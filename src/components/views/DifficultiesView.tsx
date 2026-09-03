import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Save, Sparkles, Filter, Check, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { SchoolClass, Student, DifficultyRecord } from '../../types';

interface DifficultiesViewProps {
  classes: SchoolClass[];
}

export const DifficultiesView: React.FC<DifficultiesViewProps> = ({ classes }) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'list'>('matrix');
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [students, setStudents] = useState<Student[]>([]);
  const [categories, setCategories] = useState<string[]>([
    'صعوبات القراءة والتهجي',
    'صعوبات الكتابة والخط',
    'صعوبات الحساب والأعداد',
    'صعوبات الفهم القرائي',
    'صعوبات التركيز والانتباه'
  ]);

  // Matrix grid: matrix[student_id][category] = 'none' | 'بسيطة' | 'متوسطة' | 'مهمة'
  const [matrix, setMatrix] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // List Tab State
  const [difficultiesList, setDifficultiesList] = useState<DifficultyRecord[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStudentId, setNewStudentId] = useState('');
  const [newCategory, setNewCategory] = useState(categories[0]);
  const [newSeverity, setNewSeverity] = useState<'بسيطة' | 'متوسطة' | 'مهمة'>('متوسطة');
  const [newNotes, setNewNotes] = useState('');
  const [newSupport, setNewSupport] = useState('');

  // AI Advice Modal State
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (selectedClassId) {
      loadStudentsAndMatrix(selectedClassId);
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (activeTab === 'list') {
      loadDifficultiesList();
    }
  }, [activeTab, selectedClassId]);

  const loadStudentsAndMatrix = async (classId: string) => {
    try {
      setLoading(true);
      const sRes = await api.getStudents({ classId, limit: 100 });
      const sts = sRes.students || [];
      setStudents(sts);

      // Load existing active difficulties to prefill matrix
      const dRes = await api.getDifficulties({ classId });
      const diffs: DifficultyRecord[] = dRes.difficulties || [];

      const initialMatrix: Record<string, Record<string, string>> = {};
      sts.forEach((st: Student) => {
        initialMatrix[st.id] = {};
        categories.forEach((cat) => {
          const match = diffs.find((d) => d.student_id === st.id && d.category === cat && d.status !== 'تمت معالجتها');
          initialMatrix[st.id][cat] = match ? match.severity : 'none';
        });
      });
      setMatrix(initialMatrix);
    } catch (e) {
      console.error('Failed to load matrix:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadDifficultiesList = async () => {
    try {
      setLoading(true);
      const res = await api.getDifficulties({ classId: selectedClassId || undefined });
      setDifficultiesList(res.difficulties || []);
    } catch (e) {
      console.error('Failed to load difficulties list:', e);
    } finally {
      setLoading(false);
    }
  };

  const cycleSeverity = (studentId: string, cat: string) => {
    const current = matrix[studentId]?.[cat] || 'none';
    let next = 'none';
    if (current === 'none') next = 'بسيطة';
    else if (current === 'بسيطة') next = 'متوسطة';
    else if (current === 'متوسطة') next = 'مهمة';
    else if (current === 'مهمة') next = 'none';

    setMatrix({
      ...matrix,
      [studentId]: {
        ...matrix[studentId],
        [cat]: next
      }
    });
  };

  const handleSaveMatrix = async () => {
    setSaving(true);
    setSavedSuccess(false);

    const entries: any[] = [];
    Object.entries(matrix).forEach(([studentId, cats]) => {
      Object.entries(cats).forEach(([category, severity]) => {
        if (severity && severity !== 'none') {
          entries.push({
            student_id: studentId,
            category,
            severity,
            date: new Date().toISOString().split('T')[0]
          });
        }
      });
    });

    try {
      await api.saveCollectiveDifficulties({ classId: selectedClassId, entries });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (e: any) {
      alert(e.message || 'فشل حفظ شبكة الصعوبات');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateIndividual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentId) return;

    try {
      await api.createDifficulty({
        student_id: newStudentId,
        category: newCategory,
        severity: newSeverity,
        date: new Date().toISOString().split('T')[0],
        notes: newNotes.trim() || null,
        support_action: newSupport.trim() || null,
        status: 'جديدة'
      });
      setIsAddModalOpen(false);
      setNewNotes('');
      setNewSupport('');
      loadDifficultiesList();
    } catch (e: any) {
      alert(e.message || 'فشل إضافة الصعوبة');
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: any) => {
    try {
      await api.updateDifficulty(id, { status: newStatus });
      loadDifficultiesList();
    } catch (e: any) {
      alert(e.message || 'فشل تحديث الحالة');
    }
  };

  const handleRequestAiAdviceForDiff = async (diff: DifficultyRecord) => {
    setAiLoading(true);
    try {
      const res = await api.getAIPedagogicalAdvice({
        studentName: diff.student_name,
        level: 'الابتدائي',
        difficulties: [`${diff.category} (${diff.severity}) - الملاحظة: ${diff.notes || 'غير محددة'}`],
        strengths: [],
        placements: []
      });
      setAiAdvice(res.advice);
    } catch (e: any) {
      alert(e.message || 'فشل طلب الاستشارة');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-neutral-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
            <span>رصد صعوبات التعلم وخطط الدعم التربوي</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            الشبكة الجماعية للرصد السريع بنقرة واحدة، وتتبع الإجراءات الداعمة الفردية
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-neutral-100 p-1 rounded-lg border border-neutral-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'matrix' ? 'bg-white text-emerald-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            الشبكة الجماعية للقسم (رصد سريع)
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'list' ? 'bg-white text-emerald-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            سجل الصعوبات وخطط الدعم
          </button>
        </div>
      </div>

      {/* AI Advice Popup */}
      {aiAdvice && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold flex items-center gap-1.5 text-purple-900">
              <Sparkles className="w-4 h-4 text-purple-700" />
              مقترح الدعم التربوي الذكي للصعوبة المحددة
            </h4>
            <button onClick={() => setAiAdvice(null)} className="text-xs text-purple-700 hover:underline">
              إغلاق
            </button>
          </div>
          <div className="text-xs leading-relaxed whitespace-pre-line bg-white/80 p-4 rounded-lg border border-purple-100 text-purple-950">
            {aiAdvice}
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="w-56">
          <label className="block font-bold text-neutral-700 mb-1">تحديد القسم الدراسي:</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white focus:border-emerald-700 outline-hidden font-medium"
          >
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.level})
              </option>
            ))}
          </select>
        </div>

        {activeTab === 'matrix' ? (
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-neutral-500">
              <span>طريقة الرصد: انقر على الخانة للتبديل:</span>
              <span className="px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">لا توجد</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">بسيطة</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">متوسطة</span>
              <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">مهمة</span>
            </div>
            <button
              onClick={handleSaveMatrix}
              disabled={saving || loading}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg transition-colors shadow-2xs disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>حفظ شبكة الصعوبات</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              if (students.length > 0) setNewStudentId(students[0].id);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>تسجيل صعوبة وخطة دعم</span>
          </button>
        )}
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          تم حفظ رصد صعوبات القسم بنجاح!
        </div>
      )}

      {/* MATRIX VIEW */}
      {activeTab === 'matrix' && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-neutral-400 text-xs">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-800 mx-auto mb-2" />
              جاري تحميل شبكة الصعوبات...
            </div>
          ) : students.length === 0 ? (
            <div className="py-16 text-center text-neutral-400 text-xs">
              لا يوجد متعلمون مسجلون في هذا القسم.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-neutral-100 text-neutral-800 font-bold border-b border-neutral-200">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">المتعلم(ة)</th>
                    {categories.map((cat, idx) => (
                      <th key={idx} className="p-3 text-center">
                        {cat}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {students.map((st, idx) => (
                    <tr key={st.id} className="hover:bg-neutral-50">
                      <td className="p-3 text-neutral-400 font-mono">{idx + 1}</td>
                      <td className="p-3 font-bold text-neutral-900">{st.full_name}</td>
                      {categories.map((cat, cIdx) => {
                        const sev = matrix[st.id]?.[cat] || 'none';
                        return (
                          <td key={cIdx} className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => cycleSeverity(st.id, cat)}
                              className={`w-28 py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer border ${
                                sev === 'مهمة'
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : sev === 'متوسطة'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : sev === 'بسيطة'
                                  ? 'bg-blue-100 text-blue-900 border-blue-300'
                                  : 'bg-neutral-50 text-neutral-400 border-neutral-200 hover:bg-neutral-100'
                              }`}
                            >
                              {sev === 'none' ? '—' : sev}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* LIST VIEW */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
          {difficultiesList.length === 0 ? (
            <div className="py-16 text-center text-neutral-400 text-xs">
              لم تسجل صعوبات بعد لهذا القسم.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-neutral-100 text-neutral-700 font-bold border-b border-neutral-200">
                  <tr>
                    <th className="p-3">المتعلم</th>
                    <th className="p-3">مجال الصعوبة</th>
                    <th className="p-3">درجة الصعوبة</th>
                    <th className="p-3">خطة الدعم المقترحة</th>
                    <th className="p-3">الحالة</th>
                    <th className="p-3 text-left">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {difficultiesList.map((diff) => (
                    <tr key={diff.id} className="hover:bg-neutral-50">
                      <td className="p-3 font-bold text-neutral-900">{diff.student_name}</td>
                      <td className="p-3">{diff.category}</td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            diff.severity === 'مهمة'
                              ? 'bg-rose-100 text-rose-800'
                              : diff.severity === 'متوسطة'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {diff.severity}
                        </span>
                      </td>
                      <td className="p-3 text-neutral-700 max-w-xs truncate">
                        {diff.support_action || 'لم تحدد خطة بعد'}
                      </td>
                      <td className="p-3">
                        <select
                          value={diff.status}
                          onChange={(e) => handleUpdateStatus(diff.id, e.target.value)}
                          className="px-2 py-1 bg-neutral-100 border border-neutral-300 rounded font-semibold text-neutral-800 outline-hidden text-[11px]"
                        >
                          <option value="جديدة">جديدة</option>
                          <option value="قيد المتابعة">قيد المتابعة</option>
                          <option value="تحسنت">تحسنت</option>
                          <option value="تمت معالجتها">تمت معالجتها</option>
                        </select>
                      </td>
                      <td className="p-3 text-left">
                        <button
                          onClick={() => handleRequestAiAdviceForDiff(diff)}
                          className="flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded border border-purple-200"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>اقتراح دعم ذكي</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Difficulty Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200">
            <h3 className="text-base font-black text-neutral-900 mb-4">تسجيل صعوبة وخطة دعم</h3>
            <form onSubmit={handleCreateIndividual} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">المتعلم *</label>
                <select
                  value={newStudentId}
                  onChange={(e) => setNewStudentId(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white focus:border-emerald-700 outline-hidden font-bold"
                  required
                >
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">المجال / الفئة *</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white focus:border-emerald-700 outline-hidden"
                >
                  {categories.map((c, i) => (
                    <option key={i} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">درجة الصعوبة *</label>
                <select
                  value={newSeverity}
                  onChange={(e) => setNewSeverity(e.target.value as any)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white focus:border-emerald-700 outline-hidden font-bold"
                >
                  <option value="بسيطة">بسيطة (دعم فوري في الحصة)</option>
                  <option value="متوسطة">متوسطة (تحتاج أنشطة إضافية)</option>
                  <option value="مهمة">مهمة (خطة دعم مركزة وتتبع)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">ملاحظة تشخيصية</label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="مثال: يخلط بين حرفي الدال والذال، بطء في الجمع..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">خطة الدعم المقترحة</label>
                <textarea
                  rows={2}
                  value={newSupport}
                  onChange={(e) => setNewSupport(e.target.value)}
                  placeholder="مثال: بطاقات صوتية، تمارين تمييز بصرية، مرافقة مع القرين..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 text-white rounded-lg font-bold hover:bg-emerald-900"
                >
                  حفظ الصعوبة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
