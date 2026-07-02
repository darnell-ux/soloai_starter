/**
 * Chat conversation store — Svelte 5 runes ($state), not writable stores.
 *
 * Named `*.svelte.ts` because runes only compile inside Svelte modules.
 * Import as: `import { chatStore } from '$lib/stores/chat.svelte';`
 *
 * - Keeps the full transcript for the tab in memory + sessionStorage.
 * - `getRecent()` provides the sliding window (last 10) sent to /api/chat.
 * - `syncUser()` clears the transcript when the Better Auth session changes.
 */
import { browser } from '$app/environment';

export interface ChatMessage {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	timestamp: number;
	/** True when this message failed to send / stream. */
	error?: boolean;
}

const STORAGE_KEY = 'taxnexus:chat';
/** Hard cap on stored history to keep sessionStorage small. */
const MAX_STORED = 50;
const RECENT_DEFAULT = 10;

function newId(): string {
	if (browser && typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID();
	}
	return `m_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function isChatMessage(v: unknown): v is ChatMessage {
	if (typeof v !== 'object' || v === null) return false;
	const m = v as Record<string, unknown>;
	return (
		typeof m.id === 'string' &&
		(m.role === 'user' || m.role === 'assistant') &&
		typeof m.content === 'string' &&
		typeof m.timestamp === 'number'
	);
}

class ChatStore {
	/** Reactive transcript. Deeply reactive: mutating a message's content updates the UI. */
	messages = $state<ChatMessage[]>([]);

	/** Last known Better Auth user id ('anon' for guest). `null` = not yet resolved. */
	#userKey: string | null = null;

	/** Owner id tagged on the persisted transcript (from storage or the resolved user). */
	#owner: string | null = null;

	constructor() {
		this.#restore();
	}

	/** Append a message; returns the created record (with generated id/timestamp). */
	addMessage(msg: { role: ChatMessage['role']; content: string; error?: boolean }): ChatMessage {
		const record: ChatMessage = {
			id: newId(),
			timestamp: Date.now(),
			role: msg.role,
			content: msg.content,
			error: msg.error
		};
		this.messages.push(record);
		if (this.messages.length > MAX_STORED) {
			this.messages = this.messages.slice(-MAX_STORED);
		}
		this.save();
		return record;
	}

	/** Append streamed text to an existing message (no persist per token — call save() when done). */
	appendContent(id: string, text: string): void {
		const m = this.messages.find((x) => x.id === id);
		if (m) m.content += text;
	}

	/** Flag a message as errored (e.g. stream failed / rate limited). */
	markError(id: string): void {
		const m = this.messages.find((x) => x.id === id);
		if (m) {
			m.error = true;
			this.save();
		}
	}

	/** Clear the transcript and its persisted copy. */
	clear(): void {
		this.messages = [];
		if (browser) {
			try {
				sessionStorage.removeItem(STORAGE_KEY);
			} catch {
				/* storage unavailable */
			}
		}
	}

	/** The sliding window sent to the API — last `n` messages. */
	getRecent(n: number = RECENT_DEFAULT): ChatMessage[] {
		return this.messages.slice(-n);
	}

	/**
	 * Reconcile with the current auth user. Clears the transcript whenever the
	 * resolved user differs from the transcript's owner — including the first
	 * resolution against a transcript restored from storage (so user B never
	 * inherits user A's messages after a reload) and any later login/logout swap.
	 */
	syncUser(userId: string | null): void {
		const key = userId ?? 'anon';
		if (this.#userKey === null) {
			// First resolution this session: if the restored transcript is tagged
			// with a *different* owner, it isn't ours — drop it.
			if (this.#owner !== null && this.#owner !== key && this.messages.length > 0) {
				this.clear();
			}
			this.#userKey = key;
			this.#owner = key;
			this.save(); // re-tag the persisted copy with the confirmed owner
			return;
		}
		if (this.#userKey !== key) {
			this.clear();
			this.#userKey = key;
			this.#owner = key;
		}
	}

	/** Persist the transcript (owner-tagged) to sessionStorage (tab-scoped). */
	save(): void {
		if (!browser) return;
		try {
			// messages are already capped in addMessage(); no need to re-slice here.
			const payload = { owner: this.#owner, messages: this.messages };
			sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
		} catch {
			/* quota / disabled storage — non-fatal */
		}
	}

	#restore(): void {
		if (!browser) return;
		try {
			const raw = sessionStorage.getItem(STORAGE_KEY);
			if (!raw) return;
			const parsed: unknown = JSON.parse(raw);
			// Current shape: { owner, messages }. `owner` gates the cross-user check
			// in syncUser(); a legacy untagged array leaves owner null (unknown).
			if (parsed && typeof parsed === 'object' && 'messages' in parsed) {
				const tagged = parsed as { owner?: unknown; messages?: unknown };
				this.#owner = typeof tagged.owner === 'string' ? tagged.owner : null;
				if (Array.isArray(tagged.messages)) {
					this.messages = tagged.messages.filter(isChatMessage).slice(-MAX_STORED);
				}
			} else if (Array.isArray(parsed)) {
				this.messages = parsed.filter(isChatMessage).slice(-MAX_STORED);
			}
		} catch {
			/* corrupt payload — ignore */
		}
	}
}

export const chatStore = new ChatStore();
