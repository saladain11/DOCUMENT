import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne, run } from '../db.js';
import { requireAuth, AuthenticatedRequest, logActivity } from '../auth.js';

export const studentsRouter = Router();

// Helper to compute age in years and months dynamically
export function computeAge(birthDateStr: string): { years: number; months: number; text: string } {
  if (!birthDateStr) return { years: 0, months: 0, text: 'غير محدد' };
  const birthDate = new Date(birthDateStr);
  const today = new Date();
  
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  
  if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
    years--;
    months += 12;
  }
  if (today.getDate() < birthDate.getDate()) {
    months--;
    if (months < 0) {
      months += 12;
    }
  }

  return {
    years,
    months,
    text: `${years} سنة و ${months} أشهر`
  };
}

// Calculate Placement Evolution Trend
export function calculateTrend(placements: any[]): { direction: 'improved' | 'stable' | 'regressed' | 'new'; symbol: string; text: string; color: string } {
  if (!placements || placements.length < 2) {
    return { direction: 'new', symbol: '•', text: 'بداية التتبع', color: 'blue' };
  }

  // Sort by date asc
  const sorted = [...placements].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Weight levels:
  const levelWeights: Record<string, number> = {
    'مبتدئ': 1,
    'حرف': 2,
    'كلمة': 3,
    'فقرة': 4,
    'قصة': 5,
    'أقصوصة': 5,
    'طبيعي': 3,
    'متوسط': 2,
    'جيد': 4,
    'ممتاز': 5,
    'ضعيف': 1
  };

  const prev = sorted[sorted.length - 2];
  const last = sorted[sorted.length - 1];

  const wPrev = levelWeights[prev.level] || 2;
  const wLast = levelWeights[last.level] || 2;

  if (wLast > wPrev) {
    return { direction: 'improved', symbol: '↑', text: 'تحسن ملحوظ', color: 'green' };
  } else if (wLast === wPrev) {
    return { direction: 'stable', symbol: '→', text: 'استقرار', color: 'orange' };
  } else {
    return { direction: 'regressed', symbol: '↓', text: 'تراجع يحتاج دعماً', color: 'red' };
  }
}

