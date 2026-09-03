import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne, run } from '../db.js';
import { requireAuth, AuthenticatedRequest, logActivity } from '../auth.js';

export const foldersRouter = Router();

// GET /api/folders
foldersRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const folders = await query<any>(
    `SELECT f.*,
      (SELECT count(*) FROM documents d WHERE d.folder_id = f.id) as docs_count,
      (SELECT count(*) FROM folders sub WHERE sub.parent_id = f.id) as subfolders_count
     FROM folders f
     ORDER BY f.created_at ASC`
  );
  return res.json(folders);
});

// POST /api/folders
foldersRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { name, parent_id } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم المجلد إجباري' });

  const id = 'fld_' + crypto.randomBytes(6).toString('hex');
  await run(`INSERT INTO folders (id, name, parent_id) VALUES (?, ?, ?)`, [id, name.trim(), parent_id || null]);

  await logActivity(req.user!.id, 'إنشاء مجلد', `تم إنشاء مجلد: ${name}`, req);

  return res.status(201).json({ message: 'تم إنشاء المجلد بنجاح', id });
});

// DELETE /api/folders/:id
foldersRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  await run(`DELETE FROM folders WHERE id = ?`, [id]);
  return res.json({ message: 'تم حذف المجلد بنجاح' });
});
