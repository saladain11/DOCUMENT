import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  User,
  Users,
  HeartHandshake,
  ShieldAlert,
  Target,
  AlertTriangle,
  Award,
  Calendar,
  BookOpen,
  GraduationCap,
  MessageSquare,
  Files,
  Printer,
  Edit2,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Plus
} from 'lucide-react';
import { api } from '../../lib/api';
import { Student } from '../../types';
import { PrintHeader } from '../layout/PrintHeader';

interface StudentDetailViewProps {
  studentId: string;
  onBack: () => void;
  onEdit: (studentId: string) => void;
  onOpenReport: (studentId: string, type: 'pedagogical' | 'family') => void;
}

export const StudentDetailView: React.FC<StudentDetailViewProps> = ({
  studentId,
  onBack,
  onEdit,
  onOpenReport
}) => {
  const [activeTab, setActiveTab] = useState<number>(1);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);

  useEffect(() => {
    loadStudent();
  }, [studentId]);

  const loadStudent = async () => {
    try {
      setLoading(true);
      const res = await api.getStudent(studentId);
      setData(res);
    } catch (e) {
      console.error('Failed to load student profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAiAdvice = async () => {
    if (!data) return;
    try {
      setAiLoading(true);
      const res = await api.getAIPedagogicalAdvice({
        studentName: data.student.full_name,
        level: data.student.class_level || 'الابتدائي',
        difficulties: data.difficulties.map((d: any) => `${d.category} (${d.severity})`),
        strengths: data.strengths.map((s: any) => `${s.domain}: ${s.description}`),
        placements: data.placements.map((p: any) => `${p.domain_name}: ${p.level}`)
      });
      setAiAdvice(res.advice);
    } catch (e: any) {
      alert(e.message || 'تعذر استدعاء المساعد الذكي');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-800 animate-spin" />
      </div>
    );
  }

  if (!data || !data.student) {
    return (
      <div className="p-8 text-center">
        <p className="text-neutral-500">لم يتم العثور على سجل المتعلم</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-emerald-800 text-white rounded-lg text-xs">
          العودة للقائمة
        </button>
      </div>
    );
  }

  const s = data.student;
  const tabs = [
    { id: 1, label: 'المعلومات الأساسية', icon: User },
    { id: 2, label: 'الوالدان', icon: Users },
    { id: 3, label: 'الوضعية الاجتماعية', icon: HeartHandshake },
    { id: 4, label: 'الملاحظات الوقائية', icon: ShieldAlert },
    { id: 5, label: 'مسار الموضعة (TaRL)', icon: Target },
    { id: 6, label: 'الصعوبات والدعم', icon: AlertTriangle },
    { id: 7, label: 'نقاط القوة', icon: Award },
    { id: 8, label: 'الحضور والغياب', icon: Calendar },
    { id: 9, label: 'الواجبات', icon: BookOpen },
    { id: 10, label: 'التقويمات', icon: GraduationCap },
    { id: 11, label: 'الملاحظات العامة', icon: MessageSquare },
    { id: 12, label: 'الوثائق المرتبطة', icon: Files },
  ];

  return (
    <div className="space-y-6">
      {/* Official Print Header */}
      <PrintHeader
        title={`الملف التربوي الفردي للمتعلم: ${s.full_name}`}
        subtitle={`القسم: ${s.class_name} | رقم مسار: ${s.massar_code || 'غير محدد'}`}
      />

      {/* Top Banner (Screen only) */}
      <div className="no-print bg-white p-5 sm:p-6 rounded-xl border border-neutral-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
            title="العودة للقائمة"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-xs ${
              s.gender === 'أنثى' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {s.first_name[0]}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900">{s.full_name}</h2>
              <span className="text-xs px-2 py-0.5 rounded font-mono bg-neutral-100 text-neutral-600">
                {s.massar_code || 'بدون مسار'}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              القسم: <strong className="text-neutral-800">{s.class_name}</strong> • العمر:{' '}
              <strong className="text-neutral-800">{s.age_text}</strong> • تاريخ التسجيل: {s.enrollment_date}
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleGenerateAiAdvice}
            disabled={aiLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold rounded-lg border border-purple-200 transition-colors"
          >
            {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-purple-700" />}
            <span>استشارة بيداغوجية ذكية</span>
          </button>
          <button
            onClick={() => onOpenReport(s.id, 'pedagogical')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-lg border border-neutral-200 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-neutral-600" />
            <span>التقرير التربوي</span>
          </button>
          <button
            onClick={() => onOpenReport(s.id, 'family')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-lg border border-neutral-200 transition-colors"
          >
            <span>تقرير الأسرة</span>
          </button>
          <button
            onClick={() => onEdit(s.id)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>تعديل السجل</span>
          </button>
        </div>
      </div>

      {/* AI Pedagogical Advice Box */}
      {aiAdvice && (
        <div className="no-print bg-purple-50/80 border border-purple-200 rounded-xl p-5 text-purple-950 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold flex items-center gap-1.5 text-purple-900">
              <Sparkles className="w-4 h-4 text-purple-700" />
              توجيهات المساعد البيداغوجي الذكي (مبنية على الموضعة والصعوبات ونقاط القوة)
            </h4>
            <button onClick={() => setAiAdvice(null)} className="text-xs text-purple-700 hover:underline">
              إغلاق
            </button>
          </div>
          <div className="text-xs leading-relaxed whitespace-pre-line bg-white/70 p-4 rounded-lg border border-purple-150">
            {aiAdvice}
          </div>
        </div>
      )}

      {/* Tabs Navigation (Screen only) */}
      <div className="no-print bg-white rounded-xl border border-neutral-200 p-2 shadow-2xs overflow-x-auto flex gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-2xs">
        {/* TAB 1: BASIC INFO */}
        {(activeTab === 1 || window.matchMedia('print').matches) && (
          <div className="space-y-4 text-xs">
            <h3 className="text-sm font-black text-neutral-900 pb-2 border-b border-neutral-200">
              1. المعلومات الأساسية والشخصية
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-neutral-400 block font-medium">الاسم الكامل:</span>
                <span className="font-bold text-neutral-800 text-sm">{s.full_name}</span>
              </div>
              <div>
                <span className="text-neutral-400 block font-medium">رقم مسار:</span>
                <span className="font-mono font-bold text-emerald-800 text-sm">{s.massar_code || '—'}</span>
              </div>
              <div>
                <span className="text-neutral-400 block font-medium">الجنس:</span>
                <span className="font-bold text-neutral-800">{s.gender}</span>
              </div>
              <div>
                <span className="text-neutral-400 block font-medium">تاريخ الازدياد والعمر:</span>
                <span className="font-bold text-neutral-800">{s.birth_date} ({s.age_text})</span>
              </div>
              <div>
                <span className="text-neutral-400 block font-medium">القسم الدراسي:</span>
                <span className="font-bold text-neutral-800">{s.class_name} ({s.class_level})</span>
              </div>
              <div>
                <span className="text-neutral-400 block font-medium">الفوج:</span>
                <span className="font-bold text-neutral-800">{s.group_name || 'بدون فوج'}</span>
              </div>
              <div>
                <span className="text-neutral-400 block font-medium">تاريخ التسجيل بالمؤسسة:</span>
                <span className="font-medium text-neutral-700">{s.enrollment_date}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PARENTS */}
        {activeTab === 2 && (
          <div className="space-y-4 text-xs">
            <h3 className="text-sm font-black text-neutral-900 pb-2 border-b border-neutral-200">
              2. بيانات الوالدين والتواصل العائلي
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Father */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                <h4 className="font-black text-neutral-800 text-xs">بيانات الأب:</h4>
                <p>الاسم: <strong className="text-neutral-900">{data.parent?.father_name || '—'}</strong></p>
                <p>المهنة: <strong className="text-neutral-900">{data.parent?.father_job || '—'}</strong></p>
                <p>الهاتف: <strong className="text-neutral-900 font-mono">{data.parent?.father_phone || '—'}</strong></p>
              </div>

              {/* Mother */}
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
                <h4 className="font-black text-neutral-800 text-xs">بيانات الأم:</h4>
                <p>الاسم: <strong className="text-neutral-900">{data.parent?.mother_name || '—'}</strong></p>
                <p>المهنة: <strong className="text-neutral-900">{data.parent?.mother_job || '—'}</strong></p>
                <p>الهاتف: <strong className="text-neutral-900 font-mono">{data.parent?.mother_phone || '—'}</strong></p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-2">
              <div>
                <span className="text-neutral-400 block font-medium">العلاقة الأسرية:</span>
                <span className="font-bold text-neutral-800">{data.parent?.relationship || 'الوالدان'}</span>
              </div>
              <div>
                <span className="text-neutral-400 block font-medium">عدد الإخوة:</span>
                <span className="font-bold text-neutral-800">{data.parent?.siblings_count ?? 0}</span>
              </div>
              <div>
                <span className="text-neutral-400 block font-medium">ترتيب المتعلم في الأسرة:</span>
                <span className="font-bold text-neutral-800">{data.parent?.birth_order ?? 1}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SOCIAL */}
        {activeTab === 3 && (
          <div className="space-y-4 text-xs">
            <h3 className="text-sm font-black text-neutral-900 pb-2 border-b border-neutral-200">
              3. الوضعية الاجتماعية والمعيشية
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-neutral-400 block font-medium">الوضعية العائلية:</span>
                <span className="font-bold text-neutral-800">{data.social?.social_status || 'مستقرة'}</span>
              </div>
              <div>
                <span className="text-neutral-400 block font-medium">يقيم حالياً مع:</span>
                <span className="font-bold text-neutral-800">{data.social?.living_with || 'الوالدين'}</span>
              </div>
            </div>
            <div>
              <span className="text-neutral-400 block font-medium">ملاحظات مادية:</span>
              <p className="p-3 bg-neutral-50 rounded-lg text-neutral-700 mt-1">
                {data.social?.financial_notes || 'لا توجد ملاحظات مادية مسجلة'}
              </p>
            </div>
            <div>
              <span className="text-neutral-400 block font-medium">ملاحظات اجتماعية عامة (سرية للأستاذ):</span>
              <p className="p-3 bg-neutral-50 rounded-lg text-neutral-700 mt-1">
                {data.social?.general_social_notes || 'لا توجد ملاحظات اجتماعية مسجلة'}
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: HEALTH */}
        {activeTab === 4 && (
          <div className="space-y-4 text-xs">
            <h3 className="text-sm font-black text-neutral-900 pb-2 border-b border-neutral-200">
              4. الملاحظات الصحية والوقائية الصفية
            </h3>
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
              <div>
                <span className="text-amber-900 font-bold block mb-1">الملاحظة الصحية الوقائية:</span>
                <p className="text-neutral-800 font-medium">
                  {data.health?.notes || 'عادي، لا توجد ملاحظات صحية وقائية'}
                </p>
              </div>
              <div>
                <span className="text-amber-900 font-bold block mb-1">الاحتياطات الصفية اللازمة:</span>
                <p className="text-neutral-800 font-medium">
                  {data.health?.precautions || 'لا توجد احتياطات إضافية مطلوبة'}
                </p>
              </div>
              <div className="pt-2 text-[11px] text-neutral-600 border-t border-amber-200/60">
                حالة ظهور الملاحظة بتقرير الأسرة:{' '}
                <strong className={data.health?.show_in_family_report === 1 ? 'text-emerald-800' : 'text-neutral-500'}>
                  {data.health?.show_in_family_report === 1 ? 'نعم (تظهر للأسرة)' : 'لا (محفوظة للأستاذ فقط)'}
                </strong>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: PLACEMENT & TARL */}
        {activeTab === 5 && (
          <div className="space-y-4 text-xs">
            <h3 className="text-sm font-black text-neutral-900 pb-2 border-b border-neutral-200">
              5. مسار الموضعة وتطور المتعلم (مقاربة TaRL)
            </h3>
            {data.placements.length === 0 ? (
              <p className="py-8 text-center text-neutral-400">لا توجد تسجيلات موضعة لهذا المتعلم بعد.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-neutral-100 text-neutral-700 font-bold border-b border-neutral-200">
                    <tr>
                      <th className="p-2.5">المجال</th>
                      <th className="p-2.5">المستوى المحدد</th>
                      <th className="p-2.5">تاريخ التقييم</th>
                      <th className="p-2.5">الفترة</th>
                      <th className="p-2.5">ملاحظات الأستاذ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {data.placements.map((p: any) => (
                      <tr key={p.id} className="hover:bg-neutral-50">
                        <td className="p-2.5 font-bold text-neutral-800">{p.domain_name}</td>
                        <td className="p-2.5">
                          <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300/60">
                            {p.level}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-neutral-600">{p.date}</td>
                        <td className="p-2.5">{p.period}</td>
                        <td className="p-2.5 text-neutral-600">{p.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: DIFFICULTIES */}
        {activeTab === 6 && (
          <div className="space-y-4 text-xs">
            <h3 className="text-sm font-black text-neutral-900 pb-2 border-b border-neutral-200">
              6. الصعوبات المرصودة وخطة الدعم
            </h3>
            {data.difficulties.length === 0 ? (
              <p className="py-8 text-center text-neutral-400">
                لم يتم تسجيل أية صعوبات تعلمية لهذا المتعلم؛ الوضعية إيجابية.
              </p>
            ) : (
              <div className="space-y-3">
                {data.difficulties.map((diff: any) => (
                  <div
                    key={diff.id}
                    className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/60 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-900 text-xs">{diff.category}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            diff.severity === 'مهمة'
                              ? 'bg-rose-100 text-rose-800'
                              : diff.severity === 'متوسطة'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          درجة الصعوبة: {diff.severity}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-200 text-neutral-700">
                          {diff.status}
                        </span>
                      </div>
                    </div>
                    {diff.notes && <p className="text-neutral-700">الملاحظة: {diff.notes}</p>}
                    {diff.support_action && (
                      <div className="p-2.5 rounded-lg bg-white border border-neutral-200 text-emerald-950 font-medium">
                        خطة الدعم المقترحة: {diff.support_action}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: STRENGTHS */}
        {activeTab === 7 && (
          <div className="space-y-4 text-xs">
            <h3 className="text-sm font-black text-neutral-900 pb-2 border-b border-neutral-200">
              7. نقاط القوة ومجالات التميز
            </h3>
            {data.strengths.length === 0 ? (
              <p className="py-8 text-center text-neutral-400">لا توجد نقاط قوة مسجلة بعد.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.strengths.map((str: any) => (
                  <div key={str.id} className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-900">{str.domain}</span>
                      <span className="text-[10px] text-neutral-400 font-mono">{str.date}</span>
                    </div>
                    <p className="text-neutral-700">{str.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 8: ATTENDANCE */}
        {activeTab === 8 && (
          <div className="space-y-4 text-xs">
            <h3 className="text-sm font-black text-neutral-900 pb-2 border-b border-neutral-200">
              8. تتبع الحضور والمواظبة
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-[11px] text-emerald-800 font-bold block">نسبة الحضور</span>
                <span className="text-xl font-black text-emerald-900">{data.attendance?.rate || 100}%</span>
              </div>
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-center">
                <span className="text-[11px] text-neutral-600 font-bold block">أيام الحضور</span>
                <span className="text-xl font-black text-neutral-800">{data.attendance?.present || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-center">
                <span className="text-[11px] text-rose-800 font-bold block">أيام الغياب</span>
                <span className="text-xl font-black text-rose-900">{data.attendance?.absent || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
                <span className="text-[11px] text-amber-800 font-bold block">الغياب المبرر</span>
                <span className="text-xl font-black text-amber-900">{data.attendance?.justified || 0}</span>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="font-bold text-neutral-800 mb-2">سجل الأيام الأخيرة:</h4>
              <div className="max-h-48 overflow-y-auto border border-neutral-200 rounded-lg">
                <table className="w-full text-right text-xs">
                  <thead className="bg-neutral-100 text-neutral-700 font-bold">
                    <tr>
                      <th className="p-2">التاريخ</th>
                      <th className="p-2">الحالة</th>
                      <th className="p-2">ملاحظة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {data.attendance?.recent?.map((rec: any) => (
                      <tr key={rec.id}>
                        <td className="p-2 font-mono">{rec.date}</td>
                        <td className="p-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              rec.status === 'present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : rec.status === 'absent'
                                ? 'bg-rose-100 text-rose-800'
                                : rec.status === 'justified'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {rec.status === 'present'
                              ? 'حاضر'
                              : rec.status === 'absent'
                              ? 'غائب'
                              : rec.status === 'justified'
                              ? 'مبرر'
                              : 'متأخر'}
                          </span>
                        </td>
                        <td className="p-2 text-neutral-500">{rec.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: ASSIGNMENTS */}
        {activeTab === 9 && (
          <div className="space-y-4 text-xs">
            <h3 className="text-sm font-black text-neutral-900 pb-2 border-b border-neutral-200">
              9. الواجبات المنزلية والالتزام المدرسي
            </h3>
            {data.assignments.length === 0 ? (
              <p className="py-8 text-center text-neutral-400">لا توجد واجبات مسجلة للقسم.</p>
            ) : (
              <div className="space-y-2.5">
                {data.assignments.map((asg: any) => (
                  <div
                    key={asg.id}
                    className="p-3 rounded-lg border border-neutral-200 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-neutral-900">{asg.title} ({asg.subject})</p>
                      <p className="text-[11px] text-neutral-400">تاريخ الاستحقاق: {asg.due_date}</p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        asg.is_completed === 1
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {asg.is_completed === 1 ? '✓ تم الإنجاز' : '✗ لم يُنجز'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 10: ASSESSMENTS */}
        {activeTab === 10 && (
          <div className="space-y-4 text-xs">
            <h3 className="text-sm font-black text-neutral-900 pb-2 border-b border-neutral-200">
              10. التقويمات والنتائج
            </h3>
            {data.assessments.length === 0 ? (
              <p className="py-8 text-center text-neutral-400">لا توجد تقويمات مسجلة لهذا المتعلم.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-neutral-100 text-neutral-700 font-bold">
                    <tr>
                      <th className="p-2.5">المادة</th>
                      <th className="p-2.5">نوع التقويم</th>
                      <th className="p-2.5">النقطة المحصلة</th>
                      <th className="p-2.5">التاريخ</th>
                      <th className="p-2.5">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {data.assessments.map((ass: any) => (
                      <tr key={ass.id}>
                        <td className="p-2.5 font-bold text-neutral-800">{ass.subject}</td>
                        <td className="p-2.5">{ass.evaluation_type}</td>
                        <td className="p-2.5 font-bold font-mono text-emerald-800">
                          {ass.score} / {ass.max_score}
                        </td>
                        <td className="p-2.5 font-mono text-neutral-600">{ass.date}</td>
                        <td className="p-2.5 text-neutral-500">{ass.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 11: GENERAL NOTES */}
        {activeTab === 11 && (
          <div className="space-y-4 text-xs">
            <h3 className="text-sm font-black text-neutral-900 pb-2 border-b border-neutral-200">
              11. ملاحظات الأستاذ العامة والتطور الشخصي
            </h3>
            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl leading-relaxed text-neutral-800">
              {s.general_notes || 'لا توجد ملاحظات عامة مسجلة.'}
            </div>
          </div>
        )}

        {/* TAB 12: DOCUMENTS */}
        {activeTab === 12 && (
          <div className="space-y-4 text-xs">
            <h3 className="text-sm font-black text-neutral-900 pb-2 border-b border-neutral-200">
              12. الوثائق والمستندات المرتبطة بالمتعلم
            </h3>
            {data.documents.length === 0 ? (
              <p className="py-8 text-center text-neutral-400">
                لا توجد وثائق مرتبطة بهذا المتعلم بعد (مثل التقرير الفردي، شبكة التتبع، بطاقة التوجيه).
              </p>
            ) : (
              <div className="space-y-2">
                {data.documents.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-lg border border-neutral-200 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <Files className="w-4 h-4 text-emerald-800" />
                      <div>
                        <p className="font-bold text-neutral-900">{doc.title}</p>
                        <p className="text-[10px] text-neutral-400">النوع: {doc.relation_type || 'وثيقة عامة'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
