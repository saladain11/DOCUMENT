import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne, run, getDatabaseBinary } from '../db.js';
import { requireAuth, AuthenticatedRequest, logActivity } from '../auth.js';

export const settingsRouter = Router();

// GET /api/settings - Teacher profile & school details
settingsRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const user = await queryOne<any>(`SELECT * FROM users WHERE id = ?`, [req.user!.id]);
  const settingsRows = await query<any>(`SELECT key, value FROM settings`);
  const settingsMap: Record<string, string> = {};
  settingsRows.forEach(r => {
    settingsMap[r.key] = r.value;
  });

  return res.json({
    settings: {
      teacher_name: settingsMap.teacher_name || user?.full_name || '',
      school_name: settingsMap.school_name || user?.school_name || '',
      directorate: settingsMap.directorate || 'المديرية الإقليمية',
      academy: settingsMap.academy || 'الأكاديمية الجهوية للتربية والتكوين',
      academic_year: settingsMap.academic_year || '2026-2027',
      teacher_email: settingsMap.teacher_email || user?.email || '',
      teacher_phone: settingsMap.teacher_phone || user?.phone || ''
    }
  });
});

// POST /api/settings - Update teacher profile & school details
settingsRouter.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { teacher_name, school_name, directorate, academy, academic_year, teacher_email, teacher_phone } = req.body;
  
  const entries: [string, string][] = [
    ['teacher_name', teacher_name || ''],
    ['school_name', school_name || ''],
    ['directorate', directorate || ''],
    ['academy', academy || ''],
    ['academic_year', academic_year || '2026-2027'],
    ['teacher_email', teacher_email || ''],
    ['teacher_phone', teacher_phone || '']
  ];

  for (const [k, v] of entries) {
    await run(`INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, [k, v]);
  }

  // Also update user's own profile
  if (teacher_name || school_name || teacher_email || teacher_phone) {
    await run(
      `UPDATE users SET full_name = COALESCE(?, full_name), school_name = COALESCE(?, school_name), email = COALESCE(?, email), phone = COALESCE(?, phone) WHERE id = ?`,
      [teacher_name || null, school_name || null, teacher_email || null, teacher_phone || null, req.user!.id]
    );
  }

  await logActivity(req.user!.id, 'تحديث الإعدادات', 'تم تحديث البيانات المدرسية والترويسة الوزارية', req);
  return res.json({ message: 'تم حفظ الإعدادات بنجاح' });
});

// POST /api/settings/backup/import - Restore backup from JSON
settingsRouter.post('/backup/import', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { data } = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'ملف النسخة الاحتياطية غير صالح' });
  }

  // Restore supported tables safely
  for (const [table, rows] of Object.entries(data)) {
    if (!Array.isArray(rows) || rows.length === 0) continue;
    if (['users', 'activity_logs'].includes(table)) continue; // protect users and auth logs

    for (const row of rows) {
      const keys = Object.keys(row);
      const values = Object.values(row);
      const placeholders = keys.map(() => '?').join(', ');
      const updates = keys.map(k => `${k} = excluded.${k}`).join(', ');
      try {
        await run(
          `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO UPDATE SET ${updates}`,
          values
        );
      } catch (e) {
        console.warn(`Skipping row restore for table ${table}:`, e);
      }
    }
  }

  await logActivity(req.user!.id, 'استعادة نسخة احتياطية', 'تمت استعادة البيانات من ملف JSON', req);
  return res.json({ message: 'تمت استعادة البيانات بنجاح' });
});

// GET /api/settings/years - Academic years
settingsRouter.get('/years', requireAuth, async (req: Request, res: Response) => {
  const years = await query<any>(`SELECT * FROM academic_years ORDER BY start_date DESC`);
  return res.json(years);
});

// POST /api/settings/years - Add academic year
settingsRouter.post('/years', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { name, start_date, end_date, is_current } = req.body;
  if (!name || !start_date || !end_date) {
    return res.status(400).json({ error: 'اسم السنة وتاريخ البداية والنهاية حقول إجبارية' });
  }

  const id = 'year_' + crypto.randomBytes(6).toString('hex');
  if (is_current) {
    await run(`UPDATE academic_years SET is_current = 0`);
  }

  await run(
    `INSERT INTO academic_years (id, name, start_date, end_date, is_current) VALUES (?, ?, ?, ?, ?)`,
    [id, name.trim(), start_date, end_date, is_current ? 1 : 0]
  );

  await logActivity(req.user!.id, 'إضافة سنة دراسية', `تمت إضافة السنة: ${name}`, req);

  return res.status(201).json({ message: 'تمت إضافة السنة الدراسية بنجاح', id });
});

// POST /api/settings/years/:id/activate - Set as current year
settingsRouter.post('/years/:id/activate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  await run(`UPDATE academic_years SET is_current = 0`);
  await run(`UPDATE academic_years SET is_current = 1 WHERE id = ?`, [id]);
  await logActivity(req.user!.id, 'تفعيل سنة دراسية', `تم تعيين السنة كحالية: ${id}`, req);
  return res.json({ message: 'تم تفعيل السنة الدراسية بنجاح' });
});

// GET /api/settings/activity-logs - Activity audit trail
settingsRouter.get('/activity-logs', requireAuth, async (req: Request, res: Response) => {
  const { limit = '50' } = req.query;
  const lim = Math.max(1, Math.min(200, parseInt(limit as string) || 50));
  const logs = await query<any>(
    `SELECT al.*, u.full_name as user_name FROM activity_logs al
     LEFT JOIN users u ON al.user_id = u.id
     ORDER BY al.created_at DESC LIMIT ?`,
    [lim]
  );
  return res.json(logs);
});

// GET /api/settings/backup/json - Export entire database state to JSON (item 39)
settingsRouter.get('/backup/json', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const tables = [
    'academic_years',
    'users',
    'classes',
    'groups',
    'students',
    'parents',
    'student_social_info',
    'student_health_notes',
    'placement_domains',
    'student_placements',
    'difficulty_categories',
    'student_difficulties',
    'student_strengths',
    'holidays',
    'attendance',
    'assignments',
    'assignment_records',
    'assessments',
    'document_categories',
    'folders',
    'documents',
    'document_versions',
    'student_documents'
  ];

  const backupData: Record<string, any[]> = {};
  for (const t of tables) {
    backupData[t] = await query<any>(`SELECT * FROM ${t}`);
  }

  // Scrub password hash for safety
  if (backupData.users) {
    backupData.users = backupData.users.map(u => ({ ...u, password_hash: '[PROTECTED]' }));
  }

  const exportPayload = {
    appName: 'مساعد الأستاذ',
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    exportedBy: req.user!.full_name,
    data: backupData
  };

  await logActivity(req.user!.id, 'تصدير نسخة احتياطية', 'تم تنزيل نسخة احتياطية كاملة بصيغة JSON', req);

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="mosaid_backup_${new Date().toISOString().split('T')[0]}.json"`);
  return res.send(JSON.stringify(exportPayload, null, 2));
});

// GET /api/settings/backup/sqlite - Export raw SQLite database binary
settingsRouter.get('/backup/sqlite', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const binary = getDatabaseBinary();
  await logActivity(req.user!.id, 'تصدير قاعدة البيانات', 'تم تنزيل ملف قاعدة البيانات SQLite', req);
  res.setHeader('Content-Type', 'application/vnd.sqlite3');
  res.setHeader('Content-Disposition', `attachment; filename="mosaid_db_${new Date().toISOString().split('T')[0]}.sqlite"`);
  return res.send(Buffer.from(binary));
});
