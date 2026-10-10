import { writeFile } from 'node:fs/promises';
import '../public/demo-samples.js';
import { providerConfig, rankVocabulary, VOCABULARY_PROMPT } from '../server/provider.mjs';
const config = providerConfig();
if (!config.apiKey) throw new Error('Configure GEMINI_API_KEY or OPENAI_API_KEY in the ignored .env first.');
const samples = {};
for (const [id, sample] of Object.entries(globalThis.TyperSamples)) {
  const terms = await rankVocabulary(sample, config, AbortSignal.timeout(30000));
  if (!terms.length) throw new Error('Provider returned no usable terms for ' + id);
  samples[id] = { title: sample.title, document: sample.text, terms };
  console.log(id + ': ' + terms.length + ' terms from ' + config.model);
}
await writeFile('public/demo-vocabulary.json', JSON.stringify({ provider: config.provider, model: config.model, generatedAt: new Date().toISOString(), prompt: VOCABULARY_PROMPT, samples }, null, 2) + '\n');
