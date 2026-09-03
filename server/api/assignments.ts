import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne, run } from '../db.js';
import { requireAuth, AuthenticatedRequest, logActivity } from '../auth.js';

export const assignmentsRouter = Router();

// GET /api/assignments
assignmentsRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const { classId } = req.query;
  let sql = `
    SELECT a.*, c.name as class_name,
      (SELECT count(*) FROM assignment_records ar WHERE ar.assignment_id = a.id AND ar.status = 1) as completed_count,
      (SELECT count(*) FROM assignment_records ar WHERE ar.assignment_id = a.id AND ar.status = 0) as pending_count,
      (SELECT count(*) FROM assignment_records ar WHERE ar.assignment_id = a.id) as total_students
    FROM assignments a
    JOIN classes c ON a.class_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (classId) {
    sql += ` AND a.class_id = ?`;
    params.push(classId);
  }
  sql += ` ORDER BY a.due_date DESC`;

  const list = await query<any>(sql, params);
  const mapped = list.map(item => {
    const rate = item.total_students > 0 ? Math.round((item.completed_count / item.total_students) * 100) : 0;
    return {
      ...item,
      completion_rate: rate
    };
  });

  return res.json(mapped);
});

// GET /api/assignments/:id - Assignment details with student completion table
assignmentsRouter.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const assignment = await queryOne<any>(
    `SELECT a.*, c.name as class_name FROM assignments a JOIN classes c ON a.class_id = c.id WHERE a.id = ?`,
    [id]
  );
  if (!assignment) {
    return res.status(404).json({ error: 'الواجب غير موجود' });
  }

  // Get all students in this class and their status
  const students = await query<any>(
    `SELECT s.id as student_id, s.full_name, s.massar_code, g.name as group_name,
      COALESCE(ar.status, 0) as status, ar.notes
     FROM students s
     LEFT JOIN groups g ON s.group_id = g.id
     LEFT JOIN assignment_records ar ON ar.student_id = s.id AND ar.assignment_id = ?
     WHERE s.class_id = ?
     ORDER BY s.full_name ASC`,
    [id, assignment.class_id]
  );

  let completed = 0;
  let missing = 0;
  for (const s of students) {
    if (s.status === 1) completed++;
    else missing++;
  }
  const rate = students.length > 0 ? Math.round((completed / students.length) * 100) : 0;

  return res.json({
    assignment,
    students,
    stats: {
      total: students.length,
      completed,
      missing,
      rate
    }
  });
});

// POST /api/assignments - Add new assignment
assignmentsRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { class_id, title, subject, description, assigned_date, due_date } = req.body;
  if (!class_id || !title || !subject || !due_date) {
    return res.status(400).json({ error: 'القسم والعنوان والمادة وتاريخ الاستحقاق حقول إجبارية' });
  }

  const assignmentId = 'asg_' + crypto.randomBytes(6).toString('hex');
  const assigned = assigned_date || new Date().toISOString().split('T')[0];

  await run(
    `INSERT INTO assignments (id, class_id, title, subject, description, assigned_date, due_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [assignmentId, class_id, title.trim(), subject.trim(), description || null, assigned, due_date]
  );

  // Initialize records for all students in class (default 0)
  const students = await query<any>(`SELECT id FROM students WHERE class_id = ?`, [class_id]);
  for (const s of students) {
    const rid = `rec_${assignmentId}_${s.id}`;
    await run(
      `INSERT INTO assignment_records (id, assignment_id, student_id, status) VALUES (?, ?, ?, 0)`,
      [rid, assignmentId, s.id]
    );
  }

  await logActivity(req.user!.id, 'إضافة واجب منزلي', `تم تكليف القسم بواجب: ${title}`, req);

  return res.status(201).json({ message: 'تم إنشاء الواجب وتكليف المتعلمين به بنجاح', assignmentId });
});

// POST /api/assignments/:id/batch-status - Update students completion status
assignmentsRouter.post('/:id/batch-status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { records } = req.body; // Array<{ student_id: string, status: number, notes?: string }>

  if (!Array.isArray(records)) {
    return res.status(400).json({ error: 'بيانات غير صالحة' });
  }

  for (const r of records) {
    const rid = `rec_${id}_${r.student_id}`;
    await run(
      `INSERT INTO assignment_records (id, assignment_id, student_id, status, notes)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(assignment_id, student_id) DO UPDATE SET status = excluded.status, notes = excluded.notes`,
      [rid, id, r.student_id, r.status ? 1 : 0, r.notes || null]
    );
  }

  return res.json({ message: 'تم تحديث وضعية إنجاز الواجبات بنجاح' });
});

// DELETE /api/assignments/:id
assignmentsRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  await run(`DELETE FROM assignments WHERE id = ?`, [id]);
  return res.json({ message: 'تم حذف الواجب بنجاح' });
});
