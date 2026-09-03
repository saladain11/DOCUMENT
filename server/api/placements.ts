import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne, run } from '../db.js';
import { requireAuth, AuthenticatedRequest, logActivity } from '../auth.js';

export const placementsRouter = Router();

// GET /api/placements/domains - List placement domains
placementsRouter.get('/domains', requireAuth, async (req: Request, res: Response) => {
  const domains = await query<any>(`SELECT * FROM placement_domains ORDER BY is_default DESC, name ASC`);
  return res.json(domains);
});

// POST /api/placements/domains - Add new domain
placementsRouter.post('/domains', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { name, code, description } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم المجال إجباري' });

  const domainId = 'dom_' + crypto.randomBytes(6).toString('hex');
  const domCode = code || 'dom_' + Date.now();

  await run(
    `INSERT INTO placement_domains (id, name, code, description, is_default) VALUES (?, ?, ?, ?, 0)`,
    [domainId, name.trim(), domCode, description || null]
  );

  return res.status(201).json({ message: 'تمت إضافة المجال بنجاح', domainId });
});

// GET /api/placements - History query with filters
placementsRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const { studentId, classId, domainId, period } = req.query;

  let sql = `
    SELECT sp.*, pd.name as domain_name, s.full_name as student_name, s.massar_code, c.name as class_name
    FROM student_placements sp
    JOIN placement_domains pd ON sp.domain_id = pd.id
    JOIN students s ON sp.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (studentId) {
    sql += ` AND sp.student_id = ?`;
    params.push(studentId);
  }
  if (classId) {
    sql += ` AND s.class_id = ?`;
    params.push(classId);
  }
  if (domainId) {
    sql += ` AND sp.domain_id = ?`;
    params.push(domainId);
  }
  if (period) {
    sql += ` AND sp.period = ?`;
    params.push(period);
  }

  sql += ` ORDER BY sp.date DESC, s.full_name ASC`;
  const records = await query<any>(sql, params);
  return res.json(records);
});

// POST /api/placements - Add single placement record (never overwrites historical records)
placementsRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { student_id, domain_id, level, date, period, notes } = req.body;
  if (!student_id || !domain_id || !level || !date) {
    return res.status(400).json({ error: 'المتعلم والمجال والمستوى والتاريخ حقول إجبارية' });
  }

  const placementId = 'plc_' + crypto.randomBytes(8).toString('hex');
  const teacherName = req.user!.full_name;

  await run(
    `INSERT INTO student_placements (id, student_id, domain_id, level, date, period, notes, teacher_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [placementId, student_id, domain_id, level, date, period || 'دوري', notes || null, teacherName]
  );

  await logActivity(req.user!.id, 'إجراء موضعة فردية', `تم تسجيل موضع للمتعلم في المستوى: ${level}`, req);

  return res.status(201).json({ message: 'تم حفظ الموضعة بنجاح', placementId });
});

// POST /api/placements/batch - Collective Placement («الموضعة الجماعية»)
placementsRouter.post('/batch', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { domain_id, date, period, items } = req.body;
  // items: Array<{ student_id: string, level: string, notes?: string }>

  if (!domain_id || !date || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'يرجى اختيار المجال والتاريخ وقائمة المتعلمين' });
  }

  const teacherName = req.user!.full_name;
  let savedCount = 0;

  for (const item of items) {
    if (!item.level) continue; // Skip unselected
    const placementId = 'plc_' + crypto.randomBytes(8).toString('hex');
    await run(
      `INSERT INTO student_placements (id, student_id, domain_id, level, date, period, notes, teacher_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [placementId, item.student_id, domain_id, item.level, date, period || 'دوري', item.notes || null, teacherName]
    );
    savedCount++;
  }

  await logActivity(req.user!.id, 'موضعة جماعية', `تم إجراء موضعة جماعية لـ ${savedCount} متعلم(ة)`, req);

  return res.json({ message: `تم حفظ الموضعة الجماعية لـ ${savedCount} متعلم(ة) بنجاح`, savedCount });
});
