import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne, run } from '../db.js';
import { requireAuth, AuthenticatedRequest, logActivity } from '../auth.js';

export const documentsRouter = Router();

// HTML Sanitizer to prevent script, inline event handlers, and javascript: links (item 31)
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^>]*>(.*?)<\/iframe>/gi, (match) => {
      // Allow only safe video embeds (youtube, vimeo)
      if (match.includes('youtube.com') || match.includes('youtu.be') || match.includes('vimeo.com')) {
        return match.replace(/on\w+="[^"]*"/gi, '');
      }
      return '';
    })
    .replace(/\son\w+="[^"]*"/gi, '') // Remove onmouseover, onclick, onerror, etc.
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:[^"']*/gi, '#');
}

// GET /api/documents/categories - List pedagogical categories
documentsRouter.get('/categories', requireAuth, async (req: Request, res: Response) => {
  const categories = await query<any>(
    `SELECT dc.*, (SELECT count(*) FROM documents d WHERE d.category_id = dc.id AND d.is_draft = 0) as docs_count
     FROM document_categories dc
     ORDER BY dc.created_at ASC`
  );
  return res.json(categories);
});

// GET /api/documents - List documents with filters (section, categoryId, folderId, favorite, search)
documentsRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const { categoryId, section, folderId, isFavorite, search, studentId } = req.query;

  let sql = `
    SELECT d.*, dc.name as category_name, dc.section as category_section, f.name as folder_name,
      (SELECT count(*) FROM document_versions dv WHERE dv.document_id = d.id) as versions_count
    FROM documents d
    LEFT JOIN document_categories dc ON d.category_id = dc.id
    LEFT JOIN folders f ON d.folder_id = f.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (categoryId) {
    sql += ` AND d.category_id = ?`;
    params.push(categoryId);
  }
  if (section) {
    sql += ` AND dc.section = ?`;
    params.push(section);
  }
  if (folderId) {
    sql += ` AND d.folder_id = ?`;
    params.push(folderId);
  }
  if (isFavorite === 'true' || isFavorite === '1') {
    sql += ` AND d.is_favorite = 1`;
  }
  if (search) {
    const q = `%${(search as string).trim()}%`;
    sql += ` AND (d.title LIKE ? OR d.tags LIKE ? OR d.content_html LIKE ?)`;
    params.push(q, q, q);
  }
  if (studentId) {
    sql += ` AND d.id IN (SELECT document_id FROM student_documents WHERE student_id = ?)`;
    params.push(studentId);
  }

  sql += ` ORDER BY d.updated_at DESC`;
  const list = await query<any>(sql, params);
  return res.json(list);
});

// GET /api/documents/:id - Single document with versions and linked students
documentsRouter.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const doc = await queryOne<any>(
    `SELECT d.*, dc.name as category_name, dc.section as category_section, f.name as folder_name
     FROM documents d
     LEFT JOIN document_categories dc ON d.category_id = dc.id
     LEFT JOIN folders f ON d.folder_id = f.id
     WHERE d.id = ?`,
    [id]
  );
  if (!doc) {
    return res.status(404).json({ error: 'الوثيقة غير موجودة' });
  }

  const versions = await query<any>(
    `SELECT id, version_num, title, created_at FROM document_versions WHERE document_id = ? ORDER BY version_num DESC`,
    [id]
  );

  const linkedStudents = await query<any>(
    `SELECT sd.relation_type, s.id as student_id, s.full_name, s.massar_code, c.name as class_name
     FROM student_documents sd
     JOIN students s ON sd.student_id = s.id
     JOIN classes c ON s.class_id = c.id
     WHERE sd.document_id = ?`,
    [id]
  );

  return res.json({
    document: doc,
    versions,
    linkedStudents
  });
});

// POST /api/documents - Create new document
documentsRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { title, content_html, category_id, folder_id, is_favorite, is_draft, tags, student_id, relation_type } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'عنوان الوثيقة إجباري' });
  }

  const docId = 'doc_' + crypto.randomBytes(8).toString('hex');
  const sanitized = sanitizeHtml(content_html || '');
  const now = new Date().toISOString();

  await run(
    `INSERT INTO documents (id, category_id, folder_id, title, content_html, is_favorite, is_draft, tags, version, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      docId,
      category_id || null,
      folder_id || null,
      title.trim(),
      sanitized,
      is_favorite ? 1 : 0,
      is_draft ? 1 : 0,
      tags || null,
      now,
      now
    ]
  );

  // Version 1
  const verId = 'ver_' + crypto.randomBytes(8).toString('hex');
  await run(
    `INSERT INTO document_versions (id, document_id, version_num, title, content_html, created_at)
     VALUES (?, ?, 1, ?, ?, ?)`,
    [verId, docId, title.trim(), sanitized, now]
  );

  // Link to student if requested
  if (student_id) {
    const sdocId = 'sdoc_' + crypto.randomBytes(6).toString('hex');
    await run(
      `INSERT INTO student_documents (id, student_id, document_id, relation_type) VALUES (?, ?, ?, ?)`,
      [sdocId, student_id, docId, relation_type || 'دراسة حالة']
    );
  }

  await logActivity(req.user!.id, 'إنشاء وثيقة تربوية', `تم إنشاء الوثيقة: ${title}`, req);

  return res.status(201).json({ message: 'تم حفظ الوثيقة بنجاح', docId });
});

