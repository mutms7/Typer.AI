import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), { Engine } = require('../extension/engine.js');
const corpus = ('A vector represents a displacement. A transformation on x maps coordinates. Vector addition combines vectors. ' + 'The basis spans the vector space. ').repeat(200).slice(0, 30000);
const start = performance.now(), engine = new Engine().index(corpus, 'Vectors and transformations');
const indexMs = performance.now() - start, timings = [];
for (let i = 0; i < 10000; i++) { const t = performance.now(); engine.predict(i % 2 ? 'A v' : 'This is a tr', .82); timings.push(performance.now() - t); }
timings.sort((a, b) => a - b);
console.log(JSON.stringify({ documentCharacters: corpus.length, vocabularySize: engine.size, samples: timings.length, indexMs: +indexMs.toFixed(3), lookupP50Ms: +timings[5000].toFixed(4), lookupP95Ms: +timings[9500].toFixed(4), lookupP99Ms: +timings[9900].toFixed(4) }, null, 2));
