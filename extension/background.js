importScripts('config.js');
const DEFAULTS = { enabled: true, threshold: 0.78, cloud: false, excluded: [] };
const ready = chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
const pending = new Map(), recent = new Map();
async function settings() {
  await ready;
  const { settings } = await chrome.storage.local.get('settings');
  return { ...DEFAULTS, ...settings };
}
async function topHostname(tabId) {
  // Query our top-frame content script, rather than trusting page messages or
  // requiring access to browsing history through the tabs permission.
  try {
    const context = await chrome.tabs.sendMessage(tabId, { type: 'pageContext' }, { frameId: 0 });
    return typeof context?.hostname === 'string' ? context.hostname : '';
  } catch { return ''; }
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  (async () => {
    const s = await settings();
    const outerHost = sender.tab?.id != null ? (sender.frameId === 0 ? new URL(sender.url).hostname : await topHostname(sender.tab.id)) : '';
    if (message?.type === 'settings') return { settings: s, topHostname: outerHost, cloudAvailable: Boolean(TYPER_CONFIG.apiUrl) };
    if (message?.type !== 'rank' || !sender.tab || !s.enabled || !s.cloud || !TYPER_CONFIG.apiUrl) return { terms: [] };
    if (!outerHost) return { terms: [] };
    const host = new URL(sender.url).hostname;
    if (s.excluded.includes(host) || s.excluded.includes(outerHost)) return { terms: [] };
    const id = sender.tab.id + ':' + sender.frameId;
    const last = recent.get(id) || 0;
    if (Date.now() - last < 45000 || pending.has(id)) return { terms: [] };
    if (typeof message.text !== 'string' || message.text.length > 6000 || typeof message.title !== 'string' || message.title.length > 300) return { terms: [] };
    recent.set(id, Date.now());
    const controller = new AbortController(); pending.set(id, controller);
    const timer = setTimeout(() => controller.abort(), 32000);
    try {
      const res = await fetch(TYPER_CONFIG.apiUrl + '/api/rank', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message.text, title: message.title }), signal: controller.signal,
        credentials: 'omit', cache: 'no-store'
      });
      if (!res.ok) return { terms: [], status: 'AI vocabulary refresh unavailable. Local completion still works.' };
      const data = await res.json();
      return { terms: Array.isArray(data.terms) ? data.terms.filter(x => typeof x === 'string').slice(0, 80) : [] };
    } catch { return { terms: [], status: 'AI vocabulary refresh unavailable. Local completion still works.' }; }
    finally { clearTimeout(timer); pending.delete(id); }
  })().then(reply).catch(() => reply({ terms: [] }));
  return true;
});
let settingsVersion = 0;
chrome.storage.onChanged.addListener((changes) => {
  if (changes.settings) {
    const version = ++settingsVersion;
    for (const controller of pending.values()) controller.abort();
    chrome.tabs.query({}).then(tabs => {
      for (const tab of tabs) {
        topHostname(tab.id).then(hostname => {
          if (version !== settingsVersion) return;
          return chrome.tabs.sendMessage(tab.id, { type: 'settingsChanged', topHostname: hostname,
            settings: { ...DEFAULTS, ...changes.settings.newValue } });
        }).catch(() => {});
      }
    });
  }
});
chrome.tabs.onRemoved.addListener(tabId => {
  for (const [id, controller] of pending) if (id.startsWith(tabId + ':')) { controller.abort(); pending.delete(id); }
  for (const id of recent.keys()) if (id.startsWith(tabId + ':')) recent.delete(id);
});
