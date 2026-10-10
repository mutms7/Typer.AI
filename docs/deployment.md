# Deploy the owner-operated service

Users don't provide API keys. The extension uses your backend, and only that backend can access your Gemini or OpenAI key.

## Single-instance backend

Use Node.js 24 on a VM/container with persistent storage. A Dockerfile and Render blueprint are included. Render's persistent disk configuration is a paid plan; free hosting and free cloud inference are not promised. You can also host the Node service yourself.

1. Copy `.env.example` to `.env` for local testing, or set equivalent environment variables in your host's secret manager.
2. Set `AI_PROVIDER=gemini`, `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.1-flash-lite`, a random stable `IP_HASH_SECRET`, and `ALLOWED_ORIGINS`. Alternatively choose `AI_PROVIDER=openai` and `OPENAI_API_KEY`. Use exact origins, such as `https://mutms7.github.io` and `chrome-extension://YOUR_EXTENSION_ID`.
3. Mount a persistent directory at `DATA_DIR`. Keep exactly one server instance for SQLite quotas.
4. Set `HOST=0.0.0.0` in a container. Terminate TLS at your host or trusted reverse proxy.
5. Configure daily/monthly request budgets, per-IP hourly limits and concurrency. Start conservatively. Failed attempts consume allowances.
6. Verify `/health`, then send a consented test excerpt from the extension. Check for a `terms` response and local fallback when cloud requests fail.

Keep `TRUST_PROXY=false` unless your proxy overwrites and validates `X-Forwarded-For` and direct backend access is blocked. Otherwise a client can spoof the rate-limit identity. With proxy trust disabled, a reverse proxy can make all users share one IP quota. Adjust configuration deliberately for the hosting topology.

The API accepts only exact configured origins. Unpacked extension IDs can vary by machine and path. A Web Store package has a stable extension ID. Add test IDs explicitly while testing, then restrict to the published ID and demo origin. Do not use an origin wildcard as a substitute for addressing compatibility.

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
