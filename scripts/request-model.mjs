// A modeled comparison, not production telemetry. One active editor, no switches.
const minutes = 10, wordsPerMinute = 50, charactersPerWord = 5, refreshSeconds = 45;
const perCharacterRequests = minutes * wordsPerMinute * charactersPerWord;
// Includes an initial request and the fastest permitted refresh cadence.
const maximumBackgroundRequests = Math.ceil(minutes * 60 / refreshSeconds);
console.log(JSON.stringify({ minutes, wordsPerMinute, charactersPerWord, refreshSeconds,
  perCharacterRequests, maximumBackgroundRequests,
  reductionPercent: +(100 * (1 - maximumBackgroundRequests / perCharacterRequests)).toFixed(2)
}, null, 2));
