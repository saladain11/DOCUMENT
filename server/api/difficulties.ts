import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne, run } from '../db.js';
import { requireAuth, AuthenticatedRequest, logActivity } from '../auth.js';

export const difficultiesRouter = Router();

// GET /api/difficulties/categories
difficultiesRouter.get('/categories', requireAuth, async (req: Request, res: Response) => {
  const cats = await query<any>(`SELECT * FROM difficulty_categories ORDER BY is_default DESC, name ASC`);
  return res.json(cats);
});

// GET /api/difficulties - List with filters
difficultiesRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const { studentId, classId, category, severity, status } = req.query;

  let sql = `
    SELECT sd.*, s.full_name as student_name, s.massar_code, c.name as class_name
    FROM student_difficulties sd
    JOIN students s ON sd.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (studentId) {
    sql += ` AND sd.student_id = ?`;
    params.push(studentId);
  }
  if (classId) {
    sql += ` AND s.class_id = ?`;
    params.push(classId);
  }
  if (category) {
    sql += ` AND sd.category = ?`;
    params.push(category);
  }
  if (severity) {
    sql += ` AND sd.severity = ?`;
    params.push(severity);
  }
  if (status) {
    sql += ` AND sd.status = ?`;
    params.push(status);
  }

  sql += ` ORDER BY sd.date DESC, s.full_name ASC`;
  const results = await query<any>(sql, params);
  return res.json(results);
});

// POST /api/difficulties - Add difficulty
difficultiesRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { student_id, category, severity, date, notes, support_action, status } = req.body;
  if (!student_id || !category || !severity || !date) {
    return res.status(400).json({ error: 'المتعلم والتصنيف والدرجة والتاريخ حقول إجبارية' });
  }

  const id = 'diff_' + crypto.randomBytes(8).toString('hex');
  const now = new Date().toISOString();

  await run(
    `INSERT INTO student_difficulties (id, student_id, category, severity, date, notes, support_action, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, student_id, category, severity, date, notes || null, support_action || null, status || 'جديدة', now, now]
  );

  await logActivity(req.user!.id, 'تسجيل صعوبة تعلم', `تم تسجيل صعوبة (${category} - ${severity}) لمتعلم`, req);

  return res.status(201).json({ message: 'تم حفظ الصعوبة بنجاح', id });
});

// PUT /api/difficulties/:id - Update status / action
difficultiesRouter.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { severity, notes, support_action, status } = req.body;

  const now = new Date().toISOString();
  await run(
    `UPDATE student_difficulties SET
      severity = COALESCE(?, severity),
      notes = COALESCE(?, notes),
      support_action = COALESCE(?, support_action),
      status = COALESCE(?, status),
      updated_at = ?
     WHERE id = ?`,
    [severity, notes, support_action, status, now, id]
  );

  await logActivity(req.user!.id, 'تحديث صعوبة تعلم', `تم تحديث حالة الصعوبة إلى: ${status || severity}`, req);

  return res.json({ message: 'تم تحديث الصعوبة بنجاح' });
});

// POST /api/difficulties/collective-matrix - Batch save difficulty matrix
// Input: { class_id: string, date: string, entries: Array<{ student_id: string, category: string, severity: string }> }
difficultiesRouter.post('/collective-matrix', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { date, entries } = req.body;
  if (!date || !Array.isArray(entries)) {
    return res.status(400).json({ error: 'بيانات غير صالحة' });
  }

  let count = 0;
  const now = new Date().toISOString();

  for (const entry of entries) {
    if (!entry.severity || entry.severity === 'لا توجد') continue;
    const id = 'diff_' + crypto.randomBytes(8).toString('hex');
    await run(
      `INSERT INTO student_difficulties (id, student_id, category, severity, date, notes, support_action, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'رصد جماعي سريع', 'تخصيص أنشطة دعم موجهة', 'جديدة', ?, ?)`,
      [id, entry.student_id, entry.category, entry.severity, date, now, now]
    );
    count++;
  }

  await logActivity(req.user!.id, 'رصد جماعي للصعوبات', `تم رصد وحفظ ${count} صعوبة تعليمية`, req);

  return res.json({ message: `تم حفظ ${count} حالة بنجاح`, count });
});

// DELETE /api/difficulties/:id
difficultiesRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  await run(`DELETE FROM student_difficulties WHERE id = ?`, [id]);
  return res.json({ message: 'تم الحذف بنجاح' });
});
