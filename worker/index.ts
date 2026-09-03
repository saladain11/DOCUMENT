import { Hono } from 'hono';
import { cors } from 'hono/cors';
import bcrypt from 'bcryptjs';
import { query, queryOne, run } from './db.js';

export interface Env {
  DB: any;
  ASSETS?: { fetch: (req: Request) => Promise<Response> };
  GEMINI_API_KEY?: string;
}

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for all requests
app.use('*', cors({
  origin: (origin) => origin || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Helper: Generate random token
function generateToken(): string {
  const chars = 'abcdef0123456789';
  let str = '';
  for (let i = 0; i < 64; i++) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  return str;
}

function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

// Helper: Authenticate request
async function authenticate(c: any) {
  const authHeader = c.req.header('Authorization');
  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }
  if (!token) {
    const cookie = c.req.header('Cookie');
    if (cookie) {
      const match = cookie.match(/session_token=([^;]+)/);
      if (match) token = match[1];
    }
  }
  if (!token) return null;

  const session = await queryOne<{ user_id: string; expires_at: string }>(
    c.env.DB,
    `SELECT user_id, expires_at FROM sessions WHERE token = ? AND expires_at > datetime('now')`,
    [token]
  );
  if (!session) return null;

  return await queryOne(
    c.env.DB,
    `SELECT id, username, full_name, email, phone, role, school_name, school_city, school_phone, last_login_at FROM users WHERE id = ?`,
    [session.user_id]
  );
}

// Log activity
async function logActivity(db: any, userId: string, action: string, details: string) {
  try {
    await run(
      db,
      `INSERT INTO activity_logs (id, user_id, action, details) VALUES (?, ?, ?, ?)`,
      [generateId('log'), userId, action, details]
    );
  } catch {}
}

// ==================== 1. Health & Setup ====================
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', environment: 'Cloudflare Worker & D1', time: new Date().toISOString() });
});

