import React, { useState } from 'react';
import { School, Plus, Users, FolderPlus, Archive, Check, Edit2, Trash2, FileBarChart, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { SchoolClass } from '../../types';

interface ClassesViewProps {
  classes: SchoolClass[];
  onRefresh: () => void;
  onOpenReport: (classId: string) => void;
}

export const ClassesView: React.FC<ClassesViewProps> = ({ classes, onRefresh, onOpenReport }) => {
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // New Class Form State
  const [className, setClassName] = useState('');
  const [level, setLevel] = useState('المستوى الثالث ابتدائي');
  const [code, setCode] = useState('');
  const [room, setRoom] = useState('');
  const [subject, setSubject] = useState('عرب ومزدوج');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // New Group Form State
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) return;

    setLoading(true);
    try {
      await api.createClass({
        name: className.trim(),
        level,
        code: code.trim() || null,
        room: room.trim() || null,
        subject: subject.trim() || null,
        notes: notes.trim() || null
      });
      setIsAddClassOpen(false);
      setClassName('');
      setCode('');
      setRoom('');
      onRefresh();
    } catch (e: any) {
      alert(e.message || 'فشل إضافة القسم');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !groupName.trim()) return;

    setLoading(true);
    try {
      await api.createGroup(selectedClassId, {
        name: groupName.trim(),
        description: groupDesc.trim() || null
      });
      setIsAddGroupOpen(false);
      setGroupName('');
      setGroupDesc('');
      onRefresh();
    } catch (e: any) {
      alert(e.message || 'فشل إضافة الفوج');
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveClass = async (id: string, isArchived: number) => {
    try {
      await api.updateClass(id, { is_archived: isArchived ? 0 : 1 });
      onRefresh();
    } catch (e: any) {
      alert(e.message || 'فشل تحديث حالة القسم');
    }
  };

  const handleDeleteClass = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف قسم «${name}»؟ سيتم حذف جميع الأفواج والمتعلمين المرتبطين به.`)) return;
    try {
      await api.deleteClass(id);
      onRefresh();
    } catch (e: any) {
      alert(e.message || 'فشل حذف القسم');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-neutral-900 flex items-center gap-2">
            <School className="w-5 h-5 text-emerald-800" />
            <span>تدبير الأقسام والأفواج الدراسية</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            إدارة البنية التربوية، إنشاء الأفواج، توليد تقارير القسم الشاملة
          </p>
        </div>

        <button
          onClick={() => setIsAddClassOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة قسم دراسي</span>
        </button>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((cls) => (
          <div
            key={cls.id}
            className={`bg-white rounded-xl border p-5 shadow-2xs flex flex-col justify-between space-y-4 transition-all ${
              cls.is_archived ? 'opacity-60 border-dashed border-neutral-300' : 'border-neutral-200 hover:border-emerald-300'
            }`}
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-neutral-900">{cls.name}</h3>
                  <span className="text-xs text-emerald-800 font-semibold">{cls.level}</span>
                </div>
                <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full font-bold">
                  {cls.students_count || 0} متعلم
                </span>
              </div>

              <div className="mt-3 text-xs text-neutral-500 space-y-1">
                {cls.room && <p>القاعة: <strong className="text-neutral-700">{cls.room}</strong></p>}
                {cls.code && <p>الرمز: <strong className="text-neutral-700 font-mono">{cls.code}</strong></p>}
              </div>

              {/* Groups Badges */}
              <div className="mt-4 pt-3 border-t border-neutral-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-neutral-700">الأفواج ({cls.groups?.length || 0}):</span>
                  <button
                    onClick={() => {
                      setSelectedClassId(cls.id);
                      setIsAddGroupOpen(true);
                    }}
                    className="text-[11px] text-emerald-800 font-bold hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>فوج جديد</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(!cls.groups || cls.groups.length === 0) ? (
                    <span className="text-[11px] text-neutral-400">لا توجد أفواج منشأة لهذا القسم</span>
                  ) : (
                    cls.groups.map((grp) => (
                      <span
                        key={grp.id}
                        className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200"
                      >
                        {grp.name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
              <button
                onClick={() => onOpenReport(cls.id)}
                className="flex items-center gap-1.5 text-emerald-800 hover:text-emerald-900 font-bold hover:underline"
              >
                <FileBarChart className="w-3.5 h-3.5" />
                <span>التقرير الإحصائي الشامل</span>
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleArchiveClass(cls.id, cls.is_archived)}
                  className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded"
                  title={cls.is_archived ? 'إلغاء الأرشفة' : 'أرشفة القسم'}
                >
                  <Archive className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteClass(cls.id, cls.name)}
                  className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                  title="حذف القسم"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Class Modal */}
      {isAddClassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200">
            <h3 className="text-base font-black text-neutral-900 mb-4">إضافة قسم دراسي جديد</h3>
            <form onSubmit={handleCreateClass} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">اسم القسم *</label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="مثال: الثالث 1"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">المستوى الدراسي *</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden bg-white"
                >
                  <option value="التعليم الأولي">التعليم الأولي</option>
                  <option value="المستوى الأول ابتدائي">المستوى الأول ابتدائي</option>
                  <option value="المستوى الثاني ابتدائي">المستوى الثاني ابتدائي</option>
                  <option value="المستوى الثالث ابتدائي">المستوى الثالث ابتدائي</option>
                  <option value="المستوى الرابع ابتدائي">المستوى الرابع ابتدائي</option>
                  <option value="المستوى الخامس ابتدائي">المستوى الخامس ابتدائي</option>
                  <option value="المستوى السادس ابتدائي">المستوى السادس ابتدائي</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">رمز القسم</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="مثال: 3A-1"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-neutral-700 mb-1">رقم أو اسم القاعة</label>
                  <input
                    type="text"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                    placeholder="مثال: القاعة 4"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddClassOpen(false)}
                  className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-800 text-white rounded-lg font-bold hover:bg-emerald-900"
                >
                  {loading ? 'جاري الحفظ...' : 'حفظ القسم'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Group Modal */}
      {isAddGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200">
            <h3 className="text-base font-black text-neutral-900 mb-4">إضافة فوج جديد للقسم</h3>
            <form onSubmit={handleCreateGroup} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">اسم الفوج *</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="مثال: الفوج 1 / الفوج أ"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">وصف أو توقيت الفوج</label>
                <input
                  type="text"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  placeholder="مثال: الحصة الصباحية / دعم المساء"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddGroupOpen(false)}
                  className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-800 text-white rounded-lg font-bold hover:bg-emerald-900"
                >
                  {loading ? 'جاري الحفظ...' : 'حفظ الفوج'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
