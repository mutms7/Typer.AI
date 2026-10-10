importScripts('config.js');
const DEFAULTS = { enabled: true, threshold: 0.82, cloud: false, excluded: [] };
const ready = chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
const pending = new Map(), recent = new Map();
async function settings() {
  await ready;
  const { settings } = await chrome.storage.local.get('settings');
  return { ...DEFAULTS, ...settings };
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  (async () => {
    const s = await settings();
    if (message?.type === 'settings') return { settings: s, cloudAvailable: Boolean(TYPER_CONFIG.apiUrl) };
    if (message?.type !== 'rank' || !sender.tab || !s.enabled || !s.cloud || !TYPER_CONFIG.apiUrl) return { terms: [] };
    const host = new URL(sender.url).hostname;
    if (s.excluded.includes(host)) return { terms: [] };
    const id = sender.tab.id + ':' + sender.frameId;
    const last = recent.get(id) || 0;
    if (Date.now() - last < 45000 || pending.has(id)) return { terms: [] };
    if (typeof message.text !== 'string' || message.text.length > 6000 || typeof message.title !== 'string' || message.title.length > 300) return { terms: [] };
    recent.set(id, Date.now());
    const controller = new AbortController(); pending.set(id, controller);
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(TYPER_CONFIG.apiUrl + '/api/rank', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message.text, title: message.title }), signal: controller.signal,
        credentials: 'omit', cache: 'no-store'
      });
      if (!res.ok) return { terms: [], status: 'Local predictions active. Cloud ranking unavailable.' };
      const data = await res.json();
      return { terms: Array.isArray(data.terms) ? data.terms.filter(x => typeof x === 'string').slice(0, 60) : [] };
    } catch { return { terms: [], status: 'Local predictions active. Cloud ranking unavailable.' }; }
    finally { clearTimeout(timer); pending.delete(id); }
  })().then(reply).catch(() => reply({ terms: [] }));
  return true;
});
chrome.storage.onChanged.addListener((changes) => {
  if (changes.settings) {
    for (const controller of pending.values()) controller.abort();
    chrome.tabs.query({}).then(tabs => {
      for (const tab of tabs) chrome.tabs.sendMessage(tab.id, { type: 'settingsChanged', settings: { ...DEFAULTS, ...changes.settings.newValue } }).catch(() => {});
    });
  }
});
chrome.tabs.onRemoved.addListener(tabId => {
  for (const [id, controller] of pending) if (id.startsWith(tabId + ':')) { controller.abort(); pending.delete(id); }
  for (const id of recent.keys()) if (id.startsWith(tabId + ':')) recent.delete(id);
});
