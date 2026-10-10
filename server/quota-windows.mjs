import { createHmac } from 'node:crypto';
export function quotaWindows(ip, config, now = new Date()) {
  const day = now.toISOString().slice(0, 10), month = day.slice(0, 7), hour = now.toISOString().slice(0, 13);
  const hash = createHmac('sha256', config.ipSecret).update(ip).digest('hex');
  return [
    ['day:' + day, config.daily, Date.parse(day) + 86400000],
    ['month:' + month, config.monthly, Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)],
    ['ip:' + hour + ':' + hash, config.perIp, now.getTime() + 3600000]
  ];
}
