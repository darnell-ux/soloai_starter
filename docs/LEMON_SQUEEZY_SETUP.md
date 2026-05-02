# Lemon Squeezy test-mode checklist

1. Enable **Test mode** in the Lemon Squeezy dashboard.
2. Create an **API key** (Settings → API) and set `LEMON_SQUEEZY_API_KEY`.
3. Copy your **Store ID** into `LEMON_SQUEEZY_STORE_ID`.
4. Create subscription **products / variants**; copy variant ids into `LEMON_VARIANT_BASIC`, `LEMON_VARIANT_PRO`, and/or `LEMON_VARIANT_TEAM`.
5. Set `LEMON_SQUEEZY_ENVIRONMENT=sandbox` and hosted checkout redirect targets: `LEMON_SQUEEZY_CHECKOUT_SUCCESS_URL`, `LEMON_SQUEEZY_CHECKOUT_CANCEL_URL` (HTTPS in production).
6. Add a **webhook** pointing to `https://<your-host>/api/lemonsqueezy/webhook`, choose subscription/order events you need, and copy the signing secret into `LEMON_SQUEEZY_WEBHOOK_SECRET`.
7. Run `npm run validate-env` and `npm run verify-lemon`.
8. Use a **non-`en`** locale in the app, open **Pricing**, sign in, and complete checkout; confirm `data/stripe-billing.json` updates after webhooks.
9. Re-send or simulate webhooks in the dashboard and confirm **duplicate events** do not double-apply (idempotent store under `data/lemon-webhook-events.json`).
