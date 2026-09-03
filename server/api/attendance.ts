import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne, run } from '../db.js';
import { requireAuth, AuthenticatedRequest, logActivity } from '../auth.js';

export const attendanceRouter = Router();

// GET /api/attendance/month
// Query params: classId, year (YYYY), month (1-12)
attendanceRouter.get('/month', requireAuth, async (req: Request, res: Response) => {
  const { classId, year, month } = req.query;
  if (!classId || !year || !month) {
    return res.status(400).json({ error: 'يرجى تحديد القسم والسنة والشهر' });
  }

  const y = parseInt(year as string);
  const m = parseInt(month as string);

  // Determine days in this month
  const daysInMonth = new Date(y, m, 0).getDate();
  const monthStr = m.toString().padStart(2, '0');

  // List of active school days in this month (Monday=1 through Saturday=6 in Moroccan school system, Sunday=0 is weekly off)
  const schoolDays: Array<{ date: string; dayNumber: number; dayName: string; isHoliday: boolean }> = [];
  const dayNamesAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  // Fetch registered holidays overlapping this month
  const startDateStr = `${y}-${monthStr}-01`;
  const endDateStr = `${y}-${monthStr}-${daysInMonth.toString().padStart(2, '0')}`;

  const holidays = await query<any>(
    `SELECT * FROM holidays WHERE start_date <= ? AND end_date >= ?`,
    [endDateStr, startDateStr]
  );

  for (let day = 1; day <= daysInMonth; day++) {
    const dStr = `${y}-${monthStr}-${day.toString().padStart(2, '0')}`;
    const dateObj = new Date(y, m - 1, day);
    const dayOfWeek = dateObj.getDay();

    if (dayOfWeek === 0) continue; // Sunday is weekend off

    // Check if day is holiday
    const isHol = holidays.some(h => dStr >= h.start_date && dStr <= h.end_date);

    schoolDays.push({
      date: dStr,
      dayNumber: day,
      dayName: dayNamesAr[dayOfWeek],
      isHoliday: isHol
    });
  }

  // Fetch students in class
  const students = await query<any>(
    `SELECT id, full_name, massar_code, group_id FROM students WHERE class_id = ? ORDER BY full_name ASC`,
    [classId]
  );

  if (students.length === 0) {
    return res.json({ schoolDays, students: [], matrix: {} });
  }

  const studentIds = students.map(s => s.id);
  const placeholders = studentIds.map(() => '?').join(',');

  // Fetch attendance records for this month
  const records = await query<any>(
    `SELECT student_id, date, status, notes
     FROM attendance
     WHERE student_id IN (${placeholders}) AND date >= ? AND date <= ?`,
    [...studentIds, startDateStr, endDateStr]
  );

  // Map into matrix: [studentId][date] = status
  const matrix: Record<string, Record<string, string>> = {};
  for (const s of students) {
    matrix[s.id] = {};
  }
  for (const r of records) {
    if (matrix[r.student_id]) {
      matrix[r.student_id][r.date] = r.status;
    }
  }

  // Calculate stats for each student
  const studentStats = students.map(st => {
    let actualDays = 0;
    let present = 0;
    let justified = 0;
    let unexcused = 0;
    let late = 0;

    for (const d of schoolDays) {
      const rec = matrix[st.id]?.[d.date];
      if (d.isHoliday || rec === 'holiday') {
        continue; // Holiday is excluded from attendance denominator
      }

      if (rec) {
        actualDays++;
        if (rec === 'present') present++;
        else if (rec === 'justified') justified++;
        else if (rec === 'absent') unexcused++;
        else if (rec === 'late') {
          late++;
          present++; // Late still counts towards attendance presence
        }
      }
    }

    const rate = actualDays > 0 ? Math.round(((present + justified) / actualDays) * 100) : 100;

    return {
      ...st,
      stats: {
        actualDays,
        present,
        justified,
        unexcused,
        late,
        rate
      }
    };
  });

  return res.json({
    schoolDays,
    students: studentStats,
    matrix
  });
});

// POST /api/attendance/batch - Save attendance matrix
// Body: { records: Array<{ student_id: string, date: string, status: string }> }
attendanceRouter.post('/batch', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { records } = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'لا توجد سجلات للحفظ' });
  }

  let count = 0;
  for (const r of records) {
    if (!r.student_id || !r.date || !r.status) continue;
    const attId = `att_${r.student_id}_${r.date}`;
    await run(
      `INSERT INTO attendance (id, student_id, date, status, notes)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(student_id, date) DO UPDATE SET status = excluded.status`,
      [attId, r.student_id, r.date, r.status, r.notes || null]
    );
    count++;
  }

  await logActivity(req.user!.id, 'تسجيل الحضور والغياب', `تم تسجيل وحفظ الحضور لـ ${count} سجل`, req);

  return res.json({ message: `تم حفظ ${count} سجل حضور بنجاح`, count });
});

// POST /api/attendance/mark-day-holiday - Mark a single day as holiday for all students in a class or all classes
attendanceRouter.post('/mark-day-holiday', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { date, classId } = req.body;
  if (!date) return res.status(400).json({ error: 'التاريخ إجباري' });

  let students: any[] = [];
  if (classId) {
    students = await query<any>(`SELECT id FROM students WHERE class_id = ?`, [classId]);
  } else {
    students = await query<any>(`SELECT id FROM students`);
  }

  for (const s of students) {
    const attId = `att_${s.id}_${date}`;
    await run(
      `INSERT INTO attendance (id, student_id, date, status)
       VALUES (?, ?, ?, 'holiday')
       ON CONFLICT(student_id, date) DO UPDATE SET status = 'holiday'`,
      [attId, s.id, date]
    );
  }

  await logActivity(req.user!.id, 'تحديد يوم عطلة', `تم تحديد يوم ${date} كعطلة صفية رسمية`, req);

  return res.json({ message: `تم تحديد يوم ${date} كعطلة بنجاح لـ ${students.length} متعلم(ة)` });
});
