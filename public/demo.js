(() => {
  const notes = document.querySelector('#notes'), confidence = document.querySelector('#confidence');
  const samples = TyperSamples;
  let current = 'class-notes', cache = {};
  function ranks() {
    const entry = cache[current];
    window.dispatchEvent(new CustomEvent('typer-demo-vocabulary', { detail: {
      terms: entry?.document === samples[current].text ? entry.terms : []
    } }));
  }
  function update() {
    const threshold = Number(confidence.value) / 100;
    document.querySelector('#confidence-label').value = threshold >= .9 ? 'Conservative' : threshold < .78 ? 'Expansive' : 'Balanced';
    window.dispatchEvent(new CustomEvent('typer-settings', { detail: { threshold, enabled: true } }));
  }
  function load(id) {
    current = id; notes.dataset.typerTitle = samples[id].title; notes.value = samples[id].text;
    document.querySelector('#demo-hint').textContent = samples[id].hint;
    document.querySelectorAll('.example').forEach(el => { const selected = el.id === id; el.classList.toggle('selected', selected); el.setAttribute('aria-pressed', String(selected)); });
    notes.focus({ preventScroll: true }); notes.setSelectionRange(notes.value.length, notes.value.length);
    notes.scrollTop = notes.scrollHeight;
    notes.dispatchEvent(new InputEvent('input', { bubbles: true })); ranks();
  }
  confidence.addEventListener('input', update);
  notes.addEventListener('focus', ranks);
  for (const id of Object.keys(samples)) document.querySelector('#' + id).addEventListener('click', () => load(id));
  document.querySelector('#reset-example').addEventListener('click', () => load(current));
  // Public samples only, precomputed by the owner. No visitor text is uploaded.
  fetch('demo-vocabulary.json').then(r => r.ok ? r.json() : {}).then(data => { cache = data.samples || {}; ranks(); }).catch(() => {});
})();
