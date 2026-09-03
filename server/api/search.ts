import { Router, Request, Response } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth.js';

export const searchRouter = Router();

// GET /api/search?q=...
searchRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const qStr = ((req.query.q as string) || '').trim();
  if (!qStr || qStr.length < 2) {
    return res.json({ students: [], documents: [], classes: [], difficulties: [], assignments: [] });
  }

  const wild = `%${qStr}%`;

  // 1. Students
  const students = await query<any>(
    `SELECT s.id, s.full_name, s.massar_code, c.name as class_name
     FROM students s
     JOIN classes c ON s.class_id = c.id
     WHERE s.full_name LIKE ? OR s.massar_code LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ?
     LIMIT 5`,
    [wild, wild, wild, wild]
  );

  // 2. Documents
  const documents = await query<any>(
    `SELECT d.id, d.title, d.tags, dc.name as category_name
     FROM documents d
     LEFT JOIN document_categories dc ON d.category_id = dc.id
     WHERE d.title LIKE ? OR d.tags LIKE ?
     LIMIT 5`,
    [wild, wild]
  );

  // 3. Classes
  const classes = await query<any>(
    `SELECT c.id, c.name, c.level, c.code
     FROM classes c
     WHERE c.name LIKE ? OR c.level LIKE ? OR c.code LIKE ?
     LIMIT 5`,
    [wild, wild, wild]
  );

  // 4. Difficulties
  const difficulties = await query<any>(
    `SELECT sd.id, sd.category, sd.severity, sd.student_id, s.full_name as student_name
     FROM student_difficulties sd
     JOIN students s ON sd.student_id = s.id
     WHERE sd.category LIKE ? OR sd.notes LIKE ? OR sd.support_action LIKE ?
     LIMIT 5`,
    [wild, wild, wild]
  );

  // 5. Assignments
  const assignments = await query<any>(
    `SELECT a.id, a.title, a.subject, a.due_date, c.name as class_name
     FROM assignments a
     JOIN classes c ON a.class_id = c.id
     WHERE a.title LIKE ? OR a.subject LIKE ?
     LIMIT 5`,
    [wild, wild]
  );

  return res.json({
    query: qStr,
    students,
    documents,
    classes,
    difficulties,
    assignments,
    totalCount: students.length + documents.length + classes.length + difficulties.length + assignments.length
  });
});
