(() => {
  const notes = document.querySelector('#notes'), title = document.querySelector('#document-title');
  const confidence = document.querySelector('#confidence'), enabled = document.querySelector('#enabled');
  function update() {
    const threshold = Number(confidence.value) / 100;
    document.querySelector('#confidence-label').textContent = threshold >= .9 ? 'Conservative' : threshold < .78 ? 'Expansive' : 'Balanced';
    document.querySelector('#confidence-value').value = confidence.value;
    window.dispatchEvent(new CustomEvent('typer-settings', { detail: { threshold, enabled: enabled.checked } }));
  }
  confidence.addEventListener('input', update); enabled.addEventListener('change', update);
  const samples = {
    vectors: ['Vectors & linear algebra', 'A vector has a magnitude and a direction. Vector addition combines two vectors. The vector space contains vectors and their linear combinations.\n\nThe vector represents a displacement. The vector represents a displacement.\n\nA v'],
    transformations: ['Transformation on x', 'A transformation on x changes the input. A transformation on x maps coordinates. The transformation on x preserves a relationship between the original and the result.\n\nThis is a tr']
  };
  for (const id of Object.keys(samples)) document.querySelector('#' + id).addEventListener('click', () => {
    title.textContent = samples[id][0]; notes.dataset.typerTitle = samples[id][0]; notes.value = samples[id][1];
    document.querySelectorAll('.example').forEach(el => el.classList.toggle('selected', el.id === id));
    notes.focus(); notes.setSelectionRange(notes.value.length, notes.value.length); notes.dispatchEvent(new InputEvent('input', { bubbles: true }));
  });
  notes.addEventListener('input', () => {
    const engine = new TyperEngine().index(notes.value, notes.dataset.typerTitle), start = performance.now();
    const prediction = engine.predict(notes.value.slice(0, notes.selectionStart), Number(confidence.value) / 100, notes.value.slice(notes.selectionEnd));
    const elapsed = performance.now() - start;
    document.querySelector('#timing').textContent = prediction ? 'Local lookup: ' + elapsed.toFixed(2) + ' ms' : 'Waiting for a clear match.';
  });
})();
