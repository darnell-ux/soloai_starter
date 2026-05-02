# Secret handling

- **Isolation**: Use separate material per `NODE_ENV` (development / test / production). Do not share `.env` files across environments or merge production secrets into dev machines.
- **Transport / storage**: Expect TLS for HTTP APIs and encrypted-at-rest secret stores; never commit raw secrets.
- **Access**: Read secrets only via `src/lib/server/secrets.ts` (`getServerSecret`, `getSecretRotationState`) after `env` validation — not scattered `process.env` reads.
- **Rotation**: Set `PRIMARY` and `PRIMARY_NEXT` (e.g. `STRAPI_API_TOKEN` + `STRAPI_API_TOKEN_NEXT`) for dual-run; validate both in production when present; retire primary after cutover.
- **CI/CD**: Inject secrets at runtime from the platform secret store; do not bake into build artifacts. Mask secret names in logs; never print values.
- **Leak checks**: Run `npm run check:secrets` before push (blocks tracked `.env*` except `.env.example`, PEM blobs, obvious `sk-*` token patterns).
- **On-demand rotation audit**: `npm run rotate-secret -- STRAPI_API_TOKEN` (redacted audit line only; perform real rotation in the provider + `*_NEXT` dual-run).
- **Scheduled rotation**: Use the platform scheduler (e.g. cron/GitHub Actions) to rotate at the provider on a policy interval; keep `PRIMARY` + `PRIMARY_NEXT` during cutover; then promote and retire old material.

## Incident response (secret compromise)

1. Revoke or rotate the credential at the provider immediately.
2. Set new material in the secret store; deploy with dual-run if needed (`*_NEXT`).
3. Invalidate sessions/tokens that depended on the old secret (app-specific).
4. Redeploy all nodes; clear in-memory caches (`invalidateServerSecretCache` if wired).
5. Review audit logs (`[secret-audit]` lines) and access scopes for the affected identifier.
