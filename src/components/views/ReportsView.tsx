import React, { useState, useEffect } from 'react';
import { FileBarChart, Printer, User, School, HeartHandshake, CheckCircle2, Award, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { SchoolClass, Student } from '../../types';
import { PrintHeader } from '../layout/PrintHeader';

interface ReportsViewProps {
  classes: SchoolClass[];
  initialStudentId?: string | null;
  initialClassId?: string | null;
  initialType?: 'pedagogical' | 'family' | 'class';
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  classes,
  initialStudentId,
  initialClassId,
  initialType = 'pedagogical'
}) => {
  const [reportType, setReportType] = useState<'pedagogical' | 'family' | 'class'>(initialType);
  const [selectedClassId, setSelectedClassId] = useState(initialClassId || classes[0]?.id || '');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(initialStudentId || '');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedClassId) {
      loadStudents(selectedClassId);
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (reportType === 'class' && selectedClassId) {
      loadClassReport(selectedClassId);
    } else if ((reportType === 'pedagogical' || reportType === 'family') && selectedStudentId) {
      loadStudentOrFamilyReport(selectedStudentId, reportType);
    }
  }, [reportType, selectedStudentId, selectedClassId]);

  const loadStudents = async (classId: string) => {
    try {
      const res = await api.getStudents({ classId, limit: 100 });
      setStudents(res.students || []);
      if (res.students?.length > 0 && !selectedStudentId) {
        setSelectedStudentId(res.students[0].id);
      }
    } catch (e) {
      console.error('Failed to load students for report:', e);
    }
  };

  const loadStudentOrFamilyReport = async (studentId: string, type: 'pedagogical' | 'family') => {
    try {
      setLoading(true);
      const res = type === 'pedagogical' ? await api.getStudentReport(studentId) : await api.getFamilyReport(studentId);
      setReportData(res);
    } catch (e) {
      console.error('Failed to load report:', e);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const loadClassReport = async (classId: string) => {
    try {
      setLoading(true);
      const res = await api.getClassReport(classId);
      setReportData(res);
    } catch (e) {
      console.error('Failed to load class report:', e);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Selectors (Screen only) */}
      <div className="no-print bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-neutral-900 flex items-center gap-2">
              <FileBarChart className="w-5 h-5 text-emerald-800" />
              <span>التقارير البيداغوجية والطباعة الرسمية</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              توليد التقارير الفردية، تقارير التواصل مع الأسرة، وتقارير القسم الشاملة A4
            </p>
          </div>

          <button
            onClick={handlePrint}
            disabled={!reportData || loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير (A4)</span>
          </button>
        </div>

        {/* Report Types Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-100 text-xs font-bold">
          <button
            onClick={() => setReportType('pedagogical')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
              reportType === 'pedagogical'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>التقرير التربوي الفردي للمتعلم</span>
          </button>

          <button
            onClick={() => setReportType('family')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
              reportType === 'family'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>تقرير التواصل مع الأسرة (إيجابي وتشجيعي)</span>
          </button>

          <button
            onClick={() => setReportType('class')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all ${
              reportType === 'class'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            <School className="w-3.5 h-3.5" />
            <span>التقرير البيداغوجي الشامل للقسم</span>
          </button>
        </div>

        {/* Selection bar */}
        <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
          <div className="w-56">
            <label className="block font-bold text-neutral-700 mb-1">القسم الدراسي:</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg bg-white focus:border-emerald-700 outline-hidden font-bold"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.level})
                </option>
              ))}
            </select>
          </div>

          {reportType !== 'class' && (
            <div className="w-64">
              <label className="block font-bold text-neutral-700 mb-1">المتعلم(ة):</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg bg-white focus:border-emerald-700 outline-hidden font-bold"
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.full_name} ({st.massar_code || 'بدون مسار'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* REPORT PAPER CONTAINER (PRINT READY) */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-sm p-6 sm:p-10 max-w-[21cm] mx-auto print:border-0 print:p-0 print:shadow-none min-h-[29.7cm]">
        {loading ? (
          <div className="py-24 text-center text-neutral-400 text-xs">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-800 mx-auto mb-2" />
            جاري إعداد وتحليل بيانات التقرير...
          </div>
        ) : !reportData ? (
          <div className="py-24 text-center text-neutral-400 text-xs">
            يرجى اختيار القسم أو المتعلم لعرض التقرير
          </div>
        ) : reportType === 'pedagogical' ? (
          /* 1. PEDAGOGICAL STUDENT REPORT */
          <div className="space-y-6 text-xs text-neutral-900 leading-relaxed">
            <PrintHeader
              title="التقرير التربوي الفردي للمتعلم(ة)"
              subtitle="وثيقة رسمية للتتبع البيداغوجي والتقويم التشخيصي"
            />

            {/* Student ID block */}
            <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-neutral-500 block font-medium">الاسم الكامل:</span>
                <span className="font-bold text-neutral-900 text-sm">{reportData.student.full_name}</span>
              </div>
              <div>
                <span className="text-neutral-500 block font-medium">رقم مسار:</span>
                <span className="font-mono font-bold text-emerald-800">{reportData.student.massar_code || '—'}</span>
              </div>
              <div>
                <span className="text-neutral-500 block font-medium">القسم الدراسي:</span>
                <span className="font-bold">{reportData.student.class_name}</span>
              </div>
              <div>
                <span className="text-neutral-500 block font-medium">تاريخ الازدياد والعمر:</span>
                <span>{reportData.student.birth_date} ({reportData.student.age_text})</span>
              </div>
            </div>

            {/* Placement / TaRL status */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-emerald-950 pb-1 border-b border-emerald-800/30">
                أولاً: وضعية التموضع التشخيصي (مقاربة TaRL)
              </h3>
              {reportData.placements?.length === 0 ? (
                <p className="text-neutral-500">لم تسجل بعد نتائج موضعة لهذا المتعلم.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {reportData.placements.map((p: any) => (
                    <div key={p.id} className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200 flex items-center justify-between">
                      <span className="font-bold">{p.domain_name}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                        {p.level}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Strengths */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-emerald-950 pb-1 border-b border-emerald-800/30">
                ثانياً: نقاط القوة ومجالات التميز
              </h3>
              {reportData.strengths?.length === 0 ? (
                <p className="text-neutral-500">لا توجد نقاط قوة مسجلة.</p>
              ) : (
                <div className="space-y-1.5">
                  {reportData.strengths.map((s: any) => (
                    <div key={s.id} className="p-2.5 rounded bg-neutral-50 border border-neutral-200">
                      <strong className="text-emerald-800 ml-1">[{s.domain}]:</strong>
                      <span>{s.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Difficulties & Support */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-emerald-950 pb-1 border-b border-emerald-800/30">
                ثالثاً: الصعوبات المرصودة وخطة الدعم والمواكبة
              </h3>
              {reportData.difficulties?.length === 0 ? (
                <p className="text-neutral-500">لا توجد صعوبات تعيق مسار المتعلم؛ الوضعية إيجابية.</p>
              ) : (
                <div className="space-y-2">
                  {reportData.difficulties.map((d: any) => (
                    <div key={d.id} className="p-3 rounded-lg border border-neutral-200 bg-neutral-50">
                      <div className="flex justify-between font-bold mb-1">
                        <span>{d.category}</span>
                        <span className="text-amber-800">درجة الصعوبة: {d.severity}</span>
                      </div>
                      {d.support_action && (
                        <p className="text-emerald-900 font-medium">خطة الدعم: {d.support_action}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attendance & Homework Summary */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                <span className="text-neutral-500 block">نسبة المواظبة والحضور:</span>
                <span className="text-base font-black text-neutral-800">{reportData.attendance?.rate || 100}%</span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">
                  (غياب: {reportData.attendance?.absent || 0} أيام | مبرر: {reportData.attendance?.justified || 0})
                </span>
              </div>
              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                <span className="text-neutral-500 block">نسبة إنجاز الواجبات المنزلية:</span>
                <span className="text-base font-black text-neutral-800">{reportData.assignments?.completion_rate || 0}%</span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">
                  (أنجز: {reportData.assignments?.completed || 0} من أصل {reportData.assignments?.total || 0})
                </span>
              </div>
            </div>

            {/* Signature Area */}
            <div className="pt-10 flex justify-between text-center font-bold text-xs text-neutral-700">
              <div>
                <p>توقيع وختم السيد(ة) مدير(ة) المؤسسة</p>
              </div>
              <div>
                <p>توقيع الأستاذ(ة)</p>
              </div>
            </div>
          </div>
        ) : reportType === 'family' ? (
          /* 2. FAMILY REPORT (Positive, Strengths First, Home Advice) */
          <div className="space-y-6 text-xs text-neutral-900 leading-relaxed">
            <PrintHeader
              title="تقرير التواصل الدوري مع الأسرة"
              subtitle="نشرة إخبارية حول المسار التعليمي والسلوكي للمتعلم(ة)"
            />

            <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200">
              <p className="text-emerald-950 font-medium leading-relaxed">
                تحية تقدير واحترام لأسرة المتعلم(ة): <strong className="font-bold text-emerald-900 text-sm">{reportData.student.full_name}</strong> (القسم: {reportData.student.class_name}). يسعدنا موافاتكم بهذا التقرير الدوري الذي يرصد إنجازات وتطور طفلكم، تعزيزاً للشراكة التربوية بين المدرسة والأسرة.
              </p>
            </div>

            {/* STRENGTHS FIRST */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-emerald-900 pb-1 border-b border-emerald-700/30 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-700" />
                <span>أولاً: نقاط القوة والتميز التي نعتز بها في طفلكم</span>
              </h3>
              {reportData.strengths?.length === 0 ? (
                <p className="text-neutral-600">يظهر المتعلم انضباطاً طيباً وحرصاً على المشاركة الصفية.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {reportData.strengths.map((s: any) => (
                    <div key={s.id} className="p-3 bg-white rounded-lg border border-emerald-200/80 shadow-2xs">
                      <strong className="text-emerald-800 block text-xs mb-1">🌟 {s.domain}</strong>
                      <p className="text-neutral-700">{s.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Commitments (Attendance & Homework) */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-emerald-900 pb-1 border-b border-emerald-700/30">
                ثانياً: الانضباط والالتزام المدرسي
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                  <span className="font-bold text-neutral-800 block mb-1">المواظبة والحضور:</span>
                  <p className="text-neutral-700">
                    نسبة الحضور بلغت <strong>{reportData.attendance?.rate || 100}%</strong>.
                    {(reportData.attendance?.rate || 100) >= 90
                      ? ' (حضور منتظم ومثالي، نشكركم على حرصكم).'
                      : ' (يرجى تفادي الغياب المتكرر لما له من أثر على التحصيل).'}
                  </p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                  <span className="font-bold text-neutral-800 block mb-1">إنجاز الواجبات المنزلية:</span>
                  <p className="text-neutral-700">
                    نسبة الإنجاز <strong>{reportData.assignments?.completion_rate || 0}%</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Preventive Health if permitted */}
            {reportData.health && reportData.health.notes && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-1">
                <span className="font-bold text-amber-900 block">ملاحظة وقائية مشتركة:</span>
                <p className="text-neutral-800">{reportData.health.notes}</p>
              </div>
            )}

            {/* Home Guidance & Encouragements */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-emerald-900 pb-1 border-b border-emerald-700/30">
                ثالثاً: كيف يمكن للأسرة دعم طفلها في البيت؟
              </h3>
              <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                <p className="text-neutral-800">
                  • تخصيص 20 دقيقة يومياً للقراءة المشتركة وتشجيع المتعلم على القراءة بصوت مسموع.
                </p>
                <p className="text-neutral-800">
                  • المتابعة اليومية لدفتر الواجبات المنزلية وتشجيعه على الاعتماد على النفس.
                </p>
                <p className="text-neutral-800">
                  • تعزيز ثقته بنفسه وتثمين مجهوداته مهما بدت بسيطة.
                </p>
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-10 flex justify-between text-center font-bold text-xs text-neutral-700">
              <div>
                <p>ملاحظة وتوقيع ولي الأمر</p>
              </div>
              <div>
                <p>الأستاذ(ة): {reportData.teacher_name || 'أستاذ القسم'}</p>
              </div>
            </div>
          </div>
        ) : (
          /* 3. COMPREHENSIVE CLASS REPORT */
          <div className="space-y-6 text-xs text-neutral-900 leading-relaxed">
            <PrintHeader
              title={`التقرير البيداغوجي والإحصائي الشامل للقسم: ${reportData.class?.name || ''}`}
              subtitle={`المستوى: ${reportData.class?.level || ''} | الموسم الدراسي: 2026-2027`}
            />

            {/* Demographics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-center">
                <span className="text-neutral-500 font-bold block">إجمالي المتعلمين</span>
                <span className="text-2xl font-black text-neutral-900">{reportData.demographics?.total || 0}</span>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                <span className="text-emerald-800 font-bold block">عدد الذكور</span>
                <span className="text-2xl font-black text-emerald-900">{reportData.demographics?.males || 0}</span>
              </div>
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-center">
                <span className="text-rose-800 font-bold block">عدد الإناث</span>
                <span className="text-2xl font-black text-rose-900">{reportData.demographics?.females || 0}</span>
              </div>
              <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-center">
                <span className="text-teal-800 font-bold block">متوسط الحضور</span>
                <span className="text-2xl font-black text-teal-900">{reportData.attendance?.averageRate || 100}%</span>
              </div>
            </div>

            {/* TaRL Distribution */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-neutral-900 pb-1 border-b border-neutral-200">
                توزيع المتعلمين حسب مستويات الموضعة (TaRL)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {reportData.tarlDistribution && Object.entries(reportData.tarlDistribution).map(([lvl, count]: any) => (
                  <div key={lvl} className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200 flex justify-between items-center">
                    <span className="font-bold text-neutral-800">{lvl}</span>
                    <span className="font-black text-emerald-900 text-base">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Difficulties distribution */}
            <div className="space-y-2">
              <h3 className="text-sm font-black text-neutral-900 pb-1 border-b border-neutral-200">
                توزيع صعوبات التعلم المرصودة في القسم
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {reportData.difficultiesDistribution && Object.entries(reportData.difficultiesDistribution).map(([cat, count]: any) => (
                  <div key={cat} className="p-3 bg-amber-50/60 rounded-lg border border-amber-200 flex justify-between items-center">
                    <span className="font-bold text-neutral-800">{cat}</span>
                    <span className="font-black text-amber-900 text-base">{count} حالة</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Signature Area */}
            <div className="pt-12 flex justify-between text-center font-bold text-xs text-neutral-700">
              <div>
                <p>السيد(ة) مدير(ة) المؤسسة</p>
              </div>
              <div>
                <p>أستاذ(ة) القسم</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
