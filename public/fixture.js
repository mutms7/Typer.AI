document.querySelector('#add-editor').addEventListener('click', () => {
  if (document.querySelector('#dynamic-notes')) return;
  const label = document.createElement('label'); label.htmlFor = 'dynamic-notes'; label.textContent = 'Dynamic notes';
  const textarea = document.createElement('textarea'); textarea.id = 'dynamic-notes'; textarea.dataset.typerTitle = 'Vector'; textarea.value = 'A vector has magnitude. A vector has direction.\nA v';
  document.querySelector('#dynamic-editors').append(label, textarea);
});
