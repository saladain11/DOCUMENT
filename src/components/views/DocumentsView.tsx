import React, { useState, useEffect } from 'react';
import {
  Files,
  Plus,
  FolderPlus,
  Star,
  Search,
  Folder,
  FileText,
  Printer,
  Edit2,
  Trash2,
  Share2,
  History,
  Link,
  Tag,
  Loader2,
  X
} from 'lucide-react';
import { api } from '../../lib/api';
import { PedagogicalDocument, DocumentCategory, Folder as FolderType } from '../../types';
import { DocumentEditorModal } from './DocumentEditorModal';

interface DocumentsViewProps {
  onSelectStudentProfile?: (id: string) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = () => {
  const [documents, setDocuments] = useState<PedagogicalDocument[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Modals
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [isAddFolderOpen, setIsAddFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Document Detail / Print Modal
  const [activeViewDoc, setActiveViewDoc] = useState<any>(null);

  useEffect(() => {
    loadCategoriesAndFolders();
    loadDocuments();
  }, [selectedCategory, selectedFolder, onlyFavorites]);

  const loadCategoriesAndFolders = async () => {
    try {
      const [cRes, fRes] = await Promise.all([api.getDocumentCategories(), api.getFolders()]);
      setCategories(cRes.categories || []);
      setFolders(fRes.folders || []);
    } catch (e) {
      console.error('Failed to load categories/folders:', e);
    }
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const res = await api.getDocuments({
        categoryId: selectedCategory || undefined,
        folderId: selectedFolder || undefined,
        isFavorite: onlyFavorites ? 'true' : undefined,
        search: search.trim() || undefined
      });
      setDocuments(res.documents || []);
    } catch (e) {
      console.error('Failed to load documents:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.toggleFavoriteDocument(id);
      loadDocuments();
    } catch (err: any) {
      alert(err.message || 'فشل تحديث المفضلة');
    }
  };

  const handleDelete = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`هل أنت متأكد من حذف الوثيقة: «${title}»؟`)) return;
    try {
      await api.deleteDocument(id);
      loadDocuments();
    } catch (err: any) {
      alert(err.message || 'فشل حذف الوثيقة');
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await api.createFolder(newFolderName.trim());
      setIsAddFolderOpen(false);
      setNewFolderName('');
      loadCategoriesAndFolders();
    } catch (err: any) {
      alert(err.message || 'فشل إنشاء المجلد');
    }
  };