// Setup D1 Endpoint: Initialize tables and seed data if needed
app.post('/api/setup-d1', async (c) => {
  try {
    const userCount = await queryOne<{ count: number }>(c.env.DB, `SELECT count(*) as count FROM users`);
    if (userCount && userCount.count > 0) {
      return c.json({ message: 'قاعدة بيانات Cloudflare D1 مهيأة بالفعل وتحتوي على مستخدمين.' });
    }
  } catch (e: any) {
    // If table doesn't exist, user should execute d1-init.sql
    return c.json({
      error: 'جداول قاعدة البيانات غير منشأة بعد في D1. يرجى تنفيذ الأمر:',
      command: 'npx wrangler d1 execute document-d1 --file=./d1-init.sql --remote'
    }, 400);
  }

  // Create default admin user
  const adminPasswordHash = bcrypt.hashSync('admin123', 10);
  await run(
    c.env.DB,
    `INSERT INTO users (id, username, password_hash, full_name, email, phone, role, school_name, school_city)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['usr_teacher_1', 'admin', adminPasswordHash, 'الأستاذ رشيد الفاسي', 'rachid.teacher@taalim.ma', '0661234567', 'teacher', 'مدرسة ابن خلدون الابتدائية', 'الرباط']
  );

  return c.json({ message: 'تم تهيئة حساب الأستاذ الافتراضي بنجاح (admin / admin123)' });
});

// ==================== 2. Auth Routes ====================
app.post('/api/auth/login', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { username, password, rememberMe } = body;

  if (!username || !password) {
    return c.json({ error: 'يرجى إدخال اسم المستخدم وكلمة المرور' }, 400);
  }

  const user = await queryOne<any>(c.env.DB, `SELECT * FROM users WHERE username = ?`, [username.trim()]);
  if (!user) {
    return c.json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, 401);
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return c.json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, 401);
  }

  const token = generateToken();
  const sessionId = generateId('ses');
  const days = rememberMe ? 30 : 2;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  await run(c.env.DB, `DELETE FROM sessions WHERE user_id = ? AND expires_at < datetime('now')`, [user.id]);
  await run(
    c.env.DB,
    `INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`,
    [sessionId, user.id, token, expiresAt]
  );
  await run(c.env.DB, `UPDATE users SET last_login_at = datetime('now') WHERE id = ?`, [user.id]);
  await logActivity(c.env.DB, user.id, 'تسجيل الدخول', `تم تسجيل الدخول بنجاح من المعرف: ${username}`);

  return c.json({
    message: 'تم تسجيل الدخول بنجاح',
    token,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      school_name: user.school_name,
      school_city: user.school_city,
      last_login_at: user.last_login_at
    }
  });
});

app.post('/api/auth/logout', async (c) => {
  const authHeader = c.req.header('Authorization');
  let token: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }
  if (token) {
    await run(c.env.DB, `DELETE FROM sessions WHERE token = ?`, [token]);
  }
  return c.json({ message: 'تم تسجيل الخروج بنجاح' });
});

app.get('/api/auth/me', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به - يرجى تسجيل الدخول' }, 401);
  return c.json({ user });
});

app.put('/api/auth/profile', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const { full_name, username, email, phone, school_name, school_city } = await c.req.json();
  if (!full_name || !username) {
    return c.json({ error: 'الاسم الكامل واسم المستخدم حقول إجبارية' }, 400);
  }

  const existing = await queryOne(c.env.DB, `SELECT id FROM users WHERE username = ? AND id != ?`, [username.trim(), user.id]);
  if (existing) {
    return c.json({ error: 'اسم المستخدم مستعمل بالفعل' }, 400);
  }

  await run(
    c.env.DB,
    `UPDATE users SET full_name = ?, username = ?, email = ?, phone = ?, school_name = ?, school_city = ? WHERE id = ?`,
    [full_name.trim(), username.trim(), email || null, phone || null, school_name || null, school_city || null, user.id]
  );

  return c.json({ message: 'تم تحديث الملف الشخصي بنجاح' });
});

app.put('/api/auth/password', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const { currentPassword, newPassword } = await c.req.json();
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return c.json({ error: 'كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف' }, 400);
  }

  const dbUser = await queryOne<any>(c.env.DB, `SELECT password_hash FROM users WHERE id = ?`, [user.id]);
  if (!dbUser || !bcrypt.compareSync(currentPassword, dbUser.password_hash)) {
    return c.json({ error: 'كلمة المرور الحالية غير صحيحة' }, 400);
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  await run(c.env.DB, `UPDATE users SET password_hash = ? WHERE id = ?`, [newHash, user.id]);
  return c.json({ message: 'تم تغيير كلمة المرور بنجاح' });
});

// ==================== 3. Dashboard Stats ====================
app.get('/api/dashboard/stats', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const studentsCount = await queryOne<{ count: number }>(c.env.DB, `SELECT count(*) as count FROM students WHERE status = 'active'`);
  const classesCount = await queryOne<{ count: number }>(c.env.DB, `SELECT count(*) as count FROM classes WHERE is_archived = 0`);
  const difficultiesCount = await queryOne<{ count: number }>(c.env.DB, `SELECT count(DISTINCT student_id) as count FROM student_difficulties`);
  const documentsCount = await queryOne<{ count: number }>(c.env.DB, `SELECT count(*) as count FROM documents`);

  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = await queryOne<{ total: number; present: number; absent: number }>(
    c.env.DB,
    `SELECT count(*) as total, 
            sum(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present,
            sum(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent
     FROM attendance WHERE date = ?`,
    [today]
  );

  const classes = await query(
    c.env.DB,
    `SELECT c.id, c.name, c.level, count(s.id) as student_count
     FROM classes c
     LEFT JOIN students s ON s.class_id = c.id AND s.status = 'active'
     WHERE c.is_archived = 0
     GROUP BY c.id
     ORDER BY c.created_at ASC`
  );

  const recentDifficulties = await query(
    c.env.DB,
    `SELECT sd.*, s.first_name || ' ' || s.last_name as student_name, dc.name as category_name
     FROM student_difficulties sd
     JOIN students s ON s.id = sd.student_id
     LEFT JOIN difficulty_categories dc ON dc.id = sd.category_id
     ORDER BY sd.detected_at DESC LIMIT 5`
  );

  return c.json({
    stats: {
      students: studentsCount?.count || 0,
      classes: classesCount?.count || 0,
      studentsWithDifficulties: difficultiesCount?.count || 0,
      documents: documentsCount?.count || 0,
      todayAttendance: {
        total: todayAttendance?.total || 0,
        present: todayAttendance?.present || 0,
        absent: todayAttendance?.absent || 0,
        rate: todayAttendance?.total ? Math.round(((todayAttendance.present || 0) / todayAttendance.total) * 100) : 100
      }
    },
    classes,
    recentDifficulties
  });
});

// ==================== 4. Classes ====================
app.get('/api/classes', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const includeArchived = c.req.query('includeArchived') === 'true';
  const classes = await query(
    c.env.DB,
    `SELECT c.*, count(s.id) as student_count
     FROM classes c
     LEFT JOIN students s ON s.class_id = c.id AND s.status = 'active'
     WHERE c.is_archived = ? OR ? = 1
     GROUP BY c.id
     ORDER BY c.created_at ASC`,
    [includeArchived ? 1 : 0, includeArchived ? 1 : 0]
  );

  for (const cls of classes) {
    cls.groups = await query(c.env.DB, `SELECT * FROM groups WHERE class_id = ? ORDER BY name ASC`, [cls.id]);
  }

  return c.json({ classes });
});

app.post('/api/classes', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const { name, level, code, subject, room, notes, groups } = await c.req.json();
  if (!name || !level) return c.json({ error: 'اسم القسم والمستوى حقول مطلوبة' }, 400);

  const classId = generateId('cls');
  let currentYear = await queryOne<{ id: string }>(c.env.DB, `SELECT id FROM academic_years WHERE is_current = 1 LIMIT 1`);
  const yearId = currentYear?.id || 'year_2026_2027';

  await run(
    c.env.DB,
    `INSERT INTO classes (id, academic_year_id, name, level, code, subject, room, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [classId, yearId, name.trim(), level.trim(), code || null, subject || null, room || null, notes || null]
  );

  if (Array.isArray(groups)) {
    for (const g of groups) {
      if (g.name) {
        await run(c.env.DB, `INSERT INTO groups (id, class_id, name, description) VALUES (?, ?, ?, ?)`, [generateId('grp'), classId, g.name, g.description || null]);
      }
    }
  }

  return c.json({ message: 'تمت إضافة القسم بنجاح', id: classId });
});

app.put('/api/classes/:id', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const id = c.req.param('id');
  const { name, level, code, subject, room, notes, is_archived } = await c.req.json();

  await run(
    c.env.DB,
    `UPDATE classes SET name = ?, level = ?, code = ?, subject = ?, room = ?, notes = ?, is_archived = ? WHERE id = ?`,
    [name, level, code || null, subject || null, room || null, notes || null, is_archived ? 1 : 0, id]
  );

  return c.json({ message: 'تم تحديث القسم بنجاح' });
});

app.delete('/api/classes/:id', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const id = c.req.param('id');
  await run(c.env.DB, `DELETE FROM classes WHERE id = ?`, [id]);
  return c.json({ message: 'تم حذف القسم بنجاح' });
});

app.post('/api/classes/:id/groups', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const classId = c.req.param('id');
  const { name, description } = await c.req.json();
  const groupId = generateId('grp');

  await run(c.env.DB, `INSERT INTO groups (id, class_id, name, description) VALUES (?, ?, ?, ?)`, [groupId, classId, name, description || null]);
  return c.json({ message: 'تمت إضافة الفوج بنجاح', id: groupId });
});

