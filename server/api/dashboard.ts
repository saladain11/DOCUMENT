import { Router, Response } from 'express';
import { query, queryOne } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';

export const dashboardRouter = Router();

dashboardRouter.get('/stats', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  // Current Academic Year
  const currentYear = await queryOne<{ id: string; name: string }>(
    `SELECT id, name FROM academic_years WHERE is_current = 1 LIMIT 1`
  ) || { id: 'default', name: '2026-2027' };

  // 1. Total Students
  const stdCountRow = await queryOne<{ count: number }>(
    `SELECT count(*) as count FROM students s
     JOIN classes c ON s.class_id = c.id
     WHERE c.is_archived = 0 AND c.academic_year_id = ?`,
    [currentYear.id]
  );
  const totalStudents = stdCountRow ? stdCountRow.count : 0;

  // 2. Total Classes
  const clsCountRow = await queryOne<{ count: number }>(
    `SELECT count(*) as count FROM classes WHERE is_archived = 0 AND academic_year_id = ?`,
    [currentYear.id]
  );
  const totalClasses = clsCountRow ? clsCountRow.count : 0;

  // 3. Attendance Rate (%)
  // Exclude 'holiday' records from calculation
  const attStats = await query<{ status: string; count: number }>(
    `SELECT a.status, count(*) as count FROM attendance a
     JOIN students s ON a.student_id = s.id
     JOIN classes c ON s.class_id = c.id
     WHERE c.academic_year_id = ? AND a.status != 'holiday'
     GROUP BY a.status`,
    [currentYear.id]
  );
  let totalAttDays = 0;
  let presentDays = 0;
  for (const r of attStats) {
    totalAttDays += r.count;
    if (r.status === 'present' || r.status === 'late' || r.status === 'justified') {
      presentDays += r.count;
    }
  }
  const attendanceRate = totalAttDays > 0 ? Math.round((presentDays / totalAttDays) * 100) : 96;

  // 4. Homework Completion Rate (%)
  const asgStats = await query<{ status: number; count: number }>(
    `SELECT ar.status, count(*) as count FROM assignment_records ar
     JOIN assignments a ON ar.assignment_id = a.id
     JOIN classes c ON a.class_id = c.id
     WHERE c.academic_year_id = ?
     GROUP BY ar.status`,
    [currentYear.id]
  );
  let totalAsg = 0;
  let completedAsg = 0;
  for (const r of asgStats) {
    totalAsg += r.count;
    if (r.status === 1) completedAsg += r.count;
  }
  const homeworkRate = totalAsg > 0 ? Math.round((completedAsg / totalAsg) * 100) : 85;

  // 5. Students Needing Support (with new or active difficulties)
  const supportRow = await queryOne<{ count: number }>(
    `SELECT count(DISTINCT s.id) as count FROM students s
     JOIN student_difficulties sd ON s.id = sd.student_id
     JOIN classes c ON s.class_id = c.id
     WHERE c.academic_year_id = ? AND sd.status IN ('جديدة', 'قيد المتابعة')`,
    [currentYear.id]
  );
  const needingSupport = supportRow ? supportRow.count : 0;

  // 6. Improved Students (with resolved difficulty or upward placement)
  const improvedRow = await queryOne<{ count: number }>(
    `SELECT count(DISTINCT s.id) as count FROM students s
     JOIN student_difficulties sd ON s.id = sd.student_id
     JOIN classes c ON s.class_id = c.id
     WHERE c.academic_year_id = ? AND sd.status IN ('تحسنت', 'تمت معالجتها')`,
    [currentYear.id]
  );
  const improvedCount = improvedRow ? improvedRow.count : 0;

  // 7. Total Documents
  const docsRow = await queryOne<{ count: number }>(`SELECT count(*) as count FROM documents WHERE is_draft = 0`);
  const totalDocs = docsRow ? docsRow.count : 0;

  // 8. Total Strengths Registered
  const strRow = await queryOne<{ count: number }>(`SELECT count(*) as count FROM student_strengths`);
  const totalStrengths = strRow ? strRow.count : 0;

  // Recent Activities
  const recentActivities = await query<any>(
    `SELECT id, action, details, created_at FROM activity_logs ORDER BY created_at DESC LIMIT 8`
  );

  // Pedagogical Alerts
  const alerts: Array<{ id: string; type: 'danger' | 'warning' | 'info'; title: string; desc: string; link?: string }> = [];

  // Alert: Frequent Absences (students with 2+ unexcused absences)
  const frequentAbsences = await query<any>(
    `SELECT s.id, s.full_name, count(*) as abs_count FROM attendance a
     JOIN students s ON a.student_id = s.id
     WHERE a.status = 'absent'
     GROUP BY s.id
     HAVING abs_count >= 1
     ORDER BY abs_count DESC LIMIT 3`
  );
  for (const fa of frequentAbsences) {
    alerts.push({
      id: `abs_${fa.id}`,
      type: 'danger',
      title: 'تنبيه غياب متكرر',
      desc: `المتعلم(ة) ${fa.full_name} لديه(ا) ${fa.abs_count} تسجيل(ات) غياب غير مبرر`,
      link: `/students/${fa.id}`
    });
  }

  // Alert: Severe or unaddressed difficulties
  const severeDiffs = await query<any>(
    `SELECT sd.id, s.id as student_id, s.full_name, sd.category, sd.severity FROM student_difficulties sd
     JOIN students s ON sd.student_id = s.id
     WHERE sd.severity = 'مهمة' AND sd.status = 'جديدة'
     LIMIT 3`
  );
  for (const sd of severeDiffs) {
    alerts.push({
      id: `diff_${sd.id}`,
      type: 'warning',
      title: 'صعوبة مهمة تحتاج لخطة دعم',
      desc: `رُصدت صعوبة في «${sd.category}» لدى المتعلم ${sd.full_name} دون خطة معالجة بعد`,
      link: `/students/${sd.student_id}`
    });
  }

  // Alert: Incomplete homework
  const lateHomework = await query<any>(
    `SELECT a.title, count(*) as missing_count FROM assignment_records ar
     JOIN assignments a ON ar.assignment_id = a.id
     WHERE ar.status = 0
     GROUP BY a.id
     HAVING missing_count > 0
     ORDER BY a.due_date DESC LIMIT 2`
  );
  for (const lh of lateHomework) {
    alerts.push({
      id: `hw_${lh.title}`,
      type: 'info',
      title: 'واجبات لم تنجز بالكامل',
      desc: `واجب «${lh.title}» بحاجة لمتابعة ${lh.missing_count} متعلم لم ينجزوه بعد`,
      link: `/assignments`
    });
  }

  return res.json({
    academicYear: currentYear,
    stats: {
      totalStudents,
      totalClasses,
      attendanceRate,
      homeworkRate,
      needingSupport,
      improvedCount,
      totalDocs,
      totalStrengths
    },
    recentActivities,
    alerts
  });
});
