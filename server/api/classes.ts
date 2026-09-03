import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne, run } from '../db.js';
import { requireAuth, AuthenticatedRequest, logActivity } from '../auth.js';

export const classesRouter = Router();

// GET /api/classes
classesRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const { academicYearId, includeArchived } = req.query;

  let sql = `
    SELECT c.*, ay.name as academic_year_name,
      (SELECT count(*) FROM students s WHERE s.class_id = c.id) as students_count,
      (SELECT count(*) FROM groups g WHERE g.class_id = c.id) as groups_count
    FROM classes c
    JOIN academic_years ay ON c.academic_year_id = ay.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (academicYearId) {
    sql += ` AND c.academic_year_id = ?`;
    params.push(academicYearId);
  }
  if (!includeArchived) {
    sql += ` AND c.is_archived = 0`;
  }

  sql += ` ORDER BY c.created_at ASC`;
  const classes = await query<any>(sql, params);

  // Fetch groups for each class
  const classIds = classes.map(c => c.id);
  let groups: any[] = [];
  if (classIds.length > 0) {
    const placeholders = classIds.map(() => '?').join(',');
    groups = await query<any>(
      `SELECT g.*, (SELECT count(*) FROM students s WHERE s.group_id = g.id) as student_count
       FROM groups g WHERE g.class_id IN (${placeholders})`,
      classIds
    );
  }

  const result = classes.map(c => ({
    ...c,
    groups: groups.filter(g => g.class_id === c.id)
  }));

  return res.json(result);
});

// POST /api/classes
classesRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { academic_year_id, name, level, code, subject, room, notes, groups } = req.body;
  if (!name || !level) {
    return res.status(400).json({ error: 'اسم القسم والمستوى حقول إجبارية' });
  }

  let yearId = academic_year_id;
  if (!yearId) {
    const curYear = await queryOne<any>(`SELECT id FROM academic_years WHERE is_current = 1 LIMIT 1`);
    yearId = curYear ? curYear.id : 'year_2026_2027';
  }

  const classId = 'cls_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  await run(
    `INSERT INTO classes (id, academic_year_id, name, level, code, subject, room, notes, is_archived, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [classId, yearId, name.trim(), level.trim(), code || null, subject || null, room || null, notes || null, now]
  );

  // Add groups if provided
  if (Array.isArray(groups)) {
    for (const g of groups) {
      if (g.name && g.name.trim()) {
        const gid = 'grp_' + crypto.randomBytes(6).toString('hex');
        await run(`INSERT INTO groups (id, class_id, name, description) VALUES (?, ?, ?, ?)`,
          [gid, classId, g.name.trim(), g.description || null]);
      }
    }
  }

  await logActivity(req.user!.id, 'إضافة قسم جديد', `تم إنشاء القسم: ${name}`, req);

  return res.status(201).json({ message: 'تم إنشاء القسم بنجاح', classId });
});

// PUT /api/classes/:id
classesRouter.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, level, code, subject, room, notes, is_archived } = req.body;

  await run(
    `UPDATE classes SET
      name = COALESCE(?, name),
      level = COALESCE(?, level),
      code = COALESCE(?, code),
      subject = COALESCE(?, subject),
      room = COALESCE(?, room),
      notes = COALESCE(?, notes),
      is_archived = COALESCE(?, is_archived)
     WHERE id = ?`,
    [name, level, code, subject, room, notes, is_archived, id]
  );

  await logActivity(req.user!.id, 'تعديل قسم', `تم تعديل القسم: ${name || id}`, req);

  return res.json({ message: 'تم تحديث بيانات القسم بنجاح' });
});

// DELETE /api/classes/:id
classesRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  
  // Check if students exist in this class
  const stdCountRow = await queryOne<{ count: number }>(`SELECT count(*) as count FROM students WHERE class_id = ?`, [id]);
  if (stdCountRow && stdCountRow.count > 0) {
    return res.status(400).json({ error: `لا يمكن حذف هذا القسم لاحتوائه على ${stdCountRow.count} متعلم(ة). يمكنك أرشفته بدلاً من ذلك.` });
  }

  await run(`DELETE FROM classes WHERE id = ?`, [id]);
  await logActivity(req.user!.id, 'حذف قسم', `تم حذف القسم: ${id}`, req);

  return res.json({ message: 'تم حذف القسم بنجاح' });
});

// POST /api/classes/:id/groups - Add group to class
classesRouter.post('/:id/groups', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم الفوج إجباري' });

  const gid = 'grp_' + crypto.randomBytes(6).toString('hex');
  await run(`INSERT INTO groups (id, class_id, name, description) VALUES (?, ?, ?, ?)`,
    [gid, id, name.trim(), description || null]);

  return res.status(201).json({ message: 'تمت إضافة الفوج بنجاح', id: gid });
});