// GET /api/students - List students
studentsRouter.get('/', requireAuth, async (req: Request, res: Response) => {
  const { classId, groupId, search, gender, support, page = '1', limit = '15', sortBy = 'full_name', sortOrder = 'asc' } = req.query;
  
  let sql = `
    SELECT s.*, c.name as class_name, c.level as class_level, g.name as group_name,
      (SELECT count(*) FROM student_difficulties sd WHERE sd.student_id = s.id AND sd.status IN ('جديدة', 'قيد المتابعة')) as active_difficulties_count,
      (SELECT count(*) FROM student_strengths ss WHERE ss.student_id = s.id) as strengths_count,
      (SELECT count(*) FROM attendance a WHERE a.student_id = s.id AND a.status = 'present') as present_count,
      (SELECT count(*) FROM attendance a WHERE a.student_id = s.id AND a.status != 'holiday') as total_attendance_recorded
    FROM students s
    JOIN classes c ON s.class_id = c.id
    LEFT JOIN groups g ON s.group_id = g.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (classId) {
    sql += ` AND s.class_id = ?`;
    params.push(classId);
  }
  if (groupId) {
    sql += ` AND s.group_id = ?`;
    params.push(groupId);
  }
  if (gender) {
    sql += ` AND s.gender = ?`;
    params.push(gender);
  }
  if (search) {
    const q = `%${(search as string).trim()}%`;
    sql += ` AND (s.full_name LIKE ? OR s.first_name LIKE ? OR s.last_name LIKE ? OR s.massar_code LIKE ?)`;
    params.push(q, q, q, q);
  }

  // Count total matching
  const countSql = `SELECT count(*) as total FROM (${sql})`;
  const countRow = await queryOne<{ total: number }>(countSql, params);
  const total = countRow ? countRow.total : 0;

  // Sorting and pagination
  const safeSort = ['full_name', 'birth_date', 'created_at', 'massar_code'].includes(sortBy as string) ? sortBy : 'full_name';
  const safeOrder = (sortOrder as string).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  sql += ` ORDER BY s.${safeSort} ${safeOrder}`;

  const p = Math.max(1, parseInt(page as string) || 1);
  const lim = Math.max(1, Math.min(100, parseInt(limit as string) || 15));
  sql += ` LIMIT ? OFFSET ?`;
  params.push(lim, (p - 1) * lim);

  const students = await query<any>(sql, params);

  // Compute dynamic age and attendance percentage for each student
  const mapped = students.map(st => {
    const ageInfo = computeAge(st.birth_date);
    const attendancePct = st.total_attendance_recorded > 0
      ? Math.round((st.present_count / st.total_attendance_recorded) * 100)
      : 100;
    
    let supportLevel = 'عادي';
    if (st.active_difficulties_count >= 2) supportLevel = 'دعم مكثف';
    else if (st.active_difficulties_count === 1) supportLevel = 'دعم مستمر';

    return {
      ...st,
      age: ageInfo.years,
      age_text: ageInfo.text,
      attendance_percentage: attendancePct,
      support_level: supportLevel
    };
  });

  return res.json({
    students: mapped,
    pagination: {
      page: p,
      limit: lim,
      total,
      totalPages: Math.ceil(total / lim)
    }
  });
});

// GET /api/students/:id - Complete student profile (12 tabs)
studentsRouter.get('/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  const student = await queryOne<any>(
    `SELECT s.*, c.name as class_name, c.level as class_level, g.name as group_name
     FROM students s
     JOIN classes c ON s.class_id = c.id
     LEFT JOIN groups g ON s.group_id = g.id
     WHERE s.id = ?`,
    [id]
  );

  if (!student) {
    return res.status(404).json({ error: 'المتعلم غير موجود' });
  }

  const ageInfo = computeAge(student.birth_date);

  // 1. Parent info
  const parent = await queryOne<any>(`SELECT * FROM parents WHERE student_id = ?`, [id]) || {};

  // 2. Social info
  const social = await queryOne<any>(`SELECT * FROM student_social_info WHERE student_id = ?`, [id]) || {};

  // 3. Preventive health notes
  const health = await queryOne<any>(`SELECT * FROM student_health_notes WHERE student_id = ?`, [id]) || {
    notes: 'لا توجد ملاحظات صحية وقائية مسجلة',
    precautions: 'عادي',
    show_in_family_report: 0
  };

  // 4. Placements history
  const placements = await query<any>(
    `SELECT sp.*, pd.name as domain_name, pd.code as domain_code
     FROM student_placements sp
     JOIN placement_domains pd ON sp.domain_id = pd.id
     WHERE sp.student_id = ?
     ORDER BY sp.date ASC`,
    [id]
  );

  // Compute evolution trends grouped by domain
  const placementsByDomain: Record<string, any[]> = {};
  for (const p of placements) {
    if (!placementsByDomain[p.domain_name]) {
      placementsByDomain[p.domain_name] = [];
    }
    placementsByDomain[p.domain_name].push(p);
  }

  const domainTrends = Object.keys(placementsByDomain).map(domainName => {
    const list = placementsByDomain[domainName];
    const trend = calculateTrend(list);
    return {
      domainName,
      history: list,
      currentLevel: list[list.length - 1].level,
      trend
    };
  });

  // 5. Difficulties
  const difficulties = await query<any>(
    `SELECT * FROM student_difficulties WHERE student_id = ? ORDER BY date DESC`,
    [id]
  );

  // 6. Strengths
  const strengths = await query<any>(
    `SELECT * FROM student_strengths WHERE student_id = ? ORDER BY date DESC`,
    [id]
  );

  // 7. Attendance records & statistics
  const attendanceRecords = await query<any>(
    `SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 40`,
    [id]
  );
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
  const attendancePct = totalDays > 0 ? Math.round(((presentDays + lateDays + justifiedDays) / totalDays) * 100) : 100;

  // 8. Assignments & Homework
  const assignments = await query<any>(
    `SELECT a.title, a.subject, a.due_date, ar.status, ar.notes
     FROM assignment_records ar
     JOIN assignments a ON ar.assignment_id = a.id
     WHERE ar.student_id = ?
     ORDER BY a.due_date DESC LIMIT 20`,
    [id]
  );

  // 9. Assessments / Grades
  const assessments = await query<any>(
    `SELECT * FROM assessments WHERE student_id = ? ORDER BY date DESC`,
    [id]
  );

  // 10. Linked Documents
  const linkedDocuments = await query<any>(
    `SELECT d.id, d.title, d.created_at, sd.relation_type
     FROM student_documents sd
     JOIN documents d ON sd.document_id = d.id
     WHERE sd.student_id = ?
     ORDER BY d.created_at DESC`,
    [id]
  );

  return res.json({
    student: {
      ...student,
      age: ageInfo.years,
      age_text: ageInfo.text
    },
    parent,
    social,
    health,
    placements,
    domainTrends,
    difficulties,
    strengths,
    attendance: {
      records: attendanceRecords,
      totalDays,
      presentDays,
      absentDays,
      justifiedDays,
      lateDays,
      rate: attendancePct
    },
    assignments,
    assessments,
    linkedDocuments
  });
});

// POST /api/students - Add new student
studentsRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const {
    first_name,
    last_name,
    class_id,
    group_id,
    gender,
    birth_date,
    massar_code,
    enrollment_date,
    general_notes,
    parent,
    social,
    health
  } = req.body;

  if (!first_name || !last_name || !class_id || !gender || !birth_date) {
    return res.status(400).json({ error: 'الاسم والنسب والقسم والجنس وتاريخ الازدياد حقول إجبارية' });
  }

  const cleanMassar = massar_code ? massar_code.trim() : null;
  if (cleanMassar) {
    const dup = await queryOne<any>(`SELECT id FROM students WHERE massar_code = ?`, [cleanMassar]);
    if (dup) {
      return res.status(400).json({ error: 'رقم مسار هذا مسجل بالفعل لمتعلم آخر' });
    }
  }

  const studentId = 'std_' + crypto.randomBytes(8).toString('hex');
  const fullName = `${first_name.trim()} ${last_name.trim()}`;
  const now = new Date().toISOString();

  await run(
    `INSERT INTO students (id, class_id, group_id, first_name, last_name, full_name, gender, birth_date, massar_code, enrollment_date, general_notes, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      studentId,
      class_id,
      group_id || null,
      first_name.trim(),
      last_name.trim(),
      fullName,
      gender,
      birth_date,
      cleanMassar,
      enrollment_date || new Date().toISOString().split('T')[0],
      general_notes || null,
      now,
      now
    ]
  );

  // Parent Info
  if (parent) {
    const parentId = 'par_' + crypto.randomBytes(8).toString('hex');
    await run(
      `INSERT INTO parents (id, student_id, father_name, father_job, father_phone, mother_name, mother_job, mother_phone, relationship, siblings_count, birth_order, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parentId,
        studentId,
        parent.father_name || null,
        parent.father_job || null,
        parent.father_phone || null,
        parent.mother_name || null,
        parent.mother_job || null,
        parent.mother_phone || null,
        parent.relationship || 'الوالدان',
        parseInt(parent.siblings_count) || 0,
        parseInt(parent.birth_order) || 1,
        parent.notes || null
      ]
    );
  }

  // Social info
  if (social) {
    const socId = 'soc_' + crypto.randomBytes(8).toString('hex');
    await run(
      `INSERT INTO student_social_info (id, student_id, social_status, living_with, financial_notes, general_social_notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        socId,
        studentId,
        social.social_status || 'مستقرة',
        social.living_with || 'الوالدين',
        social.financial_notes || null,
        social.general_social_notes || null
      ]
    );
  }

  // Health notes
  if (health) {
    const hltId = 'hlt_' + crypto.randomBytes(8).toString('hex');
    await run(
      `INSERT INTO student_health_notes (id, student_id, notes, precautions, show_in_family_report)
       VALUES (?, ?, ?, ?, ?)`,
      [
        hltId,
        studentId,
        health.notes || 'لا توجد احتياطات صحية وقائية مسجلة',
        health.precautions || 'عادي',
        health.show_in_family_report ? 1 : 0
      ]
    );
  }

  await logActivity(req.user!.id, 'إضافة متعلم جديد', `تمت إضافة المتعلم: ${fullName} برقم معرف: ${cleanMassar || 'غير محدد'}`, req);

  return res.status(201).json({ message: 'تم حفظ المتعلم بنجاح', studentId });
});

