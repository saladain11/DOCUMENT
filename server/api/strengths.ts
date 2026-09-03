import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, run } from '../db.js';
import { requireAuth, AuthenticatedRequest, logActivity } from '../auth.js';

export const strengthsRouter = Router();

// GET /api/strengths
strengthsRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const { studentId, classId, domain } = req.query;

  let sql = `
    SELECT ss.*, s.full_name as student_name, s.massar_code, c.name as class_name
    FROM student_strengths ss
    JOIN students s ON ss.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (studentId) {
    sql += ` AND ss.student_id = ?`;
    params.push(studentId);
  }
  if (classId) {
    sql += ` AND s.class_id = ?`;
    params.push(classId);
  }
  if (domain) {
    sql += ` AND ss.domain = ?`;
    params.push(domain);
  }

  sql += ` ORDER BY ss.date DESC, s.full_name ASC`;
  const results = await query<any>(sql, params);
  return res.json(results);
});

// POST /api/strengths
strengthsRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { student_id, domain, description, date } = req.body;
  if (!student_id || !domain || !description || !date) {
    return res.status(400).json({ error: 'المتعلم والمجال والوصف والتاريخ حقول إجبارية' });
  }

  const id = 'str_' + crypto.randomBytes(8).toString('hex');
  await run(
    `INSERT INTO student_strengths (id, student_id, domain, description, date) VALUES (?, ?, ?, ?, ?)`,
    [id, student_id, domain, description.trim(), date]
  );

  await logActivity(req.user!.id, 'تسجيل نقطة قوة', `تم تسجيل نقطة قوة في (${domain}) لمتعلم`, req);

  return res.status(201).json({ message: 'تم حفظ نقطة القوة بنجاح', id });
});

// DELETE /api/strengths/:id
strengthsRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  await run(`DELETE FROM student_strengths WHERE id = ?`, [id]);
  return res.json({ message: 'تم حذف نقطة القوة بنجاح' });
});
