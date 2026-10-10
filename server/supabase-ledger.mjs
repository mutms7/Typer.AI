import { quotaWindows } from './quota-windows.mjs';
export class SupabaseLedger {
  constructor(config, fetcher = fetch) { this.config = config; this.fetcher = fetcher; }
  async rpc(name, body = {}) {
    const key = this.config.supabaseKey;
    const headers = { apikey: key, 'Content-Type': 'application/json' };
    // Legacy service-role JWTs need Bearer auth; new secret keys use apikey only.
    if (!key.startsWith('sb_secret_')) headers.Authorization = 'Bearer ' + key;
    const result = await this.fetcher(this.config.supabaseUrl + '/rest/v1/rpc/' + name, {
      method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(5000), redirect: 'error'
    });
    if (!result.ok) throw new Error('Quota database unavailable');
    const data = await result.json();
    if (typeof data !== 'boolean') throw new Error('Invalid quota database response');
    return data;
  }
  reserve(ip, now = new Date()) {
    const quotas = quotaWindows(ip, this.config, now);
    return this.rpc('typer_reserve_quota', {
      p_keys: quotas.map(q => q[0]), p_limits: quotas.map(q => q[1]), p_expires: quotas.map(q => q[2])
    });
  }
  healthy() { return this.rpc('typer_quota_ready'); }
  close() {}
}