// PUT /api/students/:id - Update student
studentsRouter.put('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const {
    first_name,
    last_name,
    class_id,
    group_id,
    gender,
    birth_date,
    massar_code,
    enrollment_date,
    general_notes,
    parent,
    social,
    health
  } = req.body;

  const existing = await queryOne<any>(`SELECT id FROM students WHERE id = ?`, [id]);
  if (!existing) {
    return res.status(404).json({ error: 'المتعلم غير موجود' });
  }

  const cleanMassar = massar_code ? massar_code.trim() : null;
  if (cleanMassar) {
    const dup = await queryOne<any>(`SELECT id FROM students WHERE massar_code = ? AND id != ?`, [cleanMassar, id]);
    if (dup) {
      return res.status(400).json({ error: 'رقم مسار هذا مسجل بالفعل لمتعلم آخر' });
    }
  }

  const fullName = `${first_name.trim()} ${last_name.trim()}`;
  const now = new Date().toISOString();

  await run(
    `UPDATE students SET
      class_id = ?, group_id = ?, first_name = ?, last_name = ?, full_name = ?, gender = ?,
      birth_date = ?, massar_code = ?, enrollment_date = ?, general_notes = ?, updated_at = ?
     WHERE id = ?`,
    [
      class_id,
      group_id || null,
      first_name.trim(),
      last_name.trim(),
      fullName,
      gender,
      birth_date,
      cleanMassar,
      enrollment_date,
      general_notes || null,
      now,
      id
    ]
  );

  // Update parents
  if (parent) {
    const parentRow = await queryOne<any>(`SELECT id FROM parents WHERE student_id = ?`, [id]);
    if (parentRow) {
      await run(
        `UPDATE parents SET
          father_name = ?, father_job = ?, father_phone = ?, mother_name = ?, mother_job = ?, mother_phone = ?,
          relationship = ?, siblings_count = ?, birth_order = ?, notes = ?
         WHERE student_id = ?`,
        [
          parent.father_name || null,
          parent.father_job || null,
          parent.father_phone || null,
          parent.mother_name || null,
          parent.mother_job || null,
          parent.mother_phone || null,
          parent.relationship || 'الوالدان',
          parseInt(parent.siblings_count) || 0,
          parseInt(parent.birth_order) || 1,
          parent.notes || null,
          id
        ]
      );
    } else {
      const pid = 'par_' + crypto.randomBytes(8).toString('hex');
      await run(
        `INSERT INTO parents (id, student_id, father_name, father_job, father_phone, mother_name, mother_job, mother_phone, relationship, siblings_count, birth_order, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [pid, id, parent.father_name || null, parent.father_job || null, parent.father_phone || null, parent.mother_name || null, parent.mother_job || null, parent.mother_phone || null, parent.relationship || 'الوالدان', parseInt(parent.siblings_count) || 0, parseInt(parent.birth_order) || 1, parent.notes || null]
      );
    }
  }

  // Update Social
  if (social) {
    const socRow = await queryOne<any>(`SELECT id FROM student_social_info WHERE student_id = ?`, [id]);
    if (socRow) {
      await run(
        `UPDATE student_social_info SET social_status = ?, living_with = ?, financial_notes = ?, general_social_notes = ? WHERE student_id = ?`,
        [social.social_status || 'مستقرة', social.living_with || 'الوالدين', social.financial_notes || null, social.general_social_notes || null, id]
      );
    } else {
      const sid = 'soc_' + crypto.randomBytes(8).toString('hex');
      await run(
        `INSERT INTO student_social_info (id, student_id, social_status, living_with, financial_notes, general_social_notes) VALUES (?, ?, ?, ?, ?, ?)`,
        [sid, id, social.social_status || 'مستقرة', social.living_with || 'الوالدين', social.financial_notes || null, social.general_social_notes || null]
      );
    }
  }

  // Update Health
  if (health) {
    const hltRow = await queryOne<any>(`SELECT id FROM student_health_notes WHERE student_id = ?`, [id]);
    if (hltRow) {
      await run(
        `UPDATE student_health_notes SET notes = ?, precautions = ?, show_in_family_report = ?, updated_at = ? WHERE student_id = ?`,
        [health.notes || '', health.precautions || '', health.show_in_family_report ? 1 : 0, now, id]
      );
    } else {
      const hid = 'hlt_' + crypto.randomBytes(8).toString('hex');
      await run(
        `INSERT INTO student_health_notes (id, student_id, notes, precautions, show_in_family_report) VALUES (?, ?, ?, ?, ?)`,
        [hid, id, health.notes || '', health.precautions || '', health.show_in_family_report ? 1 : 0]
      );
    }
  }

  await logActivity(req.user!.id, 'تعديل بيانات متعلم', `تم تحديث ملف المتعلم: ${fullName}`, req);

  return res.json({ message: 'تم تحديث بيانات المتعلم بنجاح' });
});

// DELETE /api/students/:id - Delete student
studentsRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const student = await queryOne<any>(`SELECT full_name FROM students WHERE id = ?`, [id]);
  if (!student) {
    return res.status(404).json({ error: 'المتعلم غير موجود' });
  }

  await run(`DELETE FROM students WHERE id = ?`, [id]);
  await logActivity(req.user!.id, 'حذف متعلم', `تم حذف سجل المتعلم: ${student.full_name}`, req);

  return res.json({ message: 'تم حذف المتعلم بنجاح' });
});

// POST /api/students/csv-preview - Preview and validate CSV before import
studentsRouter.post('/csv-preview', requireAuth, async (req: Request, res: Response) => {
  const { rows, defaultClassId } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'لم يتم العثور على أية صفوف في ملف CSV' });
  }

  const existingMassarRows = await query<{ massar_code: string }>(`SELECT massar_code FROM students WHERE massar_code IS NOT NULL`);
  const existingMassarSet = new Set(existingMassarRows.map(r => r.massar_code.toUpperCase()));

  const seenInCsv = new Set<string>();
  const validRecords: any[] = [];
  const invalidRecords: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const errors: string[] = [];

    // Fields extraction
    const firstName = (row['الاسم'] || row['الاسم الشخصي'] || row['first_name'] || '').trim();
    const lastName = (row['النسب'] || row['الاسم العائلي'] || row['last_name'] || '').trim();
    let birthDate = (row['تاريخ الازدياد'] || row['تاريخ_الازدياد'] || row['birth_date'] || '').trim();
    let gender = (row['الجنس'] || row['gender'] || 'ذكر').trim();
    const massar = (row['رقم مسار'] || row['مسار'] || row['رقم_مسار'] || row['massar_code'] || '').trim().toUpperCase();
    const classId = row['القسم'] || defaultClassId;
    const groupName = (row['الفوج'] || row['group'] || '').trim();

    if (!firstName) errors.push('الاسم مفقود');
    if (!lastName) errors.push('النسب مفقود');
    if (!birthDate) errors.push('تاريخ الازدياد مفقود');

    // Gender normalize
    if (gender.includes('أنثى') || gender.toLowerCase() === 'f' || gender === 'انثى') {
      gender = 'أنثى';
    } else {
      gender = 'ذكر';
    }

    // Check duplicate Massar
    if (massar) {
      if (existingMassarSet.has(massar)) {
        errors.push(`رقم مسار (${massar}) مسجل مسبقاً في قاعدة البيانات`);
      }
      if (seenInCsv.has(massar)) {
        errors.push(`رقم مسار (${massar}) مكرر داخل نفس ملف CSV`);
      }
      seenInCsv.add(massar);
    }

    const record = {
      row_index: i + 1,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      gender,
      birth_date: birthDate,
      massar_code: massar || null,
      class_id: classId,
      group_name: groupName || null,
      errors
    };

    if (errors.length > 0) {
      invalidRecords.push(record);
    } else {
      validRecords.push(record);
    }
  }

  return res.json({
    totalRows: rows.length,
    validCount: validRecords.length,
    invalidCount: invalidRecords.length,
    validRecords,
    invalidRecords
  });
});

// POST /api/students/csv-commit - Execute confirmed CSV import
studentsRouter.post('/csv-commit', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { records, targetClassId } = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: 'لا توجد سجلات صالحة للاستيراد' });
  }

  let importedCount = 0;
  const now = new Date().toISOString();

  for (const r of records) {
    const studentId = 'std_' + crypto.randomBytes(8).toString('hex');
    const classId = r.class_id || targetClassId;

    await run(
      `INSERT INTO students (id, class_id, first_name, last_name, full_name, gender, birth_date, massar_code, enrollment_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        studentId,
        classId,
        r.first_name,
        r.last_name,
        r.full_name || `${r.first_name} ${r.last_name}`,
        r.gender || 'ذكر',
        r.birth_date,
        r.massar_code || null,
        new Date().toISOString().split('T')[0],
        now,
        now
      ]
    );

    // Create empty parent & health records
    const pid = 'par_' + crypto.randomBytes(8).toString('hex');
    await run(`INSERT INTO parents (id, student_id) VALUES (?, ?)`, [pid, studentId]);

    const hid = 'hlt_' + crypto.randomBytes(8).toString('hex');
    await run(`INSERT INTO student_health_notes (id, student_id, notes, precautions) VALUES (?, ?, 'عادي', 'عادي')`, [hid, studentId]);

    importedCount++;
  }

  await logActivity(req.user!.id, 'استيراد متعلمين عبر CSV', `تم استيراد ${importedCount} متعلم(ة) بنجاح`, req);

  return res.json({ message: `تم استيراد ${importedCount} متعلم(ة) بنجاح`, importedCount });
});