// PUT /api/documents/:id - Update document (creates new version)
documentsRouter.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { title, content_html, category_id, folder_id, is_favorite, is_draft, tags, createNewVersion } = req.body;

  const current = await queryOne<any>(`SELECT * FROM documents WHERE id = ?`, [id]);
  if (!current) {
    return res.status(404).json({ error: 'الوثيقة غير موجودة' });
  }

  const sanitized = content_html !== undefined ? sanitizeHtml(content_html) : current.content_html;
  const now = new Date().toISOString();
  let nextVersion = current.version;

  if (createNewVersion || sanitized !== current.content_html || title !== current.title) {
    nextVersion = current.version + 1;
    const verId = 'ver_' + crypto.randomBytes(8).toString('hex');
    await run(
      `INSERT INTO document_versions (id, document_id, version_num, title, content_html, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [verId, id, nextVersion, title || current.title, sanitized, now]
    );
  }

  await run(
    `UPDATE documents SET
      title = COALESCE(?, title),
      content_html = ?,
      category_id = COALESCE(?, category_id),
      folder_id = COALESCE(?, folder_id),
      is_favorite = COALESCE(?, is_favorite),
      is_draft = COALESCE(?, is_draft),
      tags = COALESCE(?, tags),
      version = ?,
      updated_at = ?
     WHERE id = ?`,
    [
      title || null,
      sanitized,
      category_id || null,
      folder_id || null,
      is_favorite !== undefined ? (is_favorite ? 1 : 0) : null,
      is_draft !== undefined ? (is_draft ? 1 : 0) : null,
      tags || null,
      nextVersion,
      now,
      id
    ]
  );

  await logActivity(req.user!.id, 'تعديل وثيقة', `تم تحديث الوثيقة: ${title || current.title} (إصدار ${nextVersion})`, req);

  return res.json({ message: 'تم حفظ التعديلات بنجاح', version: nextVersion });
});

// POST /api/documents/:id/favorite - Toggle favorite
documentsRouter.post('/:id/favorite', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const current = await queryOne<any>(`SELECT is_favorite FROM documents WHERE id = ?`, [id]);
  if (!current) return res.status(404).json({ error: 'غير موجود' });

  const newVal = current.is_favorite ? 0 : 1;
  await run(`UPDATE documents SET is_favorite = ? WHERE id = ?`, [newVal, id]);

  return res.json({ is_favorite: newVal });
});

// POST /api/documents/:id/link-student - Link document to student
documentsRouter.post('/:id/link-student', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { student_id, relation_type } = req.body;
  if (!student_id) return res.status(400).json({ error: 'المتعلم إجباري' });

  const sdocId = 'sdoc_' + crypto.randomBytes(6).toString('hex');
  await run(
    `INSERT OR REPLACE INTO student_documents (id, student_id, document_id, relation_type) VALUES (?, ?, ?, ?)`,
    [sdocId, student_id, id, relation_type || 'دراسة حالة']
  );

  return res.json({ message: 'تم ربط الوثيقة بملف المتعلم بنجاح' });
});

// DELETE /api/documents/:id
documentsRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const doc = await queryOne<any>(`SELECT title FROM documents WHERE id = ?`, [id]);
  await run(`DELETE FROM documents WHERE id = ?`, [id]);
  if (doc) {
    await logActivity(req.user!.id, 'حذف وثيقة', `تم حذف الوثيقة: ${doc.title}`, req);
  }
  return res.json({ message: 'تم حذف الوثيقة بنجاح' });
});
