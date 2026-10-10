# Deploy the owner-operated service

Users don't provide API keys. Only the backend can access the Gemini key. The extension gets a public API URL and asks for consent before sending document excerpts.

## Free hosting with durable quotas

The default `render.yaml` uses Render's Free Docker service and Supabase's Free database. It has no persistent disk. Local development still defaults to SQLite.

1. Create a Supabase project in a Free organization. Apply `server/supabase-quota.sql` to create the quota table and atomic reservation/readiness functions.
2. Set `QUOTA_STORE=supabase`, `SUPABASE_URL` to the project's HTTPS origin, and `SUPABASE_SECRET_KEY` to a server secret key. Legacy `SUPABASE_SERVICE_ROLE_KEY` is also supported. Keep this key only in the backend environment, alongside `GEMINI_API_KEY`.
3. Deploy `render.yaml` from the repository in Render. It uses `gemini-3.1-flash-lite`, generates `IP_HASH_SECRET`, and sets the exact website/extension origins and request limits.
4. Verify `/ready` and run the deployment check below. The check doesn't call Gemini.

Quota reservations run in a PostgreSQL transaction with a global advisory lock. Daily, monthly and per-IP increments succeed together or not at all. Requests stop before calling Gemini when the database can't authorize them. RLS is enabled and anonymous/authenticated clients cannot access the table or execute its functions. Only counts, expiry times and HMAC-derived IP identifiers are stored. No document text reaches Supabase.

Render's free service [sleeps after 15 minutes of inactivity](https://render.com/docs/free). The extension retries failed background refreshes after 45, 90 and 180 seconds, then stops until new activity or settings changes. Local typing stays available. Supabase Free projects [may pause after a week of low activity](https://supabase.com/docs/guides/platform/free-project-pausing), requiring the owner to resume them. Provider usage remains subject to the Gemini account's pricing and limits. Free hosting isn't a promise of unlimited inference or continuous availability.

## Optional paid hosting with SQLite

Use Node.js 24 on a VM/container with persistent storage and `QUOTA_STORE=sqlite`. `render-sqlite.yaml` is the optional Starter Docker service with a 1 GB persistent disk at `/data`. Provisioning this service and disk is a paid hosting action. See Render's [Blueprint reference](https://render.com/docs/blueprint-spec), [persistent disk guide](https://render.com/docs/disks), and [health check guide](https://render.com/docs/health-checks).

Mount a persistent directory at `DATA_DIR`, keep one server instance, and make the mounted directory writable by the container's `node` user. A mount can replace the image directory's ownership. Fix ownership on the host if necessary, rather than running the application as root. Check that quota reservations survive restarting the service. Automated tests also verify reservations survive reopening SQLite.

## Production configuration

Set `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, and `GEMINI_MODEL=gemini-3.1-flash-lite`. Alternatively choose `AI_PROVIDER=openai` and `OPENAI_API_KEY`. Set `HOST=0.0.0.0` in a container and terminate TLS at the host or trusted reverse proxy.

Production startup rejects missing provider keys, missing/placeholder IP hash secrets, malformed origins, invalid ports, and invalid budget/proxy settings. Use a stable random `IP_HASH_SECRET` of at least 32 characters. Errors identify settings without printing secret values. Development mode works without a provider key.

The default request limits are 200 daily attempts, 3,000 monthly attempts, 20 per-IP attempts per hour, and 3 concurrent requests. Failed provider attempts consume allowances. Limits cap request counts, not exact currency; configure provider spending limits and alerts separately. Gemini output is capped at 4,096 tokens; OpenAI output at 1,600. Excerpts are bounded at 6,000 characters, titles at 300 characters.

Keep `TRUST_PROXY=false` unless the proxy overwrites and validates `X-Forwarded-For` and direct backend access is blocked. Otherwise clients can spoof their rate-limit identity. With proxy trust disabled, a reverse proxy can make all users share an IP allowance. Do not enable proxy trust without checking the actual hosting topology.

The API accepts exact configured origins. This release includes a public manifest key to keep unpacked installs at the same ID: `gneblpphgipcdhphnclghfmeoageenbg`. Include `chrome-extension://gneblpphgipcdhphnclghfmeoageenbg` and `https://mutms7.github.io` in `ALLOWED_ORIGINS`. This public identity key is unrelated to the Gemini key. A browser-store release needs the store's assigned public key/ID and a matching backend allowlist. See Chrome's [manifest key documentation](https://developer.chrome.com/docs/extensions/reference/manifest/key).

Origins aren't authentication. Anonymous users can spoof them; request budgets and abuse controls are still necessary. Before larger distribution, add managed edge rate limits and abuse monitoring without document logging. Local completion remains available when cloud ranking is over quota or unavailable.

## Health and deployment checks

`/health` checks whether the process responds. `/ready` also checks the quota database and requires a configured provider key, returning HTTP 503 if either is unavailable. Neither endpoint calls Gemini, validates the key with Google, or spends an allowance. SQLite readiness doesn't establish that its disk will survive a redeploy.

SIGTERM and SIGINT stop new connections and give active requests up to 35 seconds to finish before closing connections and the local database. Provider attempts have a 30-second timeout; remote quota checks have a 5-second timeout.

```powershell
npm run deployment:check -- https://your-service.onrender.com chrome-extension://gneblpphgipcdhphnclghfmeoageenbg
```

This checks liveness, database/provider configuration readiness, and the configured origin's POST preflight permission. It sends no document text and makes no provider requests. A successful result reports `live`, `ready`, and `originAllowed` as true, with `providerCalls` equal to zero. The website origin can also be checked as the second argument. Preflight success alone doesn't establish browser-extension or provider compatibility.

Then load the cloud package, enable cloud mode in the popup, and type a disposable sample of at least 80 characters. After the idle refresh, check the service worker's `/api/rank` response for `terms`. This final check uses a provider allowance. Turn cloud mode off and verify local completion continues. Check the database's quota rows before and after a service restart to establish persistence.

## Package the cloud-connected extension

PowerShell:

```powershell
$env:TYPER_API_URL = 'https://your-service.onrender.com'
npm run package
```

POSIX:

```sh
TYPER_API_URL=https://your-service.onrender.com npm run package
```

`dist/typer-ai.zip` contains the public origin, installation instructions and license, with no secret. Its optional network permission is restricted to that backend. Users enable background ranking in the popup and grant that permission. Publish the ZIP in a release, or submit `dist/extension` to browser stores after their required privacy disclosures. The unpacked release requires Developer mode and has no automatic update mechanism.

Set the public GitHub repository variable `TYPER_API_URL` to the backend origin and rerun the Pages workflow to update the website download. Never put provider or Supabase keys in repository variables or frontend builds.

## Publishing status

The shared backend is deployed at https://typer-ai.onrender.com on Render Free, with a dedicated Supabase Free database for request counters. Version 0.1.4 downloads include that public endpoint. Cloud mode remains off until users enable it and grant the optional host permission. The GitHub Pages demo runs the local engine with precomputed Gemini vocabulary for its public samples. It never uploads visitor edits. `npm run demo:vocabulary` regenerates those samples using the ignored local `.env`; it doesn't write the key.
