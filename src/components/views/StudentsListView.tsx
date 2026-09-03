import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  Download,
  Eye,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Award,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { api } from '../../lib/api';
import { SchoolClass, Student } from '../../types';

interface StudentsListViewProps {
  classes: SchoolClass[];
  onOpenAddModal: () => void;
  onOpenCsvModal: () => void;
  onSelectStudent: (id: string) => void;
  onEditStudent: (id: string) => void;
}

export const StudentsListView: React.FC<StudentsListViewProps> = ({
  classes,
  onOpenAddModal,
  onOpenCsvModal,
  onSelectStudent,
  onEditStudent
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const res = await api.getStudents({
        classId: selectedClass || undefined,
        gender: selectedGender || undefined,
        search: search.trim() || undefined,
        page,
        limit: 15
      });
      setStudents(res.students || []);
      setPagination(res.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
    } catch (e) {
      console.error('Failed to load students:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, selectedClass, selectedGender]);

  useEffect(() => {
    loadStudents();
  }, [page, selectedClass, selectedGender, search]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من رغبتك في حذف سجل المتعلم(ة): ${name}؟`)) return;
    try {
      setDeletingId(id);
      await api.deleteStudent(id);
      loadStudents();
    } catch (err: any) {
      alert(err.message || 'فشل حذف المتعلم');
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportCsv = () => {
    const url = `/api/students/export/csv${selectedClass ? `?classId=${selectedClass}` : ''}`;
    window.location.href = url;
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 flex items-center gap-2.5">
            <Users className="w-5 h-5 text-blue-600" />
            <span>تدبير المتعلمين والمتعلمات</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            إدارة الملفات الفردية، حساب الأعمار التلقائي، رصد وضعيات الدعم والغياب
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-xl transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة متعلم</span>
          </button>
          <button
            onClick={onOpenCsvModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl transition-colors border border-slate-200 shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>استيراد مسار (CSV)</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-xl transition-colors border border-slate-200 shadow-2xs"
            title="تصدير بيانات المتعلمين الحالية إلى ملف Excel / CSV متوافق مع الحروف العربية"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>تصدير Excel</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم الشخصي، العائلي، أو رقم مسار..."
            className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none font-medium transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
        </div>

        {/* Class Filter */}
        <div className="w-44">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-blue-600 outline-none font-medium transition-all"
          >
            <option value="">جميع الأقسام</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.level})
              </option>
            ))}
          </select>
        </div>

        {/* Gender Filter */}
        <div className="w-32">
          <select
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-blue-600 outline-none font-medium transition-all"
          >
            <option value="">كل الأجناس</option>
            <option value="ذكر">ذكور</option>
            <option value="أنثى">إناث</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
            جاري تحميل قائمة المتعلمين...
          </div>
        ) : students.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30 text-blue-600" />
            لم يتم العثور على أي متعلم يطابق معايير البحث
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">المتعلم(ة)</th>
                  <th className="p-3.5">رقم مسار</th>
                  <th className="p-3.5">القسم والفوج</th>
                  <th className="p-3.5">العمر المحسوب</th>
                  <th className="p-3.5">نسبة الحضور</th>
                  <th className="p-3.5">وضعية الدعم</th>
                  <th className="p-3.5 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                            st.gender === 'أنثى'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {st.first_name[0]}
                        </div>
                        <div>
                          <p
                            onClick={() => onSelectStudent(st.id)}
                            className="font-bold text-slate-800 hover:text-blue-600 cursor-pointer text-sm transition-colors"
                          >
                            {st.full_name}
                          </p>
                          <p className="text-[11px] text-slate-400">{st.gender}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 font-mono font-bold text-blue-900">
                      {st.massar_code || '—'}
                    </td>

                    <td className="p-3.5">
                      <p className="font-semibold text-slate-800">{st.class_name}</p>
                      <p className="text-[10px] text-slate-400">{st.group_name || 'بدون فوج'}</p>
                    </td>

                    <td className="p-3.5">
                      <span className="font-medium text-slate-700">{st.age_text}</span>
                      <p className="text-[10px] text-slate-400 font-mono">{st.birth_date}</p>
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              (st.attendance_percentage || 100) >= 90
                                ? 'bg-emerald-500'
                                : (st.attendance_percentage || 100) >= 75
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${st.attendance_percentage || 100}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-700">{st.attendance_percentage || 100}%</span>
                      </div>
                    </td>

                    <td className="p-3.5">
                      {st.support_level === 'دعم مكثف' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3" />
                          دعم مكثف
                        </span>
                      ) : st.support_level === 'دعم مستمر' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          دعم مستمر
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          عادي
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-left">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectStudent(st.id)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="الملف التربوي الشامل (12 تبويباً)"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditStudent(st.id)}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                          title="تعديل البيانات"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(st.id, st.full_name)}
                          disabled={deletingId === st.id}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="حذف المتعلم"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              عرض الصفحة {pagination.page} من {pagination.totalPages} (إجمالي {pagination.total} متعلم)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 shadow-2xs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="px-2 font-bold text-slate-700">{page}</span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 hover:bg-slate-50 shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
