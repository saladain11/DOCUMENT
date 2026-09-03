import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db.js';
import { requireAuth, AuthenticatedRequest } from '../auth.js';
import { computeAge, calculateTrend } from './students.js';

export const reportsRouter = Router();

// GET /api/reports/student/:id - Detailed Pedagogical Report (item 24)
reportsRouter.get('/student/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  const student = await queryOne<any>(
    `SELECT s.*, c.name as class_name, c.level as class_level, g.name as group_name,
      ay.name as academic_year_name, u.school_name, u.full_name as teacher_name
     FROM students s
     JOIN classes c ON s.class_id = c.id
     JOIN academic_years ay ON c.academic_year_id = ay.id
     LEFT JOIN groups g ON s.group_id = g.id
     LEFT JOIN users u ON 1=1 LIMIT 1`,
    [id]
  );

  if (!student) {
    return res.status(404).json({ error: 'المتعلم غير موجود' });
  }

  const ageInfo = computeAge(student.birth_date);

  // Placements history & trend
  const placements = await query<any>(
    `SELECT sp.*, pd.name as domain_name
     FROM student_placements sp
     JOIN placement_domains pd ON sp.domain_id = pd.id
     WHERE sp.student_id = ?
     ORDER BY sp.date ASC`,
    [id]
  );

  const placementsByDomain: Record<string, any[]> = {};
  for (const p of placements) {
    if (!placementsByDomain[p.domain_name]) {
      placementsByDomain[p.domain_name] = [];
    }
    placementsByDomain[p.domain_name].push(p);
  }

  const domainTrends = Object.keys(placementsByDomain).map(dName => {
    const list = placementsByDomain[dName];
    const trend = calculateTrend(list);
    return {
      domainName: dName,
      currentLevel: list[list.length - 1].level,
      date: list[list.length - 1].date,
      historyCount: list.length,
      trend
    };
  });

  // Difficulties & support plan
  const difficulties = await query<any>(
    `SELECT * FROM student_difficulties WHERE student_id = ? ORDER BY date DESC`,
    [id]
  );

  // Strengths
  const strengths = await query<any>(
    `SELECT * FROM student_strengths WHERE student_id = ? ORDER BY date DESC`,
    [id]
  );

  // Attendance stats
  const attSummary = await query<any>(
    `SELECT status, count(*) as count FROM attendance WHERE student_id = ? AND status != 'holiday' GROUP BY status`,
    [id]
  );
  let totalDays = 0;
  let presentDays = 0;
  let absentDays = 0;
  let justifiedDays = 0;
  let lateDays = 0;
  for (const r of attSummary) {
    totalDays += r.count;
    if (r.status === 'present') presentDays += r.count;
    if (r.status === 'absent') absentDays += r.count;
    if (r.status === 'justified') justifiedDays += r.count;
    if (r.status === 'late') lateDays += r.count;
  }
  const attendanceRate = totalDays > 0 ? Math.round(((presentDays + justifiedDays + lateDays) / totalDays) * 100) : 100;

  // Homework completion rate
  const asgStats = await query<any>(
    `SELECT status, count(*) as count FROM assignment_records WHERE student_id = ? GROUP BY status`,
    [id]
  );
  let totalAsg = 0;
  let completedAsg = 0;
  for (const r of asgStats) {
    totalAsg += r.count;
    if (r.status === 1) completedAsg += r.count;
  }
  const homeworkRate = totalAsg > 0 ? Math.round((completedAsg / totalAsg) * 100) : 0;

  return res.json({
    student: {
      ...student,
      age: ageInfo.years,
      age_text: ageInfo.text
    },
    domainTrends,
    difficulties,
    strengths,
    attendance: {
      totalDays,
      presentDays,
      absentDays,
      justifiedDays,
      lateDays,
      rate: attendanceRate
    },
    homework: {
      total: totalAsg,
      completed: completedAsg,
      rate: homeworkRate
    },
    generalNotes: student.general_notes || 'يُظهر المتعلم استعداداً طيباً للتطور والمشاركة الصفية، ويحتاج إلى تعزيز مستمر لمهارات القراءة الذاتية وتنظيم الوقت.'
  });
});

