import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Save,
  Bold,
  Italic,
  Underline,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignRight,
  AlignCenter,
  AlignLeft,
  Table,
  Eye,
  FileEdit,
  Printer,
  Loader2
} from 'lucide-react';
import { api } from '../../lib/api';
import { DocumentCategory, Folder } from '../../types';
import { PrintHeader } from '../layout/PrintHeader';

interface DocumentEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  docId?: string | null;
  categories: DocumentCategory[];
  folders: Folder[];
}

export const DocumentEditorModal: React.FC<DocumentEditorModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  docId,
  categories,
  folders
}) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [folderId, setFolderId] = useState('');
  const [tags, setTags] = useState('');
  const [isDraft, setIsDraft] = useState(false);
  const [contentHtml, setContentHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [categories]);

  useEffect(() => {
    if (isOpen && docId) {
      loadDoc(docId);
    } else if (isOpen && !docId) {
      reset();
    }
  }, [isOpen, docId]);

  const reset = () => {
    setTitle('');
    setCategoryId(categories[0]?.id || '');
    setFolderId('');
    setTags('');
    setIsDraft(false);
    setContentHtml('<p>اكتب هنا نص الوثيقة أو التخطيط التربوي...</p>');
    if (editorRef.current) {
      editorRef.current.innerHTML = '<p>اكتب هنا نص الوثيقة أو التخطيط التربوي...</p>';
    }
    setActiveTab('editor');
  };

  const loadDoc = async (id: string) => {
    try {
      setLoading(true);
      const res = await api.getDocument(id);
      const d = res.document;
      setTitle(d.title || '');
      setCategoryId(d.category_id || categories[0]?.id || '');
      setFolderId(d.folder_id || '');
      setTags(d.tags || '');
      setIsDraft(d.is_draft === 1);
      setContentHtml(d.content_html || '');
      if (editorRef.current) {
        editorRef.current.innerHTML = d.content_html || '';
      }
    } catch (e: any) {
      alert(e.message || 'فشل تحميل الوثيقة');
    } finally {
      setLoading(false);
    }
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setContentHtml(editorRef.current.innerHTML);
    }
  };

  const insertTable = () => {
    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 10px 0; border: 1px solid #ccc;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="border: 1px solid #ccc; padding: 6px; text-align: right;">النشاط التعليمي</th>
            <th style="border: 1px solid #ccc; padding: 6px; text-align: right;">دور الأستاذ</th>
            <th style="border: 1px solid #ccc; padding: 6px; text-align: right;">دور المتعلم</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #ccc; padding: 6px;">مرحلة الانطلاق</td>
            <td style="border: 1px solid #ccc; padding: 6px;">طرح وضعية المسألة</td>
            <td style="border: 1px solid #ccc; padding: 6px;">الملاحظة والتفاعل</td>
          </tr>
        </tbody>
      </table>
    `;
    document.execCommand('insertHTML', false, tableHtml);
    if (editorRef.current) {
      setContentHtml(editorRef.current.innerHTML);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const htmlToSave = editorRef.current ? editorRef.current.innerHTML : contentHtml;

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        category_id: categoryId || null,
        folder_id: folderId || null,
        content_html: htmlToSave,
        tags: tags.trim() || null,
        is_draft: isDraft ? 1 : 0
      };

      if (docId) {
        await api.updateDocument(docId, payload);
      } else {
        await api.createDocument(payload);
      }
      onSuccess();
      onClose();
    } catch (e: any) {
      alert(e.message || 'فشل حفظ الوثيقة');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-neutral-200 bg-neutral-50">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-black text-neutral-900">
              {docId ? 'تعديل الوثيقة التربوية' : 'إنشاء وثيقة تربوية جديدة'}
            </h3>
            {/* Tab switch */}
            <div className="flex bg-neutral-200/70 p-0.5 rounded-lg text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  if (editorRef.current) setContentHtml(editorRef.current.innerHTML);
                  setActiveTab('editor');
                }}
                className={`flex items-center gap-1 px-3 py-1 rounded-md transition-all ${
                  activeTab === 'editor' ? 'bg-white text-emerald-900 shadow-xs' : 'text-neutral-600'
                }`}
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>المحرر المرئي</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (editorRef.current) setContentHtml(editorRef.current.innerHTML);
                  setActiveTab('preview');
                }}
                className={`flex items-center gap-1 px-3 py-1 rounded-md transition-all ${
                  activeTab === 'preview' ? 'bg-white text-emerald-900 shadow-xs' : 'text-neutral-600'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>معاينة الطباعة A4</span>
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metadata Controls */}
        <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="sm:col-span-2">
            <label className="block font-bold text-neutral-700 mb-1">عنوان الوثيقة *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: جذاذة نموذجية - الظواهر التركيبية (المستوى 4)"
              className="w-full px-3 py-1.5 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-bold"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-neutral-700 mb-1">التصنيف التربوي:</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg bg-white focus:border-emerald-700 outline-hidden font-medium"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-neutral-700 mb-1">المجلد (مكتبتي):</label>
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-lg bg-white focus:border-emerald-700 outline-hidden"
            >
              <option value="">(المجلد الرئيسي)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {activeTab === 'editor' ? (
            <div className="flex-1 flex flex-col">
              {/* WYSIWYG Toolbar */}
              <div className="flex flex-wrap items-center gap-1 p-2 bg-neutral-100 border-b border-neutral-200">
                <button
                  type="button"
                  onClick={() => execCmd('bold')}
                  className="p-1.5 text-neutral-700 hover:bg-neutral-200 rounded"
                  title="عريض"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('italic')}
                  className="p-1.5 text-neutral-700 hover:bg-neutral-200 rounded"
                  title="مائل"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('underline')}
                  className="p-1.5 text-neutral-700 hover:bg-neutral-200 rounded"
                  title="تسطير"
                >
                  <Underline className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-neutral-300 mx-1" />
                <button
                  type="button"
                  onClick={() => execCmd('formatBlock', '<h2>')}
                  className="p-1.5 text-neutral-700 hover:bg-neutral-200 rounded"
                  title="عنوان رئيسي H2"
                >
                  <Heading2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('formatBlock', '<h3>')}
                  className="p-1.5 text-neutral-700 hover:bg-neutral-200 rounded"
                  title="عنوان فرعي H3"
                >
                  <Heading3 className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-neutral-300 mx-1" />
                <button
                  type="button"
                  onClick={() => execCmd('justifyRight')}
                  className="p-1.5 text-neutral-700 hover:bg-neutral-200 rounded"
                  title="محاذاة لليمين"
                >
                  <AlignRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('justifyCenter')}
                  className="p-1.5 text-neutral-700 hover:bg-neutral-200 rounded"
                  title="محاذاة للوسط"
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('justifyLeft')}
                  className="p-1.5 text-neutral-700 hover:bg-neutral-200 rounded"
                  title="محاذاة لليسار"
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-neutral-300 mx-1" />
                <button
                  type="button"
                  onClick={() => execCmd('insertUnorderedList')}
                  className="p-1.5 text-neutral-700 hover:bg-neutral-200 rounded"
                  title="قائمة نقطية"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => execCmd('insertOrderedList')}
                  className="p-1.5 text-neutral-700 hover:bg-neutral-200 rounded"
                  title="قائمة مرقمة"
                >
                  <ListOrdered className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-neutral-300 mx-1" />
                <button
                  type="button"
                  onClick={insertTable}
                  className="flex items-center gap-1 text-xs px-2 py-1 text-neutral-700 hover:bg-neutral-200 rounded"
                  title="إدراج جدول بيداغوجي"
                >
                  <Table className="w-4 h-4" />
                  <span>جدول</span>
                </button>
              </div>

              {/* Editable Area */}
              <div
                ref={editorRef}
                contentEditable
                onInput={() => {
                  if (editorRef.current) setContentHtml(editorRef.current.innerHTML);
                }}
                className="flex-1 p-6 text-sm text-neutral-900 outline-hidden min-h-[350px] leading-relaxed font-sans overflow-y-auto"
                dir="rtl"
              />
            </div>
          ) : (
            /* PREVIEW TAB */
            <div className="p-8 bg-neutral-100 flex-1 overflow-y-auto">
              <div className="max-w-[21cm] mx-auto bg-white p-8 shadow-md rounded-lg min-h-[29.7cm] border border-neutral-200">
                <PrintHeader title={title || 'وثيقة تربوية'} />
                <div
                  className="text-sm leading-relaxed text-neutral-900 mt-6"
                  dangerouslySetInnerHTML={{ __html: contentHtml }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-600">
            <input
              type="checkbox"
              checked={isDraft}
              onChange={(e) => setIsDraft(e.target.checked)}
              className="rounded border-neutral-300 text-emerald-800 focus:ring-emerald-700"
            />
            <span>حفظ كمسودة غير منشورة</span>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-200 rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{docId ? 'حفظ التعديلات' : 'حفظ الوثيقة'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
