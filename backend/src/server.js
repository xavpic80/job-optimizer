import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.routes.js';
import jobsRoutes from './routes/jobs.routes.js';
import applicationsRoutes from './routes/applications.routes.js';
import communicationsRoutes from './routes/communications.routes.js';
import transcriptsRoutes from './routes/transcripts.routes.js';
import cvRoutes from './routes/cv.routes.js';
import exportRoutes from './routes/export.routes.js';
import assetsRoutes from './routes/assets.routes.js';

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL ?? '*', credentials: true }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/communications', communicationsRoutes);
app.use('/api/transcripts', transcriptsRoutes);
app.use('/api/cv', cvRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/assets', assetsRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Local dev only — Vercel uses the exported app
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT ?? 3001;
  app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
}

export default app;