// GET /api/reports/family/:id - Family Progress Report (item 25)
// Formatted specifically for parents: friendly, positive tone, strengths first, areas needing family follow-up.
// Strictly omits sensitive social background notes. Only includes health notes if flag `show_in_family_report = 1`.
reportsRouter.get('/family/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  const student = await queryOne<any>(
    `SELECT s.id, s.full_name, s.first_name, s.gender, s.massar_code, s.birth_date,
      c.name as class_name, c.level as class_level,
      ay.name as academic_year_name, u.school_name, u.full_name as teacher_name
     FROM students s
     JOIN classes c ON s.class_id = c.id
     JOIN academic_years ay ON c.academic_year_id = ay.id
     LEFT JOIN users u ON 1=1 LIMIT 1`,
    [id]
  );

  if (!student) {
    return res.status(404).json({ error: 'المتعلم غير موجود' });
  }

  // Strengths
  const strengths = await query<any>(
    `SELECT domain, description FROM student_strengths WHERE student_id = ? ORDER BY date DESC LIMIT 4`,
    [id]
  );

  // Placements positive highlights
  const placements = await query<any>(
    `SELECT sp.*, pd.name as domain_name
     FROM student_placements sp
     JOIN placement_domains pd ON sp.domain_id = pd.id
     WHERE sp.student_id = ?
     ORDER BY sp.date ASC`,
    [id]
  );

  const placementsByDomain: Record<string, any[]> = {};
  for (const p of placements) {
    if (!placementsByDomain[p.domain_name]) {
      placementsByDomain[p.domain_name] = [];
    }
    placementsByDomain[p.domain_name].push(p);
  }

  const positiveAspects = Object.keys(placementsByDomain).map(dName => {
    const list = placementsByDomain[dName];
    const trend = calculateTrend(list);
    return {
      domainName: dName,
      currentLevel: list[list.length - 1].level,
      trend
    };
  });

  // Areas needing home support (gentle phrasing of active difficulties)
  const difficulties = await query<any>(
    `SELECT category, notes, support_action FROM student_difficulties
     WHERE student_id = ? AND status IN ('جديدة', 'قيد المتابعة')
     ORDER BY date DESC LIMIT 3`,
    [id]
  );

  // Attendance summary for parents
  const attSummary = await query<any>(
    `SELECT status, count(*) as count FROM attendance WHERE student_id = ? AND status != 'holiday' GROUP BY status`,
    [id]
  );
  let totalDays = 0;
  let presentDays = 0;
  let absentDays = 0;
  let lateDays = 0;
  for (const r of attSummary) {
    totalDays += r.count;
    if (r.status === 'present' || r.status === 'justified') presentDays += r.count;
    if (r.status === 'absent') absentDays += r.count;
    if (r.status === 'late') lateDays += r.count;
  }
  const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

  // Preventive health note only if teacher enabled `show_in_family_report`
  const health = await queryOne<any>(
    `SELECT notes, precautions FROM student_health_notes WHERE student_id = ? AND show_in_family_report = 1`,
    [id]
  );

  return res.json({
    student,
    positiveAspects,
    strengths,
    areasForHomeSupport: difficulties.map(d => ({
      domain: d.category,
      homeTip: `تشجيع المتعلم على ممارسة أنشطة القراءة والكتابة اليومية لمدة 15 دقيقة مع مراجعة ${d.category}.`
    })),
    attendance: {
      rate: attendanceRate,
      absentDays,
      lateDays,
      statusMessage: absentDays === 0 ? 'حضور منتظم وممتاز ما شاء الله' : `سُجلت ${absentDays} غيابات تحتاج التنسيق مع الإدارة التربوية`
    },
    preventiveHealth: health ? health.notes : null,
    teacherMessage: `يسرنا مشاركتكم هذا التقرير الدوري لتتبع المسار الدراسي لابنكم/ابنتكم ${student.first_name}. نثمن عالياً تعاونكم الدائم لدعم تفوقه ونجاحه.`
  });
});

// GET /api/reports/class/:id - Comprehensive Class Report (item 26)
reportsRouter.get('/class/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  const classData = await queryOne<any>(
    `SELECT c.*, ay.name as academic_year_name, u.school_name, u.school_city, u.full_name as teacher_name
     FROM classes c
     JOIN academic_years ay ON c.academic_year_id = ay.id
     LEFT JOIN users u ON 1=1 LIMIT 1
     WHERE c.id = ?`,
    [id]
  );
  if (!classData) {
    return res.status(404).json({ error: 'القسم غير موجود' });
  }

  const students = await query<any>(
    `SELECT id, full_name, gender, birth_date, massar_code FROM students WHERE class_id = ? ORDER BY full_name ASC`,
    [id]
  );

  const maleCount = students.filter(s => s.gender === 'ذكر').length;
  const femaleCount = students.filter(s => s.gender === 'أنثى').length;

  // Attendance stats for class
  const classAtt = await query<any>(
    `SELECT a.status, count(*) as count FROM attendance a
     JOIN students s ON a.student_id = s.id
     WHERE s.class_id = ? AND a.status != 'holiday'
     GROUP BY a.status`,
    [id]
  );
  let totalDays = 0;
  let presentDays = 0;
  for (const r of classAtt) {
    totalDays += r.count;
    if (r.status === 'present' || r.status === 'justified' || r.status === 'late') {
      presentDays += r.count;
    }
  }
  const classAttendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 98;

  // Active difficulties breakdown
  const difficultiesBreakdown = await query<any>(
    `SELECT sd.category, count(*) as count
     FROM student_difficulties sd
     JOIN students s ON sd.student_id = s.id
     WHERE s.class_id = ? AND sd.status IN ('جديدة', 'قيد المتابعة')
     GROUP BY sd.category
     ORDER BY count DESC`,
    [id]
  );

  // Placements distribution
  const placementsDistribution = await query<any>(
    `SELECT pd.name as domain_name, sp.level, count(*) as count
     FROM student_placements sp
     JOIN placement_domains pd ON sp.domain_id = pd.id
     JOIN students s ON sp.student_id = s.id
     WHERE s.class_id = ?
     GROUP BY pd.name, sp.level`,
    [id]
  );

  return res.json({
    classData,
    stats: {
      totalStudents: students.length,
      maleCount,
      femaleCount,
      attendanceRate: classAttendanceRate
    },
    difficultiesBreakdown,
    placementsDistribution,
    students
  });
});