  const handleOpenDoc = async (id: string) => {
    try {
      const res = await api.getDocument(id);
      setActiveViewDoc(res);
    } catch (e: any) {
      alert(e.message || 'فشل فتح الوثيقة');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-neutral-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-black text-neutral-900 flex items-center gap-2">
            <Files className="w-5 h-5 text-purple-800" />
            <span>الوثائق والمكتبة التربوية للأستاذ</span>
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            الجذاذات، التخطيط اليومي، وثائق TaRL والتعليم الصريح، إدارة النسخ والطباعة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddFolderOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-xs font-semibold rounded-lg border border-neutral-200 transition-colors"
          >
            <FolderPlus className="w-4 h-4 text-neutral-600" />
            <span>مجلد جديد</span>
          </button>
          <button
            onClick={() => {
              setEditingDocId(null);
              setIsEditorOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>تحرير وثيقة جديدة</span>
          </button>
        </div>
      </div>

      {/* Filter and Category Ribbon */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs space-y-3">
        {/* Top search & selectors */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadDocuments()}
              placeholder="ابحث في عناوين الوثائق والوسوم..."
              className="w-full pl-3 pr-9 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-xs text-neutral-800 focus:bg-white focus:border-emerald-700 outline-hidden font-medium"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-2.5" />
          </div>

          <div className="w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg bg-white focus:border-emerald-700 outline-hidden font-medium"
            >
              <option value="">جميع التصنيفات</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-44">
            <select
              value={selectedFolder}
              onChange={(e) => setSelectedFolder(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg bg-white focus:border-emerald-700 outline-hidden"
            >
              <option value="">جميع المجلدات</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-bold transition-colors ${
              onlyFavorites
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${onlyFavorites ? 'fill-amber-500 text-amber-500' : ''}`} />
            <span>المفضلة فقط</span>
          </button>
        </div>

        {/* Categories Chips */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-neutral-100">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
              !selectedCategory ? 'bg-emerald-800 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            الكل
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id === selectedCategory ? '' : cat.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
                cat.id === selectedCategory
                  ? 'bg-emerald-800 text-white font-bold'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-2xs p-6">
        {loading ? (
          <div className="py-16 text-center text-neutral-400 text-xs">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-800 mx-auto mb-2" />
            جاري تحميل الوثائق التربوية...
          </div>
        ) : documents.length === 0 ? (
          <div className="py-16 text-center text-neutral-400 text-xs">
            لا توجد وثائق مطابقة لبحثك. انقر على «تحرير وثيقة جديدة» لإضافة جذاذة أو مخطط.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => handleOpenDoc(doc.id)}
                className="p-5 rounded-xl border border-neutral-200 hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer bg-neutral-50/40 flex flex-col justify-between space-y-3 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {doc.category_name || 'وثيقة عامة'}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleToggleFavorite(doc.id, e)}
                        className="p-1 text-neutral-400 hover:text-amber-500 rounded"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            doc.is_favorite === 1 ? 'fill-amber-400 text-amber-400' : ''
                          }`}
                        />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingDocId(doc.id);
                          setIsEditorOpen(true);
                        }}
                        className="p-1 text-neutral-400 hover:text-neutral-700 rounded"
                        title="تعديل"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(doc.id, doc.title, e)}
                        className="p-1 text-neutral-400 hover:text-rose-600 rounded"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-bold text-neutral-900 text-sm mt-2 group-hover:text-emerald-900 transition-colors">
                    {doc.title}
                  </h4>

                  {doc.tags && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {doc.tags.split(',').map((t, idx) => (
                        <span key={idx} className="text-[10px] text-neutral-500 bg-white px-1.5 py-0.5 rounded border border-neutral-200">
                          #{t.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-neutral-200 text-[10px] text-neutral-400 flex items-center justify-between">
                  <span className="font-mono">الإصدار: v{doc.version || 1}</span>
                  <span>{new Date(doc.updated_at).toLocaleDateString('ar-MA')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Folder Modal */}
      {isAddFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-neutral-200">
            <h3 className="text-base font-black text-neutral-900 mb-4">إنشاء مجلد جديد في مكتبتي</h3>
            <form onSubmit={handleCreateFolder} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-neutral-700 mb-1">اسم المجلد *</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="مثال: جذاذات الرياضيات (الدورة 1)"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:border-emerald-700 outline-hidden font-medium"
                  required
                />
              </div>

              <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddFolderOpen(false)}
                  className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-800 text-white rounded-lg font-bold hover:bg-emerald-900"
                >
                  إنشاء المجلد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      <DocumentEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSuccess={() => {
          loadCategoriesAndFolders();
          loadDocuments();
        }}
        docId={editingDocId}
        categories={categories}
        folders={folders}
      />

      {/* Document View / Print Modal */}
      {activeViewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-neutral-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-200">
              <div>
                <h3 className="text-base font-black text-neutral-900">
                  {activeViewDoc.document.title}
                </h3>
                <p className="text-xs text-neutral-500">
                  التصنيف: {activeViewDoc.document.category_name || 'عام'} • الإصدار: v{activeViewDoc.document.version}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-xs font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة</span>
                </button>
                <button
                  onClick={() => setActiveViewDoc(null)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-6">
              <div
                className="text-sm leading-relaxed text-neutral-900"
                dangerouslySetInnerHTML={{ __html: activeViewDoc.document.content_html }}
              />

              {/* Version History */}
              {activeViewDoc.versions?.length > 0 && (
                <div className="mt-8 pt-4 border-t border-neutral-200 text-xs">
                  <h4 className="font-bold text-neutral-800 mb-2 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-neutral-500" />
                    <span>تاريخ النسخ والتعديل:</span>
                  </h4>
                  <div className="space-y-1 text-neutral-600">
                    {activeViewDoc.versions.map((v: any) => (
                      <div key={v.id} className="flex items-center justify-between p-2 rounded bg-neutral-50">
                        <span>الإصدار v{v.version_num} ({v.title})</span>
                        <span className="font-mono text-[10px] text-neutral-400">{v.created_at}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
