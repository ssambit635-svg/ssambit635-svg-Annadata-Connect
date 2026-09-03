import config from './config.js';
import { createApp } from './app.js';

const app = createApp();

app.listen(config.port, '0.0.0.0', () => {
  console.log(`Annadata Connect API listening on http://0.0.0.0:${config.port} (${config.env})`);
});