// ==================== 5. Students ====================
app.get('/api/students', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const classId = c.req.query('classId');
  const search = c.req.query('search');
  const gender = c.req.query('gender');

  let sql = `SELECT s.*, c.name as class_name, g.name as group_name
             FROM students s
             LEFT JOIN classes c ON c.id = s.class_id
             LEFT JOIN groups g ON g.id = s.group_id
             WHERE s.status = 'active'`;
  const params: any[] = [];

  if (classId) {
    sql += ` AND s.class_id = ?`;
    params.push(classId);
  }
  if (gender) {
    sql += ` AND s.gender = ?`;
    params.push(gender);
  }
  if (search) {
    sql += ` AND (s.first_name LIKE ? OR s.last_name LIKE ? OR s.massar_code LIKE ?)`;
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  sql += ` ORDER BY s.order_num ASC, s.last_name ASC`;
  const students = await query(c.env.DB, sql, params);
  return c.json({ students });
});

app.get('/api/students/:id', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const id = c.req.param('id');
  const student = await queryOne(
    c.env.DB,
    `SELECT s.*, c.name as class_name, g.name as group_name
     FROM students s
     LEFT JOIN classes c ON c.id = s.class_id
     LEFT JOIN groups g ON g.id = s.group_id
     WHERE s.id = ?`,
    [id]
  );
  if (!student) return c.json({ error: 'المتعلم غير موجود' }, 404);

  const placements = await query(c.env.DB, `SELECT sp.*, pd.name as domain_name FROM student_placements sp JOIN placement_domains pd ON pd.id = sp.domain_id WHERE sp.student_id = ?`, [id]);
  const difficulties = await query(c.env.DB, `SELECT sd.*, dc.name as category_name FROM student_difficulties sd LEFT JOIN difficulty_categories dc ON dc.id = sd.category_id WHERE sd.student_id = ?`, [id]);
  const strengths = await query(c.env.DB, `SELECT * FROM student_strengths WHERE student_id = ?`, [id]);

  return c.json({ student, placements, difficulties, strengths });
});

