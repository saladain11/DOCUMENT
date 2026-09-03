import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, User, Check, AlertCircle, Loader2, Sparkles, BookOpen } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login({ username: username.trim(), password, rememberMe });
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول، تأكد من صحة البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setUsername('admin');
    setPassword('admin123');
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 sm:p-6" dir="rtl">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Header Ribbon */}
        <div className="bg-blue-900 p-6 sm:p-8 text-center text-white relative">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-600 flex items-center justify-center text-2xl font-bold text-white shadow-xs">
            م
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">«مساعد الأستاذ»</h1>
          <p className="text-blue-200 text-xs sm:text-sm mt-1">
            المنصة المتكاملة لتدبير القسم وتتبع المتعلمين
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-blue-800/80 rounded-full text-[11px] text-blue-200 border border-blue-700/60">
            <BookOpen className="w-3 h-3 text-blue-300" />
            <span>المدرسة المغربية الحديثة • الموسم 2026-2027</span>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              اسم المستخدم (المعرف)
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم..."
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                required
              />
              <User className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور..."
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                required
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-200 w-4 h-4"
              />
              <span>تذكرني على هذا الجهاز</span>
            </label>

            <button
              type="button"
              onClick={handleFillDemo}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline"
            >
              بيانات الدخول التجريبي
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-xl text-sm transition-colors shadow-2xs flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري التحقق والدخول...</span>
              </>
            ) : (
              <span>تسجيل الدخول إلى فضاء الأستاذ</span>
            )}
          </button>

          <div className="pt-3 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              الحساب الافتراضي: المعرف: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">admin</code> | كلمة المرور: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">admin123</code>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
