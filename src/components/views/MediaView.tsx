import React, { useState, useEffect, useRef } from 'react';
import { Image, Upload, Trash2, Filter, User, Tag, Plus, Loader2, FileText, Check } from 'lucide-react';
import { api } from '../../lib/api';
import { MediaItem, SchoolClass, Student } from '../../types';

interface MediaViewProps {
  classes: SchoolClass[];
}

export const MediaView: React.FC<MediaViewProps> = ({ classes }) => {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [classesList] = useState<SchoolClass[]>(classes);
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('أنشطة صفية');
  const [uploadStudentId, setUploadStudentId] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedClassId) {
      loadStudents(selectedClassId);
    }
  }, [selectedClassId]);

  useEffect(() => {
    loadMedia();
  }, [selectedStudentId, selectedCategory]);

  const loadStudents = async (classId: string) => {
    try {
      const res = await api.getStudents({ classId, limit: 100 });
      setStudents(res.students || []);
    } catch (e) {
      console.error('Failed to load students:', e);
    }
  };

  const loadMedia = async () => {
    try {
      setLoading(true);
      const res = await api.getMedia({
        studentId: selectedStudentId || undefined,
        category: selectedCategory || undefined
      });
      setMediaList(res.media || []);
    } catch (e) {
      console.error('Failed to load media:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('يرجى اختيار ملف لرفعه');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('title', uploadTitle.trim() || uploadFile.name);
    formData.append('category', uploadCategory);
    if (uploadStudentId) formData.append('student_id', uploadStudentId);
    if (uploadNotes.trim()) formData.append('notes', uploadNotes.trim());

    try {
      await api.uploadMedia(formData);
      setIsUploadOpen(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadNotes('');
      loadMedia();
    } catch (e: any) {
      alert(e.message || 'فشل رفع الملف');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`هل أنت متأكد من حذف الوسيط: «${title}»؟`)) return;
    try {
      await api.deleteMedia(id);
      loadMedia();
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
            <Image className="w-5 h-5 text-emerald-800" />
            <span>معرض وسائط وإنجازات المتعلمين</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            صور الأنشطة الصفية، شواهد التقدير، تسجيلات القراءة الصوتية، والأشغال اليدوية
          </p>
        </div>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
        >
          <Upload className="w-4 h-4" />
          <span>رفع وسيط أو ملف جديد</span>
        </button>
      </div>

      {/* Filter Ribbon */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs flex flex-wrap items-center gap-4 text-xs">
        <div className="w-48">
          <label className="block font-bold text-neutral-700 mb-1">القسم:</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg bg-white focus:border-emerald-700 outline-hidden font-medium"
          >
            {classesList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.level})
              </option>
            ))}
          </select>
        </div>

        <div className="w-56">
          <label className="block font-bold text-neutral-700 mb-1">تصفية حسب المتعلم:</label>
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg bg-white focus:border-emerald-700 outline-hidden"
          >
            <option value="">جميع المتعلمين</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-48">
          <label className="block font-bold text-neutral-700 mb-1">نوع النشاط / الفئة:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg bg-white focus:border-emerald-700 outline-hidden font-medium"
          >
            <option value="">جميع الفئات</option>
            <option value="أنشطة صفية">أنشطة صفية</option>
            <option value="شواهد وتكريمات">شواهد وتكريمات</option>
            <option value="إنتاجات وأشغال يدوية">إنتاجات وأشغال يدوية</option>
            <option value="تسجيلات صوتية">تسجيلات صوتية</option>
            <option value="ملفات أخرى">ملفات أخرى</option>
          </select>
        </div>
      </div>

      {/* Media Grid */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs p-6">
        {loading ? (
          <div className="py-16 text-center text-neutral-400 text-xs">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-800 mx-auto mb-2" />
            جاري تحميل الوسائط...
          </div>
        ) : mediaList.length === 0 ? (
          <div className="py-16 text-center text-neutral-400 text-xs">
            لا توجد وسائط أو وثائق مرفوعة مطابقة للتصفية الحالية.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {mediaList.map((m) => {
              const isImage = m.file_path && m.file_path.startsWith('data:image');
              return (
                <div
                  key={m.id}
                  className="rounded-xl border border-neutral-200 overflow-hidden bg-neutral-50/50 hover:shadow-xs transition-all flex flex-col justify-between group"
                >
                  <div className="aspect-square bg-neutral-100 relative flex items-center justify-center overflow-hidden">
                    {isImage ? (
                      <img
                        src={m.file_path}
                        alt={m.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="p-4 text-center">
                        <FileText className="w-10 h-10 text-neutral-400 mx-auto mb-1" />
                        <span className="text-[10px] text-neutral-500 font-mono uppercase">
                          {m.file_type?.split('/')[1] || 'FILE'}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => handleDelete(m.id, m.title)}
                      className="absolute top-2 left-2 p-1.5 bg-white/90 rounded-md text-neutral-400 hover:text-rose-600 shadow-xs"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {m.category}
                    </span>
                    <h4 className="font-bold text-neutral-900 text-xs mt-1 truncate" title={m.title}>
                      {m.title}
                    </h4>
                    {m.student_name && (
                      <span className="text-[10px] text-neutral-500 block truncate mt-0.5">
                        👤 {m.student_name}
                      </span>
                    )}
                    <span className="text-[9px] text-neutral-400 block mt-1 font-mono">
                      {new Date(m.created_at).toLocaleDateString('ar-MA')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-neutral-200">
            <h3 className="text-base font-black text-neutral-900 mb-4">رفع وسيط أو وثيقة جديدة</h3>
            <form onSubmit={handleUploadSubmit} className="space-y-3.5 text-xs">
              {/* Drag and Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-300 hover:border-emerald-700 rounded-xl p-6 text-center cursor-pointer bg-neutral-50 hover:bg-neutral-100 transition-colors"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                      if (!uploadTitle) setUploadTitle(e.target.files[0].name.split('.')[0]);
                    }
                  }}
                  className="hidden"
                />
                {uploadFile ? (
                  <div className="space-y-1">
                    <Check className="w-6 h-6 text-emerald-700 mx-auto" />
                    <p className="font-bold text-neutral-800">{uploadFile.name}</p>
                    <p className="text-[10px] text-neutral-500">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Upload className="w-6 h-6 text-neutral-400 mx-auto" />
                    <p className="font-bold text-neutral-700">انقر لاختيار ملف أو اسحبه هنا</p>
                    <p className="text-[10px] text-neutral-400">يدعم الصور (PNG, JPG)، الوثائق (PDF)، والتسجيلات</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">عنوان أو تسمية الملف *</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="مثال: شهادة تقدير التميز في القراءة"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-medium"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">التصنيف *</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white focus:border-emerald-700 outline-hidden font-medium"
                >
                  <option value="أنشطة صفية">أنشطة صفية</option>
                  <option value="شواهد وتكريمات">شواهد وتكريمات</option>
                  <option value="إنتاجات وأشغال يدوية">إنتاجات وأشغال يدوية</option>
                  <option value="تسجيلات صوتية">تسجيلات صوتية</option>
                  <option value="ملفات أخرى">ملفات أخرى</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-neutral-700 mb-1">ربط بمتعلم محدد (اختياري)</label>
                <select
                  value={uploadStudentId}
                  onChange={(e) => setUploadStudentId(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg bg-white focus:border-emerald-700 outline-hidden"
                >
                  <option value="">(غير مرتبط بمتعلم معين - نشاط جماعي)</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="px-5 py-2 bg-emerald-800 text-white rounded-lg font-bold hover:bg-emerald-900 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  <span>رفع وحفظ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
