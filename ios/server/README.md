# ClearCutCost Temporary Backend

This is a local-only backend proxy for testing OpenAI analysis without putting the API key inside the iOS app.

## Add your key

Open `server/.env` and paste your key after `OPENAI_API_KEY=`.

```text
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4.1-mini
PORT=3000
```

Do not commit or share `server/.env`.

## Optional Supabase persistence

The backend works without Supabase. If `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
are present, analyses and RevenueCat webhook events are saved to Supabase.

1. Open the Supabase SQL editor.
2. Run `server/supabase/schema.sql`.
3. Add these backend-only environment variables:

```text
SUPABASE_URL=https://gvuygvkhdedmdrqcuhol.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-backend-only-service-role-key
REVENUECAT_WEBHOOK_SECRET=your-random-webhook-secret
```

Do not put the service-role key in the mobile app.

RevenueCat webhook URL:

```text
https://YOUR_BACKEND_URL/webhooks/revenuecat
```

Recent webhook events:

```bash
curl http://localhost:3000/api/admin/subscription-events
```

## Run it

From this `server` folder:

```bash
npm run dev
```

Health check:

```bash
curl http://localhost:3000/health
```

Analyze:

```bash
curl http://localhost:3000/analyze \
  -H "Content-Type: application/json" \
  -d '{"description":"Replace 300 square feet of damaged flooring."}'
```

If testing from an iPhone or simulator that cannot reach `localhost`, use your Mac's local network IP address:

```text
http://YOUR_MAC_IP:3000/analyze
```
