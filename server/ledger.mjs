import { DatabaseSync } from 'node:sqlite';
import { createHmac } from 'node:crypto';
export class Ledger {
  constructor(path, config) {
    this.config = config;
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS quota (key TEXT PRIMARY KEY, used INTEGER NOT NULL, expires INTEGER NOT NULL)');
    this.get = this.db.prepare('SELECT used FROM quota WHERE key=?');
    this.add = this.db.prepare('INSERT INTO quota(key,used,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET used=used+1');
  }
  reserve(ip, now = new Date()) {
    const day = now.toISOString().slice(0, 10), month = day.slice(0, 7), hour = now.toISOString().slice(0, 13);
    const hash = createHmac('sha256', this.config.ipSecret).update(ip).digest('hex');
    const quotas = [
      ['day:' + day, this.config.daily, Date.parse(day) + 86400000],
      ['month:' + month, this.config.monthly, Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)],
      ['ip:' + hour + ':' + hash, this.config.perIp, now.getTime() + 3600000]
    ];
    this.db.exec('BEGIN IMMEDIATE');
    try {
      for (const [key, limit] of quotas) if ((this.get.get(key)?.used || 0) >= limit) {
        this.db.exec('ROLLBACK'); return false;
      }
      for (const [key, , expiry] of quotas) this.add.run(key, expiry);
      this.db.prepare('DELETE FROM quota WHERE expires < ?').run(now.getTime());
      this.db.exec('COMMIT'); return true;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  close() { this.db.close(); }
}
