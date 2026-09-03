export interface User {
  id: string;
  username: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  school_name: string | null;
  school_city: string | null;
  last_login_at: string | null;
}

export interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: number;
}

export interface ClassGroup {
  id: string;
  class_id: string;
  name: string;
  description: string | null;
  student_count?: number;
}

export interface SchoolClass {
  id: string;
  academic_year_id: string;
  academic_year_name?: string;
  name: string;
  level: string;
  code: string | null;
  subject: string | null;
  room: string | null;
  notes: string | null;
  is_archived: number;
  students_count?: number;
  groups_count?: number;
  groups?: ClassGroup[];
}

export interface Student {
  id: string;
  class_id: string;
  class_name?: string;
  class_level?: string;
  group_id: string | null;
  group_name?: string | null;
  first_name: string;
  last_name: string;
  full_name: string;
  gender: 'ذكر' | 'أنثى';
  birth_date: string;
  age?: number;
  age_text?: string;
  massar_code: string | null;
  enrollment_date: string;
  photo_url: string | null;
  general_notes: string | null;
  attendance_percentage?: number;
  active_difficulties_count?: number;
  strengths_count?: number;
  support_level?: string;
}

export interface ParentInfo {
  id?: string;
  student_id?: string;
  father_name?: string | null;
  father_job?: string | null;
  father_phone?: string | null;
  mother_name?: string | null;
  mother_job?: string | null;
  mother_phone?: string | null;
  relationship?: string;
  siblings_count?: number;
  birth_order?: number;
  notes?: string | null;
}

export interface SocialInfo {
  id?: string;
  student_id?: string;
  social_status?: string;
  living_with?: string;
  financial_notes?: string | null;
  general_social_notes?: string | null;
}

export interface HealthNotes {
  id?: string;
  student_id?: string;
  notes: string;
  precautions: string;
  show_in_family_report: number;
}

export interface PlacementDomain {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_default: number;
}

export interface PlacementRecord {
  id: string;
  student_id: string;
  student_name?: string;
  massar_code?: string;
  class_name?: string;
  domain_id: string;
  domain_name?: string;
  level: string;
  date: string;
  period: string;
  notes: string | null;
  teacher_name?: string;
}

export interface DifficultyRecord {
  id: string;
  student_id: string;
  student_name?: string;
  massar_code?: string;
  class_name?: string;
  category: string;
  severity: 'بسيطة' | 'متوسطة' | 'مهمة';
  date: string;
  notes: string | null;
  support_action: string | null;
  status: 'جديدة' | 'قيد المتابعة' | 'تحسنت' | 'تمت معالجتها';
}

export interface StrengthRecord {
  id: string;
  student_id: string;
  student_name?: string;
  massar_code?: string;
  class_name?: string;
  domain: string;
  description: string;
  date: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'justified' | 'late' | 'holiday';
  notes?: string | null;
}

export interface Holiday {
  id: string;
  academic_year_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_single_day: number;
}

export interface Assignment {
  id: string;
  class_id: string;
  class_name?: string;
  title: string;
  subject: string;
  description: string | null;
  assigned_date: string;
  due_date: string;
  completed_count?: number;
  pending_count?: number;
  total_students?: number;
  completion_rate?: number;
}

export interface Assessment {
  id: string;
  class_id: string;
  student_id: string;
  student_name?: string;
  class_name?: string;
  subject: string;
  domain: string | null;
  evaluation_type: string;
  score: number;
  max_score: number;
  date: string;
  notes: string | null;
}

export interface DocumentCategory {
  id: string;
  name: string;
  section: string;
  description: string | null;
  docs_count?: number;
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  docs_count?: number;
  subfolders_count?: number;
}

export interface PedagogicalDocument {
  id: string;
  category_id: string | null;
  category_name?: string | null;
  category_section?: string | null;
  folder_id: string | null;
  folder_name?: string | null;
  title: string;
  content_html: string;
  file_url: string | null;
  file_type: string | null;
  is_favorite: number;
  is_draft: number;
  tags: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  versions_count?: number;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_num: number;
  title: string;
  content_html: string;
  created_at: string;
}

export interface DashboardStats {
  totalStudents: number;
  totalClasses: number;
  attendanceRate: number;
  homeworkRate: number;
  needingSupport: number;
  improvedCount: number;
  totalDocs: number;
  totalStrengths: number;
}

export interface PedagogicalAlert {
  id: string;
  type: 'danger' | 'warning' | 'info';
  title: string;
  desc: string;
  link?: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  user_name?: string;
  action: string;
  details: string;
  created_at: string;
}

export interface MediaItem {
  id: string;
  student_id: string | null;
  student_name?: string | null;
  title: string;
  category: string;
  file_path: string;
  file_type: string;
  file_size: number;
  notes: string | null;
  created_at: string;
}

export interface SchoolSettings {
  teacher_name?: string;
  school_name?: string;
  directorate?: string;
  academy?: string;
  academic_year?: string;
  teacher_email?: string;
  teacher_phone?: string;
}
