import { readFile, writeFile } from 'node:fs/promises';
import '../public/demo-samples.js';
import { providerConfig, rankVocabulary, vocabularyTerms, VOCABULARY_PROMPT } from '../server/provider.mjs';
const config = providerConfig();
if (!config.apiKey) throw new Error('Configure GEMINI_API_KEY or OPENAI_API_KEY in the ignored .env first.');
const samples = {};
// Explicit review exclusions for the public fixtures, not a private document filter.
const rejected = new Set(['opp', 'tr', 'far please', 'week so', 'process and', 'out more', 'well as', 'we are', 'i am', 'i have', 'can not']);
const reviewed = terms => terms.filter(term => !rejected.has(term.toLocaleLowerCase('en-US')));
const previous = process.argv.includes('--refine-cache') ? JSON.parse(await readFile('public/demo-vocabulary.json', 'utf8')).samples : {};
for (const [id, sample] of Object.entries(globalThis.TyperSamples)) {
  let terms;
  try { terms = previous[id]?.document === sample.text ? previous[id].terms : await rankVocabulary(sample, config, AbortSignal.timeout(30000)); }
  catch (error) {
    if (error.status !== 503) throw error;
    console.log(id + ': provider temporarily busy, retrying once.');
    terms = await rankVocabulary(sample, config, AbortSignal.timeout(30000));
  }
  terms = reviewed(terms);
  if (!terms.length) throw new Error('Provider returned no usable terms for ' + id);
  const supplementalPrompts = previous[id]?.supplementalPrompts || [];
  for (let attempt = 0; terms.length < 80 && attempt < 3; attempt++) {
    const missing = 80 - terms.length;
    const instructions = VOCABULARY_PROMPT + '\nFor this supplemental response, the main cache is already generated. Return ONLY ' + missing + ' NEW everyday words or natural connective phrases, not 80. Use the supplemental terms-array schema. None may duplicate these existing entries: ' + JSON.stringify(terms) + '. Do not use these rejected incomplete or awkward entries: ' + JSON.stringify([...rejected]) + '. Prefer wording such as because of, as a result, let me know if, find out more, and at the same time if not already included and suitable for this draft.';
    supplementalPrompts.push(instructions);
    const extra = await rankVocabulary(sample, { ...config, instructions, supplement: missing }, AbortSignal.timeout(30000));
    terms = reviewed(vocabularyTerms([...terms, ...extra]));
  }
  if (terms.length !== 80) throw new Error('Could not generate 80 distinct relevant entries for ' + id);
  samples[id] = { title: sample.title, document: sample.text, terms, supplementalPrompts };
  console.log(id + ': ' + terms.length + ' terms from ' + config.model);
}
await writeFile('public/demo-vocabulary.json', JSON.stringify({ provider: config.provider, model: config.model, generatedAt: new Date().toISOString(), prompt: VOCABULARY_PROMPT, samples }, null, 2) + '\n');