app.post('/api/students', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const data = await c.req.json();
  const studentId = generateId('std');

  await run(
    c.env.DB,
    `INSERT INTO students (id, class_id, group_id, first_name, last_name, massar_code, gender, birth_date, birth_place, order_num, address, guardian_name, guardian_phone, guardian_relationship)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      studentId,
      data.class_id,
      data.group_id || null,
      data.first_name.trim(),
      data.last_name.trim(),
      data.massar_code ? data.massar_code.trim() : null,
      data.gender || 'M',
      data.birth_date || null,
      data.birth_place || null,
      data.order_num || null,
      data.address || null,
      data.guardian_name || null,
      data.guardian_phone || null,
      data.guardian_relationship || 'أب'
    ]
  );

  return c.json({ message: 'تمت إضافة المتعلم بنجاح', id: studentId });
});

app.put('/api/students/:id', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const id = c.req.param('id');
  const data = await c.req.json();

  await run(
    c.env.DB,
    `UPDATE students SET 
      class_id = ?, group_id = ?, first_name = ?, last_name = ?, massar_code = ?, gender = ?,
      birth_date = ?, birth_place = ?, order_num = ?, address = ?, guardian_name = ?,
      guardian_phone = ?, guardian_relationship = ?
     WHERE id = ?`,
    [
      data.class_id,
      data.group_id || null,
      data.first_name.trim(),
      data.last_name.trim(),
      data.massar_code ? data.massar_code.trim() : null,
      data.gender || 'M',
      data.birth_date || null,
      data.birth_place || null,
      data.order_num || null,
      data.address || null,
      data.guardian_name || null,
      data.guardian_phone || null,
      data.guardian_relationship || 'أب',
      id
    ]
  );

  return c.json({ message: 'تم تحديث بيانات المتعلم بنجاح' });
});

app.delete('/api/students/:id', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const id = c.req.param('id');
  await run(c.env.DB, `DELETE FROM students WHERE id = ?`, [id]);
  return c.json({ message: 'تم حذف المتعلم بنجاح' });
});

app.post('/api/students/csv-commit', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const { records, targetClassId } = await c.req.json();
  if (!Array.isArray(records) || records.length === 0) {
    return c.json({ error: 'لا توجد بيانات للاستيراد' }, 400);
  }

  let imported = 0;
  for (const r of records) {
    const studentId = generateId('std');
    await run(
      c.env.DB,
      `INSERT INTO students (id, class_id, first_name, last_name, massar_code, gender, birth_date, order_num)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        studentId,
        targetClassId || r.class_id,
        r.first_name || 'بدون اسم',
        r.last_name || '',
        r.massar_code || null,
        r.gender || 'M',
        r.birth_date || null,
        r.order_num || (imported + 1)
      ]
    );
    imported++;
  }

  return c.json({ message: `تم استيراد ${imported} متعلم بنجاح` });
});

// Export students to CSV
app.get('/api/students/export/csv', async (c) => {
  const classId = c.req.query('classId');
  let sql = `SELECT s.*, c.name as class_name FROM students s LEFT JOIN classes c ON c.id = s.class_id WHERE s.status = 'active'`;
  const params: any[] = [];
  if (classId) {
    sql += ` AND s.class_id = ?`;
    params.push(classId);
  }
  sql += ` ORDER BY s.order_num ASC, s.last_name ASC`;
  const students = await query<any>(c.env.DB, sql, params);

  let csv = '\uFEFFالرقم الترتيبي,رمز مسار,النسب,الاسم,الجنس,تاريخ الازدياد,القسم,ولي الأمر,الهاتف\n';
  for (const s of students) {
    csv += `"${s.order_num || ''}","${s.massar_code || ''}","${s.last_name || ''}","${s.first_name || ''}","${s.gender === 'F' ? 'أنثى' : 'ذكر'}","${s.birth_date || ''}","${s.class_name || ''}","${s.guardian_name || ''}","${s.guardian_phone || ''}"\n`;
  }

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="students-${Date.now()}.csv"`
    }
  });
});

// ==================== 6. Placements (الموضعة TaRL) ====================
app.get('/api/placements/domains', async (c) => {
  const domains = await query(c.env.DB, `SELECT * FROM placement_domains ORDER BY id ASC`);
  return c.json({ domains });
});

app.get('/api/placements', async (c) => {
  const classId = c.req.query('classId');
  const domainId = c.req.query('domainId');
  const period = c.req.query('period');

  let sql = `SELECT sp.*, s.first_name, s.last_name, s.order_num, pd.name as domain_name, pd.code as domain_code
             FROM student_placements sp
             JOIN students s ON s.id = sp.student_id
             JOIN placement_domains pd ON pd.id = sp.domain_id
             WHERE 1=1`;
  const params: any[] = [];

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

  const placements = await query(c.env.DB, sql, params);
  return c.json({ placements });
});

app.post('/api/placements/batch', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const { records } = await c.req.json();
  if (!Array.isArray(records)) return c.json({ error: 'بيانات غير صالحة' }, 400);

  for (const r of records) {
    await run(
      c.env.DB,
      `INSERT OR REPLACE INTO student_placements (id, student_id, domain_id, level_code, level_name, period, score, notes, evaluated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id || generateId('plc'),
        r.student_id,
        r.domain_id,
        r.level_code,
        r.level_name || r.level_code,
        r.period || 'تشخيصي',
        r.score !== undefined ? r.score : null,
        r.notes || null,
        r.evaluated_at || new Date().toISOString()
      ]
    );
  }

  return c.json({ message: 'تم حفظ نتائج الموضعة بنجاح' });
});

