import { pathToFileURL } from 'node:url';

export async function checkDeployment(apiUrl, origin, fetcher = fetch) {
  const url = new URL(apiUrl);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.origin !== apiUrl) throw new Error('Provide an API origin without a path or trailing slash');
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Public deployments need HTTPS');
  if (!origin) throw new Error('Provide the allowed website or extension origin');
  const request = (path, options = {}) => fetcher(apiUrl + path, { ...options, redirect: 'error', signal: AbortSignal.timeout(10000) });
  const health = await request('/health');
  const healthData = await health.json();
  if (health.status !== 200 || healthData.ok !== true) throw new Error('Liveness check failed');
  const ready = await request('/ready');
  const readyData = await ready.json();
  if (ready.status !== 200 || readyData.ok !== true || readyData.databaseReady !== true || readyData.cloudConfigured !== true) throw new Error('Readiness check failed: verify the provider key and quota database');
  const cors = await request('/api/rank', {
    method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'Content-Type' }
  });
  const methods = cors.headers.get('access-control-allow-methods')?.split(',').map(s => s.trim()) || [];
  const headers = cors.headers.get('access-control-allow-headers')?.toLowerCase().split(',').map(s => s.trim()) || [];
  if (cors.status !== 204 || cors.headers.get('access-control-allow-origin') !== origin || !methods.includes('POST') || !headers.includes('content-type')) throw new Error('Origin check failed: add the exact origin to ALLOWED_ORIGINS');
  return { live: true, ready: true, originAllowed: true, providerCalls: 0 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 2) throw new Error('Usage: npm run deployment:check -- <API_ORIGIN> <ALLOWED_ORIGIN>');
    console.log(JSON.stringify(await checkDeployment(...args)));
  } catch (error) {
    console.error(error instanceof TypeError ? 'Deployment check could not connect. Verify the URL, TLS and service status.' : error.message);
    process.exitCode = 1;
  }
}
