import initSqlJs, { type Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

let dbInstance: SqlJsDatabase | null = null;
const dbDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dbDir, 'app_assistant.sqlite');

export interface QueryResult<T = any> {
  rows: T[];
}

export function saveDatabase() {
  if (!dbInstance) return;
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const data = dbInstance.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

export function getDatabaseBinary(): Uint8Array {
  if (!dbInstance) {
    if (fs.existsSync(dbPath)) {
      return fs.readFileSync(dbPath);
    }
    return new Uint8Array();
  }
  return dbInstance.export();
}

export async function initDb(): Promise<SqlJsDatabase> {
  return await getDb();
}

export async function getDb(): Promise<SqlJsDatabase> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.error('Error loading existing sqlite file, creating fresh database:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  await initializeSchemaAndSeeds(dbInstance);
  return dbInstance;
}

// Helper to convert parameters for sql.js prepared statements
function normalizeParams(params: any[] = []): any[] {
  return params.map(val => {
    if (val === undefined || val === null) return null;
    if (typeof val === 'boolean') return val ? 1 : 0;
    return val;
  });
}

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDb();
  const normParams = normalizeParams(params);
  const stmt = db.prepare(sql);
  
  if (normParams.length > 0) {
    stmt.bind(normParams);
  }

  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return results;
}

export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function run(sql: string, params: any[] = []): Promise<void> {
  const db = await getDb();
  const normParams = normalizeParams(params);
  db.run(sql, normParams);
  saveDatabase();
}

export async function exec(sql: string): Promise<void> {
  const db = await getDb();
  db.exec(sql);
  saveDatabase();
}

/**
 * Initialize Tables from schema.sql and seed default pedagogical content
 */