// ==================== 7. Difficulties & Strengths ====================
app.get('/api/difficulties/categories', async (c) => {
  const categories = await query(c.env.DB, `SELECT * FROM difficulty_categories ORDER BY id ASC`);
  return c.json({ categories });
});

app.get('/api/difficulties', async (c) => {
  const classId = c.req.query('classId');
  let sql = `SELECT sd.*, s.first_name, s.last_name, dc.name as category_name, dc.code as category_code
             FROM student_difficulties sd
             JOIN students s ON s.id = sd.student_id
             LEFT JOIN difficulty_categories dc ON dc.id = sd.category_id
             WHERE 1=1`;
  const params: any[] = [];
  if (classId) {
    sql += ` AND s.class_id = ?`;
    params.push(classId);
  }
  sql += ` ORDER BY sd.detected_at DESC`;
  const difficulties = await query(c.env.DB, sql, params);
  return c.json({ difficulties });
});

app.post('/api/difficulties', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const data = await c.req.json();
  const id = generateId('diff');
  await run(
    c.env.DB,
    `INSERT INTO student_difficulties (id, student_id, category_id, title, description, severity, status, proposed_action)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.student_id, data.category_id, data.title, data.description || null, data.severity || 'medium', data.status || 'identified', data.proposed_action || null]
  );
  return c.json({ message: 'تم تسجيل الصعوبة بنجاح', id });
});

app.put('/api/difficulties/:id', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const id = c.req.param('id');
  const data = await c.req.json();
  await run(
    c.env.DB,
    `UPDATE student_difficulties SET status = ?, severity = ?, proposed_action = ?, notes = ? WHERE id = ?`,
    [data.status, data.severity, data.proposed_action || null, data.notes || null, id]
  );
  return c.json({ message: 'تم تحديث الصعوبة بنجاح' });
});

app.delete('/api/difficulties/:id', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const id = c.req.param('id');
  await run(c.env.DB, `DELETE FROM student_difficulties WHERE id = ?`, [id]);
  return c.json({ message: 'تم حذف الصعوبة بنجاح' });
});

app.get('/api/strengths', async (c) => {
  const studentId = c.req.query('studentId');
  let sql = `SELECT ss.*, s.first_name, s.last_name FROM student_strengths ss JOIN students s ON s.id = ss.student_id`;
  const params: any[] = [];
  if (studentId) {
    sql += ` WHERE ss.student_id = ?`;
    params.push(studentId);
  }
  const strengths = await query(c.env.DB, sql, params);
  return c.json({ strengths });
});

app.post('/api/strengths', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const data = await c.req.json();
  const id = generateId('str');
  await run(
    c.env.DB,
    `INSERT INTO student_strengths (id, student_id, title, description, domain) VALUES (?, ?, ?, ?, ?)`,
    [id, data.student_id, data.title, data.description || null, data.domain || 'عام']
  );
  return c.json({ message: 'تمت إضافة نقطة القوة بنجاح', id });
});

app.delete('/api/strengths/:id', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const id = c.req.param('id');
  await run(c.env.DB, `DELETE FROM student_strengths WHERE id = ?`, [id]);
  return c.json({ message: 'تم حذف نقطة القوة بنجاح' });
});

// ==================== 8. Attendance & Holidays ====================
app.get('/api/attendance/month', async (c) => {
  const classId = c.req.query('classId');
  const year = c.req.query('year');
  const month = c.req.query('month');

  if (!classId || !year || !month) return c.json({ error: 'بيانات البحث غير مكتملة' }, 400);

  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const records = await query(
    c.env.DB,
    `SELECT a.* FROM attendance a
     JOIN students s ON s.id = a.student_id
     WHERE s.class_id = ? AND a.date LIKE ?`,
    [classId, `${prefix}%`]
  );

  return c.json({ records });
});

app.post('/api/attendance/batch', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const { records } = await c.req.json();
  if (!Array.isArray(records)) return c.json({ error: 'بيانات غير صالحة' }, 400);

  for (const r of records) {
    await run(
      c.env.DB,
      `INSERT OR REPLACE INTO attendance (id, student_id, date, status, period, reason, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id || generateId('att'),
        r.student_id,
        r.date,
        r.status || 'present',
        r.period || 'full_day',
        r.reason || null,
        r.notes || null
      ]
    );
  }

  return c.json({ message: 'تم تسجيل الغياب بنجاح' });
});

app.get('/api/holidays', async (c) => {
  const holidays = await query(c.env.DB, `SELECT * FROM holidays ORDER BY start_date ASC`);
  return c.json({ holidays });
});

