import React from 'react';
import { Search, Bell, Printer, Menu, User, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onOpenSearch: () => void;
  onToggleSidebar: () => void;
  onNavigate: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSearch, onToggleSidebar, onNavigate }) => {
  const { user } = useAuth();

  const handlePrint = () => {
    window.print();
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-8 shadow-xs shrink-0">
      {/* Right side (Mobile toggle + Greeting) */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          title="القائمة الجانبية"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col text-right">
          <h2 className="text-sm sm:text-base font-bold text-slate-800 leading-tight">
            مرحباً، {user?.full_name || 'الأستاذ(ة)'}
          </h2>
          <p className="text-[11px] text-slate-500">
            الموسم الدراسي: 2026 - 2027
          </p>
        </div>
      </div>

      {/* Left side (Search pill + Print + Alerts + Avatar) */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Geometric Balance Search Bar Pill */}
        <button
          onClick={onOpenSearch}
          className="relative bg-slate-100 hover:bg-slate-200/70 border-none rounded-full px-4 py-1.5 text-xs sm:text-sm text-slate-500 hover:text-slate-800 transition-all w-36 sm:w-64 flex items-center justify-between focus:ring-2 focus:ring-blue-200 outline-none"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="truncate">بحث شامل...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white text-slate-500 rounded-md border border-slate-200 shadow-2xs">
            Ctrl K
          </kbd>
        </button>

        {/* Print Button */}
        <button
          onClick={handlePrint}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-blue-700 transition-colors shadow-2xs"
          title="طباعة الصفحة الحالية A4"
        >
          <Printer className="w-3.5 h-3.5 text-blue-600" />
          <span>طباعة</span>
        </button>

        {/* Notifications / Alerts icon */}
        <button
          onClick={() => onNavigate('dashboard')}
          className="relative p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors"
          title="التنبيهات التربوية"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white animate-pulse" />
        </button>

        {/* Teacher profile avatar pill */}
        <div
          onClick={() => onNavigate('settings')}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-50 border-2 border-white shadow-sm flex items-center justify-center font-bold text-blue-700 text-xs sm:text-sm cursor-pointer hover:ring-2 hover:ring-blue-200 transition-all ring-1 ring-slate-200"
          title={user?.full_name || 'الملف الشخصي'}
        >
          {user?.full_name ? user.full_name[0] : 'أ'}
        </div>
      </div>
    </header>
  );
};
