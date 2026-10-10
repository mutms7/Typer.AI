async page => {
  const failures = [], check = (condition, name) => { if (!condition) failures.push(name); };
  const notes = page.getByRole('textbox', { name: 'Textarea notes', exact: true });
  await notes.focus(); await page.keyboard.press('Control+End');
  await page.waitForTimeout(200); await page.keyboard.press('Tab');
  check(/A vector(?: has)?$/.test(await notes.inputValue()), 'textarea Tab completion');
  await page.keyboard.press('Control+z');
  check((await notes.inputValue()).endsWith('A v'), 'native undo');
  await notes.fill('A vector has magnitude. A vector has direction.\nA v');
  await page.keyboard.press('Control+End'); await page.waitForTimeout(1100); await page.keyboard.press('Escape');
  await page.keyboard.press('Tab'); check((await notes.inputValue()).endsWith('A v'), 'Escape dismissal');
  await notes.fill('A vector has magnitude.\nhowever,'); await page.keyboard.press('Control+End');
  await page.waitForTimeout(80); await page.keyboard.press('Tab');
  check((await notes.inputValue()).endsWith('however,'), 'no open-ended continuation');
  const input = page.getByRole('textbox', { name: 'Text input', exact: true });
  await input.focus(); await page.keyboard.press('End'); await page.waitForTimeout(80); await page.keyboard.press('Tab');
  check(await input.inputValue() === 'A vector', 'text input');
  const rich = page.getByRole('textbox', { name: 'Rich notes', exact: true });
  await rich.focus(); await page.keyboard.press('Control+End'); await page.waitForTimeout(80); await page.keyboard.press('Tab');
  check(/This is a transformation(?: on x maps coordinates)?$/.test(await rich.innerText()), 'contenteditable');
  await page.getByRole('button', { name: 'Add textarea' }).click();
  const dynamic = page.getByRole('textbox', { name: 'Dynamic notes', exact: true });
  await dynamic.scrollIntoViewIfNeeded();
  await dynamic.focus(); await page.keyboard.press('Control+End'); await page.waitForTimeout(200); await page.keyboard.press('Tab');
  check(/A vector(?: has)?$/.test(await dynamic.inputValue()), 'dynamic field');
  check(await page.locator('[data-typer-ui]').count() === 1, 'only the installed extension is active');
  if (failures.length) throw new Error(failures.join(', '));
  return { passed: ['textarea Tab completion','native undo','Escape dismissal','no open-ended continuation','text input','contenteditable','dynamic field','installed extension activation'] };
}
