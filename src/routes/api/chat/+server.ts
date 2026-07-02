/**
 * POST /api/chat — streaming California nexus compliance assistant.
 *
 * Server-only. Streams Claude Sonnet 4.6 (Anthropic) token deltas as
 * text/plain. Auth-aware: an authenticated Better Auth session adds the user's
 * subscription tier to the system prompt context. Privacy: message content is
 * NEVER logged — only requestId, userId, messageCount, latency and token usage.
 */
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { getEnv } from '$lib/server/env';
import { rateLimit } from '$lib/server/rate-limiter';
import { readJsonBody } from '$lib/server/http/read-json';
import { getUserBilling } from '$lib/server/stripe/billing-store';

/** Best fit for an interactive compliance widget: fast, adaptive, ~1/3 Opus cost. */
const CHAT_MODEL = 'claude-sonnet-4-6';
const MAX_OUTPUT_TOKENS = 2_048;
const REQUEST_TIMEOUT_MS = 30_000;
/** Client sends a sliding window of 10; cap defensively above that. */
const MAX_MESSAGES = 20;
const MAX_CONTENT_CHARS = 4_000;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;

const SYSTEM_PROMPT =
	'You are a California sales tax nexus compliance assistant for Amazon FBA sellers. ' +
	'You help sellers understand whether they have a California filing obligation based on ' +
	'warehouse presence and sales thresholds. You are accurate, plain-language, and always ' +
	'recommend consulting a tax professional for specific filing decisions. You never give legal advice.';

const messageSchema = z.object({
	role: z.enum(['user', 'assistant']),
	content: z.string().min(1).max(MAX_CONTENT_CHARS)
});

const bodySchema = z.object({
	messages: z.array(messageSchema).min(1).max(MAX_MESSAGES)
});

/** Structured, content-free request log (info) — the only place we log this route. */
function logChat(fields: {
	requestId: string;
	userId: string;
	messageCount: number;
	latencyMs: number;
	tokens: number;
	kind?: string;
}): void {
	console.info('[chat]', fields);
}

/**
 * Rate-limit identity for anonymous callers. `getClientAddress()` returns the
 * nginx proxy address, which would collapse every guest into one shared bucket
 * (a trivial DoS), so prefer the left-most `X-Forwarded-For` hop that nginx
 * sets, falling back to the socket address.
 */
function clientIp(request: Request, fallback: () => string): string {
	const xff = request.headers.get('x-forwarded-for');
	const first = xff?.split(',')[0]?.trim();
	return first || fallback();
}

