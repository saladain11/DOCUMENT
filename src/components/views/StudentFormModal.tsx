import React, { useState, useEffect } from 'react';
import { X, Save, User, HeartHandshake, ShieldAlert, Users, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';
import { SchoolClass, Student } from '../../types';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  studentId?: string | null;
  classes: SchoolClass[];
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  studentId,
  classes
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'parents' | 'social' | 'health'>('basic');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [classId, setClassId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [gender, setGender] = useState<'ذكر' | 'أنثى'>('ذكر');
  const [birthDate, setBirthDate] = useState('2018-05-15');
  const [massarCode, setMassarCode] = useState('');
  const [enrollmentDate, setEnrollmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [generalNotes, setGeneralNotes] = useState('');

  // Parents
  const [fatherName, setFatherName] = useState('');
  const [fatherJob, setFatherJob] = useState('');
  const [fatherPhone, setFatherPhone] = useState('');
  const [motherName, setMotherName] = useState('');
  const [motherJob, setMotherJob] = useState('');
  const [motherPhone, setMotherPhone] = useState('');
  const [relationship, setRelationship] = useState('الوالدان');
  const [siblingsCount, setSiblingsCount] = useState('2');
  const [birthOrder, setBirthOrder] = useState('1');

  // Social
  const [socialStatus, setSocialStatus] = useState('مستقرة');
  const [livingWith, setLivingWith] = useState('الوالدين');
  const [financialNotes, setFinancialNotes] = useState('');
  const [generalSocialNotes, setGeneralSocialNotes] = useState('');

  // Health
  const [healthNotes, setHealthNotes] = useState('عادي ولا توجد ملاحظات صحية وقائية خاصة');
  const [precautions, setPrecautions] = useState('عادي');
  const [showInFamilyReport, setShowInFamilyReport] = useState(false);

  useEffect(() => {
    if (classes.length > 0 && !classId) {
      setClassId(classes[0].id);
    }
  }, [classes]);

  useEffect(() => {
    if (isOpen && studentId) {
      loadStudentData(studentId);
    } else if (isOpen && !studentId) {
      resetForm();
    }
  }, [isOpen, studentId]);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setClassId(classes[0]?.id || '');
    setGroupId('');
    setGender('ذكر');
    setBirthDate('2018-05-15');
    setMassarCode('');
    setEnrollmentDate(new Date().toISOString().split('T')[0]);
    setGeneralNotes('');

    setFatherName('');
    setFatherJob('');
    setFatherPhone('');
    setMotherName('');
    setMotherJob('');
    setMotherPhone('');
    setRelationship('الوالدان');
    setSiblingsCount('2');
    setBirthOrder('1');

    setSocialStatus('مستقرة');
    setLivingWith('الوالدين');
    setFinancialNotes('');
    setGeneralSocialNotes('');

    setHealthNotes('عادي ولا توجد ملاحظات خاصة');
    setPrecautions('عادي');
    setShowInFamilyReport(false);
    setError(null);
    setActiveTab('basic');
  };

  const loadStudentData = async (id: string) => {
    try {
      setFetching(true);
      const res = await api.getStudent(id);
      const s = res.student;
      setFirstName(s.first_name || '');
      setLastName(s.last_name || '');
      setClassId(s.class_id || '');
      setGroupId(s.group_id || '');
      setGender(s.gender || 'ذكر');
      setBirthDate(s.birth_date || '');
      setMassarCode(s.massar_code || '');
      setEnrollmentDate(s.enrollment_date || '');
      setGeneralNotes(s.general_notes || '');

      if (res.parent) {
        setFatherName(res.parent.father_name || '');
        setFatherJob(res.parent.father_job || '');
        setFatherPhone(res.parent.father_phone || '');
        setMotherName(res.parent.mother_name || '');
        setMotherJob(res.parent.mother_job || '');
        setMotherPhone(res.parent.mother_phone || '');
        setRelationship(res.parent.relationship || 'الوالدان');
        setSiblingsCount(String(res.parent.siblings_count || 0));
        setBirthOrder(String(res.parent.birth_order || 1));
      }

      if (res.social) {
        setSocialStatus(res.social.social_status || 'مستقرة');
        setLivingWith(res.social.living_with || 'الوالدين');
        setFinancialNotes(res.social.financial_notes || '');
        setGeneralSocialNotes(res.social.general_social_notes || '');
      }

      if (res.health) {
        setHealthNotes(res.health.notes || '');
        setPrecautions(res.health.precautions || 'عادي');
        setShowInFamilyReport(res.health.show_in_family_report === 1);
      }
    } catch (e: any) {
      setError(e.message || 'فشل تحميل بيانات المتعلم');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !classId || !birthDate) {
      setError('يرجى ملء الاسم والنسب والقسم وتاريخ الازدياد');
      setActiveTab('basic');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      class_id: classId,
      group_id: groupId || null,
      gender,
      birth_date: birthDate,
      massar_code: massarCode ? massarCode.trim().toUpperCase() : null,
      enrollment_date: enrollmentDate,
      general_notes: generalNotes || null,
      parent: {
        father_name: fatherName || null,
        father_job: fatherJob || null,
        father_phone: fatherPhone || null,
        mother_name: motherName || null,
        mother_job: motherJob || null,
        mother_phone: motherPhone || null,
        relationship,
        siblings_count: parseInt(siblingsCount) || 0,
        birth_order: parseInt(birthOrder) || 1
      },
      social: {
        social_status: socialStatus,
        living_with: livingWith,
        financial_notes: financialNotes || null,
        general_social_notes: generalSocialNotes || null
      },
      health: {
        notes: healthNotes,
        precautions,
        show_in_family_report: showInFamilyReport
      }
    };

    try {
      if (studentId) {
        await api.updateStudent(studentId, payload);
      } else {
        await api.createStudent(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ المتعلم');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentClass = classes.find(c => c.id === classId);
  const availableGroups = currentClass?.groups || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
          <div>
            <h3 className="text-base font-black text-neutral-900">
              {studentId ? 'تعديل بيانات المتعلم' : 'إضافة متعلم جديد للمنصة'}
            </h3>
            <p className="text-xs text-neutral-500">
              يرجى إدخال البيانات الشخصية والتربوية بدقة لضمان دقة التقارير
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-200 bg-neutral-100/50 px-6 gap-2 text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'basic'
                ? 'border-emerald-700 text-emerald-900 bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>المعلومات الأساسية</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('parents')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'parents'
                ? 'border-emerald-700 text-emerald-900 bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>بيانات الوالدين</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('social')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'social'
                ? 'border-emerald-700 text-emerald-900 bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            <span>الوضعية الاجتماعية</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('health')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'health'
                ? 'border-emerald-700 text-emerald-900 bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>الملاحظات الصحية الوقائية</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-medium">
              {error}
            </div>
          )}

          {fetching ? (
            <div className="py-16 text-center text-neutral-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-emerald-800" />
              جاري تحميل بيانات المتعلم...
            </div>
          ) : (
            <>
              {/* TAB 1: BASIC INFO */}
              {activeTab === 'basic' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">الاسم الشخصي *</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="مثال: ياسمين"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">الاسم العائلي (النسب) *</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="مثال: العلمي"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">الجنس *</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden bg-white"
                    >
                      <option value="ذكر">ذكر</option>
                      <option value="أنثى">أنثى</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">تاريخ الازدياد * (يُحسب العمر منه آلياً)</label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">رقم مسار (Massar Code)</label>
                    <input
                      type="text"
                      value={massarCode}
                      onChange={(e) => setMassarCode(e.target.value)}
                      placeholder="مثال: G134567890"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">القسم الدراسي *</label>
                    <select
                      value={classId}
                      onChange={(e) => setClassId(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden bg-white font-medium"
                      required
                    >
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name} ({cls.level})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">الفوج (إن وجد)</label>
                    <select
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden bg-white"
                    >
                      <option value="">بدون فوج محدد</option>
                      {availableGroups.map((grp) => (
                        <option key={grp.id} value={grp.id}>
                          {grp.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">تاريخ التسجيل</label>
                    <input
                      type="date"
                      value={enrollmentDate}
                      onChange={(e) => setEnrollmentDate(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-neutral-700 mb-1">ملاحظات تربوية عامة</label>
                    <textarea
                      rows={2}
                      value={generalNotes}
                      onChange={(e) => setGeneralNotes(e.target.value)}
                      placeholder="أية ملاحظات تمهيدية حول المتعلم..."
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: PARENTS */}
              {activeTab === 'parents' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">اسم الأب</label>
                    <input
                      type="text"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      placeholder="الاسم الكامل للأب"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">مهنة الأب</label>
                    <input
                      type="text"
                      value={fatherJob}
                      onChange={(e) => setFatherJob(e.target.value)}
                      placeholder="مهنة الأب"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">هاتف الأب</label>
                    <input
                      type="tel"
                      value={fatherPhone}
                      onChange={(e) => setFatherPhone(e.target.value)}
                      placeholder="06XXXXXXXX"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">اسم الأم</label>
                    <input
                      type="text"
                      value={motherName}
                      onChange={(e) => setMotherName(e.target.value)}
                      placeholder="الاسم الكامل للأم"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">مهنة الأم</label>
                    <input
                      type="text"
                      value={motherJob}
                      onChange={(e) => setMotherJob(e.target.value)}
                      placeholder="ربة بيت / موظفة..."
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">هاتف الأم</label>
                    <input
                      type="tel"
                      value={motherPhone}
                      onChange={(e) => setMotherPhone(e.target.value)}
                      placeholder="06XXXXXXXX"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">عدد الإخوة والأخوات</label>
                    <input
                      type="number"
                      min="0"
                      value={siblingsCount}
                      onChange={(e) => setSiblingsCount(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">ترتيب المتعلم بين إخوته</label>
                    <input
                      type="number"
                      min="1"
                      value={birthOrder}
                      onChange={(e) => setBirthOrder(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: SOCIAL */}
              {activeTab === 'social' && (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-neutral-700 mb-1">الوضعية العائلية</label>
                      <select
                        value={socialStatus}
                        onChange={(e) => setSocialStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden bg-white"
                      >
                        <option value="مستقرة">مستقرة (يعيش مع الوالدين معاً)</option>
                        <option value="طلاق">طلاق / انفصال</option>
                        <option value="يتيم الأب">يتيم الأب</option>
                        <option value="يتيم الأم">يتيم الأم</option>
                        <option value="يتيم الأبوين">يتيم الأبوين (تحت كفالة)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-neutral-700 mb-1">يعيش حالياً مع</label>
                      <input
                        type="text"
                        value={livingWith}
                        onChange={(e) => setLivingWith(e.target.value)}
                        placeholder="مثال: الوالدين / الجدة / الكفيل"
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">ملاحظات مادية أو معيشية</label>
                    <input
                      type="text"
                      value={financialNotes}
                      onChange={(e) => setFinancialNotes(e.target.value)}
                      placeholder="مثال: يستفيد من تيسير / يحتاج دعماً في اللوازم المدرسية"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">ملاحظات اجتماعية وسلوكية عامة</label>
                    <textarea
                      rows={3}
                      value={generalSocialNotes}
                      onChange={(e) => setGeneralSocialNotes(e.target.value)}
                      placeholder="ملاحظات سرية للأستاذ لفهم سلوك وتفاعل المتعلم..."
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: HEALTH */}
              {activeTab === 'health' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-900 leading-relaxed">
                    ⚠️ <strong>تنبيه تربوي وقائي:</strong> هذه الخانة مخصصة فقط للملاحظات الوقائية الصفية التي تفيد الأستاذ (مثل: ضعف البصر والجلوس في الصف الأول، حساسية، صعوبة نطق، ربو)، وليست ملفاً طبياً تشخيصياً.
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">الملاحظات الصحية الوقائية</label>
                    <textarea
                      rows={3}
                      value={healthNotes}
                      onChange={(e) => setHealthNotes(e.target.value)}
                      placeholder="مثال: يرتدي نظارات طبية - يفضل جلوسه في المقاعد الأمامية"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-neutral-700 mb-1">الاحتياطات اللازمة داخل الفصل أو الساحة</label>
                    <input
                      type="text"
                      value={precautions}
                      onChange={(e) => setPrecautions(e.target.value)}
                      placeholder="مثال: تجنب المجهود البدني الشديد / الملاحظة أثناء الأنشطة"
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden"
                    />
                  </div>

                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-neutral-800">
                      <input
                        type="checkbox"
                        checked={showInFamilyReport}
                        onChange={(e) => setShowInFamilyReport(e.target.checked)}
                        className="rounded border-neutral-300 text-emerald-800 focus:ring-emerald-700 w-4 h-4"
                      />
                      <span>إظهار هذه الملاحظة الوقائية في تقرير الأسرة الدوري</span>
                    </label>
                    <p className="text-[11px] text-neutral-500 mr-6 mt-0.5">
                      إذا لم يتم التحديد، ستبقى هذه الملاحظة سرية ومحفوظة لفضاء الأستاذ فقط.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Footer Submit */}
          <div className="pt-4 border-t border-neutral-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading || fetching}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{studentId ? 'حفظ التعديلات' : 'حفظ المتعلم'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
