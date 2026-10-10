import { mkdirSync } from 'node:fs';
import { createApp } from './app.mjs';
import { serverConfig } from './config.mjs';
const config = serverConfig();
mkdirSync(config.dataDir, { recursive: true });
const server = createApp(config);
server.listen(config.port, config.host, () => console.log('Typer.AI server started. Cloud ranking ' + (config.apiKey ? 'configured.' : 'disabled.')));
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  console.log('Typer.AI server stopping. Finishing active requests.');
  // Provider attempts have a 30-second deadline. Allow them to finish first.
  const deadline = setTimeout(() => server.closeAllConnections(), 35000);
  deadline.unref();
  server.close(() => clearTimeout(deadline));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
