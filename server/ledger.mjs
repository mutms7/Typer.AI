import { DatabaseSync } from 'node:sqlite';
import { quotaWindows } from './quota-windows.mjs';
export class Ledger {
  constructor(path, config) {
    this.config = config;
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS quota (key TEXT PRIMARY KEY, used INTEGER NOT NULL, expires INTEGER NOT NULL)');
    this.get = this.db.prepare('SELECT used FROM quota WHERE key=?');
    this.add = this.db.prepare('INSERT INTO quota(key,used,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET used=used+1');
  }
  reserve(ip, now = new Date()) {
    const quotas = quotaWindows(ip, this.config, now);
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
  healthy() { return this.db.prepare('SELECT 1 AS ok').get().ok === 1; }
  close() { this.db.close(); }
}