async function initializeSchemaAndSeeds(db: SqlJsDatabase) {
  const schemaPath = path.join(process.cwd(), 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schemaSql);
  }

  // Check if users exist
  const stmt = db.prepare('SELECT count(*) as count FROM users');
  stmt.step();
  const row = stmt.getAsObject() as { count: number };
  stmt.free();

  if (row.count === 0) {
    console.log('Seeding initial pedagogical data for Moroccan teacher...');
    const now = new Date().toISOString();
    const adminPasswordHash = bcrypt.hashSync('admin123', 10);

    // 1. Default Teacher
    db.run(
      `INSERT INTO users (id, username, password_hash, full_name, email, phone, role, school_name, school_city, school_phone, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'usr_teacher_1',
        'admin',
        adminPasswordHash,
        'الأستاذ رشيد الفاسي',
        'rachid.teacher@taalim.ma',
        '0661234567',
        'teacher',
        'مدرسة ابن خلدون الابتدائية',
        'الرباط',
        '0537000000',
        now
      ]
    );

    // 2. Default Academic Year
    db.run(
      `INSERT INTO academic_years (id, name, is_current, start_date, end_date, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['year_2026_2027', '2026-2027', 1, '2026-09-01', '2027-06-30', 'المقرر الوزاري لتنظيم السنة الدراسية 2026/2027', now]
    );

    // 3. Default Classes & Groups
    db.run(
      `INSERT INTO classes (id, academic_year_id, name, level, code, subject, room, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['cls_5_1', 'year_2026_2027', 'المستوى الخامس - فوج 1', 'المستوى الخامس ابتدائي', '5-A', 'اللغة العربية والاجتماعيات', 'القاعة 3', 'مؤسسة الريادة']
    );

    db.run(
      `INSERT INTO classes (id, academic_year_id, name, level, code, subject, room, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['cls_6_1', 'year_2026_2027', 'المستوى السادس - فوج 1', 'المستوى السادس ابتدائي', '6-A', 'اللغة العربية والتربية الإسلامية', 'القاعة 4', 'مؤسسة الريادة']
    );

    db.run(
      `INSERT INTO groups (id, class_id, name, description) VALUES (?, ?, ?, ?)`,
      ['grp_5_a', 'cls_5_1', 'الفوج أ', 'الحصة الصباحية']
    );
    db.run(
      `INSERT INTO groups (id, class_id, name, description) VALUES (?, ?, ?, ?)`,
      ['grp_5_b', 'cls_5_1', 'الفوج ب', 'الحصة المسائية']
    );

    // 4. Default Placement Domains (المجالات الافتراضية للموضعة مثل TaRL)
    const domains = [
      { id: 'dom_reading', name: 'القراءة', code: 'reading', desc: 'روائز القراءة باللغة العربية (مبتدئ، حرف، كلمة، فقرة، أقصوصة)' },
      { id: 'dom_comprehension', name: 'الفهم', code: 'comprehension', desc: 'فهم المقروء واستخراج المعاني الضمنية والصريحة' },
      { id: 'dom_writing', name: 'الكتابة والإملاء', code: 'writing', desc: 'الرسم الإملائي والإنتاج الكتابي السليم' },
      { id: 'dom_math', name: 'الرياضيات والعمليات', code: 'math', desc: 'الحساب، الجمع، الطرح، الضرب، والقسمة وحل المسائل' }
    ];
    for (const d of domains) {
      db.run(`INSERT INTO placement_domains (id, name, code, description, is_default) VALUES (?, ?, ?, ?, 1)`, [d.id, d.name, d.code, d.desc]);
    }

    // 5. Difficulty Categories
    const difficulties = [
      { id: 'diff_reading', name: 'القراءة والتهجي', code: 'reading' },
      { id: 'diff_writing', name: 'الكتابة والرسم الإملائي', code: 'writing' },
      { id: 'diff_calc', name: 'الحساب والعمليات الأساسية', code: 'math' },
      { id: 'diff_focus', name: 'التركيز والانتباه', code: 'focus' },
      { id: 'diff_distract', name: 'التشتت وفرط الحركة', code: 'distraction' },
      { id: 'diff_comp', name: 'الفهم والاستيعاب', code: 'comprehension' },
      { id: 'diff_express', name: 'التعبير الشفهي والتواصل', code: 'expression' },
      { id: 'diff_other', name: 'صعوبات أخرى', code: 'other' }
    ];
    for (const diff of difficulties) {
      db.run(`INSERT INTO difficulty_categories (id, name, code, is_default) VALUES (?, ?, ?, 1)`, [diff.id, diff.name, diff.code]);
    }

    // 6. Moroccan Holidays 2026/2027
    const holidays = [
      { id: 'hol_1', name: 'عيد المولد النبوي الشريف', start: '2026-09-15', end: '2026-09-16' },
      { id: 'hol_2', name: 'العطلة البينية الأولى', start: '2026-10-25', end: '2026-11-01' },
      { id: 'hol_3', name: 'ذكرى المسيرة الخضراء', start: '2026-11-06', end: '2026-11-06', single: 1 },
      { id: 'hol_4', name: 'عيد الاستقلال', start: '2026-11-18', end: '2026-11-18', single: 1 },
      { id: 'hol_5', name: 'العطلة البينية الثانية', start: '2026-12-06', end: '2026-12-13' },
      { id: 'hol_6', name: 'فاتح السنة الميلادية', start: '2027-01-01', end: '2027-01-01', single: 1 },
      { id: 'hol_7', name: 'ذكرى تقديم وثيقة الاستقلال', start: '2027-01-11', end: '2027-01-11', single: 1 },
      { id: 'hol_8', name: 'عطلة منتصف السنة الدراسية', start: '2027-01-24', end: '2027-01-31' },
      { id: 'hol_9', name: 'العطلة البينية الثالثة', start: '2027-03-14', end: '2027-03-21' },
      { id: 'hol_10', name: 'العطلة البينية الرابعة وعيد الفطر', start: '2027-05-02', end: '2027-05-09' }
    ];
    for (const h of holidays) {
      db.run(
        `INSERT INTO holidays (id, academic_year_id, name, start_date, end_date, is_single_day) VALUES (?, ?, ?, ?, ?, ?)`,
        [h.id, 'year_2026_2027', h.name, h.start, h.end, h.single ? 1 : 0]
      );
    }

    // 7. Seed Students (Moroccan names, realistic data)
    const demoStudents = [
      { id: 'std_1', first: 'أحمد', last: 'العمراوي', gender: 'ذكر', birth: '2015-03-12', massar: 'M130024891', grp: 'grp_5_a',
        f_name: 'محمد العمراوي', f_job: 'موظف بريد', f_phone: '0662112233', m_name: 'فاطمة الزهراء البقالي', m_job: 'أستاذة', m_phone: '0663445566',
        social: 'مستقرة', health_notes: 'يعاني من ضعف خفيف في الإبصار', health_prec: 'الجلوس في الصف الأول ومراعاة حجم خط السبورة' },
      { id: 'std_2', first: 'مريم', last: 'التلمساني', gender: 'أنثى', birth: '2015-07-25', massar: 'M130098432', grp: 'grp_5_a',
        f_name: 'يوسف التلمساني', f_job: 'تاجر', f_phone: '0671889900', m_name: 'خديجة الوزاني', m_job: 'ربة بيت', m_phone: '0672001122',
        social: 'مستقرة', health_notes: 'لا توجد ملاحظات صحية خاصة', health_prec: 'عادي' },
      { id: 'std_3', first: 'سفيان', last: 'بلمعطي', gender: 'ذكر', birth: '2015-01-18', massar: 'M130055611', grp: 'grp_5_b',
        f_name: 'عبد الرحيم بلمعطي', f_job: 'سائق', f_phone: '0654332211', m_name: 'حليمة السعيدي', m_job: 'ربة بيت', m_phone: '0655443322',
        social: 'مستقرة', health_notes: 'حساسية موسمية تستدعي تجنب الأتربة المباشرة', health_prec: 'إبعاد المتعلم عن مسحوق الطباشير أو الغبار' },
      { id: 'std_4', first: 'إيمان', last: 'المرابط', gender: 'أنثى', birth: '2015-11-05', massar: 'M130077884', grp: 'grp_5_a',
        f_name: 'عزيز المرابط', f_job: 'تقني معلوميات', f_phone: '0668990011', m_name: 'نادية الشاوي', m_job: 'ممرضة', m_phone: '0669112233',
        social: 'مستقرة', health_notes: 'لا توجد ملاحظات صحية', health_prec: 'عادي' },
      { id: 'std_5', first: 'ياسين', last: 'الركراكي', gender: 'ذكر', birth: '2015-05-30', massar: 'M130012399', grp: 'grp_5_b',
        f_name: 'إبراهيم الركراكي', f_job: 'فلاح', f_phone: '0645001122', m_name: 'سعيدة العلمي', m_job: 'ربة بيت', m_phone: '0646112233',
        social: 'مستقرة', health_notes: 'يحتاج تشجيعاً مستمراً لتقوية الثقة بالنفس وتجنب الإجهاد', health_prec: 'منحه وقتاً إضافياً في الإنجاز الكتابي' },
      { id: 'std_6', first: 'زينب', last: 'العلوي', gender: 'أنثى', birth: '2015-08-14', massar: 'M130044552', grp: 'grp_5_a',
        f_name: 'الحسن العلوي', f_job: 'مهندس', f_phone: '0661998877', m_name: 'أمينة بنجلون', m_job: 'صيدلانية', m_phone: '0662887766',
        social: 'مستقرة', health_notes: 'لا توجد ملاحظات', health_prec: 'عادي' },
      { id: 'std_7', first: 'عمر', last: 'الخطابي', gender: 'ذكر', birth: '2014-12-03', massar: 'M130066113', grp: 'grp_5_b',
        f_name: 'طارق الخطابي', f_job: 'محاسب', f_phone: '0678112244', m_name: 'سكينة الصقلي', m_job: 'أستاذة جامعية', m_phone: '0679223355',
        social: 'مستقرة', health_notes: 'لا توجد ملاحظات', health_prec: 'عادي' },
      { id: 'std_8', first: 'هبة', last: 'المنصوري', gender: 'أنثى', birth: '2015-04-20', massar: 'M130033221', grp: 'grp_5_a',
        f_name: 'مصطفى المنصوري', f_job: 'أستاذ', f_phone: '0651778899', m_name: 'ليلى الدكالي', m_job: 'مهندسة معمارية', m_phone: '0652889900',
        social: 'مستقرة', health_notes: 'لا توجد ملاحظات', health_prec: 'عادي' },
      { id: 'std_9', first: 'حمزة', last: 'السوسي', gender: 'ذكر', birth: '2015-09-09', massar: 'M130088992', grp: 'grp_5_b',
        f_name: 'سليمان السوسي', f_job: 'تاجر مواد غذائية', f_phone: '0664556677', m_name: 'راضية التيجاني', m_job: 'ربة بيت', m_phone: '0665667788',
        social: 'مستقرة', health_notes: 'صعوبة خفيفة في السمع بالأذن اليسرى', health_prec: 'الجلوس في الجهة اليمنى من الصف الأول' },
      { id: 'std_10', first: 'سارة', last: 'التازي', gender: 'أنثى', birth: '2015-02-14', massar: 'M130011447', grp: 'grp_5_a',
        f_name: 'كريم التازي', f_job: 'طبيب عام', f_phone: '0661334455', m_name: 'مريم الفيلالي', m_job: 'محامية', m_phone: '0662445566',
        social: 'مستقرة', health_notes: 'لا توجد ملاحظات', health_prec: 'عادي' }
    ];

    for (const s of demoStudents) {
      const fullName = `${s.first} ${s.last}`;
      db.run(
        `INSERT INTO students (id, class_id, group_id, first_name, last_name, full_name, gender, birth_date, massar_code, enrollment_date, general_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [s.id, 'cls_5_1', s.grp, s.first, s.last, fullName, s.gender, s.birth, s.massar, '2026-09-02', 'تلميذ مجتهد ويشارك بانتظام']
      );

      db.run(
        `INSERT INTO parents (id, student_id, father_name, father_job, father_phone, mother_name, mother_job, mother_phone, relationship, siblings_count, birth_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'الوالدان', 2, 1)`,
        [`par_${s.id}`, s.id, s.f_name, s.f_job, s.f_phone, s.m_name, s.m_job, s.m_phone]
      );

      db.run(
        `INSERT INTO student_social_info (id, student_id, social_status, living_with, general_social_notes)
         VALUES (?, ?, ?, 'الوالدين', 'بيئة أسرية ملائمة للدراسة والتحصيل')`,
        [`soc_${s.id}`, s.id, s.social]
      );

      db.run(
        `INSERT INTO student_health_notes (id, student_id, notes, precautions, show_in_family_report)
         VALUES (?, ?, ?, ?, 0)`,
        [`hlt_${s.id}`, s.id, s.health_notes, s.health_prec]
      );
    }

    // 8. Seed Placements (Historical TaRL progression demo)
    const placementsData = [
      { id: 'plc_1', std: 'std_1', dom: 'dom_reading', lvl: 'حرف', date: '2026-09-10', period: 'شتنبر', note: 'تعثر في قراءة المقاطع الطويلة' },
      { id: 'plc_2', std: 'std_1', dom: 'dom_reading', lvl: 'كلمة', date: '2026-10-15', period: 'أكتوبر', note: 'تحسن ملموس في تهجي الكلمات البسيطة' },
      { id: 'plc_3', std: 'std_1', dom: 'dom_reading', lvl: 'فقرة', date: '2026-12-05', period: 'دجنبر', note: 'قراءة سلسلة لفقرة قصيرة مع احترام الفواصل' },
      
      { id: 'plc_4', std: 'std_2', dom: 'dom_reading', lvl: 'كلمة', date: '2026-09-10', period: 'شتنبر', note: 'بداية جيدة' },
      { id: 'plc_5', std: 'std_2', dom: 'dom_reading', lvl: 'فقرة', date: '2026-10-20', period: 'أكتوبر', note: 'تطور سريع' },
      { id: 'plc_6', std: 'std_2', dom: 'dom_reading', lvl: 'قصة', date: '2026-12-10', period: 'دجنبر', note: 'مستوى ممتاز في قراءة القصة والتعبير' },

      { id: 'plc_7', std: 'std_3', dom: 'dom_math', lvl: 'مبتدئ', date: '2026-09-12', period: 'شتنبر', note: 'صعوبة في جداول الضرب' },
      { id: 'plc_8', std: 'std_3', dom: 'dom_math', lvl: 'متوسط', date: '2026-10-18', period: 'أكتوبر', note: 'استيعاب آلية الضرب بالأنشطة التفاعلية' },

      { id: 'plc_9', std: 'std_5', dom: 'dom_writing', lvl: 'مبتدئ', date: '2026-09-15', period: 'شتنبر', note: 'خط غير مقروء مع أخطاء إملائية' },
      { id: 'plc_10', std: 'std_5', dom: 'dom_writing', lvl: 'متوسط', date: '2026-11-20', period: 'نوفمبر', note: 'تحسن في مسك القلم ورسم الحروف المتشابهة' }
    ];

    for (const p of placementsData) {
      db.run(
        `INSERT INTO student_placements (id, student_id, domain_id, level, date, period, notes, teacher_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.std, p.dom, p.lvl, p.date, p.period, p.note, 'الأستاذ رشيد الفاسي']
      );
    }

    // 9. Seed Difficulties
    db.run(
      `INSERT INTO student_difficulties (id, student_id, category, severity, date, notes, support_action, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['diff_rec_1', 'std_1', 'القراءة والتهجي', 'متوسطة', '2026-09-14', 'خلط بين الحروف المتقاربة صوتاً (د/ض، ت/ط)', 'بطاقات الحروف ومقارنة المخارج الصوتية', 'تحسنت']
    );
    db.run(
      `INSERT INTO student_difficulties (id, student_id, category, severity, date, notes, support_action, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['diff_rec_2', 'std_3', 'التركيز والانتباه', 'متوسطة', '2026-09-20', 'تشتت الانتباه أثناء الأنشطة الطويلة', 'تقسيم المهام إلى أجزاء صغيرة ومكافأة الإنجاز', 'قيد المتابعة']
    );
    db.run(
      `INSERT INTO student_difficulties (id, student_id, category, severity, date, notes, support_action, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['diff_rec_3', 'std_5', 'الكتابة والرسم الإملائي', 'مهمة', '2026-09-22', 'صعوبة في التمييز بين التاء المربوطة والمبسوطة', 'تمارين تطبيقية وتدريب يومي ببطاقات الدعم', 'قيد المتابعة']
    );

    // 10. Seed Strengths
    db.run(
      `INSERT INTO student_strengths (id, student_id, domain, description, date)
       VALUES (?, ?, ?, ?, ?)`,
      ['str_1', 'std_1', 'التعاون', 'مبادرة متميزة في مساعدة زملائه بالقسم وروح جماعية عالية', '2026-10-02']
    );
    db.run(
      `INSERT INTO student_strengths (id, student_id, domain, description, date)
       VALUES (?, ?, ?, ?, ?)`,
      ['str_2', 'std_2', 'القراءة', 'طلاقة لغوية رائعة وقدرة فائقة على تلخيص النصوص السردية', '2026-10-10']
    );
    db.run(
      `INSERT INTO student_strengths (id, student_id, domain, description, date)
       VALUES (?, ?, ?, ?, ?)`,
      ['str_3', 'std_4', 'الرياضة', 'لياقة بدنية ممتازة وتميز في ألعاب القوى المدرسية', '2026-11-04']
    );
    db.run(
      `INSERT INTO student_strengths (id, student_id, domain, description, date)
       VALUES (?, ?, ?, ?, ?)`,
      ['str_4', 'std_6', 'الإبداع', 'خيال خصب في التعبير الكتابي والرسم التشكيلي', '2026-11-12']
    );

    // 11. Seed Attendance for September/October days
    const dates = ['2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12'];
    for (const d of dates) {
      for (const s of demoStudents) {
        let st = 'present';
        if (s.id === 'std_3' && d === '2026-09-09') st = 'justified';
        if (s.id === 'std_5' && d === '2026-09-11') st = 'absent';
        if (s.id === 'std_7' && d === '2026-09-12') st = 'late';
        db.run(
          `INSERT OR IGNORE INTO attendance (id, student_id, date, status) VALUES (?, ?, ?, ?)`,
          [`att_${s.id}_${d}`, s.id, d, st]
        );
      }
    }

    // 12. Seed Assignments & Records
    db.run(
      `INSERT INTO assignments (id, class_id, title, subject, description, assigned_date, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['asg_1', 'cls_5_1', 'قراءة نص المسترسل والتلخيص', 'اللغة العربية', 'قراءة الجزء الأول واستخراج الأفكار الرئيسة والشخصيات', '2026-09-15', '2026-09-18']
    );
    db.run(
      `INSERT INTO assignments (id, class_id, title, subject, description, assigned_date, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['asg_2', 'cls_5_1', 'تمارين القسمة الإقليدية', 'الرياضيات', 'إنجاز التمارين 1 و 2 و 3 الصفحة 24 من كراسة التلميذ', '2026-09-22', '2026-09-24']
    );

    for (const s of demoStudents) {
      const completed1 = s.id !== 'std_5' && s.id !== 'std_3' ? 1 : 0;
      const completed2 = s.id !== 'std_5' ? 1 : 0;
      db.run(`INSERT INTO assignment_records (id, assignment_id, student_id, status) VALUES (?, ?, ?, ?)`,
        [`rec_1_${s.id}`, 'asg_1', s.id, completed1]);
      db.run(`INSERT INTO assignment_records (id, assignment_id, student_id, status) VALUES (?, ?, ?, ?)`,
        [`rec_2_${s.id}`, 'asg_2', s.id, completed2]);
    }

    // 13. Seed Document Categories for Teacher's Cumulative Portfolio
    const categories = [
      // 1. الملف التراكمي للأستاذ
      { id: 'cat_cum_1', name: 'بطاقة الأستاذ والمعلومات المهنية', section: 'cumulative', icon: 'UserCheck' },
      { id: 'cat_cum_2', name: 'وثائق وتقارير التكوين والورشات', section: 'cumulative', icon: 'Award' },
      { id: 'cat_cum_3', name: 'وثائق TaRL وشبكات التصديق', section: 'cumulative', icon: 'Target' },
      { id: 'cat_cum_4', name: 'وثائق التعليم الصريح', section: 'cumulative', icon: 'BookOpen' },
      { id: 'cat_cum_5', name: 'استعمال الزمن والتعاقد الصفي', section: 'cumulative', icon: 'Clock' },
      { id: 'cat_cum_6', name: 'المذكرة اليومية والتوازيع السنوية', section: 'cumulative', icon: 'Calendar' },
      // 2. التخطيط والتدبير اليومي
      { id: 'cat_plan_1', name: 'المذكرة اليومية وجذاذات الحصص', section: 'planning', icon: 'FileText' },
      { id: 'cat_plan_2', name: 'التوزيع السنوي والمرحلي', section: 'planning', icon: 'Layers' },
      { id: 'cat_plan_3', name: 'دفتر النصوص وسجل الدروس', section: 'planning', icon: 'Book' },
      // 3. TaRL - الدعم المكثف
      { id: 'cat_tarl_1', name: 'روائز الموضعة ودليل التمرير', section: 'tarl', icon: 'BarChart2' },
      { id: 'cat_tarl_2', name: 'شبكات تفريغ النتائج والمجموعات', section: 'tarl', icon: 'Users' },
      { id: 'cat_tarl_3', name: 'جذاذات وأنشطة الدعم المكثف', section: 'tarl', icon: 'Sparkles' },
      // 4. التعليم الصريح
      { id: 'cat_exp_1', name: 'خطط ومراحل الدرس الصريح', section: 'explicit', icon: 'Compass' },
      { id: 'cat_exp_2', name: 'الخرائط الذهنية وشبكات التحكم', section: 'explicit', icon: 'CheckCircle' },
      // 5. التقويم والتتبع
      { id: 'cat_eval_1', name: 'التقويم التشخيصي والفروض', section: 'assessment', icon: 'ClipboardCheck' },
      { id: 'cat_eval_2', name: 'تقارير النتائج ودراسات الحالات', section: 'assessment', icon: 'FilePieChart' },
      // 6. وثائق إدارية وتنظيمية
      { id: 'cat_adm_1', name: 'لوائح المتعلمين وجدول العطل', section: 'admin', icon: 'FolderCheck' },
      { id: 'cat_adm_2', name: 'ميثاق القسم والقانون الداخلي', section: 'admin', icon: 'Shield' }
    ];

    for (const c of categories) {
      db.run(
        `INSERT INTO document_categories (id, name, section, icon, is_system) VALUES (?, ?, ?, ?, 1)`,
        [c.id, c.name, c.section, c.icon]
      );
    }

    // 14. Seed Folders in "مكتبتي"
    const libraryFolders = [
      { id: 'fld_arabic', name: 'اللغة العربية والقراءة' },
      { id: 'fld_math', name: 'الرياضيات والعلوم' },
      { id: 'fld_support', name: 'أنشطة الدعم والمعالجة (TaRL)' },
      { id: 'fld_exams', name: 'فروض ومراقبات مستمرة' },
      { id: 'fld_digital', name: 'موارد رقمية وفيديوهات تعليمية' }
    ];
    for (const f of libraryFolders) {
      db.run(`INSERT INTO folders (id, name) VALUES (?, ?)`, [f.id, f.name]);
    }

    // 15. Seed Documents with rich HTML content
    const sampleDocs = [
      {
        id: 'doc_1',
        cat: 'cat_cum_1',
        fld: null,
        title: 'بطاقة الأستاذ المهنية والمعلومات الإدارية',
        fav: 1,
        content: `<h2>بطاقة الأستاذ المهنية</h2>
<p><strong>الاسم الكامل:</strong> رشيد الفاسي</p>
<p><strong>رقم التأجير:</strong> 1459820</p>
<p><strong>الإطار:</strong> أستاذ التعليم الابتدائي</p>
<p><strong>الدرجة:</strong> الدرجة الممتازة</p>
<p><strong>المؤسسة:</strong> مدرسة ابن خلدون الابتدائية</p>
<p><strong>المديرية الإقليمية:</strong> الرباط</p>
<p><strong>الأكاديمية الجهوية:</strong> جهة الرباط سلا القنيطرة</p>
<hr />
<h3>التكليفات والمهام:</h3>
<ul>
  <li>تدريس المستوى الخامس ابتدائي (فوج 1)</li>
  <li>منسق أنشطة الدعم التربوي بمقاربة TaRL بالمؤسسة</li>
  <li>عضو خلية اليقظة والإنصات والتوجيه المدرسي</li>
</ul>`
      },
      {
        id: 'doc_2',
        cat: 'cat_adm_2',
        fld: null,
        title: 'ميثاق التعاقد الديداكتيكي وقواعد القسم',
        fav: 1,
        content: `<h2>ميثاق القسم — معاً نصنع النجاح</h2>
<p>تم إعداد هذا الميثاق بتشاور وتوافق تام بين الأستاذ وتلميذات وتلاميذ المستوى الخامس:</p>
<ol>
  <li><strong>احترام الوقت:</strong> الحضور في الموعد والاصطفاف بانتظام ودخول القاعة بهدوء.</li>
  <li><strong>المشاركة الإيجابية:</strong> رفع اليد قبل أخذ الكلمة واحترام آراء الآخرين دون سخرية.</li>
  <li><strong>الحفاظ على فضاء التعلم:</strong> العناية بنظافة القسم والأثاث والوسائل التعليمية المشتركة.</li>
  <li><strong>إنجاز الواجبات:</strong> المداومة على إحضار الأدوات وإنجاز الأنشطة المنزلية بتفانٍ.</li>
  <li><strong>التعاون والتآزر:</strong> تقديم يد العون للزملاء في ورشات العمل التشاركية.</li>
</ol>`
      },
      {
        id: 'doc_3',
        cat: 'cat_tarl_1',
        fld: 'fld_support',
        title: 'دليل تمرير روائز الموضعة — مقاربة التدريس وفق المستوى المناسب (TaRL)',
        fav: 1,
        content: `<h2>دليل تمرير روائز TaRL للغة العربية</h2>
<p>تهدف مقاربة TaRL إلى وضع كل متعلم في مستواه الحقيقي للانطلاق في رحلة الدعم المركز:</p>
<h3>مستويات القراءة المعتمدة:</h3>
<ul>
  <li><strong>المستوى 0 (مبتدئ):</strong> المتعلم الذي لا يتعرف على الحروف المعروضة.</li>
  <li><strong>المستوى 1 (حرف):</strong> يتعرف على 4 أحرف على الأقل من أصل 5 بشكل صحيح وسريع.</li>
  <li><strong>المستوى 2 (كلمة):</strong> يقرأ 4 كلمات ذات معنى بشكل سليم مع الحركات.</li>
  <li><strong>المستوى 3 (فقرة):</strong> يقرأ نصاً قصيراً (من 3 إلى 4 أسطر) بطلاقة ودون تردد.</li>
  <li><strong>المستوى 4 (أقصوصة):</strong> يقرأ قصة ويجيب عن أسئلة الفهم الصريح والضمني.</li>
</ul>`
      },
      {
        id: 'doc_4',
        cat: 'cat_plan_1',
        fld: 'fld_arabic',
        title: 'جذاذة نموذجية وفق مبادئ التعليم الصريح (Explicit Instruction)',
        fav: 0,
        content: `<h2>جذاذة درس: التمييز وأنواعه</h2>
<h3>المستوى: الخامس ابتدائي | المادة: اللغة العربية (التراكيب)</h3>
<hr />
<h4>1. النمذجة (أنا أفعل — I Do):</h4>
<p>يقوم الأستاذ بعرض الجملة التوضيحية بصوت مسموع، مبيناً كيفية كشف الكلمة المبهمة بالتمييز الملفوظ.</p>
<h4>2. الممارسة الموجهة (نحن نفعل — We Do):</h4>
<p>يشارك التلاميذ جماعياً وثنائياً في تحديد نوع التمييز في بطاقات ملونة مع تقديم تغذية راجعة فورية.</p>
<h4>3. الممارسة المستقلة (أنت تفعل — You Do):</h4>
<p>ينجز المتعلم فردياً التطبيقات على الدفتر للتأكد من تمكنه المستقل من القاعدة.</p>`
      }
    ];

    for (const d of sampleDocs) {
      db.run(
        `INSERT INTO documents (id, category_id, folder_id, title, content_html, is_favorite, is_draft, version, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`,
        [d.id, d.cat, d.fld, d.title, d.content, d.fav, now, now]
      );

      db.run(
        `INSERT INTO document_versions (id, document_id, version_num, title, content_html, created_at)
         VALUES (?, ?, 1, ?, ?, ?)`,
        [`ver_${d.id}_1`, d.id, d.title, d.content, now]
      );
    }

    // 16. Link study case doc to student 1
    db.run(
      `INSERT INTO student_documents (id, student_id, document_id, relation_type)
       VALUES (?, ?, ?, ?)`,
      ['sdoc_1', 'std_1', 'doc_3', 'خطة دعم']
    );

    // 17. Seed Initial Settings
    const initialSettings = [
      { key: 'school_name', value: 'مدرسة ابن خلدون الابتدائية' },
      { key: 'school_city', value: 'الرباط' },
      { key: 'school_director', value: 'محمد الإدريسي' },
      { key: 'teacher_name', value: 'رشيد الفاسي' },
      { key: 'current_year', value: '2026-2027' },
      { key: 'eval_scale', value: '10' }
    ];
    for (const s of initialSettings) {
      db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [s.key, s.value]);
    }

    // 18. Activity Log
    db.run(
      `INSERT INTO activity_logs (id, user_id, action, details, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      ['act_init', 'usr_teacher_1', 'تهيئة النظام', 'تم بنجاح تشغيل منصة مساعد الأستاذ وتهيئة قاعدة البيانات الرقمية', now]
    );

    saveDatabase();
    console.log('Database initialized and seeded successfully with full pedagogical content.');
  }
}
