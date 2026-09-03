import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne, run } from '../db.js';
import { requireAuth, AuthenticatedRequest, logActivity } from '../auth.js';

export const assessmentsRouter = Router();

// GET /api/assessments
assessmentsRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const { classId, studentId, subject } = req.query;

  let sql = `
    SELECT asm.*, s.full_name as student_name, s.massar_code, c.name as class_name
    FROM assessments asm
    JOIN students s ON asm.student_id = s.id
    JOIN classes c ON asm.class_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (classId) {
    sql += ` AND asm.class_id = ?`;
    params.push(classId);
  }
  if (studentId) {
    sql += ` AND asm.student_id = ?`;
    params.push(studentId);
  }
  if (subject) {
    sql += ` AND asm.subject = ?`;
    params.push(subject);
  }

  sql += ` ORDER BY asm.date DESC, s.full_name ASC`;
  const list = await query<any>(sql, params);
  return res.json(list);
});

// POST /api/assessments - Add assessment
assessmentsRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { class_id, student_id, subject, domain, evaluation_type, score, max_score, date, notes } = req.body;
  if (!class_id || !student_id || !subject || !evaluation_type || score === undefined || !date) {
    return res.status(400).json({ error: 'القسم والمتعلم والمادة ونوع التقويم والنقطة والتاريخ حقول إجبارية' });
  }

  const id = 'asm_' + crypto.randomBytes(6).toString('hex');
  await run(
    `INSERT INTO assessments (id, class_id, student_id, subject, domain, evaluation_type, score, max_score, date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      class_id,
      student_id,
      subject.trim(),
      domain || null,
      evaluation_type.trim(),
      parseFloat(score),
      parseFloat(max_score) || 10.0,
      date,
      notes || null
    ]
  );

  await logActivity(req.user!.id, 'تسجيل تقويم', `تم رصد نقطة ${score}/${max_score || 10} في مادة ${subject}`, req);

  return res.status(201).json({ message: 'تم حفظ التقويم بنجاح', id });
});

// DELETE /api/assessments/:id
assessmentsRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  await run(`DELETE FROM assessments WHERE id = ?`, [id]);
  return res.json({ message: 'تم الحذف بنجاح' });
});
