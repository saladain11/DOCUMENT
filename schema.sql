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
