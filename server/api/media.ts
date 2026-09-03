import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { storage } from '../storage.js';
import { query, queryOne, run } from '../db.js';
import { requireAuth, AuthenticatedRequest, logActivity } from '../auth.js';

export const mediaRouter = Router();

// Ensure media table has extended columns
run(`
  CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    path TEXT NOT NULL,
    url TEXT NOT NULL,
    student_id TEXT,
    title TEXT,
    category TEXT DEFAULT 'أنشطة صفية',
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`).catch(() => {});

// Allowed file types (item 36)
const ALLOWED_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'application/msword', // doc
  'text/plain',
  'text/csv',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'video/mp4'
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم. يسمح برفع صور، PDF، Word، Excel، PowerPoint، CSV'));
    }
  }
});

// GET /api/media - List media items
mediaRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const { studentId, category } = req.query;
  let sql = `
    SELECT m.id, m.filename, m.original_name, m.mime_type as file_type, m.size as file_size,
           m.url as file_path, m.student_id, m.title, m.category, m.notes, m.created_at,
           s.full_name as student_name
    FROM media m
    LEFT JOIN students s ON m.student_id = s.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (studentId) {
    sql += ` AND m.student_id = ?`;
    params.push(studentId);
  }
  if (category) {
    sql += ` AND m.category = ?`;
    params.push(category);
  }
  sql += ` ORDER BY m.created_at DESC`;

  const rows = await query<any>(sql, params);
  return res.json({ media: rows });
});

// POST /api/media/upload
mediaRouter.post('/upload', requireAuth, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم إرسال أي ملف' });
    }

    const { title, category = 'أنشطة صفية', student_id, notes } = req.body;

    const stored = await storage.upload({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    const id = 'med_' + crypto.randomBytes(6).toString('hex');
    await run(
      `INSERT INTO media (id, filename, original_name, mime_type, size, path, url, student_id, title, category, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        id,
        stored.originalName,
        stored.originalName,
        stored.mimeType,
        stored.size,
        stored.path,
        stored.url,
        student_id || null,
        title || stored.originalName,
        category,
        notes || null
      ]
    );

    await logActivity(req.user!.id, 'رفع ملف مرفق', `تم رفع الملف: ${req.file.originalname}`, req);

    return res.json({
      message: 'تم رفع الملف بنجاح',
      id,
      fileName: stored.originalName,
      key: stored.path,
      mimeType: stored.mimeType,
      size: stored.size,
      url: stored.url
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'فشل رفع الملف' });
  }
});

// DELETE /api/media/:id
mediaRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const item = await queryOne<any>(`SELECT * FROM media WHERE id = ?`, [id]);
  if (!item) {
    return res.status(404).json({ error: 'الملف غير موجود' });
  }

  await run(`DELETE FROM media WHERE id = ?`, [id]);
  await logActivity(req.user!.id, 'حذف ملف مرفق', `تم حذف الملف: ${item.title || item.original_name}`, req);
  return res.json({ message: 'تم حذف الملف بنجاح' });
});

// GET /api/media/download/:key - Download or view uploaded file
mediaRouter.get('/download/*', async (req: Request, res: Response) => {
  try {
    const rawPath = req.params[0] || (req.params as any).key;
    const buffer = await storage.get(rawPath);
    if (!buffer) {
      return res.status(404).send('الملف غير موجود');
    }

    // Guess content type from key
    const ext = path.extname(rawPath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv': 'text/csv'
    };

    res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
    return res.send(buffer);
  } catch (e: any) {
    return res.status(500).send('خطأ أثناء قراءة الملف');
  }
});
