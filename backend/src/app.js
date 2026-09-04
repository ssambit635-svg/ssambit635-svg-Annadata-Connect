import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import config from './config.js';
import { seed } from './db/store.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import authRoutes from './routes/auth.routes.js';
import referenceRoutes from './routes/reference.routes.js';
import farmerRoutes from './routes/farmer.routes.js';
import centreRoutes from './routes/centre.routes.js';
import requestRoutes from './routes/request.routes.js';
import sellingRoutes from './routes/selling.routes.js';
import officerRoutes from './routes/officer.routes.js';
import authorityRoutes from './routes/authority.routes.js';
import notificationRoutes from './routes/notification.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  if (config.seedOnBoot) seed();

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

  // CORS: restrict to CORS_ORIGIN when configured; otherwise allow (dev convenience).
  if (config.corsOrigin) {
    app.use(cors({ origin: config.corsOrigin.split(','), credentials: false }));
  } else {
    app.use(cors());
  }

  app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'annadata-connect-api', time: new Date().toISOString() }));

  app.use('/api/auth', authRoutes);
  app.use('/api/reference', referenceRoutes);
  app.use('/api/farmers', farmerRoutes);
  app.use('/api/centres', centreRoutes);
  app.use('/api/requests', requestRoutes);
  app.use('/api/selling', sellingRoutes);
  app.use('/api/officer', officerRoutes);
  app.use('/api/authority', authorityRoutes);
  app.use('/api/notifications', notificationRoutes);

  app.use('/api', notFoundHandler);

  // Production: serve the built frontend as a single-port deployment.
 const distDir = path.resolve(__dirname, '../../frontend/dist');
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));
  } else {
    app.get('/', (req, res) =>
      res.json({ service: 'annadata-connect-api', hint: 'Frontend build not found. Run `npm run build` in ../frontend.' })
    );
  }

  app.use(errorHandler);
  return app;
}
