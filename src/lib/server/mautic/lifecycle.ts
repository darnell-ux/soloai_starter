import { enqueueMauticSync } from './queue';

export function onAuthUserCreated(user: { id: unknown; email?: unknown; name?: unknown }): void {
	const email = user.email != null ? String(user.email) : '';
	if (!email) return;
	enqueueMauticSync({
		kind: 'auth_user',
		userId: String(user.id),
		email,
		name: user.name != null ? String(user.name) : null,
		locale: null,
		marketingOptIn: false,
		addDefaultSegment: true
	});
}