// GET /api/students/export/csv - Export students to CSV
studentsRouter.get('/export/csv', requireAuth, async (req: Request, res: Response) => {
  const { classId } = req.query;
  let sql = `
    SELECT s.first_name, s.last_name, s.gender, s.birth_date, s.massar_code, c.name as class_name, g.name as group_name
    FROM students s
    JOIN classes c ON s.class_id = c.id
    LEFT JOIN groups g ON s.group_id = g.id
  `;
  const params: any[] = [];
  if (classId) {
    sql += ` WHERE s.class_id = ?`;
    params.push(classId);
  }
  sql += ` ORDER BY c.name ASC, s.full_name ASC`;

  const students = await query<any>(sql, params);

  // Build CSV with BOM for Arabic Excel support
  let csvContent = '\uFEFFالاسم,النسب,الجنس,تاريخ الازدياد,العمر,رقم مسار,القسم,الفوج\r\n';
  for (const s of students) {
    const age = computeAge(s.birth_date).years;
    const row = [
      `"${(s.first_name || '').replace(/"/g, '""')}"`,
      `"${(s.last_name || '').replace(/"/g, '""')}"`,
      `"${s.gender}"`,
      `"${s.birth_date}"`,
      `"${age}"`,
      `"${s.massar_code || ''}"`,
      `"${(s.class_name || '').replace(/"/g, '""')}"`,
      `"${(s.group_name || '').replace(/"/g, '""')}"`
    ].join(',');
    csvContent += row + '\r\n';
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="students_export.csv"');
  return res.send(csvContent);
});
