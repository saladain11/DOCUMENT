import React, { useState, useEffect } from 'react';
import { Award, Plus, Trash2, Filter, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { SchoolClass, Student, StrengthRecord } from '../../types';

interface StrengthsViewProps {
  classes: SchoolClass[];
}

export const StrengthsView: React.FC<StrengthsViewProps> = ({ classes }) => {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [strengths, setStrengths] = useState<StrengthRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Add form state
  const [studentId, setStudentId] = useState('');
  const [domain, setDomain] = useState('الإبداع اللغوي والتعبير');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const strengthDomains = [
    'الإبداع اللغوي والتعبير',
    'الذكاء المنطقي والرياضي',
    'الرسم والفنون التشكيلية',
    'النشاط الرياضي والحركي',
    'القيادة والمبادرة الصيفية',
    'التعاون ومساعدة الأقران',
    'الذاكرة وسرعة الحفظ',
    'الخط العربي والترتيب'
  ];

  useEffect(() => {
    if (selectedClassId) {
      loadStrengths();
      loadStudents();
    }
  }, [selectedClassId]);

  const loadStrengths = async () => {
    try {
      setLoading(true);
      const res = await api.getStrengths({ classId: selectedClassId || undefined });
      setStrengths(res.strengths || []);
    } catch (e) {
      console.error('Failed to load strengths:', e);
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

  const handleCreateStrength = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !description.trim()) return;

    try {
      await api.createStrength({
        student_id: studentId,
        domain,
        description: description.trim(),
        date
      });
      setIsAddModalOpen(false);
      setDescription('');
      loadStrengths();
    } catch (e: any) {
      alert(e.message || 'فشل حفظ نقطة القوة');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف نقطة القوة هذه؟')) return;
    try {
      await api.deleteStrength(id);
      loadStrengths();
    } catch (e: any) {
      alert(e.message || 'فشل حذف السجل');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-neutral-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-orange-700" />
            <span>سجل نقاط القوة والتميز للمتعلمين</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            توثيق المواهب ومجالات التميز الفردية، وتضمينها أولوياً في تقرير الأسرة
          </p>
        </div>

        <button
          onClick={() => {
            if (students.length > 0) setStudentId(students[0].id);
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>توثيق نقطة قوة جديدة</span>
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

      {/* Strengths Grid */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs p-6">
        {loading ? (
          <div className="py-16 text-center text-neutral-400 text-xs">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-800 mx-auto mb-2" />
            جاري تحميل نقاط القوة...
          </div>
        ) : strengths.length === 0 ? (
          <div className="py-16 text-center text-neutral-400 text-xs">
            لم تسجل نقاط قوة لهذا القسم بعد. انقر على «توثيق نقطة قوة جديدة» لإضافة تميز المتعلمين.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {strengths.map((str) => (
              <div
                key={str.id}
                className="p-4 rounded-xl border border-orange-200 bg-orange-50/40 hover:bg-orange-50/70 transition-colors flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-neutral-900 text-sm">{str.student_name}</h4>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-900 border border-orange-300 mt-1">
                        {str.domain}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(str.id)}
                      className="text-neutral-400 hover:text-rose-600 p-1 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-neutral-700 mt-2.5 leading-relaxed">{str.description}</p>
                </div>
                <div className="text-[10px] text-neutral-400 font-mono pt-2 border-t border-orange-200/50">
                  سُجلت بتاريخ: {str.date}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200">
            <h3 className="text-base font-black text-neutral-900 mb-4">توثيق نقطة قوة للمتعلم</h3>
            <form onSubmit={handleCreateStrength} className="space-y-3 text-xs">
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

              <div>
                <label className="block font-bold text-neutral-700 mb-1">مجال التميز والقوة *</label>
                <select
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white focus:border-emerald-700 outline-hidden font-medium"
                >
                  {strengthDomains.map((d, i) => (
                    <option key={i} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">تاريخ الملاحظة</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">الوصف والتفاصيل الإيجابية *</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="مثال: يمتلك طلاقة تعبيرية ممتازة أثناء تقديم العروض الصفية..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden leading-relaxed"
                  required
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
                  حفظ نقطة القوة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
