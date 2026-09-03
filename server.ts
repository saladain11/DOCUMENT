import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initDb } from './server/db.js';

// Import API routers
import { authRouter } from './server/api/auth.js';
import { dashboardRouter } from './server/api/dashboard.js';
import { studentsRouter } from './server/api/students.js';
import { classesRouter } from './server/api/classes.js';
import { placementsRouter } from './server/api/placements.js';
import { difficultiesRouter } from './server/api/difficulties.js';
import { strengthsRouter } from './server/api/strengths.js';
import { attendanceRouter } from './server/api/attendance.js';
import { holidaysRouter } from './server/api/holidays.js';
import { assignmentsRouter } from './server/api/assignments.js';
import { assessmentsRouter } from './server/api/assessments.js';
import { documentsRouter } from './server/api/documents.js';
import { foldersRouter } from './server/api/folders.js';
import { mediaRouter } from './server/api/media.js';
import { reportsRouter } from './server/api/reports.js';
import { settingsRouter } from './server/api/settings.js';
import { searchRouter } from './server/api/search.js';
import { aiRouter } from './server/api/ai.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  // Initialize SQLite database and seed initial demo data
  await initDb();

  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));
  app.use(cookieParser());

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Mount API modules
  app.use('/api/auth', authRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/students', studentsRouter);
  app.use('/api/classes', classesRouter);
  app.use('/api/placements', placementsRouter);
  app.use('/api/difficulties', difficultiesRouter);
  app.use('/api/strengths', strengthsRouter);
  app.use('/api/attendance', attendanceRouter);
  app.use('/api/holidays', holidaysRouter);
  app.use('/api/assignments', assignmentsRouter);
  app.use('/api/assessments', assessmentsRouter);
  app.use('/api/documents', documentsRouter);
  app.use('/api/folders', foldersRouter);
  app.use('/api/media', mediaRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/ai', aiRouter);

  // Vite middleware in development vs static serving in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`«مساعد الأستاذ» Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
