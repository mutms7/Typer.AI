(async () => {
  const defaults = { enabled: true, threshold: 0.78, cloud: false, excluded: [] };
  const data = await chrome.storage.local.get('settings');
  const settings = { ...defaults, ...data.settings };
  const enabled = document.querySelector('#enabled'), threshold = document.querySelector('#threshold'), cloud = document.querySelector('#cloud'), site = document.querySelector('#site'), status = document.querySelector('#status');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let hostname;
  try { const url = new URL(tab.url); if (['http:', 'https:'].includes(url.protocol)) hostname = url.hostname; } catch { /* Browser may hide tab URL without host access. */ }
  enabled.checked = settings.enabled; threshold.value = Math.round(settings.threshold * 100); cloud.checked = settings.cloud;
  cloud.disabled = !TYPER_CONFIG.apiUrl;
  if (!TYPER_CONFIG.apiUrl) {
    document.querySelector('#cloud-help').textContent = 'Background AI is not available in this build. Local completion works without it.';
    document.querySelector('#cloud-data').hidden = true;
  }
  function display() {
    const level = settings.threshold >= .9 ? 'Fewer suggestions' : settings.threshold < .78 ? 'More suggestions' : 'Balanced';
    document.querySelector('#level').textContent = level;
    threshold.setAttribute('aria-valuetext', level);
    site.textContent = hostname ? (settings.excluded.includes(hostname) ? 'Resume Typer on ' : 'Pause Typer on ') + hostname : 'Site controls unavailable on this page';
    site.disabled = !hostname;
  }
  async function save(message = 'Settings saved.') { await chrome.storage.local.set({ settings }); display(); status.textContent = message; }
  enabled.addEventListener('change', () => { settings.enabled = enabled.checked; save(settings.enabled ? 'Completions on.' : 'Completions off.'); });
  threshold.addEventListener('input', () => { settings.threshold = Number(threshold.value) / 100; display(); });
  threshold.addEventListener('change', () => save('Suggestion level saved.'));
  cloud.addEventListener('change', async () => {
    if (cloud.checked) {
      const origin = new URL(TYPER_CONFIG.apiUrl).origin + '/*';
      const granted = await chrome.permissions.request({ origins: [origin] });
      if (!granted) { cloud.checked = false; status.textContent = 'Background AI stayed off because access was not granted.'; return; }
    }
    settings.cloud = cloud.checked; save(settings.cloud ? 'Background AI on. Draft excerpts can now be sent for vocabulary refreshes.' : 'Background AI off. No new excerpts will be sent.');
  });
  site.addEventListener('click', () => { settings.excluded = settings.excluded.includes(hostname) ? settings.excluded.filter(h => h !== hostname) : [...settings.excluded, hostname]; save(settings.excluded.includes(hostname) ? 'Typer paused on ' + hostname + '.' : 'Typer resumed on ' + hostname + '.'); });
  display();
})();
