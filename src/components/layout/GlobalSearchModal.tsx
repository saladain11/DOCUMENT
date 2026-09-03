import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, FileText, School, AlertCircle, BookOpen, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (view: string, id?: string) => void;
  onSelectStudent?: (id: string) => void;
  onSelectDocument?: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  onSelectStudent,
  onSelectDocument,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>({ students: [], documents: [], classes: [], difficulties: [], assignments: [] });
  const inputRef = useRef<HTMLInputElement>(null);

  const handleItemClick = (view: string, id?: string) => {
    if (view === 'students' && id && onSelectStudent) {
      onSelectStudent(id);
    } else if (view === 'documents' && onSelectDocument) {
      onSelectDocument();
    } else if (onNavigate) {
      onNavigate(view, id);
    }
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ students: [], documents: [], classes: [], difficulties: [], assignments: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults({ students: [], documents: [], classes: [], difficulties: [], assignments: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.globalSearch(query);
        setResults(res);
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const totalHits =
    results.students.length +
    results.documents.length +
    results.classes.length +
    results.difficulties.length +
    results.assignments.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 bg-slate-900/40 backdrop-blur-xs p-4" dir="rtl">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-5 py-4 border-b border-slate-100 gap-3 bg-slate-50/50">
          <Search className="w-5 h-5 text-blue-600 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث بالاسم، برقم مسار، بعنوان وثيقة، بصعوبة، باسم قسم..."
            className="flex-1 bg-transparent text-sm sm:text-base text-slate-800 placeholder-slate-400 outline-none font-medium"
          />
          {loading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="text-xs px-2.5 py-1 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 font-medium transition-colors">
            Esc
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!query.trim() && (
            <div className="text-center py-8 text-slate-400 text-sm">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-40 text-blue-600" />
              ابدأ بكتابة اسم متعلم أو رمز مسار أو وثيقة تربوية للبحث السريع
            </div>
          )}

          {query.trim().length >= 2 && !loading && totalHits === 0 && (
            <div className="text-center py-8 text-slate-500 text-sm">
              لم يتم العثور على أي نتائج مطابقة لـ «{query}»
            </div>
          )}

          {/* Students Group */}
          {results.students.length > 0 && (
            <div>
              <div className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1.5 px-2">
                <User className="w-3.5 h-3.5" />
                المتعلمون ({results.students.length})
              </div>
              <div className="space-y-1">
                {results.students.map((st: any) => (
                  <div
                    key={st.id}
                    onClick={() => handleItemClick('students', st.id)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                        {st.full_name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{st.full_name}</p>
                        <p className="text-xs text-slate-500">مسار: {st.massar_code || 'غير محدد'}</p>
                      </div>
                    </div>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-lg font-medium">
                      {st.class_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents Group */}
          {results.documents.length > 0 && (
            <div>
              <div className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1.5 px-2">
                <FileText className="w-3.5 h-3.5" />
                الوثائق التربوية ({results.documents.length})
              </div>
              <div className="space-y-1">
                {results.documents.map((doc: any) => (
                  <div
                    key={doc.id}
                    onClick={() => handleItemClick('documents', doc.id)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{doc.title}</p>
                        <p className="text-xs text-slate-500">{doc.category_name || 'وثيقة عامة'}</p>
                      </div>
                    </div>
                    {doc.tags && (
                      <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg">
                        {doc.tags}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Classes Group */}
          {results.classes.length > 0 && (
            <div>
              <div className="text-xs font-bold text-blue-700 mb-2 flex items-center gap-1.5 px-2">
                <School className="w-3.5 h-3.5" />
                الأقسام ({results.classes.length})
              </div>
              <div className="space-y-1">
                {results.classes.map((cls: any) => (
                  <div
                    key={cls.id}
                    onClick={() => handleItemClick('classes', cls.id)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800">{cls.name}</p>
                      <p className="text-xs text-slate-500">{cls.level}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Difficulties Group */}
          {results.difficulties.length > 0 && (
            <div>
              <div className="text-xs font-bold text-amber-700 mb-2 flex items-center gap-1.5 px-2">
                <AlertCircle className="w-3.5 h-3.5" />
                صعوبات التعلم المرصودة ({results.difficulties.length})
              </div>
              <div className="space-y-1">
                {results.difficulties.map((diff: any) => (
                  <div
                    key={diff.id}
                    onClick={() => handleItemClick('difficulties', diff.student_id)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-amber-50/60 cursor-pointer border border-transparent hover:border-amber-200 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800">{diff.category} - {diff.student_name}</p>
                      <p className="text-xs text-slate-500">درجة الصعوبة: {diff.severity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assignments Group */}
          {results.assignments.length > 0 && (
            <div>
              <div className="text-xs font-bold text-indigo-700 mb-2 flex items-center gap-1.5 px-2">
                <BookOpen className="w-3.5 h-3.5" />
                الواجبات المنزلية ({results.assignments.length})
              </div>
              <div className="space-y-1">
                {results.assignments.map((asg: any) => (
                  <div
                    key={asg.id}
                    onClick={() => handleItemClick('assignments', asg.id)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50/60 cursor-pointer border border-transparent hover:border-indigo-200 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-800">{asg.title} ({asg.subject})</p>
                      <p className="text-xs text-slate-500">القسم: {asg.class_name} | الاستحقاق: {asg.due_date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
