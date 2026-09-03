import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, run } from '../db.js';
import { requireAuth, AuthenticatedRequest, logActivity } from '../auth.js';

export const holidaysRouter = Router();

// GET /api/holidays
holidaysRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const { yearId } = req.query;
  let sql = `SELECT * FROM holidays`;
  const params: any[] = [];
  if (yearId) {
    sql += ` WHERE academic_year_id = ?`;
    params.push(yearId);
  }
  sql += ` ORDER BY start_date ASC`;
  const list = await query<any>(sql, params);
  return res.json(list);
});

// POST /api/holidays
holidaysRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { academic_year_id, name, start_date, end_date, is_single_day } = req.body;
  if (!name || !start_date) {
    return res.status(400).json({ error: 'اسم العطلة وتاريخ البداية حقول إجبارية' });
  }

  const id = 'hol_' + crypto.randomBytes(6).toString('hex');
  const yearId = academic_year_id || 'year_2026_2027';
  const finalEnd = is_single_day || !end_date ? start_date : end_date;

  await run(
    `INSERT INTO holidays (id, academic_year_id, name, start_date, end_date, is_single_day)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, yearId, name.trim(), start_date, finalEnd, is_single_day ? 1 : 0]
  );

  await logActivity(req.user!.id, 'إضافة عطلة', `تمت إضافة عطلة: ${name}`, req);

  return res.status(201).json({ message: 'تمت إضافة العطلة بنجاح', id });
});

// DELETE /api/holidays/:id
holidaysRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  await run(`DELETE FROM holidays WHERE id = ?`, [id]);
  return res.json({ message: 'تم حذف العطلة بنجاح' });
});
