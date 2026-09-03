-- Cloudflare D1 Full Database Schema & Initial Data for «مساعد الأستاذ»

-- مساعد الأستاذ - مخطط قاعدة البيانات المتوافق مع Cloudflare D1 و SQLite
-- Database Schema for Assistant Professor (Moroccan School Teacher Management)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'teacher', -- 'teacher', 'admin', 'supervisor'
  school_name TEXT DEFAULT 'مدرسة النجاح الابتدائية',
  school_city TEXT DEFAULT 'الرباط',
  school_phone TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS academic_years (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL, -- e.g. '2026-2027'
  is_current INTEGER DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  academic_year_id TEXT NOT NULL,
  name TEXT NOT NULL, -- e.g. 'المستوى الخامس - فوج 1'
  level TEXT NOT NULL, -- e.g. 'المستوى الخامس ابتدائي'
  code TEXT, -- e.g. '5-A'
  subject TEXT, -- e.g. 'اللغة العربية والاجتماعيات'
  room TEXT,
  notes TEXT,
  is_archived INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS groups (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  name TEXT NOT NULL, -- e.g. 'الفوج أ', 'الفوج ب'
  description TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  group_id TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  gender TEXT NOT NULL, -- 'ذكر', 'أنثى'
  birth_date TEXT NOT NULL, -- YYYY-MM-DD
  massar_code TEXT UNIQUE, -- رقم مسار
  enrollment_date TEXT DEFAULT (date('now')),
  avatar_url TEXT,
  general_notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT,
  FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS parents (
  id TEXT PRIMARY KEY,
  student_id TEXT UNIQUE NOT NULL,
  father_name TEXT,
  father_job TEXT,
  father_phone TEXT,
  mother_name TEXT,
  mother_job TEXT,
  mother_phone TEXT,
  relationship TEXT DEFAULT 'الوالدان',
  siblings_count INTEGER DEFAULT 0,
  birth_order INTEGER DEFAULT 1,
  notes TEXT,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_social_info (
  id TEXT PRIMARY KEY,
  student_id TEXT UNIQUE NOT NULL,
  social_status TEXT, -- مستقرة، منفصلان، يتيم، مع الجدين
  living_with TEXT, -- الوالدين، الأم، الأب، الكفيل
  financial_notes TEXT,
  general_social_notes TEXT,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_health_notes (
  id TEXT PRIMARY KEY,
  student_id TEXT UNIQUE NOT NULL,
  notes TEXT NOT NULL, -- الاحتياط التربوي فقط بدون تشخيص طبي
  precautions TEXT, -- مثلا: الجلوس في المقاعد الأمامية لضعف بصر، تجنب مجهود بدني مفاجئ
  show_in_family_report INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS placement_domains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL, -- e.g. 'القراءة', 'الفهم', 'الكتابة', 'الرياضيات'
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  is_default INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS student_placements (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  domain_id TEXT NOT NULL,
  level TEXT NOT NULL, -- 'مبتدئ', 'حرف', 'كلمة', 'فقرة', 'قصة' / 'طبيعي', 'متوسط', 'جيد'
  date TEXT NOT NULL, -- YYYY-MM-DD
  period TEXT NOT NULL, -- 'شتنبر', 'دورة 1', 'دورة 2', 'وسط السنة', 'نهاية السنة'
  notes TEXT,
  teacher_name TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (domain_id) REFERENCES placement_domains(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS difficulty_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL, -- 'القراءة', 'الكتابة', 'الحساب', 'التركيز', 'التشتت', 'الفهم', 'التعبير', 'صعوبات أخرى'
  code TEXT UNIQUE NOT NULL,
  is_default INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS student_difficulties (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  category TEXT NOT NULL,
  severity TEXT NOT NULL, -- 'بسيطة', 'متوسطة', 'مهمة'
  date TEXT NOT NULL,
  notes TEXT,
  support_action TEXT, -- الإجراء الداعم
  status TEXT DEFAULT 'جديدة', -- 'جديدة', 'قيد المتابعة', 'تحسنت', 'تمت معالجتها'
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_strengths (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  domain TEXT NOT NULL, -- 'القراءة', 'التعبير', 'الحساب', 'التعاون', 'المشاركة', 'الإبداع', 'الانضباط', 'القيادة', 'الرياضة', 'الفن'
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS holidays (
  id TEXT PRIMARY KEY,
  academic_year_id TEXT NOT NULL,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL, -- YYYY-MM-DD
  end_date TEXT NOT NULL,   -- YYYY-MM-DD
  is_single_day INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attendance (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  status TEXT NOT NULL, -- 'present' (✓ حاضر), 'absent' (غ غائب), 'justified' (م مبرر), 'late' (ت تأخر), 'holiday' (ع عطلة)
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(student_id, date),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  assigned_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assignment_records (
  id TEXT PRIMARY KEY,
  assignment_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  status INTEGER DEFAULT 0, -- 0 = لم ينجز, 1 = أنجز
  notes TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(assignment_id, student_id),
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  domain TEXT,
  evaluation_type TEXT NOT NULL, -- 'مراقبة مستمرة', 'فرض محروس', 'تقويم تشخيصي', 'نشاط شفوي'
  score REAL NOT NULL,
  max_score REAL DEFAULT 10.0,
  date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS document_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  section TEXT NOT NULL, -- 'cumulative', 'planning', 'tarl', 'explicit', 'assessment', 'admin', 'library'
  parent_id TEXT,
  icon TEXT,
  is_system INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  category_id TEXT,
  folder_id TEXT,
  title TEXT NOT NULL,
  content_html TEXT NOT NULL,
  is_favorite INTEGER DEFAULT 0,
  is_draft INTEGER DEFAULT 0,
  tags TEXT,
  version INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES document_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  version_num INTEGER NOT NULL,
  title TEXT NOT NULL,
  content_html TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  path TEXT NOT NULL,
  url TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS document_media (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  media_id TEXT NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_documents (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  relation_type TEXT DEFAULT 'دراسة حالة', -- 'دراسة حالة', 'خطة دعم', 'تقرير', 'وثيقة تقويم', 'ملاحظات'
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  details TEXT,
  ip TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(full_name);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);
CREATE INDEX IF NOT EXISTS idx_placements_student ON student_placements(student_id);
CREATE INDEX IF NOT EXISTS idx_difficulties_student ON student_difficulties(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id);


-- Data for users (1 rows)
INSERT OR IGNORE INTO users (id, username, password_hash, full_name, email, phone, role, school_name, school_city, school_phone, created_at, last_login_at) VALUES ('usr_teacher_1', 'admin', '$2b$10$c6VWFMxqQG3jrGUCWzp1NOP4VTBGpuDknNKACVC1RULhy6UdWjdWe', 'الأستاذ رشيد الفاسي', 'rachid.teacher@taalim.ma', '0661234567', 'teacher', 'مدرسة ابن خلدون الابتدائية', 'الرباط', '0537000000', '2026-09-03T19:56:19.851Z', '2026-09-03 21:17:06');

-- Data for sessions (1 rows)
INSERT OR IGNORE INTO sessions (id, user_id, token, expires_at, created_at) VALUES ('ses_297dd6c5ea7d8ef5', 'usr_teacher_1', '14f1d116842f3b5bac9f4f50860c114d0b8b10e639261211e6e4b1ce026d67ab', '2026-09-05T21:17:06.604Z', '2026-09-03 21:17:06');

-- Data for academic_years (1 rows)
INSERT OR IGNORE INTO academic_years (id, name, is_current, start_date, end_date, notes, created_at) VALUES ('year_2026_2027', '2026-2027', 1, '2026-09-01', '2027-06-30', 'المقرر الوزاري لتنظيم السنة الدراسية 2026/2027', '2026-09-03T19:56:19.851Z');

-- Data for classes (2 rows)
INSERT OR IGNORE INTO classes (id, academic_year_id, name, level, code, subject, room, notes, is_archived, created_at) VALUES ('cls_5_1', 'year_2026_2027', 'المستوى الخامس - فوج 1', 'المستوى الخامس ابتدائي', '5-A', 'اللغة العربية والاجتماعيات', 'القاعة 3', 'مؤسسة الريادة', 0, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO classes (id, academic_year_id, name, level, code, subject, room, notes, is_archived, created_at) VALUES ('cls_6_1', 'year_2026_2027', 'المستوى السادس - فوج 1', 'المستوى السادس ابتدائي', '6-A', 'اللغة العربية والتربية الإسلامية', 'القاعة 4', 'مؤسسة الريادة', 0, '2026-09-03 19:56:20');

-- Data for groups (2 rows)
INSERT OR IGNORE INTO groups (id, class_id, name, description, created_at) VALUES ('grp_5_a', 'cls_5_1', 'الفوج أ', 'الحصة الصباحية', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO groups (id, class_id, name, description, created_at) VALUES ('grp_5_b', 'cls_5_1', 'الفوج ب', 'الحصة المسائية', '2026-09-03 19:56:20');

-- Data for students (10 rows)
INSERT OR IGNORE INTO students (id, class_id, group_id, first_name, last_name, full_name, gender, birth_date, massar_code, enrollment_date, avatar_url, general_notes, created_at, updated_at) VALUES ('std_1', 'cls_5_1', 'grp_5_a', 'أحمد', 'العمراوي', 'أحمد العمراوي', 'ذكر', '2015-03-12', 'M130024891', '2026-09-02', NULL, 'تلميذ مجتهد ويشارك بانتظام', '2026-09-03 19:56:20', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO students (id, class_id, group_id, first_name, last_name, full_name, gender, birth_date, massar_code, enrollment_date, avatar_url, general_notes, created_at, updated_at) VALUES ('std_2', 'cls_5_1', 'grp_5_a', 'مريم', 'التلمساني', 'مريم التلمساني', 'أنثى', '2015-07-25', 'M130098432', '2026-09-02', NULL, 'تلميذ مجتهد ويشارك بانتظام', '2026-09-03 19:56:20', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO students (id, class_id, group_id, first_name, last_name, full_name, gender, birth_date, massar_code, enrollment_date, avatar_url, general_notes, created_at, updated_at) VALUES ('std_3', 'cls_5_1', 'grp_5_b', 'سفيان', 'بلمعطي', 'سفيان بلمعطي', 'ذكر', '2015-01-18', 'M130055611', '2026-09-02', NULL, 'تلميذ مجتهد ويشارك بانتظام', '2026-09-03 19:56:20', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO students (id, class_id, group_id, first_name, last_name, full_name, gender, birth_date, massar_code, enrollment_date, avatar_url, general_notes, created_at, updated_at) VALUES ('std_4', 'cls_5_1', 'grp_5_a', 'إيمان', 'المرابط', 'إيمان المرابط', 'أنثى', '2015-11-05', 'M130077884', '2026-09-02', NULL, 'تلميذ مجتهد ويشارك بانتظام', '2026-09-03 19:56:20', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO students (id, class_id, group_id, first_name, last_name, full_name, gender, birth_date, massar_code, enrollment_date, avatar_url, general_notes, created_at, updated_at) VALUES ('std_5', 'cls_5_1', 'grp_5_b', 'ياسين', 'الركراكي', 'ياسين الركراكي', 'ذكر', '2015-05-30', 'M130012399', '2026-09-02', NULL, 'تلميذ مجتهد ويشارك بانتظام', '2026-09-03 19:56:20', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO students (id, class_id, group_id, first_name, last_name, full_name, gender, birth_date, massar_code, enrollment_date, avatar_url, general_notes, created_at, updated_at) VALUES ('std_6', 'cls_5_1', 'grp_5_a', 'زينب', 'العلوي', 'زينب العلوي', 'أنثى', '2015-08-14', 'M130044552', '2026-09-02', NULL, 'تلميذ مجتهد ويشارك بانتظام', '2026-09-03 19:56:20', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO students (id, class_id, group_id, first_name, last_name, full_name, gender, birth_date, massar_code, enrollment_date, avatar_url, general_notes, created_at, updated_at) VALUES ('std_7', 'cls_5_1', 'grp_5_b', 'عمر', 'الخطابي', 'عمر الخطابي', 'ذكر', '2014-12-03', 'M130066113', '2026-09-02', NULL, 'تلميذ مجتهد ويشارك بانتظام', '2026-09-03 19:56:20', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO students (id, class_id, group_id, first_name, last_name, full_name, gender, birth_date, massar_code, enrollment_date, avatar_url, general_notes, created_at, updated_at) VALUES ('std_8', 'cls_5_1', 'grp_5_a', 'هبة', 'المنصوري', 'هبة المنصوري', 'أنثى', '2015-04-20', 'M130033221', '2026-09-02', NULL, 'تلميذ مجتهد ويشارك بانتظام', '2026-09-03 19:56:20', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO students (id, class_id, group_id, first_name, last_name, full_name, gender, birth_date, massar_code, enrollment_date, avatar_url, general_notes, created_at, updated_at) VALUES ('std_9', 'cls_5_1', 'grp_5_b', 'حمزة', 'السوسي', 'حمزة السوسي', 'ذكر', '2015-09-09', 'M130088992', '2026-09-02', NULL, 'تلميذ مجتهد ويشارك بانتظام', '2026-09-03 19:56:20', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO students (id, class_id, group_id, first_name, last_name, full_name, gender, birth_date, massar_code, enrollment_date, avatar_url, general_notes, created_at, updated_at) VALUES ('std_10', 'cls_5_1', 'grp_5_a', 'سارة', 'التازي', 'سارة التازي', 'أنثى', '2015-02-14', 'M130011447', '2026-09-02', NULL, 'تلميذ مجتهد ويشارك بانتظام', '2026-09-03 19:56:20', '2026-09-03 19:56:20');

-- Data for parents (10 rows)
INSERT OR IGNORE INTO parents (id, student_id, father_name, father_job, father_phone, mother_name, mother_job, mother_phone, relationship, siblings_count, birth_order, notes) VALUES ('par_std_1', 'std_1', 'محمد العمراوي', 'موظف بريد', '0662112233', 'فاطمة الزهراء البقالي', 'أستاذة', '0663445566', 'الوالدان', 2, 1, NULL);
INSERT OR IGNORE INTO parents (id, student_id, father_name, father_job, father_phone, mother_name, mother_job, mother_phone, relationship, siblings_count, birth_order, notes) VALUES ('par_std_2', 'std_2', 'يوسف التلمساني', 'تاجر', '0671889900', 'خديجة الوزاني', 'ربة بيت', '0672001122', 'الوالدان', 2, 1, NULL);
INSERT OR IGNORE INTO parents (id, student_id, father_name, father_job, father_phone, mother_name, mother_job, mother_phone, relationship, siblings_count, birth_order, notes) VALUES ('par_std_3', 'std_3', 'عبد الرحيم بلمعطي', 'سائق', '0654332211', 'حليمة السعيدي', 'ربة بيت', '0655443322', 'الوالدان', 2, 1, NULL);
INSERT OR IGNORE INTO parents (id, student_id, father_name, father_job, father_phone, mother_name, mother_job, mother_phone, relationship, siblings_count, birth_order, notes) VALUES ('par_std_4', 'std_4', 'عزيز المرابط', 'تقني معلوميات', '0668990011', 'نادية الشاوي', 'ممرضة', '0669112233', 'الوالدان', 2, 1, NULL);
INSERT OR IGNORE INTO parents (id, student_id, father_name, father_job, father_phone, mother_name, mother_job, mother_phone, relationship, siblings_count, birth_order, notes) VALUES ('par_std_5', 'std_5', 'إبراهيم الركراكي', 'فلاح', '0645001122', 'سعيدة العلمي', 'ربة بيت', '0646112233', 'الوالدان', 2, 1, NULL);
INSERT OR IGNORE INTO parents (id, student_id, father_name, father_job, father_phone, mother_name, mother_job, mother_phone, relationship, siblings_count, birth_order, notes) VALUES ('par_std_6', 'std_6', 'الحسن العلوي', 'مهندس', '0661998877', 'أمينة بنجلون', 'صيدلانية', '0662887766', 'الوالدان', 2, 1, NULL);
INSERT OR IGNORE INTO parents (id, student_id, father_name, father_job, father_phone, mother_name, mother_job, mother_phone, relationship, siblings_count, birth_order, notes) VALUES ('par_std_7', 'std_7', 'طارق الخطابي', 'محاسب', '0678112244', 'سكينة الصقلي', 'أستاذة جامعية', '0679223355', 'الوالدان', 2, 1, NULL);
INSERT OR IGNORE INTO parents (id, student_id, father_name, father_job, father_phone, mother_name, mother_job, mother_phone, relationship, siblings_count, birth_order, notes) VALUES ('par_std_8', 'std_8', 'مصطفى المنصوري', 'أستاذ', '0651778899', 'ليلى الدكالي', 'مهندسة معمارية', '0652889900', 'الوالدان', 2, 1, NULL);
INSERT OR IGNORE INTO parents (id, student_id, father_name, father_job, father_phone, mother_name, mother_job, mother_phone, relationship, siblings_count, birth_order, notes) VALUES ('par_std_9', 'std_9', 'سليمان السوسي', 'تاجر مواد غذائية', '0664556677', 'راضية التيجاني', 'ربة بيت', '0665667788', 'الوالدان', 2, 1, NULL);
INSERT OR IGNORE INTO parents (id, student_id, father_name, father_job, father_phone, mother_name, mother_job, mother_phone, relationship, siblings_count, birth_order, notes) VALUES ('par_std_10', 'std_10', 'كريم التازي', 'طبيب عام', '0661334455', 'مريم الفيلالي', 'محامية', '0662445566', 'الوالدان', 2, 1, NULL);

-- Data for student_social_info (10 rows)
INSERT OR IGNORE INTO student_social_info (id, student_id, social_status, living_with, financial_notes, general_social_notes) VALUES ('soc_std_1', 'std_1', 'مستقرة', 'الوالدين', NULL, 'بيئة أسرية ملائمة للدراسة والتحصيل');
INSERT OR IGNORE INTO student_social_info (id, student_id, social_status, living_with, financial_notes, general_social_notes) VALUES ('soc_std_2', 'std_2', 'مستقرة', 'الوالدين', NULL, 'بيئة أسرية ملائمة للدراسة والتحصيل');
INSERT OR IGNORE INTO student_social_info (id, student_id, social_status, living_with, financial_notes, general_social_notes) VALUES ('soc_std_3', 'std_3', 'مستقرة', 'الوالدين', NULL, 'بيئة أسرية ملائمة للدراسة والتحصيل');
INSERT OR IGNORE INTO student_social_info (id, student_id, social_status, living_with, financial_notes, general_social_notes) VALUES ('soc_std_4', 'std_4', 'مستقرة', 'الوالدين', NULL, 'بيئة أسرية ملائمة للدراسة والتحصيل');
INSERT OR IGNORE INTO student_social_info (id, student_id, social_status, living_with, financial_notes, general_social_notes) VALUES ('soc_std_5', 'std_5', 'مستقرة', 'الوالدين', NULL, 'بيئة أسرية ملائمة للدراسة والتحصيل');
INSERT OR IGNORE INTO student_social_info (id, student_id, social_status, living_with, financial_notes, general_social_notes) VALUES ('soc_std_6', 'std_6', 'مستقرة', 'الوالدين', NULL, 'بيئة أسرية ملائمة للدراسة والتحصيل');
INSERT OR IGNORE INTO student_social_info (id, student_id, social_status, living_with, financial_notes, general_social_notes) VALUES ('soc_std_7', 'std_7', 'مستقرة', 'الوالدين', NULL, 'بيئة أسرية ملائمة للدراسة والتحصيل');
INSERT OR IGNORE INTO student_social_info (id, student_id, social_status, living_with, financial_notes, general_social_notes) VALUES ('soc_std_8', 'std_8', 'مستقرة', 'الوالدين', NULL, 'بيئة أسرية ملائمة للدراسة والتحصيل');
INSERT OR IGNORE INTO student_social_info (id, student_id, social_status, living_with, financial_notes, general_social_notes) VALUES ('soc_std_9', 'std_9', 'مستقرة', 'الوالدين', NULL, 'بيئة أسرية ملائمة للدراسة والتحصيل');
INSERT OR IGNORE INTO student_social_info (id, student_id, social_status, living_with, financial_notes, general_social_notes) VALUES ('soc_std_10', 'std_10', 'مستقرة', 'الوالدين', NULL, 'بيئة أسرية ملائمة للدراسة والتحصيل');

-- Data for student_health_notes (10 rows)
INSERT OR IGNORE INTO student_health_notes (id, student_id, notes, precautions, show_in_family_report, updated_at) VALUES ('hlt_std_1', 'std_1', 'يعاني من ضعف خفيف في الإبصار', 'الجلوس في الصف الأول ومراعاة حجم خط السبورة', 0, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO student_health_notes (id, student_id, notes, precautions, show_in_family_report, updated_at) VALUES ('hlt_std_2', 'std_2', 'لا توجد ملاحظات صحية خاصة', 'عادي', 0, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO student_health_notes (id, student_id, notes, precautions, show_in_family_report, updated_at) VALUES ('hlt_std_3', 'std_3', 'حساسية موسمية تستدعي تجنب الأتربة المباشرة', 'إبعاد المتعلم عن مسحوق الطباشير أو الغبار', 0, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO student_health_notes (id, student_id, notes, precautions, show_in_family_report, updated_at) VALUES ('hlt_std_4', 'std_4', 'لا توجد ملاحظات صحية', 'عادي', 0, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO student_health_notes (id, student_id, notes, precautions, show_in_family_report, updated_at) VALUES ('hlt_std_5', 'std_5', 'يحتاج تشجيعاً مستمراً لتقوية الثقة بالنفس وتجنب الإجهاد', 'منحه وقتاً إضافياً في الإنجاز الكتابي', 0, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO student_health_notes (id, student_id, notes, precautions, show_in_family_report, updated_at) VALUES ('hlt_std_6', 'std_6', 'لا توجد ملاحظات', 'عادي', 0, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO student_health_notes (id, student_id, notes, precautions, show_in_family_report, updated_at) VALUES ('hlt_std_7', 'std_7', 'لا توجد ملاحظات', 'عادي', 0, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO student_health_notes (id, student_id, notes, precautions, show_in_family_report, updated_at) VALUES ('hlt_std_8', 'std_8', 'لا توجد ملاحظات', 'عادي', 0, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO student_health_notes (id, student_id, notes, precautions, show_in_family_report, updated_at) VALUES ('hlt_std_9', 'std_9', 'صعوبة خفيفة في السمع بالأذن اليسرى', 'الجلوس في الجهة اليمنى من الصف الأول', 0, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO student_health_notes (id, student_id, notes, precautions, show_in_family_report, updated_at) VALUES ('hlt_std_10', 'std_10', 'لا توجد ملاحظات', 'عادي', 0, '2026-09-03 19:56:20');

-- Data for placement_domains (4 rows)
INSERT OR IGNORE INTO placement_domains (id, name, code, description, is_default, created_at) VALUES ('dom_reading', 'القراءة', 'reading', 'روائز القراءة باللغة العربية (مبتدئ، حرف، كلمة، فقرة، أقصوصة)', 1, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO placement_domains (id, name, code, description, is_default, created_at) VALUES ('dom_comprehension', 'الفهم', 'comprehension', 'فهم المقروء واستخراج المعاني الضمنية والصريحة', 1, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO placement_domains (id, name, code, description, is_default, created_at) VALUES ('dom_writing', 'الكتابة والإملاء', 'writing', 'الرسم الإملائي والإنتاج الكتابي السليم', 1, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO placement_domains (id, name, code, description, is_default, created_at) VALUES ('dom_math', 'الرياضيات والعمليات', 'math', 'الحساب، الجمع، الطرح، الضرب، والقسمة وحل المسائل', 1, '2026-09-03 19:56:20');

-- Data for student_placements (10 rows)
INSERT OR IGNORE INTO student_placements (id, student_id, domain_id, level, date, period, notes, teacher_name, created_at) VALUES ('plc_1', 'std_1', 'dom_reading', 'حرف', '2026-09-10', 'شتنبر', 'تعثر في قراءة المقاطع الطويلة', 'الأستاذ رشيد الفاسي', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO student_placements (id, student_id, domain_id, level, date, period, notes, teacher_name, created_at) VALUES ('plc_2', 'std_1', 'dom_reading', 'كلمة', '2026-10-15', 'أكتوبر', 'تحسن ملموس في تهجي الكلمات البسيطة', 'الأستاذ رشيد الفاسي', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO student_placements (id, student_id, domain_id, level, date, period, notes, teacher_name, created_at) VALUES ('plc_3', 'std_1', 'dom_reading', 'فقرة', '2026-12-05', 'دجنبر', 'قراءة سلسلة لفقرة قصيرة مع احترام الفواصل', 'الأستاذ رشيد الفاسي', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO student_placements (id, student_id, domain_id, level, date, period, notes, teacher_name, created_at) VALUES ('plc_4', 'std_2', 'dom_reading', 'كلمة', '2026-09-10', 'شتنبر', 'بداية جيدة', 'الأستاذ رشيد الفاسي', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO student_placements (id, student_id, domain_id, level, date, period, notes, teacher_name, created_at) VALUES ('plc_5', 'std_2', 'dom_reading', 'فقرة', '2026-10-20', 'أكتوبر', 'تطور سريع', 'الأستاذ رشيد الفاسي', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO student_placements (id, student_id, domain_id, level, date, period, notes, teacher_name, created_at) VALUES ('plc_6', 'std_2', 'dom_reading', 'قصة', '2026-12-10', 'دجنبر', 'مستوى ممتاز في قراءة القصة والتعبير', 'الأستاذ رشيد الفاسي', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO student_placements (id, student_id, domain_id, level, date, period, notes, teacher_name, created_at) VALUES ('plc_7', 'std_3', 'dom_math', 'مبتدئ', '2026-09-12', 'شتنبر', 'صعوبة في جداول الضرب', 'الأستاذ رشيد الفاسي', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO student_placements (id, student_id, domain_id, level, date, period, notes, teacher_name, created_at) VALUES ('plc_8', 'std_3', 'dom_math', 'متوسط', '2026-10-18', 'أكتوبر', 'استيعاب آلية الضرب بالأنشطة التفاعلية', 'الأستاذ رشيد الفاسي', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO student_placements (id, student_id, domain_id, level, date, period, notes, teacher_name, created_at) VALUES ('plc_9', 'std_5', 'dom_writing', 'مبتدئ', '2026-09-15', 'شتنبر', 'خط غير مقروء مع أخطاء إملائية', 'الأستاذ رشيد الفاسي', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO student_placements (id, student_id, domain_id, level, date, period, notes, teacher_name, created_at) VALUES ('plc_10', 'std_5', 'dom_writing', 'متوسط', '2026-11-20', 'نوفمبر', 'تحسن في مسك القلم ورسم الحروف المتشابهة', 'الأستاذ رشيد الفاسي', '2026-09-03 19:56:20');

-- Data for difficulty_categories (8 rows)
INSERT OR IGNORE INTO difficulty_categories (id, name, code, is_default) VALUES ('diff_reading', 'القراءة والتهجي', 'reading', 1);
INSERT OR IGNORE INTO difficulty_categories (id, name, code, is_default) VALUES ('diff_writing', 'الكتابة والرسم الإملائي', 'writing', 1);
INSERT OR IGNORE INTO difficulty_categories (id, name, code, is_default) VALUES ('diff_calc', 'الحساب والعمليات الأساسية', 'math', 1);
INSERT OR IGNORE INTO difficulty_categories (id, name, code, is_default) VALUES ('diff_focus', 'التركيز والانتباه', 'focus', 1);
INSERT OR IGNORE INTO difficulty_categories (id, name, code, is_default) VALUES ('diff_distract', 'التشتت وفرط الحركة', 'distraction', 1);
INSERT OR IGNORE INTO difficulty_categories (id, name, code, is_default) VALUES ('diff_comp', 'الفهم والاستيعاب', 'comprehension', 1);
INSERT OR IGNORE INTO difficulty_categories (id, name, code, is_default) VALUES ('diff_express', 'التعبير الشفهي والتواصل', 'expression', 1);
INSERT OR IGNORE INTO difficulty_categories (id, name, code, is_default) VALUES ('diff_other', 'صعوبات أخرى', 'other', 1);

-- Data for student_difficulties (3 rows)
INSERT OR IGNORE INTO student_difficulties (id, student_id, category, severity, date, notes, support_action, status, created_at, updated_at) VALUES ('diff_rec_1', 'std_1', 'القراءة والتهجي', 'متوسطة', '2026-09-14', 'خلط بين الحروف المتقاربة صوتاً (د/ض، ت/ط)', 'بطاقات الحروف ومقارنة المخارج الصوتية', 'تحسنت', '2026-09-03 19:56:20', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO student_difficulties (id, student_id, category, severity, date, notes, support_action, status, created_at, updated_at) VALUES ('diff_rec_2', 'std_3', 'التركيز والانتباه', 'متوسطة', '2026-09-20', 'تشتت الانتباه أثناء الأنشطة الطويلة', 'تقسيم المهام إلى أجزاء صغيرة ومكافأة الإنجاز', 'قيد المتابعة', '2026-09-03 19:56:20', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO student_difficulties (id, student_id, category, severity, date, notes, support_action, status, created_at, updated_at) VALUES ('diff_rec_3', 'std_5', 'الكتابة والرسم الإملائي', 'مهمة', '2026-09-22', 'صعوبة في التمييز بين التاء المربوطة والمبسوطة', 'تمارين تطبيقية وتدريب يومي ببطاقات الدعم', 'قيد المتابعة', '2026-09-03 19:56:20', '2026-09-03 19:56:20');

-- Data for student_strengths (4 rows)
INSERT OR IGNORE INTO student_strengths (id, student_id, domain, description, date, created_at) VALUES ('str_1', 'std_1', 'التعاون', 'مبادرة متميزة في مساعدة زملائه بالقسم وروح جماعية عالية', '2026-10-02', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO student_strengths (id, student_id, domain, description, date, created_at) VALUES ('str_2', 'std_2', 'القراءة', 'طلاقة لغوية رائعة وقدرة فائقة على تلخيص النصوص السردية', '2026-10-10', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO student_strengths (id, student_id, domain, description, date, created_at) VALUES ('str_3', 'std_4', 'الرياضة', 'لياقة بدنية ممتازة وتميز في ألعاب القوى المدرسية', '2026-11-04', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO student_strengths (id, student_id, domain, description, date, created_at) VALUES ('str_4', 'std_6', 'الإبداع', 'خيال خصب في التعبير الكتابي والرسم التشكيلي', '2026-11-12', '2026-09-03 19:56:20');

-- Data for holidays (10 rows)
INSERT OR IGNORE INTO holidays (id, academic_year_id, name, start_date, end_date, is_single_day, created_at) VALUES ('hol_1', 'year_2026_2027', 'عيد المولد النبوي الشريف', '2026-09-15', '2026-09-16', 0, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO holidays (id, academic_year_id, name, start_date, end_date, is_single_day, created_at) VALUES ('hol_2', 'year_2026_2027', 'العطلة البينية الأولى', '2026-10-25', '2026-11-01', 0, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO holidays (id, academic_year_id, name, start_date, end_date, is_single_day, created_at) VALUES ('hol_3', 'year_2026_2027', 'ذكرى المسيرة الخضراء', '2026-11-06', '2026-11-06', 1, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO holidays (id, academic_year_id, name, start_date, end_date, is_single_day, created_at) VALUES ('hol_4', 'year_2026_2027', 'عيد الاستقلال', '2026-11-18', '2026-11-18', 1, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO holidays (id, academic_year_id, name, start_date, end_date, is_single_day, created_at) VALUES ('hol_5', 'year_2026_2027', 'العطلة البينية الثانية', '2026-12-06', '2026-12-13', 0, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO holidays (id, academic_year_id, name, start_date, end_date, is_single_day, created_at) VALUES ('hol_6', 'year_2026_2027', 'فاتح السنة الميلادية', '2027-01-01', '2027-01-01', 1, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO holidays (id, academic_year_id, name, start_date, end_date, is_single_day, created_at) VALUES ('hol_7', 'year_2026_2027', 'ذكرى تقديم وثيقة الاستقلال', '2027-01-11', '2027-01-11', 1, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO holidays (id, academic_year_id, name, start_date, end_date, is_single_day, created_at) VALUES ('hol_8', 'year_2026_2027', 'عطلة منتصف السنة الدراسية', '2027-01-24', '2027-01-31', 0, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO holidays (id, academic_year_id, name, start_date, end_date, is_single_day, created_at) VALUES ('hol_9', 'year_2026_2027', 'العطلة البينية الثالثة', '2027-03-14', '2027-03-21', 0, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO holidays (id, academic_year_id, name, start_date, end_date, is_single_day, created_at) VALUES ('hol_10', 'year_2026_2027', 'العطلة البينية الرابعة وعيد الفطر', '2027-05-02', '2027-05-09', 0, '2026-09-03 19:56:20');

-- Data for attendance (50 rows)
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_1_2026-09-08', 'std_1', '2026-09-08', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_2_2026-09-08', 'std_2', '2026-09-08', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_3_2026-09-08', 'std_3', '2026-09-08', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_4_2026-09-08', 'std_4', '2026-09-08', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_5_2026-09-08', 'std_5', '2026-09-08', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_6_2026-09-08', 'std_6', '2026-09-08', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_7_2026-09-08', 'std_7', '2026-09-08', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_8_2026-09-08', 'std_8', '2026-09-08', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_9_2026-09-08', 'std_9', '2026-09-08', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_10_2026-09-08', 'std_10', '2026-09-08', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_1_2026-09-09', 'std_1', '2026-09-09', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_2_2026-09-09', 'std_2', '2026-09-09', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_3_2026-09-09', 'std_3', '2026-09-09', 'justified', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_4_2026-09-09', 'std_4', '2026-09-09', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_5_2026-09-09', 'std_5', '2026-09-09', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_6_2026-09-09', 'std_6', '2026-09-09', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_7_2026-09-09', 'std_7', '2026-09-09', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_8_2026-09-09', 'std_8', '2026-09-09', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_9_2026-09-09', 'std_9', '2026-09-09', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_10_2026-09-09', 'std_10', '2026-09-09', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_1_2026-09-10', 'std_1', '2026-09-10', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_2_2026-09-10', 'std_2', '2026-09-10', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_3_2026-09-10', 'std_3', '2026-09-10', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_4_2026-09-10', 'std_4', '2026-09-10', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_5_2026-09-10', 'std_5', '2026-09-10', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_6_2026-09-10', 'std_6', '2026-09-10', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_7_2026-09-10', 'std_7', '2026-09-10', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_8_2026-09-10', 'std_8', '2026-09-10', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_9_2026-09-10', 'std_9', '2026-09-10', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_10_2026-09-10', 'std_10', '2026-09-10', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_1_2026-09-11', 'std_1', '2026-09-11', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_2_2026-09-11', 'std_2', '2026-09-11', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_3_2026-09-11', 'std_3', '2026-09-11', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_4_2026-09-11', 'std_4', '2026-09-11', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_5_2026-09-11', 'std_5', '2026-09-11', 'absent', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_6_2026-09-11', 'std_6', '2026-09-11', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_7_2026-09-11', 'std_7', '2026-09-11', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_8_2026-09-11', 'std_8', '2026-09-11', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_9_2026-09-11', 'std_9', '2026-09-11', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_10_2026-09-11', 'std_10', '2026-09-11', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_1_2026-09-12', 'std_1', '2026-09-12', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_2_2026-09-12', 'std_2', '2026-09-12', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_3_2026-09-12', 'std_3', '2026-09-12', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_4_2026-09-12', 'std_4', '2026-09-12', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_5_2026-09-12', 'std_5', '2026-09-12', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_6_2026-09-12', 'std_6', '2026-09-12', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_7_2026-09-12', 'std_7', '2026-09-12', 'late', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_8_2026-09-12', 'std_8', '2026-09-12', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_9_2026-09-12', 'std_9', '2026-09-12', 'present', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO attendance (id, student_id, date, status, notes, created_at) VALUES ('att_std_10_2026-09-12', 'std_10', '2026-09-12', 'present', NULL, '2026-09-03 19:56:20');

-- Data for assignments (2 rows)
INSERT OR IGNORE INTO assignments (id, class_id, title, subject, description, assigned_date, due_date, created_at) VALUES ('asg_1', 'cls_5_1', 'قراءة نص المسترسل والتلخيص', 'اللغة العربية', 'قراءة الجزء الأول واستخراج الأفكار الرئيسة والشخصيات', '2026-09-15', '2026-09-18', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO assignments (id, class_id, title, subject, description, assigned_date, due_date, created_at) VALUES ('asg_2', 'cls_5_1', 'تمارين القسمة الإقليدية', 'الرياضيات', 'إنجاز التمارين 1 و 2 و 3 الصفحة 24 من كراسة التلميذ', '2026-09-22', '2026-09-24', '2026-09-03 19:56:20');

-- Data for assignment_records (20 rows)
INSERT OR IGNORE INTO assignment_records (id, assignment_id, student_id, status, notes, updated_at) VALUES ('rec_1_std_1', 'asg_1', 'std_1', 1, NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO assignment_records (id, assignment_id, student_id, status, notes, updated_at) VALUES ('rec_2_std_1', 'asg_2', 'std_1', 1, NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO assignment_records (id, assignment_id, student_id, status, notes, updated_at) VALUES ('rec_1_std_2', 'asg_1', 'std_2', 1, NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO assignment_records (id, assignment_id, student_id, status, notes, updated_at) VALUES ('rec_2_std_2', 'asg_2', 'std_2', 1, NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO assignment_records (id, assignment_id, student_id, status, notes, updated_at) VALUES ('rec_1_std_3', 'asg_1', 'std_3', 0, NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO assignment_records (id, assignment_id, student_id, status, notes, updated_at) VALUES ('rec_2_std_3', 'asg_2', 'std_3', 1, NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO assignment_records (id, assignment_id, student_id, status, notes, updated_at) VALUES ('rec_1_std_4', 'asg_1', 'std_4', 1, NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO assignment_records (id, assignment_id, student_id, status, notes, updated_at) VALUES ('rec_2_std_4', 'asg_2', 'std_4', 1, NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO assignment_records (id, assignment_id, student_id, status, notes, updated_at) VALUES ('rec_1_std_5', 'asg_1', 'std_5', 0, NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO assignment_records (id, assignment_id, student_id, status, notes, updated_at) VALUES ('rec_2_std_5', 'asg_2', 'std_5', 0, NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO assignment_records (id, assignment_id, student_id, status, notes, updated_at) VALUES ('rec_1_std_6', 'asg_1', 'std_6', 1, NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO assignment_records (id, assignment_id, student_id, status, notes, updated_at) VALUES ('rec_2_std_6', 'asg_2', 'std_6', 1, NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO assignment_records (id, assignment_id, student_id, status, notes, updated_at) VALUES ('rec_1_std_7', 'asg_1', 'std_7', 1, NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO assignment_records (id, assignment_id, student_id, status, notes, updated_at) VALUES ('rec_2_std_7', 'asg_2', 'std_7', 1, NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO assignment_records (id, assignment_id, student_id, status, notes, updated_at) VALUES ('rec_1_std_8', 'asg_1', 'std_8', 1, NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO assignment_records (id, assignment_id, student_id, status, notes, updated_at) VALUES ('rec_2_std_8', 'asg_2', 'std_8', 1, NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO assignment_records (id, assignment_id, student_id, status, notes, updated_at) VALUES ('rec_1_std_9', 'asg_1', 'std_9', 1, NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO assignment_records (id, assignment_id, student_id, status, notes, updated_at) VALUES ('rec_2_std_9', 'asg_2', 'std_9', 1, NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO assignment_records (id, assignment_id, student_id, status, notes, updated_at) VALUES ('rec_1_std_10', 'asg_1', 'std_10', 1, NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO assignment_records (id, assignment_id, student_id, status, notes, updated_at) VALUES ('rec_2_std_10', 'asg_2', 'std_10', 1, NULL, '2026-09-03 19:56:20');

-- Data for folders (5 rows)
INSERT OR IGNORE INTO folders (id, name, parent_id, created_at) VALUES ('fld_arabic', 'اللغة العربية والقراءة', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO folders (id, name, parent_id, created_at) VALUES ('fld_math', 'الرياضيات والعلوم', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO folders (id, name, parent_id, created_at) VALUES ('fld_support', 'أنشطة الدعم والمعالجة (TaRL)', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO folders (id, name, parent_id, created_at) VALUES ('fld_exams', 'فروض ومراقبات مستمرة', NULL, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO folders (id, name, parent_id, created_at) VALUES ('fld_digital', 'موارد رقمية وفيديوهات تعليمية', NULL, '2026-09-03 19:56:20');

-- Data for document_categories (18 rows)
INSERT OR IGNORE INTO document_categories (id, name, section, parent_id, icon, is_system, created_at) VALUES ('cat_cum_1', 'بطاقة الأستاذ والمعلومات المهنية', 'cumulative', NULL, 'UserCheck', 1, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO document_categories (id, name, section, parent_id, icon, is_system, created_at) VALUES ('cat_cum_2', 'وثائق وتقارير التكوين والورشات', 'cumulative', NULL, 'Award', 1, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO document_categories (id, name, section, parent_id, icon, is_system, created_at) VALUES ('cat_cum_3', 'وثائق TaRL وشبكات التصديق', 'cumulative', NULL, 'Target', 1, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO document_categories (id, name, section, parent_id, icon, is_system, created_at) VALUES ('cat_cum_4', 'وثائق التعليم الصريح', 'cumulative', NULL, 'BookOpen', 1, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO document_categories (id, name, section, parent_id, icon, is_system, created_at) VALUES ('cat_cum_5', 'استعمال الزمن والتعاقد الصفي', 'cumulative', NULL, 'Clock', 1, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO document_categories (id, name, section, parent_id, icon, is_system, created_at) VALUES ('cat_cum_6', 'المذكرة اليومية والتوازيع السنوية', 'cumulative', NULL, 'Calendar', 1, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO document_categories (id, name, section, parent_id, icon, is_system, created_at) VALUES ('cat_plan_1', 'المذكرة اليومية وجذاذات الحصص', 'planning', NULL, 'FileText', 1, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO document_categories (id, name, section, parent_id, icon, is_system, created_at) VALUES ('cat_plan_2', 'التوزيع السنوي والمرحلي', 'planning', NULL, 'Layers', 1, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO document_categories (id, name, section, parent_id, icon, is_system, created_at) VALUES ('cat_plan_3', 'دفتر النصوص وسجل الدروس', 'planning', NULL, 'Book', 1, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO document_categories (id, name, section, parent_id, icon, is_system, created_at) VALUES ('cat_tarl_1', 'روائز الموضعة ودليل التمرير', 'tarl', NULL, 'BarChart2', 1, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO document_categories (id, name, section, parent_id, icon, is_system, created_at) VALUES ('cat_tarl_2', 'شبكات تفريغ النتائج والمجموعات', 'tarl', NULL, 'Users', 1, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO document_categories (id, name, section, parent_id, icon, is_system, created_at) VALUES ('cat_tarl_3', 'جذاذات وأنشطة الدعم المكثف', 'tarl', NULL, 'Sparkles', 1, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO document_categories (id, name, section, parent_id, icon, is_system, created_at) VALUES ('cat_exp_1', 'خطط ومراحل الدرس الصريح', 'explicit', NULL, 'Compass', 1, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO document_categories (id, name, section, parent_id, icon, is_system, created_at) VALUES ('cat_exp_2', 'الخرائط الذهنية وشبكات التحكم', 'explicit', NULL, 'CheckCircle', 1, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO document_categories (id, name, section, parent_id, icon, is_system, created_at) VALUES ('cat_eval_1', 'التقويم التشخيصي والفروض', 'assessment', NULL, 'ClipboardCheck', 1, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO document_categories (id, name, section, parent_id, icon, is_system, created_at) VALUES ('cat_eval_2', 'تقارير النتائج ودراسات الحالات', 'assessment', NULL, 'FilePieChart', 1, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO document_categories (id, name, section, parent_id, icon, is_system, created_at) VALUES ('cat_adm_1', 'لوائح المتعلمين وجدول العطل', 'admin', NULL, 'FolderCheck', 1, '2026-09-03 19:56:20');
INSERT OR IGNORE INTO document_categories (id, name, section, parent_id, icon, is_system, created_at) VALUES ('cat_adm_2', 'ميثاق القسم والقانون الداخلي', 'admin', NULL, 'Shield', 1, '2026-09-03 19:56:20');

-- Data for documents (4 rows)
INSERT OR IGNORE INTO documents (id, category_id, folder_id, title, content_html, is_favorite, is_draft, tags, version, created_at, updated_at) VALUES ('doc_1', 'cat_cum_1', NULL, 'بطاقة الأستاذ المهنية والمعلومات الإدارية', '<h2>بطاقة الأستاذ المهنية</h2>
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
</ul>', 1, 0, NULL, 1, '2026-09-03T19:56:19.851Z', '2026-09-03T19:56:19.851Z');
INSERT OR IGNORE INTO documents (id, category_id, folder_id, title, content_html, is_favorite, is_draft, tags, version, created_at, updated_at) VALUES ('doc_2', 'cat_adm_2', NULL, 'ميثاق التعاقد الديداكتيكي وقواعد القسم', '<h2>ميثاق القسم — معاً نصنع النجاح</h2>
<p>تم إعداد هذا الميثاق بتشاور وتوافق تام بين الأستاذ وتلميذات وتلاميذ المستوى الخامس:</p>
<ol>
  <li><strong>احترام الوقت:</strong> الحضور في الموعد والاصطفاف بانتظام ودخول القاعة بهدوء.</li>
  <li><strong>المشاركة الإيجابية:</strong> رفع اليد قبل أخذ الكلمة واحترام آراء الآخرين دون سخرية.</li>
  <li><strong>الحفاظ على فضاء التعلم:</strong> العناية بنظافة القسم والأثاث والوسائل التعليمية المشتركة.</li>
  <li><strong>إنجاز الواجبات:</strong> المداومة على إحضار الأدوات وإنجاز الأنشطة المنزلية بتفانٍ.</li>
  <li><strong>التعاون والتآزر:</strong> تقديم يد العون للزملاء في ورشات العمل التشاركية.</li>
</ol>', 1, 0, NULL, 1, '2026-09-03T19:56:19.851Z', '2026-09-03T19:56:19.851Z');
INSERT OR IGNORE INTO documents (id, category_id, folder_id, title, content_html, is_favorite, is_draft, tags, version, created_at, updated_at) VALUES ('doc_3', 'cat_tarl_1', 'fld_support', 'دليل تمرير روائز الموضعة — مقاربة التدريس وفق المستوى المناسب (TaRL)', '<h2>دليل تمرير روائز TaRL للغة العربية</h2>
<p>تهدف مقاربة TaRL إلى وضع كل متعلم في مستواه الحقيقي للانطلاق في رحلة الدعم المركز:</p>
<h3>مستويات القراءة المعتمدة:</h3>
<ul>
  <li><strong>المستوى 0 (مبتدئ):</strong> المتعلم الذي لا يتعرف على الحروف المعروضة.</li>
  <li><strong>المستوى 1 (حرف):</strong> يتعرف على 4 أحرف على الأقل من أصل 5 بشكل صحيح وسريع.</li>
  <li><strong>المستوى 2 (كلمة):</strong> يقرأ 4 كلمات ذات معنى بشكل سليم مع الحركات.</li>
  <li><strong>المستوى 3 (فقرة):</strong> يقرأ نصاً قصيراً (من 3 إلى 4 أسطر) بطلاقة ودون تردد.</li>
  <li><strong>المستوى 4 (أقصوصة):</strong> يقرأ قصة ويجيب عن أسئلة الفهم الصريح والضمني.</li>
</ul>', 1, 0, NULL, 1, '2026-09-03T19:56:19.851Z', '2026-09-03T19:56:19.851Z');
INSERT OR IGNORE INTO documents (id, category_id, folder_id, title, content_html, is_favorite, is_draft, tags, version, created_at, updated_at) VALUES ('doc_4', 'cat_plan_1', 'fld_arabic', 'جذاذة نموذجية وفق مبادئ التعليم الصريح (Explicit Instruction)', '<h2>جذاذة درس: التمييز وأنواعه</h2>
<h3>المستوى: الخامس ابتدائي | المادة: اللغة العربية (التراكيب)</h3>
<hr />
<h4>1. النمذجة (أنا أفعل — I Do):</h4>
<p>يقوم الأستاذ بعرض الجملة التوضيحية بصوت مسموع، مبيناً كيفية كشف الكلمة المبهمة بالتمييز الملفوظ.</p>
<h4>2. الممارسة الموجهة (نحن نفعل — We Do):</h4>
<p>يشارك التلاميذ جماعياً وثنائياً في تحديد نوع التمييز في بطاقات ملونة مع تقديم تغذية راجعة فورية.</p>
<h4>3. الممارسة المستقلة (أنت تفعل — You Do):</h4>
<p>ينجز المتعلم فردياً التطبيقات على الدفتر للتأكد من تمكنه المستقل من القاعدة.</p>', 0, 0, NULL, 1, '2026-09-03T19:56:19.851Z', '2026-09-03T19:56:19.851Z');

-- Data for document_versions (4 rows)
INSERT OR IGNORE INTO document_versions (id, document_id, version_num, title, content_html, created_at) VALUES ('ver_doc_1_1', 'doc_1', 1, 'بطاقة الأستاذ المهنية والمعلومات الإدارية', '<h2>بطاقة الأستاذ المهنية</h2>
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
</ul>', '2026-09-03T19:56:19.851Z');
INSERT OR IGNORE INTO document_versions (id, document_id, version_num, title, content_html, created_at) VALUES ('ver_doc_2_1', 'doc_2', 1, 'ميثاق التعاقد الديداكتيكي وقواعد القسم', '<h2>ميثاق القسم — معاً نصنع النجاح</h2>
<p>تم إعداد هذا الميثاق بتشاور وتوافق تام بين الأستاذ وتلميذات وتلاميذ المستوى الخامس:</p>
<ol>
  <li><strong>احترام الوقت:</strong> الحضور في الموعد والاصطفاف بانتظام ودخول القاعة بهدوء.</li>
  <li><strong>المشاركة الإيجابية:</strong> رفع اليد قبل أخذ الكلمة واحترام آراء الآخرين دون سخرية.</li>
  <li><strong>الحفاظ على فضاء التعلم:</strong> العناية بنظافة القسم والأثاث والوسائل التعليمية المشتركة.</li>
  <li><strong>إنجاز الواجبات:</strong> المداومة على إحضار الأدوات وإنجاز الأنشطة المنزلية بتفانٍ.</li>
  <li><strong>التعاون والتآزر:</strong> تقديم يد العون للزملاء في ورشات العمل التشاركية.</li>
</ol>', '2026-09-03T19:56:19.851Z');
INSERT OR IGNORE INTO document_versions (id, document_id, version_num, title, content_html, created_at) VALUES ('ver_doc_3_1', 'doc_3', 1, 'دليل تمرير روائز الموضعة — مقاربة التدريس وفق المستوى المناسب (TaRL)', '<h2>دليل تمرير روائز TaRL للغة العربية</h2>
<p>تهدف مقاربة TaRL إلى وضع كل متعلم في مستواه الحقيقي للانطلاق في رحلة الدعم المركز:</p>
<h3>مستويات القراءة المعتمدة:</h3>
<ul>
  <li><strong>المستوى 0 (مبتدئ):</strong> المتعلم الذي لا يتعرف على الحروف المعروضة.</li>
  <li><strong>المستوى 1 (حرف):</strong> يتعرف على 4 أحرف على الأقل من أصل 5 بشكل صحيح وسريع.</li>
  <li><strong>المستوى 2 (كلمة):</strong> يقرأ 4 كلمات ذات معنى بشكل سليم مع الحركات.</li>
  <li><strong>المستوى 3 (فقرة):</strong> يقرأ نصاً قصيراً (من 3 إلى 4 أسطر) بطلاقة ودون تردد.</li>
  <li><strong>المستوى 4 (أقصوصة):</strong> يقرأ قصة ويجيب عن أسئلة الفهم الصريح والضمني.</li>
</ul>', '2026-09-03T19:56:19.851Z');
INSERT OR IGNORE INTO document_versions (id, document_id, version_num, title, content_html, created_at) VALUES ('ver_doc_4_1', 'doc_4', 1, 'جذاذة نموذجية وفق مبادئ التعليم الصريح (Explicit Instruction)', '<h2>جذاذة درس: التمييز وأنواعه</h2>
<h3>المستوى: الخامس ابتدائي | المادة: اللغة العربية (التراكيب)</h3>
<hr />
<h4>1. النمذجة (أنا أفعل — I Do):</h4>
<p>يقوم الأستاذ بعرض الجملة التوضيحية بصوت مسموع، مبيناً كيفية كشف الكلمة المبهمة بالتمييز الملفوظ.</p>
<h4>2. الممارسة الموجهة (نحن نفعل — We Do):</h4>
<p>يشارك التلاميذ جماعياً وثنائياً في تحديد نوع التمييز في بطاقات ملونة مع تقديم تغذية راجعة فورية.</p>
<h4>3. الممارسة المستقلة (أنت تفعل — You Do):</h4>
<p>ينجز المتعلم فردياً التطبيقات على الدفتر للتأكد من تمكنه المستقل من القاعدة.</p>', '2026-09-03T19:56:19.851Z');

-- Data for student_documents (1 rows)
INSERT OR IGNORE INTO student_documents (id, student_id, document_id, relation_type, created_at) VALUES ('sdoc_1', 'std_1', 'doc_3', 'خطة دعم', '2026-09-03 19:56:20');

-- Data for settings (6 rows)
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('school_name', 'مدرسة ابن خلدون الابتدائية', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('school_city', 'الرباط', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('school_director', 'محمد الإدريسي', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('teacher_name', 'رشيد الفاسي', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('current_year', '2026-2027', '2026-09-03 19:56:20');
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES ('eval_scale', '10', '2026-09-03 19:56:20');

-- Data for activity_logs (2 rows)
INSERT OR IGNORE INTO activity_logs (id, user_id, action, details, ip, created_at) VALUES ('act_init', 'usr_teacher_1', 'تهيئة النظام', 'تم بنجاح تشغيل منصة مساعد الأستاذ وتهيئة قاعدة البيانات الرقمية', NULL, '2026-09-03T19:56:19.851Z');
INSERT OR IGNORE INTO activity_logs (id, user_id, action, details, ip, created_at) VALUES ('act_ab0c07caa5155757', 'usr_teacher_1', 'تسجيل الدخول', 'تم تسجيل الدخول بنجاح من المعرف: admin', '127.0.0.1', '2026-09-03 21:17:06');

