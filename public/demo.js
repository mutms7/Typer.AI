(() => {
  const notes = document.querySelector('#notes'), title = document.querySelector('#document-title');
  const confidence = document.querySelector('#confidence'), enabled = document.querySelector('#enabled');
  let current = 'email';
  const samples = {
    email: {
      title: 'Friday’s project update',
      text: 'Hi Jamie,\n\nThanks for the project update. I’ll share the project update with the team before Friday’s meeting.\n\nI’ve added my feedback below. Let me know if you have any questions.\n\nYour pro',
      hint: 'Click at the end of “pro”, then press Tab. Lower the confidence to complete a familiar phrase.'
    },
    meeting: {
      title: 'Planning the birthday party',
      text: 'We’re planning a birthday party for Sam. The birthday party will be at the park on Saturday.\n\nJamie will bring the birthday cake. Alex will pick up the birthday cake on the way to the park.\n\nRemember to bring the birth',
      hint: 'Click at the end of “birth”, then press Tab. Typer uses the words already in these notes.'
    }
  };
  function update() {
    const threshold = Number(confidence.value) / 100;
    document.querySelector('#confidence-label').value = threshold >= .9 ? 'Conservative' : threshold < .78 ? 'Expansive' : 'Balanced';
    window.dispatchEvent(new CustomEvent('typer-settings', { detail: { threshold, enabled: enabled.checked } }));
  }
  function load(id) {
    current = id;
    title.textContent = samples[id].title; notes.dataset.typerTitle = samples[id].title; notes.value = samples[id].text;
    document.querySelector('#demo-hint').textContent = samples[id].hint;
    document.querySelectorAll('.example').forEach(el => { const selected = el.id === id; el.classList.toggle('selected', selected); el.setAttribute('aria-pressed', String(selected)); });
    notes.focus({ preventScroll: true }); notes.setSelectionRange(notes.value.length, notes.value.length);
    notes.dispatchEvent(new InputEvent('input', { bubbles: true }));
  }
  confidence.addEventListener('input', update); enabled.addEventListener('change', update);
  for (const id of Object.keys(samples)) document.querySelector('#' + id).addEventListener('click', () => load(id));
  document.querySelector('#reset-example').addEventListener('click', () => load(current));
})();
