import React from 'react';
import {
  LayoutDashboard,
  Users,
  School,
  Target,
  AlertTriangle,
  Award,
  CheckSquare,
  BookOpen,
  GraduationCap,
  Files,
  FileBarChart,
  Settings,
  LogOut,
  X,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, isOpen, onClose }) => {
  const { logout, user } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'لوحة القيادة', icon: LayoutDashboard },
    { id: 'students', label: 'تدبير المتعلمين', icon: Users },
    { id: 'classes', label: 'الأقسام والأفواج', icon: School },
    { id: 'placements', label: 'الموضعة و TaRL', icon: Target },
    { id: 'difficulties', label: 'الصعوبات والدعم', icon: AlertTriangle },
    { id: 'strengths', label: 'نقاط القوة والتميز', icon: Award },
    { id: 'attendance', label: 'الحضور والغياب', icon: CheckSquare },
    { id: 'assignments', label: 'الواجبات المنزلية', icon: BookOpen },
    { id: 'assessments', label: 'التقويمات والنتائج', icon: GraduationCap },
    { id: 'documents', label: 'الوثائق والمكتبة', icon: Files },
    { id: 'reports', label: 'التقارير والطباعة', icon: FileBarChart },
    { id: 'settings', label: 'الإعدادات والنسخ', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-neutral-900/50 z-40 lg:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 right-0 z-40 w-64 bg-white text-slate-800 flex flex-col transition-transform duration-250 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } border-l border-slate-200 shadow-sm shrink-0 h-full`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-xs">
                <span className="font-bold text-base">م</span>
              </div>
              <h1 className="text-xl font-bold text-blue-900 leading-none">مساعد الأستاذ</h1>
            </div>
            <p className="text-xs text-slate-400">المنصة المتكاملة لتدبير القسم</p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            الوحدات التربوية
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-xs sm:text-sm transition-all text-right group ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Teacher profile & Logout Footer */}
        <div className="p-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
              {user?.full_name ? user.full_name[0] : 'أ'}
            </div>
            <div className="overflow-hidden text-right flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">
                {user?.full_name || 'الأستاذ(ة)'}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user?.school_name || 'المدرسة الابتدائية'}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            className="flex items-center gap-3 p-3 w-full text-red-600 hover:bg-red-50 rounded-xl font-medium text-xs transition-colors text-right"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
};
