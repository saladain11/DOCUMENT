import React, { useState, useEffect } from 'react';
import { Target, Save, Filter, History, Check, Loader2, Sparkles, Printer } from 'lucide-react';
import { api } from '../../lib/api';
import { SchoolClass, Student, PlacementDomain, PlacementRecord } from '../../types';
import { PrintHeader } from '../layout/PrintHeader';

interface PlacementsViewProps {
  classes: SchoolClass[];
}

export const PlacementsView: React.FC<PlacementsViewProps> = ({ classes }) => {
  const [activeTab, setActiveTab] = useState<'batch' | 'history'>('batch');
  const [domains, setDomains] = useState<PlacementDomain[]>([]);
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const [period, setPeriod] = useState('تشخيص بداية الموسم');
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().split('T')[0]);

  // Batch Form State
  const [students, setStudents] = useState<Student[]>([]);
  const [batchLevels, setBatchLevels] = useState<Record<string, string>>({});
  const [batchNotes, setBatchNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // History State
  const [history, setHistory] = useState<PlacementRecord[]>([]);

  useEffect(() => {
    loadDomains();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      loadStudentsForClass(selectedClassId);
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, selectedClassId, selectedDomainId]);

  const loadDomains = async () => {
    try {
      const res = await api.getPlacementDomains();
      setDomains(res.domains || []);
      if (res.domains?.length > 0) {
        setSelectedDomainId(res.domains[0].id);
      }
    } catch (e) {
      console.error('Failed to load domains:', e);
    }
  };

  const loadStudentsForClass = async (classId: string) => {
    try {
      setLoading(true);
      const res = await api.getStudents({ classId, limit: 100 });
      setStudents(res.students || []);

      // Initialise levels
      const initialLevels: Record<string, string> = {};
      const initialNotes: Record<string, string> = {};
      res.students?.forEach((st: Student) => {
        initialLevels[st.id] = 'كلمة';
        initialNotes[st.id] = '';
      });
      setBatchLevels(initialLevels);
      setBatchNotes(initialNotes);
    } catch (e) {
      console.error('Failed to load students for batch placement:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await api.getPlacements({
        classId: selectedClassId || undefined,
        domainId: selectedDomainId || undefined
      });
      setHistory(res.placements || []);
    } catch (e) {
      console.error('Failed to load placement history:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBatch = async () => {
    if (!selectedDomainId || students.length === 0) return;

    setSaving(true);
    setSaveSuccess(false);

    const records = students.map((st) => ({
      student_id: st.id,
      domain_id: selectedDomainId,
      level: batchLevels[st.id] || 'مبتدئ',
      date: assessmentDate,
      period,
      notes: batchNotes[st.id] || null
    }));

    try {
      await api.batchPlacements({ records });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e: any) {
      alert(e.message || 'فشل حفظ الموضعة الجماعية');
    } finally {
      setSaving(false);
    }
  };

  const currentDomain = domains.find((d) => d.id === selectedDomainId);
  const currentClass = classes.find((c) => c.id === selectedClassId);

  // Standard TaRL levels
  const tarlLevels = [
    'مبتدئ',
    'حرف',
    'كلمة',
    'فقرة',
    'قصة',
    'عمليات الجمع',
    'عمليات الطرح',
    'عمليات الضرب',
    'حل المسائل'
  ];

  return (
    <div className="space-y-6">
      {/* Official Print Header for print mode */}
      <PrintHeader
        title={`شبكة الموضعة التشخيصية (TaRL): ${currentDomain?.name || ''}`}
        subtitle={`القسم: ${currentClass?.name || ''} | الفترة: ${period} | التاريخ: ${assessmentDate}`}
      />

      {/* Header Bar */}
      <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-neutral-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-800" />
            <span>الموضعة التشخيصية ومقاربة TaRL</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            التقييم حسب المستوى المناسب، شبكة الرصد الجماعي، وتتبع التطور المرحلي
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-neutral-100 p-1 rounded-lg border border-neutral-200 text-xs font-bold">
          <button
            onClick={() => setActiveTab('batch')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'batch' ? 'bg-white text-emerald-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            الموضعة الجماعية السريعة
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'history' ? 'bg-white text-emerald-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            سجل الموضعات والمسارات
          </button>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="no-print bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs flex flex-wrap items-center gap-3 text-xs">
        {/* Class Selection */}
        <div className="w-48">
          <label className="block font-bold text-neutral-700 mb-1">القسم الدراسي:</label>
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

        {/* Domain Selection */}
        <div className="w-48">
          <label className="block font-bold text-neutral-700 mb-1">مجال الموضعة:</label>
          <select
            value={selectedDomainId}
            onChange={(e) => setSelectedDomainId(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white focus:border-emerald-700 outline-hidden font-medium"
          >
            {domains.map((dom) => (
              <option key={dom.id} value={dom.id}>
                {dom.name}
              </option>
            ))}
          </select>
        </div>

        {/* Period Selection */}
        <div className="w-44">
          <label className="block font-bold text-neutral-700 mb-1">الفترة / المحطة:</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white focus:border-emerald-700 outline-hidden"
          >
            <option value="تشخيص بداية الموسم">تشخيص بداية الموسم</option>
            <option value="التقييم المرحلي 1 (TaRL)">التقييم المرحلي 1 (TaRL)</option>
            <option value="التقييم المرحلي 2 (TaRL)">التقييم المرحلي 2 (TaRL)</option>
            <option value="تقييم نهاية الأسدوس الأول">تقييم نهاية الأسدوس الأول</option>
            <option value="تقييم نهاية السنة">تقييم نهاية السنة</option>
          </select>
        </div>

        {/* Date */}
        <div className="w-36">
          <label className="block font-bold text-neutral-700 mb-1">تاريخ الموضعة:</label>
          <input
            type="date"
            value={assessmentDate}
            onChange={(e) => setAssessmentDate(e.target.value)}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-mono"
          />
        </div>

        {/* Save button for batch mode */}
        {activeTab === 'batch' && (
          <div className="mr-auto self-end pt-1">
            <button
              onClick={handleSaveBatch}
              disabled={saving || loading || students.length === 0}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg transition-colors shadow-2xs disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الحفظ الجماعي...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>حفظ الموضعة الجماعية للقسم</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-900 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-700" />
          تم حفظ نتائج الموضعة بنجاح لكافة متعلمي القسم!
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'batch' ? (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-neutral-400 text-xs">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-800 mx-auto mb-2" />
              جاري تحميل متعلمي القسم...
            </div>
          ) : students.length === 0 ? (
            <div className="py-16 text-center text-neutral-400 text-xs">
              لا يوجد متعلمون مسجلون في هذا القسم بعد.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-neutral-100 text-neutral-700 font-bold border-b border-neutral-200">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">المتعلم(ة)</th>
                    <th className="p-3">رقم مسار</th>
                    <th className="p-3 w-48">المستوى المشخص (TaRL)</th>
                    <th className="p-3">ملاحظات توجيهية خاصة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {students.map((st, idx) => (
                    <tr key={st.id} className="hover:bg-neutral-50/80">
                      <td className="p-3 text-neutral-400">{idx + 1}</td>
                      <td className="p-3 font-bold text-neutral-900">{st.full_name}</td>
                      <td className="p-3 font-mono text-neutral-500">{st.massar_code || '—'}</td>
                      <td className="p-3">
                        <select
                          value={batchLevels[st.id] || 'مبتدئ'}
                          onChange={(e) =>
                            setBatchLevels({ ...batchLevels, [st.id]: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg bg-white font-bold text-emerald-900 focus:border-emerald-700 outline-hidden"
                        >
                          {tarlLevels.map((lvl) => (
                            <option key={lvl} value={lvl}>
                              {lvl}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={batchNotes[st.id] || ''}
                          onChange={(e) =>
                            setBatchNotes({ ...batchNotes, [st.id]: e.target.value })
                          }
                          placeholder="ملاحظة حول دقة النطق أو السرعة..."
                          className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg focus:border-emerald-700 outline-hidden text-neutral-700"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* History Tab */
        <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs overflow-hidden">
          {history.length === 0 ? (
            <div className="py-16 text-center text-neutral-400 text-xs">
              لا توجد سجلات موضعة سابقة لهذا القسم والمجال.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-neutral-100 text-neutral-700 font-bold border-b border-neutral-200">
                  <tr>
                    <th className="p-3">المتعلم</th>
                    <th className="p-3">المجال</th>
                    <th className="p-3">المستوى</th>
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">المحطة</th>
                    <th className="p-3">الملاحظات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {history.map((rec) => (
                    <tr key={rec.id} className="hover:bg-neutral-50">
                      <td className="p-3 font-bold text-neutral-900">{rec.student_name}</td>
                      <td className="p-3">{rec.domain_name}</td>
                      <td className="p-3 font-bold text-emerald-800">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200">
                          {rec.level}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-neutral-600">{rec.date}</td>
                      <td className="p-3">{rec.period}</td>
                      <td className="p-3 text-neutral-500">{rec.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
