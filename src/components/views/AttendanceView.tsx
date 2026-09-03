import React, { useState, useEffect } from 'react';
import { CheckSquare, Save, Calendar, Check, AlertCircle, Printer, Loader2, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { SchoolClass, Student } from '../../types';
import { PrintHeader } from '../layout/PrintHeader';

interface AttendanceViewProps {
  classes: SchoolClass[];
}

export const AttendanceView: React.FC<AttendanceViewProps> = ({ classes }) => {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(10); // October by default
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Matrix response: { students, days: [{ date, dayNum, dayName, isHoliday, holidayName }], records: { [studentId]: { [date]: status } } }
  const [data, setData] = useState<any>(null);
  const [localRecords, setLocalRecords] = useState<Record<string, Record<string, string>>>({});

  const arabicMonths = [
    { num: 9, name: 'شتنبر (سبتمبر)' },
    { num: 10, name: 'أكتوبر' },
    { num: 11, name: 'نونبر (نوفمبر)' },
    { num: 12, name: 'دجنبر (ديسمبر)' },
    { num: 1, name: 'يناير' },
    { num: 2, name: 'فبراير' },
    { num: 3, name: 'مارس' },
    { num: 4, name: 'أبريل' },
    { num: 5, name: 'ماي (مايو)' },
    { num: 6, name: 'يونيو' },
    { num: 7, name: 'يوليوز' }
  ];

  useEffect(() => {
    if (selectedClassId) {
      loadAttendance();
    }
  }, [selectedClassId, selectedYear, selectedMonth]);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const res = await api.getMonthlyAttendance(selectedClassId, selectedYear, selectedMonth);
      setData(res);
      setLocalRecords(res.records || {});
    } catch (e) {
      console.error('Failed to load monthly attendance:', e);
    } finally {
      setLoading(false);
    }
  };

  const cycleStatus = (studentId: string, date: string, isHoliday: boolean) => {
    if (isHoliday) return; // Holidays are fixed

    const current = localRecords[studentId]?.[date] || 'present';
    let next = 'present';
    if (current === 'present') next = 'absent';
    else if (current === 'absent') next = 'justified';
    else if (current === 'justified') next = 'late';
    else if (current === 'late') next = 'present';

    setLocalRecords((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [date]: next
      }
    }));
  };

  const handleSaveBatch = async () => {
    setSaving(true);
    setSavedSuccess(false);

    const recordsToSave: any[] = [];
    Object.entries(localRecords).forEach(([stId, dates]) => {
      Object.entries(dates).forEach(([dt, status]) => {
        recordsToSave.push({
          student_id: stId,
          date: dt,
          status
        });
      });
    });

    try {
      await api.saveAttendanceBatch(recordsToSave);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (e: any) {
      alert(e.message || 'فشل حفظ سجل الحضور');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkHoliday = async () => {
    const day = prompt('أدخل اليوم المراد تحديده كعطلة في هذا الشهر (مثال: 18):');
    if (!day) return;
    const dayNum = parseInt(day);
    if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
      alert('اليوم غير صالح');
      return;
    }
    const formattedDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    try {
      await api.markDayHoliday(formattedDate, selectedClassId);
      loadAttendance();
    } catch (e: any) {
      alert(e.message || 'فشل تسجيل العطلة');
    }
  };

  const currentClass = classes.find((c) => c.id === selectedClassId);
  const currentMonthName = arabicMonths.find((m) => m.num === selectedMonth)?.name || '';

  // Calculate live stats per student based on localRecords & working days
  const workingDays = data?.days?.filter((d: any) => !d.isHoliday) || [];
  const totalWorkingDays = workingDays.length;

  const calculateStudentStats = (studentId: string) => {
    let presentCount = 0;
    let absentCount = 0;
    let justifiedCount = 0;
    let lateCount = 0;

    workingDays.forEach((d: any) => {
      const status = localRecords[studentId]?.[d.date] || 'present';
      if (status === 'present') presentCount++;
      else if (status === 'absent') absentCount++;
      else if (status === 'justified') justifiedCount++;
      else if (status === 'late') {
        lateCount++;
        presentCount++;
      }
    });

    const rate = totalWorkingDays > 0 ? Math.round(((presentCount) / totalWorkingDays) * 100) : 100;
    return { presentCount, absentCount, justifiedCount, lateCount, rate };
  };

  return (
    <div className="space-y-6">
      {/* Official Print Header for Attendance Registry */}
      <PrintHeader
        title={`سجل المواظبة والغياب الشهري — ${currentMonthName} ${selectedYear}`}
        subtitle={`القسم الدراسي: ${currentClass?.name || ''} | عدد أيام العمل الفعلية: ${totalWorkingDays} يوماً`}
      />

      {/* Header Bar */}
      <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-neutral-900 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-teal-800" />
            <span>المصفوفة الشهرية لتتبع الحضور والغياب</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            شبكة الحصص الشهرية، إدراج العطل الرسمية، حساب نسب المواظبة الشهرية بدقة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-lg border border-neutral-200 transition-colors"
          >
            <Printer className="w-4 h-4 text-neutral-600" />
            <span>طباعة الورقة الشهرية</span>
          </button>
          <button
            onClick={handleSaveBatch}
            disabled={saving || loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>حفظ سجل الشهر كاملاً</span>
          </button>
        </div>
      </div>

      {/* Selector & Legend Bar */}
      <div className="no-print bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Class Selector */}
          <div className="w-44">
            <label className="block font-bold text-neutral-700 mb-1">القسم:</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg bg-white focus:border-emerald-700 outline-hidden font-bold"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.level})
                </option>
              ))}
            </select>
          </div>

          {/* Month Selector */}
          <div className="w-44">
            <label className="block font-bold text-neutral-700 mb-1">الشهر:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg bg-white focus:border-emerald-700 outline-hidden font-bold"
            >
              {arabicMonths.map((m) => (
                <option key={m.num} value={m.num}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div className="w-28">
            <label className="block font-bold text-neutral-700 mb-1">السنة:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg bg-white focus:border-emerald-700 outline-hidden font-mono"
            >
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          <div className="self-end pt-1">
            <button
              onClick={handleMarkHoliday}
              className="px-3 py-1.5 text-xs bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg font-bold"
            >
              + تحديد يوم كعطلة
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-600 bg-neutral-50 p-2 rounded-lg border border-neutral-200">
          <span className="font-bold">دليل الرموز:</span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">✓ حاضر</span>
          <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">غ غائب</span>
          <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">م مبرر</span>
          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">ت متأخر</span>
          <span className="px-1.5 py-0.5 rounded bg-neutral-200 text-neutral-700 font-bold">ع عطلة</span>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-700" />
          تم حفظ سجل غياب الشهر بنجاح!
        </div>
      )}

      {/* MATRIX TABLE */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-neutral-400 text-xs">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-800 mx-auto mb-2" />
            جاري إعداد مصفوفة أيام الشهر وحصص المتعلمين...
          </div>
        ) : !data || data.students.length === 0 ? (
          <div className="py-16 text-center text-neutral-400 text-xs">
            لا يوجد متعلمون مسجلون في هذا القسم.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-center text-[11px] border-collapse">
              <thead className="bg-neutral-100/90 text-neutral-800 font-bold sticky top-0">
                <tr className="border-b border-neutral-300">
                  <th className="p-2 text-right border-l border-neutral-200 min-w-[140px] sticky right-0 bg-neutral-100 z-10">
                    المتعلم(ة)
                  </th>
                  {data.days.map((d: any) => (
                    <th
                      key={d.date}
                      className={`p-1.5 border-l border-neutral-200 min-w-[28px] ${
                        d.isHoliday ? 'bg-amber-100/60 text-amber-900' : ''
                      }`}
                      title={`${d.dayName} ${d.date}${d.isHoliday ? ` (${d.holidayName || 'عطلة'})` : ''}`}
                    >
                      <div className="text-[10px] opacity-70">{d.dayName[0]}</div>
                      <div className="font-mono text-xs">{d.dayNum}</div>
                    </th>
                  ))}
                  {/* Summary Columns */}
                  <th className="p-2 border-l border-neutral-200 bg-emerald-50/80 text-emerald-900 min-w-[40px]" title="أيام الحضور">
                    ح
                  </th>
                  <th className="p-2 border-l border-neutral-200 bg-rose-50/80 text-rose-900 min-w-[40px]" title="أيام الغياب">
                    غ
                  </th>
                  <th className="p-2 border-l border-neutral-200 bg-amber-50/80 text-amber-900 min-w-[40px]" title="الغياب المبرر">
                    م
                  </th>
                  <th className="p-2 border-l border-neutral-200 bg-blue-50/80 text-blue-900 min-w-[40px]" title="التأخرات">
                    ت
                  </th>
                  <th className="p-2 bg-neutral-100 text-neutral-900 font-black min-w-[50px]">
                    %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {data.students.map((st: Student) => {
                  const stats = calculateStudentStats(st.id);
                  return (
                    <tr key={st.id} className="hover:bg-neutral-50/80 transition-colors">
                      <td className="p-2 text-right font-bold text-neutral-900 border-l border-neutral-200 sticky right-0 bg-white z-10 truncate max-w-[140px]">
                        {st.full_name}
                      </td>

                      {data.days.map((d: any) => {
                        const status = d.isHoliday ? 'holiday' : localRecords[st.id]?.[d.date] || 'present';
                        return (
                          <td
                            key={d.date}
                            onClick={() => cycleStatus(st.id, d.date, d.isHoliday)}
                            className={`p-1 border-l border-neutral-200 transition-colors cursor-pointer select-none font-bold ${
                              status === 'holiday'
                                ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                                : status === 'absent'
                                ? 'bg-rose-100/90 text-rose-800 hover:bg-rose-200'
                                : status === 'justified'
                                ? 'bg-amber-100/90 text-amber-800 hover:bg-amber-200'
                                : status === 'late'
                                ? 'bg-blue-100/90 text-blue-800 hover:bg-blue-200'
                                : 'text-emerald-700 hover:bg-neutral-100'
                            }`}
                          >
                            {status === 'holiday'
                              ? 'ع'
                              : status === 'absent'
                              ? 'غ'
                              : status === 'justified'
                              ? 'م'
                              : status === 'late'
                              ? 'ت'
                              : '✓'}
                          </td>
                        );
                      })}

                      {/* Live Stats Cells */}
                      <td className="p-2 border-l border-neutral-200 bg-emerald-50/40 font-bold text-emerald-900">
                        {stats.presentCount}
                      </td>
                      <td className="p-2 border-l border-neutral-200 bg-rose-50/40 font-bold text-rose-900">
                        {stats.absentCount}
                      </td>
                      <td className="p-2 border-l border-neutral-200 bg-amber-50/40 font-bold text-amber-900">
                        {stats.justifiedCount}
                      </td>
                      <td className="p-2 border-l border-neutral-200 bg-blue-50/40 font-bold text-blue-900">
                        {stats.lateCount}
                      </td>
                      <td className="p-2 font-black text-neutral-800">
                        {stats.rate}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
