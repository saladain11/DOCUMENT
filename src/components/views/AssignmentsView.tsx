import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, CheckCircle2, Clock, Check, Loader2, Users } from 'lucide-react';
import { api } from '../../lib/api';
import { SchoolClass, Assignment } from '../../types';

interface AssignmentsViewProps {
  classes: SchoolClass[];
}

export const AssignmentsView: React.FC<AssignmentsViewProps> = ({ classes }) => {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);

  // Add Assignment Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('اللغة العربية');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]);

  // Check Completion Modal
  const [activeAssignment, setActiveAssignment] = useState<any>(null);
  const [studentsStatus, setStudentsStatus] = useState<any[]>([]);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    if (selectedClassId) {
      loadAssignments();
    }
  }, [selectedClassId]);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const res = await api.getAssignments(selectedClassId || undefined);
      setAssignments(res.assignments || []);
    } catch (e) {
      console.error('Failed to load assignments:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedClassId) return;

    try {
      await api.createAssignment({
        class_id: selectedClassId,
        title: title.trim(),
        subject,
        description: description.trim() || null,
        assigned_date: new Date().toISOString().split('T')[0],
        due_date: dueDate
      });
      setIsAddOpen(false);
      setTitle('');
      setDescription('');
      loadAssignments();
    } catch (e: any) {
      alert(e.message || 'فشل إضافة الواجب');
    }
  };

  const openCompletionModal = async (asg: Assignment) => {
    try {
      const res = await api.getAssignment(asg.id);
      setActiveAssignment(res.assignment);
      setStudentsStatus(res.records || []);
    } catch (e: any) {
      alert(e.message || 'فشل تحميل بيانات إنجاز الواجب');
    }
  };

  const toggleStudentStatus = (studentId: string) => {
    setStudentsStatus((prev) =>
      prev.map((s) => (s.student_id === studentId ? { ...s, is_completed: s.is_completed === 1 ? 0 : 1 } : s))
    );
  };

  const handleSaveCompletion = async () => {
    if (!activeAssignment) return;
    setSavingStatus(true);
    try {
      const records = studentsStatus.map((s) => ({
        student_id: s.student_id,
        is_completed: s.is_completed,
        notes: s.notes || null
      }));
      await api.updateAssignmentBatchStatus(activeAssignment.id, records);
      setActiveAssignment(null);
      loadAssignments();
    } catch (e: any) {
      alert(e.message || 'فشل حفظ حالة الإنجاز');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد بالتأكيد حذف هذا الواجب؟')) return;
    try {
      await api.deleteAssignment(id);
      loadAssignments();
    } catch (e: any) {
      alert(e.message || 'فشل حذف الواجب');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-neutral-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-800" />
            <span>تدبير الواجبات المنزلية والمهام الصفية</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            تكليف المتعلمين بالتمارين المنزلية، رصد الإنجاز، واحتساب نسبة الالتزام
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>تكليف بواجب جديد</span>
        </button>
      </div>

      {/* Class filter */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs flex items-center gap-3 text-xs">
        <span className="font-bold text-neutral-700">تصفية حسب القسم:</span>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="px-3 py-2 border border-neutral-300 rounded-lg bg-white focus:border-emerald-700 outline-hidden font-medium min-w-[200px]"
        >
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name} ({cls.level})
            </option>
          ))}
        </select>
      </div>

      {/* Assignments List */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs p-6">
        {loading ? (
          <div className="py-16 text-center text-neutral-400 text-xs">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-800 mx-auto mb-2" />
            جاري تحميل الواجبات...
          </div>
        ) : assignments.length === 0 ? (
          <div className="py-16 text-center text-neutral-400 text-xs">
            لا توجد واجبات مسجلة لهذا القسم حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.map((asg) => (
              <div
                key={asg.id}
                className="p-5 rounded-xl border border-neutral-200 hover:border-indigo-200 transition-all flex flex-col justify-between space-y-4 bg-neutral-50/50"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-neutral-900 text-base">{asg.title}</h4>
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 mt-1">
                        {asg.subject}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(asg.id)}
                      className="text-neutral-400 hover:text-rose-600 text-xs"
                    >
                      حذف
                    </button>
                  </div>

                  {asg.description && (
                    <p className="text-xs text-neutral-600 mt-3 leading-relaxed">{asg.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-neutral-500 mt-4">
                    <span>تاريخ التكليف: {asg.assigned_date}</span>
                    <span>تاريخ الاستحقاق: <strong className="text-neutral-800">{asg.due_date}</strong></span>
                  </div>
                </div>

                {/* Completion Progress */}
                <div className="pt-3 border-t border-neutral-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-neutral-700">نسبة إنجاز القسم:</span>
                    <span className="font-mono font-bold text-indigo-900">{asg.completion_rate || 0}%</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-700 rounded-full transition-all"
                      style={{ width: `${asg.completion_rate || 0}%` }}
                    />
                  </div>

                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => openCompletionModal(asg)}
                      className="flex items-center gap-1 text-xs font-bold text-emerald-800 hover:underline"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>تحديد إنجاز المتعلمين</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Assignment Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200">
            <h3 className="text-base font-black text-neutral-900 mb-4">تكليف بواجب منزلي جديد</h3>
            <form onSubmit={handleCreateAssignment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">عنوان أو موضوع الواجب *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: تمارين كتابية صفحة 45 (النواسخ الفعلية)"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">المادة الدراسية *</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white focus:border-emerald-700 outline-hidden font-medium"
                >
                  <option value="اللغة العربية">اللغة العربية</option>
                  <option value="الرياضيات">الرياضيات</option>
                  <option value="النشاط العلمي">النشاط العلمي</option>
                  <option value="التربية الإسلامية">التربية الإسلامية</option>
                  <option value="اللغة الفرنسية">اللغة الفرنسية</option>
                  <option value="التربية الفنية">التربية الفنية</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">تاريخ الاستحقاق (أجل التسليم) *</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">تعليمات وتفاصيل إضافية</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="مثال: إنجاز التمرين 1 و 2 في دفتر التمارين المنزلية..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 text-white rounded-lg font-bold hover:bg-emerald-900"
                >
                  حفظ التكليف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Completion Checking Modal */}
      {activeAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-neutral-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <div>
                <h3 className="text-base font-black text-neutral-900">
                  تحديد إنجاز الواجب: {activeAssignment.title}
                </h3>
                <p className="text-xs text-neutral-500">
                  انقر على الزر أمام كل متعلم لتأكيد إنجازه أو عدم إنجازه
                </p>
              </div>
              <button
                onClick={() => setActiveAssignment(null)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-2">
              {studentsStatus.map((st) => (
                <div
                  key={st.student_id}
                  className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50"
                >
                  <span className="text-xs font-bold text-neutral-800">{st.student_name}</span>
                  <button
                    type="button"
                    onClick={() => toggleStudentStatus(st.student_id)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      st.is_completed === 1
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-rose-100 text-rose-900 border border-rose-300'
                    }`}
                  >
                    {st.is_completed === 1 ? '✓ تم الإنجاز' : '✗ لم يُنجز'}
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveAssignment(null)}
                className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleSaveCompletion}
                disabled={savingStatus}
                className="px-5 py-2 bg-emerald-800 text-white rounded-lg text-xs font-bold hover:bg-emerald-900 disabled:opacity-50"
              >
                {savingStatus ? 'جاري الحفظ...' : 'حفظ حالة الإنجاز'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
