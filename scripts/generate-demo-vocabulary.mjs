import { readFile, writeFile } from 'node:fs/promises';
import '../public/demo-samples.js';
import { providerConfig, rankVocabulary, vocabularyTerms, VOCABULARY_PROMPT } from '../server/provider.mjs';
const config = providerConfig();
if (!config.apiKey) throw new Error('Configure GEMINI_API_KEY or OPENAI_API_KEY in the ignored .env first.');
const samples = {};
async function request(sample, options = config) {
  try { return await rankVocabulary(sample, options, AbortSignal.timeout(30000)); }
  catch (error) {
    if (error.status !== 503) throw error;
    console.log('Provider temporarily busy, retrying once.');
    return rankVocabulary(sample, options, AbortSignal.timeout(30000));
  }
}
// Explicit review exclusions for the public fixtures, not a private document filter.
const rejected = new Set(['opp', 'tr', 'far please', 'week so', 'process and', 'out more', 'well as', 'we are', 'i am', 'i have', 'can not', 'jamie', 'typical score turns', 'overall performance shown', 'scores an', 'others the', 'order the median']);
const reviewed = terms => terms.filter(term => !rejected.has(term.toLocaleLowerCase('en-US')));
const previous = process.argv.includes('--refine-cache') ? JSON.parse(await readFile('public/demo-vocabulary.json', 'utf8')).samples : {};
for (const [id, sample] of Object.entries(globalThis.TyperSamples)) {
  let terms = previous[id]?.document === sample.text ? previous[id].terms : await request(sample);
  terms = reviewed(vocabularyTerms(terms));
  if (!terms.length) throw new Error('Provider returned no usable terms for ' + id);
  const supplementalPrompts = previous[id]?.supplementalPrompts || [];
  for (let attempt = 0; terms.length < 80 && attempt < 3; attempt++) {
    const missing = 80 - terms.length;
    const instructions = VOCABULARY_PROMPT + '\nSupplement: return ONLY ' + missing + ' new natural connective or sentence-building PHRASES of 2 to 5 words in the terms-array schema. Prefer useful explanations or calculations for notes, polite questions or next-step wording for the email. Generic phrases still must fit the purpose of this draft. Do not return standalone words, proper names, dangling fragments, or repetitive verb swaps. The existing cache below is already retained; exclude exact matches and avoid near-duplicate fragments. Rejected entries are invalid.\nExisting: ' + JSON.stringify(terms) + '\nRejected: ' + JSON.stringify([...rejected]);
    supplementalPrompts.push(instructions);
    const extra = await request(sample, { ...config, instructions, supplement: missing });
    terms = reviewed(vocabularyTerms([...terms, ...extra]));
  }
  if (terms.length !== 80) throw new Error('Could not generate 80 distinct relevant entries for ' + id);
  samples[id] = { title: sample.title, document: sample.text, terms, supplementalPrompts };
  console.log(id + ': ' + terms.length + ' terms from ' + config.model);
}
await writeFile('public/demo-vocabulary.json', JSON.stringify({ provider: config.provider, model: config.model, generatedAt: new Date().toISOString(), prompt: VOCABULARY_PROMPT, samples }, null, 2) + '\n');
