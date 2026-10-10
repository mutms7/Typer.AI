# Deploy the owner-operated service

Users don't provide API keys. The extension uses your backend, and only that backend can access your Gemini or OpenAI key.

## Single-instance backend

Use Node.js 24 on a VM/container with persistent storage. A Dockerfile and Render blueprint are included. Render's persistent disk configuration is a paid plan; free hosting and free cloud inference are not promised. You can also host the Node service yourself.

1. Copy `.env.example` to `.env` for local testing, or set equivalent environment variables in your host's secret manager.
2. Set `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.1-flash-lite`, a random stable `IP_HASH_SECRET`, and `ALLOWED_ORIGINS`. Alternatively choose `AI_PROVIDER=openai` and `OPENAI_API_KEY`. Use exact origins, such as `https://mutms7.github.io` and `chrome-extension://YOUR_EXTENSION_ID`.
3. Mount a persistent directory at `DATA_DIR`. Keep exactly one server instance for SQLite quotas.
4. Set `HOST=0.0.0.0` in a container. Terminate TLS at your host or trusted reverse proxy.
5. Configure daily/monthly request budgets, per-IP hourly limits and concurrency. Start conservatively. Failed attempts consume allowances.
6. Verify `/ready`, then send a consented test excerpt from the extension. Check for a `terms` response and local fallback when cloud requests fail.

Production startup rejects missing provider keys, missing or placeholder IP hash secrets, invalid origin lists, invalid ports, and invalid budget/proxy settings. Use a random `IP_HASH_SECRET` of at least 32 characters. Errors identify the setting without printing secret values. Development mode still works without a provider key.

`/health` checks whether the process is responding. `/ready` also queries the SQLite quota database and requires a configured provider key, returning HTTP 503 if either is unavailable. Neither endpoint calls the provider, verifies key validity with Google, or spends a request allowance. Readiness does not verify that the disk will persist across redeploys. SIGTERM and SIGINT stop new connections and give active provider requests up to 35 seconds to finish before closing connections and SQLite.

## Render setup

Create a Blueprint from this repository using `render.yaml`. The blueprint uses Gemini 3.1 Flash-Lite, a single Starter Docker service, a 1 GB persistent disk at `/data`, and `/ready` for health checks. It generates `IP_HASH_SECRET`; supply `GEMINI_API_KEY` through Render's secret environment field and set `ALLOWED_ORIGINS` to a comma-separated list of exact origins. For example, start with `https://mutms7.github.io` and add the actual `chrome-extension://...` origin from the loaded extension's ID. Production rejects placeholder extension IDs.

Keep the service at one instance and confirm `/data` is writable by the container's `node` user. A disk mount can replace the image directory's ownership. If the host reports a permission error, fix the mounted directory's ownership for that user rather than running the application as root. Keep `TRUST_PROXY=false` until you've verified the proxy behavior; this conservative default can make all visitors share the per-IP limit.

The blueprint explicitly sets 200 daily attempts, 3,000 monthly attempts, 20 attempts per IP per hour, and 3 concurrent requests. Provisioning the service and disk is a paid hosting action. See Render's [Blueprint reference](https://render.com/docs/blueprint-spec), [persistent disk guide](https://render.com/docs/disks), and [health check guide](https://render.com/docs/health-checks).

## Check a deployed backend

Run this from the repository with the public backend origin and the extension origin you configured:

```powershell
npm run deployment:check -- https://your-service.onrender.com chrome-extension://YOUR_ACTUAL_EXTENSION_ID
```

This checks liveness, database/provider configuration readiness, and the origin's POST preflight permission. It sends no document text and makes no Gemini requests. A successful result reports `live`, `ready`, and `originAllowed` as true, with `providerCalls` equal to zero. The same command can check `https://mutms7.github.io` as the second argument. A successful preflight alone does not establish browser-extension compatibility or provider availability.

Then package the extension as described below, load it in Chrome or Edge, enable cloud mode in the popup, and type a disposable sample of at least 80 characters. After the idle refresh, check the service worker's network response for `/api/rank` and confirm it contains `terms`. This final check uses a provider allowance. Turn cloud mode off and verify local completion continues. Restart the service and confirm the mounted quota database remains in `/data`; the automated quota tests also verify reservations survive reopening the database.

Keep `TRUST_PROXY=false` unless your proxy overwrites and validates `X-Forwarded-For` and direct backend access is blocked. Otherwise a client can spoof the rate-limit identity. With proxy trust disabled, a reverse proxy can make all users share one IP quota. Adjust configuration deliberately for the hosting topology.

The API accepts only exact configured origins. This release includes a public manifest key to keep unpacked installs at the same ID: `gneblpphgipcdhphnclghfmeoageenbg`. Add `chrome-extension://gneblpphgipcdhphnclghfmeoageenbg` to `ALLOWED_ORIGINS`. This public identity key is unrelated to the private Gemini API key. When publishing through a browser store, use the store's assigned public key/ID and update the backend allowlist accordingly. See Chrome's [manifest key documentation](https://developer.chrome.com/docs/extensions/reference/manifest/key). Do not use an origin wildcard as a substitute for addressing compatibility.

## Package the cloud-connected extension

PowerShell:

```powershell
$env:TYPER_API_URL = 'https://your-server.example'
npm run package
```

POSIX shell:

```sh
TYPER_API_URL=https://your-server.example npm run package
```

The ZIP in `dist/typer-ai.zip` has the public API origin and no secret. The optional cloud permission is requested when a user enables background ranking. The popup explains what leaves the device before that choice. Publish the resulting ZIP in a release, or submit `dist/extension` to the Chrome Web Store and Edge Add-ons after completing their privacy disclosures.

To update the demo's downloaded extension, set the GitHub repository variable `TYPER_API_URL` to the backend origin and rerun the Pages workflow. It is a public URL, not an API key. Never store the owner key in a repository variable or frontend build.

## Budget limits

Global attempt limits are durable across service restarts if the SQLite volume persists. They cap request count, not exact currency. Excerpts have a 6,000-character limit, titles 300 characters, and responses at most 4,096 output tokens for Gemini or 1,600 for OpenAI. Model pricing changes and tokenization varies. Configure provider-side spending controls and alerts too.

This no-account design trades stronger per-user identity for quick onboarding. Origin spoofing, IP rotation and shared networks are limitations. Before large-scale distribution, add abuse monitoring without document logging, managed edge rate limits, and a shared quota store if scaling horizontally.

## Publishing status

The GitHub Pages demo runs the local engine with cached, real Gemini vocabulary for its public examples. It never uploads visitor document text. Regenerate those public sample caches with `npm run demo:vocabulary` before publishing; the script reads your ignored `.env` and never writes the key. A working backend must be provisioned separately for cloud-connected extension users. The initial public release works locally and can be used immediately without a backend.