export const POST: RequestHandler = async ({ request, locals, getClientAddress }) => {
	const requestId = randomUUID();
	const startedAt = Date.now();

	const user = locals.user as { id?: string | number } | undefined;
	const userId = user?.id != null ? String(user.id) : 'anon';

	// --- content type + JSON parse (shared guard) -----------------------------
	const raw = await readJsonBody(request);

	// --- validation -----------------------------------------------------------
	const parsed = bodySchema.safeParse(raw);
	if (!parsed.success) {
		throw error(400, { message: 'invalid_body' });
	}

	// Anthropic requires the first message to be a user turn. The client's sliding
	// window can begin on an assistant turn, so drop any leading assistant messages.
	const firstUser = parsed.data.messages.findIndex((m) => m.role === 'user');
	if (firstUser === -1) {
		throw error(400, { message: 'invalid_body' });
	}
	const messages = parsed.data.messages.slice(firstUser);

	// --- rate limiting (per user, falling back to proxy-aware client IP) ------
	const rateKey =
		userId !== 'anon' ? `chat:user:${userId}` : `chat:ip:${clientIp(request, getClientAddress)}`;
	const rl = rateLimit(rateKey, { windowMs: RATE_WINDOW_MS, max: RATE_MAX });
	if (rl.limited) {
		logChat({
			requestId,
			userId,
			messageCount: messages.length,
			latencyMs: Date.now() - startedAt,
			tokens: 0,
			kind: 'rate_limited'
		});
		return json(
			{ error: 'rate_limited', requestId },
			{
				status: 429,
				headers: {
					'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)),
					'X-Request-Id': requestId
				}
			}
		);
	}

	// --- Anthropic configuration ----------------------------------------------
	const apiKey = getEnv().ANTHROPIC_API_KEY;
	if (!apiKey) {
		logChat({
			requestId,
			userId,
			messageCount: messages.length,
			latencyMs: Date.now() - startedAt,
			tokens: 0,
			kind: 'not_configured'
		});
		throw error(503, { message: 'chat_unavailable' });
	}

	// Auth-aware system prompt: include the subscription tier for signed-in users.
	let systemPrompt = SYSTEM_PROMPT;
	if (userId !== 'anon') {
		const tier = getUserBilling(userId)?.subscriptionTier ?? 'trial';
		systemPrompt +=
			`\n\nContext: the user is authenticated on the "${tier}" plan. ` +
			'Tailor guidance to their situation where relevant, but never expose internal billing details.';
	}

	// --- streaming completion with a hard 30s timeout -------------------------
	const client = new Anthropic({ apiKey });
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

	// Thinking disabled + low effort keeps an interactive chat snappy and cheap.
	const messageStream = client.messages.stream(
		{
			model: CHAT_MODEL,
			max_tokens: MAX_OUTPUT_TOKENS,
			system: systemPrompt,
			thinking: { type: 'disabled' },
			output_config: { effort: 'low' },
			messages
		},
		{ signal: controller.signal }
	);

	async function* textDeltas(): AsyncGenerator<string> {
		for await (const event of messageStream) {
			if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
				yield event.delta.text;
			}
		}
	}
	const deltas = textDeltas();

	// Pre-flight the first chunk so pre-output failures (bad request, expired key,
	// network error) surface as a real HTTP status the client can detect — rather
	// than a 200 whose body is an error notice that renders as a normal answer.
	let firstChunk: IteratorResult<string>;
	try {
		firstChunk = await deltas.next();
	} catch {
		clearTimeout(timeout);
		const aborted = controller.signal.aborted;
		logChat({
			requestId,
			userId,
			messageCount: messages.length,
			latencyMs: Date.now() - startedAt,
			tokens: 0,
			kind: aborted ? 'timeout' : 'upstream_error'
		});
		throw error(aborted ? 504 : 502, { message: 'chat_upstream_error' });
	}

	const encoder = new TextEncoder();
	let tokens = 0;

	const stream = new ReadableStream<Uint8Array>({
		async start(ctrl) {
			try {
				if (!firstChunk.done) ctrl.enqueue(encoder.encode(firstChunk.value));
				for await (const chunk of deltas) {
					ctrl.enqueue(encoder.encode(chunk));
				}
				const final = await messageStream.finalMessage();
				tokens = (final.usage.input_tokens ?? 0) + (final.usage.output_tokens ?? 0);
				ctrl.close();
				logChat({
					requestId,
					userId,
					messageCount: messages.length,
					latencyMs: Date.now() - startedAt,
					tokens,
					kind: final.stop_reason === 'refusal' ? 'refusal' : 'completed'
				});
			} catch {
				// Failure AFTER the first token: the 200 headers are already sent, so
				// the status can't change — degrade with an inline notice.
				const aborted = controller.signal.aborted;
				logChat({
					requestId,
					userId,
					messageCount: messages.length,
					latencyMs: Date.now() - startedAt,
					tokens,
					kind: aborted ? 'timeout' : 'stream_error'
				});
				try {
					ctrl.enqueue(
						encoder.encode('\n\n[The assistant response was interrupted. Please try again.]')
					);
				} catch {
					/* controller already closed */
				}
				ctrl.close();
			} finally {
				clearTimeout(timeout);
			}
		},
		cancel() {
			controller.abort();
			clearTimeout(timeout);
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'no-store',
			'X-Request-Id': requestId,
			// Disable proxy buffering (nginx) so tokens flush to the client immediately.
			'X-Accel-Buffering': 'no'
		}
	});
};