app.post('/api/holidays', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const data = await c.req.json();
  const id = generateId('hol');
  await run(
    c.env.DB,
    `INSERT INTO holidays (id, academic_year_id, name, start_date, end_date, is_single_day) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.academic_year || 'year_2026_2027', data.name, data.start_date, data.end_date || data.start_date, data.start_date === data.end_date ? 1 : 0]
  );
  return c.json({ message: 'تمت إضافة العطلة بنجاح', id });
});

app.delete('/api/holidays/:id', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const id = c.req.param('id');
  await run(c.env.DB, `DELETE FROM holidays WHERE id = ?`, [id]);
  return c.json({ message: 'تم حذف العطلة بنجاح' });
});

// ==================== 9. Assignments & Assessments ====================
app.get('/api/assignments', async (c) => {
  const classId = c.req.query('classId');
  let sql = `SELECT a.*, c.name as class_name, count(ar.id) as total_submissions
             FROM assignments a
             LEFT JOIN classes c ON c.id = a.class_id
             LEFT JOIN assignment_records ar ON ar.assignment_id = a.id
             WHERE 1=1`;
  const params: any[] = [];
  if (classId) {
    sql += ` AND a.class_id = ?`;
    params.push(classId);
  }
  sql += ` GROUP BY a.id ORDER BY a.due_date DESC`;
  const assignments = await query(c.env.DB, sql, params);
  return c.json({ assignments });
});

app.get('/api/assignments/:id', async (c) => {
  const id = c.req.param('id');
  const assignment = await queryOne(c.env.DB, `SELECT a.*, c.name as class_name FROM assignments a LEFT JOIN classes c ON c.id = a.class_id WHERE a.id = ?`, [id]);
  if (!assignment) return c.json({ error: 'الواجب غير موجود' }, 404);

  const records = await query(
    c.env.DB,
    `SELECT ar.*, s.first_name, s.last_name, s.order_num
     FROM assignment_records ar
     JOIN students s ON s.id = ar.student_id
     WHERE ar.assignment_id = ?
     ORDER BY s.order_num ASC`,
    [id]
  );

  return c.json({ assignment, records });
});

app.post('/api/assignments', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const data = await c.req.json();
  const id = generateId('asg');
  await run(
    c.env.DB,
    `INSERT INTO assignments (id, class_id, title, subject, description, due_date) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.class_id, data.title, data.subject || null, data.description || null, data.due_date]
  );
  return c.json({ message: 'تم إنشاء الواجب بنجاح', id });
});

app.post('/api/assignments/:id/batch-status', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const assignmentId = c.req.param('id');
  const { records } = await c.req.json();
  if (!Array.isArray(records)) return c.json({ error: 'بيانات غير صالحة' }, 400);

  for (const r of records) {
    await run(
      c.env.DB,
      `INSERT OR REPLACE INTO assignment_records (id, assignment_id, student_id, status, score, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [r.id || generateId('asr'), assignmentId, r.student_id, r.status || 'pending', r.score || null, r.notes || null]
    );
  }
  return c.json({ message: 'تم حفظ حالة إنجاز الواجبات' });
});

app.delete('/api/assignments/:id', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const id = c.req.param('id');
  await run(c.env.DB, `DELETE FROM assignments WHERE id = ?`, [id]);
  return c.json({ message: 'تم حذف الواجب بنجاح' });
});

app.get('/api/assessments', async (c) => {
  const studentId = c.req.query('studentId');
  let sql = `SELECT * FROM assessments`;
  const params: any[] = [];
  if (studentId) {
    sql += ` WHERE student_id = ?`;
    params.push(studentId);
  }
  sql += ` ORDER BY assessment_date DESC`;
  const assessments = await query(c.env.DB, sql, params);
  return c.json({ assessments });
});

app.post('/api/assessments', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const data = await c.req.json();
  const id = generateId('ass');
  await run(
    c.env.DB,
    `INSERT INTO assessments (id, student_id, title, subject, score, max_score, period, assessment_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, data.student_id, data.title, data.subject, data.score, data.max_score || 10, data.period || 'مراقبة مستمرة', data.assessment_date || new Date().toISOString().split('T')[0], data.notes || null]
  );
  return c.json({ message: 'تم تسجيل التقييم بنجاح', id });
});

// ==================== 10. Documents & Folders ====================
app.get('/api/documents/categories', async (c) => {
  const categories = await query(c.env.DB, `SELECT * FROM document_categories ORDER BY id ASC`);
  return c.json({ categories });
});

app.get('/api/folders', async (c) => {
  const folders = await query(c.env.DB, `SELECT * FROM folders ORDER BY name ASC`);
  return c.json({ folders });
});

