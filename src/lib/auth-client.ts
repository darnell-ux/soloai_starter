import { createAuthClient } from 'better-auth/svelte';

type AuthClient = ReturnType<typeof createAuthClient>;

export const authClient: AuthClient = createAuthClient({});
