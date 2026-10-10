(async () => {
  const defaults = { enabled: true, threshold: 0.78, cloud: false, excluded: [] };
  const data = await chrome.storage.local.get('settings');
  const settings = { ...defaults, ...data.settings };
  const enabled = document.querySelector('#enabled'), threshold = document.querySelector('#threshold'), cloud = document.querySelector('#cloud'), site = document.querySelector('#site'), status = document.querySelector('#status');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let hostname;
  try { hostname = new URL(tab.url).hostname; } catch { /* Browser may hide tab URL without host access. */ }
  enabled.checked = settings.enabled; threshold.value = Math.round(settings.threshold * 100); cloud.checked = settings.cloud;
  cloud.disabled = !TYPER_CONFIG.apiUrl;
  if (!TYPER_CONFIG.apiUrl) document.querySelector('#cloud-help').textContent = 'This build runs locally. Background AI ranking becomes available when the project owner connects the shared server.';
  function display() {
    document.querySelector('#level').textContent = settings.threshold >= .9 ? 'Conservative' : settings.threshold < .78 ? 'Expansive' : 'Balanced';
    site.textContent = hostname ? (settings.excluded.includes(hostname) ? 'Resume on ' : 'Pause on ') + hostname : 'Site controls unavailable here';
    site.disabled = !hostname;
  }
  async function save() { await chrome.storage.local.set({ settings }); display(); status.textContent = 'Settings saved.'; }
  enabled.addEventListener('change', () => { settings.enabled = enabled.checked; save(); });
  threshold.addEventListener('input', () => { settings.threshold = Number(threshold.value) / 100; display(); });
  threshold.addEventListener('change', save);
  cloud.addEventListener('change', async () => {
    if (cloud.checked) {
      const origin = new URL(TYPER_CONFIG.apiUrl).origin + '/*';
      const granted = await chrome.permissions.request({ origins: [origin] });
      if (!granted) { cloud.checked = false; status.textContent = 'Cloud access wasn’t enabled. Local predictions are active.'; return; }
    }
    settings.cloud = cloud.checked; save();
  });
  site.addEventListener('click', () => { settings.excluded = settings.excluded.includes(hostname) ? settings.excluded.filter(h => h !== hostname) : [...settings.excluded, hostname]; save(); });
  display();
})();
