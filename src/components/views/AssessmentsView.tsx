import React, { useState, useEffect } from 'react';
import { GraduationCap, Plus, Trash2, Filter, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { SchoolClass, Student, Assessment } from '../../types';

interface AssessmentsViewProps {
  classes: SchoolClass[];
}

export const AssessmentsView: React.FC<AssessmentsViewProps> = ({ classes }) => {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State
  const [studentId, setStudentId] = useState('');
  const [subject, setSubject] = useState('اللغة العربية');
  const [domain, setDomain] = useState('القراءة والفهم');
  const [evalType, setEvalType] = useState('مراقبة مستمرة 1');
  const [score, setScore] = useState('8.5');
  const [maxScore, setMaxScore] = useState('10');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (selectedClassId) {
      loadAssessments();
      loadStudents();
    }
  }, [selectedClassId, selectedSubject]);

  const loadAssessments = async () => {
    try {
      setLoading(true);
      const res = await api.getAssessments({
        classId: selectedClassId || undefined,
        subject: selectedSubject || undefined
      });
      setAssessments(res.assessments || []);
    } catch (e) {
      console.error('Failed to load assessments:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const res = await api.getStudents({ classId: selectedClassId, limit: 100 });
      setStudents(res.students || []);
      if (res.students?.length > 0 && !studentId) {
        setStudentId(res.students[0].id);
      }
    } catch (e) {
      console.error('Failed to load students:', e);
    }
  };

  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !score) return;

    try {
      await api.createAssessment({
        class_id: selectedClassId,
        student_id: studentId,
        subject,
        domain: domain.trim() || null,
        evaluation_type: evalType,
        score: parseFloat(score),
        max_score: parseFloat(maxScore) || 10,
        date,
        notes: notes.trim() || null
      });
      setIsAddOpen(false);
      setNotes('');
      loadAssessments();
    } catch (e: any) {
      alert(e.message || 'فشل تسجيل النتيجة');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه النتيجة؟')) return;
    try {
      await api.deleteAssessment(id);
      loadAssessments();
    } catch (e: any) {
      alert(e.message || 'فشل الحذف');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-neutral-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-800" />
            <span>التقويمات والنتائج الدراسية</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            رصد نقط المراقبة المستمرة، الفروض الدورية، والتقويم التشخيصي
          </p>
        </div>

        <button
          onClick={() => {
            if (students.length > 0) setStudentId(students[0].id);
            setIsAddOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل نتيجة تقويم</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs flex flex-wrap items-center gap-3 text-xs">
        <div className="w-48">
          <label className="block font-bold text-neutral-700 mb-1">القسم:</label>
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

        <div className="w-48">
          <label className="block font-bold text-neutral-700 mb-1">المادة:</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white focus:border-emerald-700 outline-hidden font-medium"
          >
            <option value="">جميع المواد</option>
            <option value="اللغة العربية">اللغة العربية</option>
            <option value="الرياضيات">الرياضيات</option>
            <option value="النشاط العلمي">النشاط العلمي</option>
            <option value="التربية الإسلامية">التربية الإسلامية</option>
            <option value="اللغة الفرنسية">اللغة الفرنسية</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-neutral-400 text-xs">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-800 mx-auto mb-2" />
            جاري تحميل النتائج...
          </div>
        ) : assessments.length === 0 ? (
          <div className="py-16 text-center text-neutral-400 text-xs">
            لا توجد نتائج تقويمية مسجلة لهذا الاختيار.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-neutral-100 text-neutral-700 font-bold border-b border-neutral-200">
                <tr>
                  <th className="p-3">المتعلم</th>
                  <th className="p-3">المادة والمجال</th>
                  <th className="p-3">نوع التقويم</th>
                  <th className="p-3">النقطة المحصلة</th>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">ملاحظات</th>
                  <th className="p-3 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {assessments.map((ass) => (
                  <tr key={ass.id} className="hover:bg-neutral-50">
                    <td className="p-3 font-bold text-neutral-900">{ass.student_name}</td>
                    <td className="p-3">
                      <span className="font-semibold text-neutral-800">{ass.subject}</span>
                      {ass.domain && <span className="text-neutral-400 block text-[10px]">{ass.domain}</span>}
                    </td>
                    <td className="p-3">{ass.evaluation_type}</td>
                    <td className="p-3 font-mono font-bold text-sm text-emerald-800">
                      {ass.score} <span className="text-xs text-neutral-400">/ {ass.max_score}</span>
                    </td>
                    <td className="p-3 font-mono text-neutral-500">{ass.date}</td>
                    <td className="p-3 text-neutral-600">{ass.notes || '—'}</td>
                    <td className="p-3 text-left">
                      <button
                        onClick={() => handleDelete(ass.id)}
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
        )}
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200">
            <h3 className="text-base font-black text-neutral-900 mb-4">تسجيل نقطة تقويم</h3>
            <form onSubmit={handleCreateAssessment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">المتعلم *</label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">المادة *</label>
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
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 mb-1">نوع التقويم</label>
                  <select
                    value={evalType}
                    onChange={(e) => setEvalType(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white focus:border-emerald-700 outline-hidden"
                  >
                    <option value="تقويم تشخيصي">تقويم تشخيصي</option>
                    <option value="مراقبة مستمرة 1">مراقبة مستمرة 1</option>
                    <option value="مراقبة مستمرة 2">مراقبة مستمرة 2</option>
                    <option value="مراقبة مستمرة 3">مراقبة مستمرة 3</option>
                    <option value="مراقبة مستمرة 4">مراقبة مستمرة 4</option>
                    <option value="امتحان موحد">امتحان موحد</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">النقطة المحصلة *</label>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max={maxScore}
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-mono font-bold text-emerald-900"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-neutral-700 mb-1">النقطة القصوى</label>
                  <input
                    type="number"
                    value={maxScore}
                    onChange={(e) => setMaxScore(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">المجال أو المهارة المقومة</label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="مثال: القراءة / المعجم / الحساب الذهني"
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
                  حفظ النتيجة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