app.post('/api/folders', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const { name, parent_id } = await c.req.json();
  const id = generateId('fld');
  await run(c.env.DB, `INSERT INTO folders (id, name, parent_id) VALUES (?, ?, ?)`, [id, name, parent_id || null]);
  return c.json({ message: 'تم إنشاء المجلد بنجاح', id });
});

app.delete('/api/folders/:id', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const id = c.req.param('id');
  await run(c.env.DB, `DELETE FROM folders WHERE id = ?`, [id]);
  return c.json({ message: 'تم حذف المجلد بنجاح' });
});

app.get('/api/documents', async (c) => {
  const folderId = c.req.query('folderId');
  const categoryId = c.req.query('categoryId');
  const search = c.req.query('search');

  let sql = `SELECT d.*, dc.name as category_name, f.name as folder_name
             FROM documents d
             LEFT JOIN document_categories dc ON dc.id = d.category_id
             LEFT JOIN folders f ON f.id = d.folder_id
             WHERE 1=1`;
  const params: any[] = [];

  if (folderId) {
    sql += ` AND d.folder_id = ?`;
    params.push(folderId);
  }
  if (categoryId) {
    sql += ` AND d.category_id = ?`;
    params.push(categoryId);
  }
  if (search) {
    sql += ` AND (d.title LIKE ? OR d.description LIKE ? OR d.tags LIKE ?)`;
    const t = `%${search.trim()}%`;
    params.push(t, t, t);
  }

  sql += ` ORDER BY d.is_favorite DESC, d.created_at DESC`;
  const documents = await query(c.env.DB, sql, params);
  return c.json({ documents });
});

app.get('/api/documents/:id', async (c) => {
  const id = c.req.param('id');
  const document = await queryOne(c.env.DB, `SELECT * FROM documents WHERE id = ?`, [id]);
  if (!document) return c.json({ error: 'الوثيقة غير موجودة' }, 404);
  return c.json({ document });
});

app.post('/api/documents', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const data = await c.req.json();
  const id = generateId('doc');
  await run(
    c.env.DB,
    `INSERT INTO documents (id, folder_id, category_id, title, description, file_path, file_type, file_size, tags, is_favorite)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.folder_id || null,
      data.category_id || null,
      data.title,
      data.description || null,
      data.file_path || null,
      data.file_type || 'application/pdf',
      data.file_size || 0,
      data.tags || null,
      data.is_favorite ? 1 : 0
    ]
  );
  return c.json({ message: 'تمت إضافة الوثيقة بنجاح', id });
});

app.put('/api/documents/:id', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const id = c.req.param('id');
  const data = await c.req.json();
  await run(
    c.env.DB,
    `UPDATE documents SET title = ?, description = ?, category_id = ?, folder_id = ?, tags = ? WHERE id = ?`,
    [data.title, data.description || null, data.category_id || null, data.folder_id || null, data.tags || null, id]
  );
  return c.json({ message: 'تم تحديث الوثيقة بنجاح' });
});

app.post('/api/documents/:id/favorite', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const id = c.req.param('id');
  await run(c.env.DB, `UPDATE documents SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END WHERE id = ?`, [id]);
  return c.json({ message: 'تم تحديث التفضيل' });
});

app.delete('/api/documents/:id', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const id = c.req.param('id');
  await run(c.env.DB, `DELETE FROM documents WHERE id = ?`, [id]);
  return c.json({ message: 'تم حذف الوثيقة بنجاح' });
});

// ==================== 11. Settings & Backup ====================
app.get('/api/settings', async (c) => {
  const settingsRows = await query<{ key: string; value: string }>(c.env.DB, `SELECT key, value FROM settings`);
  const settings: Record<string, string> = {};
  for (const row of settingsRows) {
    settings[row.key] = row.value;
  }
  return c.json({ settings });
});

app.post('/api/settings', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const data = await c.req.json();
  for (const [k, v] of Object.entries(data)) {
    await run(c.env.DB, `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))`, [k, String(v)]);
  }
  return c.json({ message: 'تم حفظ الإعدادات بنجاح' });
});

app.get('/api/settings/years', async (c) => {
  const years = await query(c.env.DB, `SELECT * FROM academic_years ORDER BY start_date DESC`);
  return c.json({ years });
});

app.post('/api/settings/years', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const data = await c.req.json();
  const id = generateId('year');
  await run(
    c.env.DB,
    `INSERT INTO academic_years (id, name, is_current, start_date, end_date, notes) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, data.name, data.is_current ? 1 : 0, data.start_date || null, data.end_date || null, data.notes || null]
  );
  return c.json({ message: 'تمت إضافة السنة الدراسية بنجاح', id });
});

app.post('/api/settings/years/:id/activate', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const id = c.req.param('id');
  await run(c.env.DB, `UPDATE academic_years SET is_current = 0`);
  await run(c.env.DB, `UPDATE academic_years SET is_current = 1 WHERE id = ?`, [id]);
  return c.json({ message: 'تم تفعيل السنة الدراسية بنجاح' });
});

