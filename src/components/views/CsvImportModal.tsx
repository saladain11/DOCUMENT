import React, { useState } from 'react';
import { X, UploadCloud, CheckCircle2, AlertTriangle, FileText, ArrowRight, Loader2, Download } from 'lucide-react';
import { api } from '../../lib/api';
import { SchoolClass } from '../../types';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classes: SchoolClass[];
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose, onSuccess, classes }) => {
  const [file, setFile] = useState<File | null>(null);
  const [targetClassId, setTargetClassId] = useState(classes[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Simple CSV parser for Arabic text
  const parseCSV = (text: string) => {
    // Remove BOM
    const cleanText = text.replace(/^\uFEFF/, '');
    const lines = cleanText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    // Detect delimiter: comma or semicolon
    const headerLine = lines[0];
    const delimiter = headerLine.includes(';') ? ';' : ',';

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^"|"$/g, ''));
      return result;
    };

    const headers = parseLine(headerLine);
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      if (values.length === 0 || (values.length === 1 && !values[0])) continue;
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h.trim()] = values[idx] || '';
      });
      rows.push(row);
    }
    return rows;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    setError(null);
    setLoading(true);

    try {
      const text = await selected.text();
      const parsedRows = parseCSV(text);

      if (parsedRows.length === 0) {
        throw new Error('الملف فارغ أو لا يحتوي على صفوف صالحة');
      }

      const previewRes = await api.previewCsv(parsedRows, targetClassId);
      setPreviewData(previewRes);
    } catch (err: any) {
      setError(err.message || 'فشل معالجة ملف CSV');
      setPreviewData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!previewData || previewData.validRecords.length === 0) return;

    setCommitting(true);
    setError(null);

    try {
      await api.commitCsv(previewData.validRecords, targetClassId);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء استيراد البيانات');
    } finally {
      setCommitting(false);
    }
  };

  const downloadSampleTemplate = () => {
    const csvHeader = '\uFEFFالاسم,النسب,الجنس,تاريخ الازدياد,رقم مسار,الفوج\r\n';
    const sampleRows = 'أيمن,المرابط,ذكر,2018-04-12,M139876543,الفوج 1\r\nنهيلة,الشرايبي,أنثى,2018-07-22,M139876544,الفوج 2\r\n';
    const blob = new Blob([csvHeader + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'نموذج_استيراد_المتعلمين.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 bg-neutral-50">
          <div>
            <h3 className="text-base font-black text-neutral-900">
              استيراد المتعلمين من ملف CSV (مسار)
            </h3>
            <p className="text-xs text-neutral-500">
              يتم فحص البيانات تلقائياً للتأكد من خلوها من التكرار وسلامة الحقول
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-medium">
              {error}
            </div>
          )}

          {/* Target Class Selection & Template Download */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
            <div className="w-full sm:w-72">
              <label className="block text-xs font-bold text-neutral-700 mb-1">
                تحديد القسم المستهدف للاستيراد:
              </label>
              <select
                value={targetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg bg-white focus:border-emerald-700 outline-hidden font-medium"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.level})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={downloadSampleTemplate}
              className="flex items-center gap-1.5 text-xs text-emerald-800 hover:text-emerald-900 font-bold hover:underline"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل نموذج CSV الجاهز (Excel)</span>
            </button>
          </div>

          {/* Upload Area */}
          {!previewData && (
            <div className="border-2 border-dashed border-neutral-300 hover:border-emerald-600 rounded-xl p-8 text-center transition-colors bg-neutral-50/50">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-file-input"
              />
              <label htmlFor="csv-file-input" className="cursor-pointer flex flex-col items-center">
                <UploadCloud className="w-10 h-10 text-emerald-700 mb-2" />
                <span className="text-sm font-bold text-neutral-800">
                  انقر هنا لاختيار ملف CSV أو اسحبه إلى هنا
                </span>
                <span className="text-xs text-neutral-500 mt-1">
                  الحقول المدعومة: الاسم، النسب، تاريخ الازدياد، الجنس، رقم مسار
                </span>
              </label>
            </div>
          )}

          {loading && (
            <div className="py-12 text-center text-neutral-500 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-800 mx-auto mb-2" />
              جاري فحص وتدقيق سجلات الملف...
            </div>
          )}

          {/* Preview Results Table */}
          {previewData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="flex items-center gap-1 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4" />
                    {previewData.validCount} سجل سليم ومؤهل للاستيراد
                  </span>
                  {previewData.invalidCount > 0 && (
                    <span className="flex items-center gap-1 text-rose-800">
                      <AlertTriangle className="w-4 h-4" />
                      {previewData.invalidCount} سجل به أخطاء أو تكرار
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setPreviewData(null);
                    setFile(null);
                  }}
                  className="text-xs text-neutral-500 hover:text-neutral-800 underline"
                >
                  اختيار ملف آخر
                </button>
              </div>

              {/* Valid Records Preview */}
              {previewData.validRecords.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-neutral-700 mb-2">معاينة المتعلمين المقبولين:</h4>
                  <div className="max-h-48 overflow-y-auto border border-neutral-200 rounded-lg">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-neutral-100 text-neutral-700 sticky top-0 font-bold">
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">الاسم والنسب</th>
                          <th className="p-2">الجنس</th>
                          <th className="p-2">تاريخ الازدياد</th>
                          <th className="p-2">رقم مسار</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200">
                        {previewData.validRecords.map((r: any, idx: number) => (
                          <tr key={idx} className="hover:bg-neutral-50">
                            <td className="p-2 text-neutral-400">{idx + 1}</td>
                            <td className="p-2 font-bold text-neutral-800">{r.full_name}</td>
                            <td className="p-2">{r.gender}</td>
                            <td className="p-2 font-mono">{r.birth_date}</td>
                            <td className="p-2 font-mono text-emerald-800">{r.massar_code || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Invalid Records with reasons */}
              {previewData.invalidRecords.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-rose-800 mb-2">السجلات المرفوضة وسبب الرفض:</h4>
                  <div className="max-h-36 overflow-y-auto border border-rose-200 rounded-lg bg-rose-50/40">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-rose-100/70 text-rose-900 sticky top-0 font-bold">
                        <tr>
                          <th className="p-2">السطر</th>
                          <th className="p-2">الاسم المدخل</th>
                          <th className="p-2">سبب الرفض</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-200">
                        {previewData.invalidRecords.map((r: any, idx: number) => (
                          <tr key={idx}>
                            <td className="p-2 text-rose-600 font-mono">{r.row_index}</td>
                            <td className="p-2 font-bold text-neutral-800">{r.full_name || 'غير محدد'}</td>
                            <td className="p-2 text-rose-700">{r.errors.join(' • ')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-200 rounded-lg transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleCommit}
            disabled={!previewData || previewData.validCount === 0 || committing}
            className="flex items-center gap-1.5 px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-lg transition-colors shadow-2xs disabled:opacity-50"
          >
            {committing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>جاري الاستيراد والتسجيل...</span>
              </>
            ) : (
              <>
                <ArrowRight className="w-3.5 h-3.5" />
                <span>
                  تأكيد استيراد {previewData ? previewData.validCount : 0} متعلم(ة)
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
