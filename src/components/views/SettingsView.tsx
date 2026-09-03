import React, { useState, useEffect } from 'react';
import { Settings, Save, Calendar, Database, Download, Upload, Check, AlertCircle, Plus, Trash2, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { Holiday } from '../../types';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'holidays' | 'database'>('profile');

  // Teacher Profile State
  const [profile, setProfile] = useState({
    name: '',
    school_name: '',
    directorate: '',
    academy: '',
    academic_year: '2026-2027',
    email: '',
    phone: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Holidays State
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [loadingHolidays, setLoadingHolidays] = useState(false);

  // Backup State
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    loadSettings();
    loadHolidays();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.getSettings();
      if (res.settings) {
        setProfile({
          name: res.settings.teacher_name || '',
          school_name: res.settings.school_name || '',
          directorate: res.settings.directorate || '',
          academy: res.settings.academy || '',
          academic_year: res.settings.academic_year || '2026-2027',
          email: res.settings.teacher_email || '',
          phone: res.settings.teacher_phone || ''
        });
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  const loadHolidays = async () => {
    try {
      setLoadingHolidays(true);
      const res = await api.getHolidays();
      setHolidays(res.holidays || []);
    } catch (e) {
      console.error('Failed to load holidays:', e);
    } finally {
      setLoadingHolidays(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess(false);

    try {
      await api.updateSettings({
        teacher_name: profile.name,
        school_name: profile.school_name,
        directorate: profile.directorate,
        academy: profile.academy,
        academic_year: profile.academic_year,
        teacher_email: profile.email,
        teacher_phone: profile.phone
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3500);
    } catch (e: any) {
      alert(e.message || 'فشل حفظ الإعدادات');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName.trim() || !newStartDate) return;

    try {
      await api.createHoliday({
        name: newHolidayName.trim(),
        start_date: newStartDate,
        end_date: newEndDate || newStartDate,
        academic_year: profile.academic_year
      });
      setNewHolidayName('');
      setNewStartDate('');
      setNewEndDate('');
      loadHolidays();
    } catch (e: any) {
      alert(e.message || 'فشل إضافة العطلة');
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه العطلة؟')) return;
    try {
      await api.deleteHoliday(id);
      loadHolidays();
    } catch (e: any) {
      alert(e.message || 'فشل حذف العطلة');
    }
  };

  const handleExportBackup = async () => {
    setExporting(true);
    try {
      const data = await api.exportBackup();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mosaid-al-ostad-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e.message || 'فشل تصدير النسخة الاحتياطية');
    } finally {
      setExporting(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('تنبيه هام: استعادة النسخة الاحتياطية ستضيف وتحدث البيانات الموجودة. هل تود المتابعة؟')) {
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const backupData = JSON.parse(text);
      await api.importBackup(backupData);
      alert('تمت استعادة النسخة الاحتياطية بنجاح!');
      window.location.reload();
    } catch (e: any) {
      alert(e.message || 'فشل استيراد النسخة الاحتياطية (تأكد من سلامة ملف JSON)');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-neutral-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-800" />
            <span>الإعدادات المدرسية وقاعدة البيانات</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            بيانات المؤسسة والترويسة الرسمية، لائحة العطل المدرسية، وإدارة النسخ الاحتياطية
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-neutral-100 p-1 rounded-lg border border-neutral-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'profile' ? 'bg-white text-emerald-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            البيانات الرسمية والترويسة
          </button>
          <button
            onClick={() => setActiveTab('holidays')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'holidays' ? 'bg-white text-emerald-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            العطل المدرسية الرسمية
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'database' ? 'bg-white text-emerald-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            النسخ الاحتياطي والأمان
          </button>
        </div>
      </div>

      {/* Profile Settings */}
      {activeTab === 'profile' && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs p-6 max-w-3xl">
          <h3 className="text-sm font-black text-neutral-900 pb-3 border-b border-neutral-200 mb-4">
            البيانات البيداغوجية والترويسة الوزارية للوثائق
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">اسم الأستاذ(ة) الكامل *</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="مثال: ذ. محمد العمراني"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">السنة الدراسية *</label>
                <input
                  type="text"
                  value={profile.academic_year}
                  onChange={(e) => setProfile({ ...profile, academic_year: e.target.value })}
                  placeholder="2026-2027"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-mono"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">المؤسسة التعليمية *</label>
                <input
                  type="text"
                  value={profile.school_name}
                  onChange={(e) => setProfile({ ...profile, school_name: e.target.value })}
                  placeholder="م.م النخيل الابتدائية"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">المديرية الإقليمية *</label>
                <input
                  type="text"
                  value={profile.directorate}
                  onChange={(e) => setProfile({ ...profile, directorate: e.target.value })}
                  placeholder="مديرية الرباط"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">الأكاديمية الجهوية *</label>
                <input
                  type="text"
                  value={profile.academy}
                  onChange={(e) => setProfile({ ...profile, academy: e.target.value })}
                  placeholder="جهة الرباط سلا القنيطرة"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-medium"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">البريد الإلكتروني المهني (Taalim.ma)</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="m.omrani@taalim.ma"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">رقم الهاتف للتواصل المهني</label>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="06XXXXXXXX"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-mono"
                />
              </div>
            </div>

            {profileSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-700" />
                تم حفظ بيانات الترويسة بنجاح، وستظهر تلقائياً في كافة الوثائق والتقارير المطبوعة!
              </div>
            )}

            <div className="pt-3 border-t border-neutral-200 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg transition-colors shadow-2xs disabled:opacity-50"
              >
                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>حفظ التعديلات</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Holidays Manager */}
      {activeTab === 'holidays' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs p-6">
            <h3 className="text-sm font-black text-neutral-900 pb-3 border-b border-neutral-200 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-800" />
              <span>إضافة عطلة مدرسية جديدة (مقرر تنظيم السنة الدراسية بالمغرب)</span>
            </h3>

            <form onSubmit={handleAddHoliday} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-bold text-neutral-700 mb-1">اسم أو مناسبة العطلة *</label>
                <input
                  type="text"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  placeholder="مثال: العطلة البينية الأولى وعيد المسيرة الخضراء"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">تاريخ البداية *</label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">تاريخ النهاية</label>
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-mono"
                />
              </div>

              <div className="sm:col-span-4 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة العطلة</span>
                </button>
              </div>
            </form>
          </div>

          {/* Holidays Table */}
          <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-neutral-100 text-neutral-700 font-bold border-b border-neutral-200">
                <tr>
                  <th className="p-3">مناسبة العطلة</th>
                  <th className="p-3">تاريخ البداية</th>
                  <th className="p-3">تاريخ النهاية</th>
                  <th className="p-3 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {holidays.map((h) => (
                  <tr key={h.id} className="hover:bg-neutral-50">
                    <td className="p-3 font-bold text-neutral-900">{h.name}</td>
                    <td className="p-3 font-mono text-neutral-600">{h.start_date}</td>
                    <td className="p-3 font-mono text-neutral-600">{h.end_date}</td>
                    <td className="p-3 text-left">
                      <button
                        onClick={() => handleDeleteHoliday(h.id)}
                        className="text-neutral-400 hover:text-rose-600 p-1 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Database & Backup */}
      {activeTab === 'database' && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs p-6 max-w-3xl space-y-6 text-xs">
          <div>
            <h3 className="text-sm font-black text-neutral-900 pb-3 border-b border-neutral-200 flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-800" />
              <span>النسخ الاحتياطي واستعادة البيانات (أمان بنسبة 100%)</span>
            </h3>
            <p className="text-neutral-600 mt-2 leading-relaxed">
              جميع بياناتك البيداغوجية، المتعلمين، سجلات الغياب، والموضعة محفوظة بشكل دائم في قاعدة بيانات SQLite حقيقية. يمكنك في أي وقت تحميل نسخة احتياطية كاملة ونقلها لأي حاسوب آخر أو رفعها على Cloudflare D1/R2.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Export Card */}
            <div className="p-5 rounded-xl border border-neutral-200 bg-neutral-50/70 flex flex-col justify-between space-y-4">
              <div>
                <h4 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-800" />
                  <span>تصدير نسخة احتياطية</span>
                </h4>
                <p className="text-neutral-600 mt-1">
                  تنزيل ملف JSON شامل يحتوي على كل الأقسام، المتعلمين، الموضعات، الجذاذات وسجلات الغياب.
                </p>
              </div>

              <button
                onClick={handleExportBackup}
                disabled={exporting}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg transition-colors shadow-2xs disabled:opacity-50"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>تحميل النسخة الاحتياطية (.json)</span>
              </button>
            </div>

            {/* Import Card */}
            <div className="p-5 rounded-xl border border-neutral-200 bg-neutral-50/70 flex flex-col justify-between space-y-4">
              <div>
                <h4 className="font-bold text-neutral-900 text-sm flex items-center gap-2">
                  <Upload className="w-4 h-4 text-indigo-800" />
                  <span>استعادة نسخة احتياطية</span>
                </h4>
                <p className="text-neutral-600 mt-1">
                  رفع ملف نسخة سابقة لاستعادة كافة السجلات والمعطيات على الفور.
                </p>
              </div>

              <label className="w-full flex items-center justify-center gap-2 py-2.5 bg-neutral-800 hover:bg-neutral-900 text-white font-bold rounded-lg transition-colors shadow-2xs cursor-pointer">
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>استعراض ملف النسخة الاحتياطية</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                  disabled={importing}
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