app.get('/api/settings/activity-logs', async (c) => {
  const logs = await query(c.env.DB, `SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 50`);
  return c.json({ logs });
});

app.get('/api/settings/backup/json', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const tables = ['users', 'classes', 'groups', 'students', 'student_placements', 'student_difficulties', 'student_strengths', 'attendance', 'assignments', 'assessments', 'documents', 'folders', 'holidays', 'settings'];
  const backup: Record<string, any[]> = {};
  for (const t of tables) {
    try {
      backup[t] = await query(c.env.DB, `SELECT * FROM ${t}`);
    } catch {}
  }
  return c.json({
    version: '1.0',
    exported_at: new Date().toISOString(),
    data: backup
  });
});

app.post('/api/settings/backup/import', async (c) => {
  const user = await authenticate(c);
  if (!user) return c.json({ error: 'غير مصرح به' }, 401);

  const body = await c.req.json();
  const backup = body.data || body;
  let importedCount = 0;

  for (const [table, rows] of Object.entries(backup)) {
    if (Array.isArray(rows) && rows.length > 0) {
      for (const row of rows) {
        try {
          const cols = Object.keys(row);
          const placeholders = cols.map(() => '?').join(', ');
          const values = Object.values(row);
          await run(c.env.DB, `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`, values);
          importedCount++;
        } catch {}
      }
    }
  }

  return c.json({ message: `تمت استعادة النسخة الاحتياطية بنجاح (${importedCount} سجل)` });
});

// ==================== 12. Search ====================
app.get('/api/search', async (c) => {
  const q = c.req.query('q');
  if (!q || q.trim().length < 2) return c.json({ results: { students: [], documents: [], classes: [] } });

  const term = `%${q.trim()}%`;
  const students = await query(c.env.DB, `SELECT id, first_name, last_name, massar_code FROM students WHERE first_name LIKE ? OR last_name LIKE ? OR massar_code LIKE ? LIMIT 5`, [term, term, term]);
  const documents = await query(c.env.DB, `SELECT id, title, description FROM documents WHERE title LIKE ? OR description LIKE ? LIMIT 5`, [term, term]);
  const classes = await query(c.env.DB, `SELECT id, name, level FROM classes WHERE name LIKE ? OR level LIKE ? LIMIT 5`, [term, term]);

  return c.json({ results: { students, documents, classes } });
});

// ==================== 13. Reports ====================
app.get('/api/reports/student/:id', async (c) => {
  const id = c.req.param('id');
  const student = await queryOne(c.env.DB, `SELECT s.*, c.name as class_name FROM students s LEFT JOIN classes c ON c.id = s.class_id WHERE s.id = ?`, [id]);
  if (!student) return c.json({ error: 'المتعلم غير موجود' }, 404);

  const placements = await query(c.env.DB, `SELECT sp.*, pd.name as domain_name FROM student_placements sp JOIN placement_domains pd ON pd.id = sp.domain_id WHERE sp.student_id = ?`, [id]);
  const difficulties = await query(c.env.DB, `SELECT sd.*, dc.name as category_name FROM student_difficulties sd LEFT JOIN difficulty_categories dc ON dc.id = sd.category_id WHERE sd.student_id = ?`, [id]);
  const strengths = await query(c.env.DB, `SELECT * FROM student_strengths WHERE student_id = ?`, [id]);
  const attendance = await query(c.env.DB, `SELECT * FROM attendance WHERE student_id = ? ORDER BY date DESC LIMIT 30`, [id]);
  const assessments = await query(c.env.DB, `SELECT * FROM assessments WHERE student_id = ? ORDER BY assessment_date DESC`, [id]);

  return c.json({ report: { student, placements, difficulties, strengths, attendance, assessments } });
});

app.get('/api/reports/class/:id', async (c) => {
  const id = c.req.param('id');
  const cls = await queryOne(c.env.DB, `SELECT * FROM classes WHERE id = ?`, [id]);
  if (!cls) return c.json({ error: 'القسم غير موجود' }, 404);

  const students = await query(c.env.DB, `SELECT * FROM students WHERE class_id = ? AND status = 'active' ORDER BY order_num ASC`, [id]);
  const difficulties = await query(c.env.DB, `SELECT sd.*, dc.name as category_name FROM student_difficulties sd JOIN students s ON s.id = sd.student_id LEFT JOIN difficulty_categories dc ON dc.id = sd.category_id WHERE s.class_id = ?`, [id]);

  return c.json({ report: { class: cls, students, difficulties } });
});

// ==================== 14. Fallback for Static Assets (React App) ====================
app.all('*', async (c) => {
  // If static assets binding exists in Cloudflare Worker, forward the request
  if (c.env.ASSETS) {
    return await c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text('Not Found', 404);
});

export default app;
