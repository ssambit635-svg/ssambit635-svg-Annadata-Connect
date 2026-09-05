import config from './config.js';
import { createApp } from './app.js';

// Keep the server alive no matter what: log unexpected errors instead of
// crashing (a crashed API is the #1 cause of "the app won't open").
process.on('unhandledRejection', (reason) => {
  console.error('[annadata-connect] unhandled rejection:', reason instanceof Error ? reason.stack : reason);
});
process.on('uncaughtException', (err) => {
  console.error('[annadata-connect] uncaught exception:', err?.stack || err);
});

const app = createApp();

const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`Annadata Connect API listening on http://0.0.0.0:${config.port} (${config.env})`);
});

// Graceful shutdown: stop accepting new connections, let in-flight requests
// finish, then exit cleanly (container orchestrators send SIGTERM).
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`[annadata-connect] ${signal} received — shutting down gracefully…`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 10_000).unref();
  });
}
