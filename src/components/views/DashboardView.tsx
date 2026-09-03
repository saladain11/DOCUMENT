import React, { useState, useEffect } from 'react';
import {
  Users,
  School,
  CheckCircle2,
  BookOpen,
  AlertTriangle,
  TrendingUp,
  Files,
  Award,
  PlusCircle,
  Clock,
  ArrowUpRight,
  Sparkles,
  Calendar,
  ChevronLeft,
  Loader2
} from 'lucide-react';
import { api } from '../../lib/api';
import { DashboardStats, PedagogicalAlert, ActivityLog } from '../../types';

interface DashboardViewProps {
  onNavigate: (view: string, id?: string) => void;
  onOpenStudentModal?: () => void;
  onSelectStudent?: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, onOpenStudentModal, onSelectStudent }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<PedagogicalAlert[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data.stats);
      setAlerts(data.alerts || []);
      setActivities(data.recentActivities || []);
    } catch (e) {
      console.error('Failed to load dashboard:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'المتعلمون',
      value: stats?.totalStudents || 0,
      icon: Users,
      badgeColor: 'bg-blue-100 text-blue-600',
      view: 'students'
    },
    {
      title: 'الأقسام',
      value: stats?.totalClasses || 0,
      icon: School,
      badgeColor: 'bg-emerald-100 text-emerald-600',
      view: 'classes'
    },
    {
      title: 'نسبة الحضور',
      value: `${stats?.attendanceRate || 0}%`,
      icon: CheckCircle2,
      badgeColor: 'bg-amber-100 text-amber-600',
      view: 'attendance'
    },
    {
      title: 'حالات الدعم',
      value: stats?.needingSupport || 0,
      icon: AlertTriangle,
      badgeColor: 'bg-rose-100 text-rose-600',
      view: 'difficulties'
    },
    {
      title: 'إنجاز الواجبات',
      value: `${stats?.homeworkRate || 0}%`,
      icon: BookOpen,
      badgeColor: 'bg-indigo-100 text-indigo-600',
      view: 'assignments'
    },
    {
      title: 'مستويات في تحسن',
      value: stats?.improvedCount || 0,
      icon: TrendingUp,
      badgeColor: 'bg-teal-100 text-teal-600',
      view: 'placements'
    },
    {
      title: 'الوثائق والموارد',
      value: stats?.totalDocs || 0,
      icon: Files,
      badgeColor: 'bg-purple-100 text-purple-600',
      view: 'documents'
    },
    {
      title: 'نقاط القوة المسجلة',
      value: stats?.totalStrengths || 0,
      icon: Award,
      badgeColor: 'bg-sky-100 text-sky-600',
      view: 'strengths'
    }
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 8 Stats Cards Grid - Geometric Balance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigate(card.view)}
              className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-3.5 sm:gap-4 cursor-pointer hover:shadow-md hover:border-slate-200 transition-all group"
            >
              <div className={`w-11 h-11 sm:w-12 sm:h-12 ${card.badgeColor} rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-slate-500 font-medium truncate">{card.title}</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: 2 Cols Left (Actions + Activities) & 1 Col Right (Alerts + Quote) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions Card */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-sm sm:text-base font-bold mb-4 flex items-center gap-2 text-slate-800">
              <span className="text-amber-500">⚡</span> إجراءات سريعة
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button
                onClick={() => (onOpenStudentModal ? onOpenStudentModal() : onNavigate('students'))}
                className="flex items-center justify-center gap-2 py-3 px-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors text-xs sm:text-sm shadow-2xs"
              >
                <span>➕</span>
                <span>إضافة متعلم</span>
              </button>
              <button
                onClick={() => onNavigate('attendance')}
                className="flex items-center justify-center gap-2 py-3 px-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors text-xs sm:text-sm shadow-2xs"
              >
                <span>📝</span>
                <span>تسجيل الحضور</span>
              </button>
              <button
                onClick={() => onNavigate('placements')}
                className="flex items-center justify-center gap-2 py-3 px-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors text-xs sm:text-sm shadow-2xs"
              >
                <span>📊</span>
                <span>إجراء موضعة</span>
              </button>
              <button
                onClick={() => onNavigate('students')}
                className="flex items-center justify-center gap-2 py-3 px-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors text-xs sm:text-sm"
              >
                <span>📤</span>
                <span>استيراد مسار (CSV)</span>
              </button>
              <button
                onClick={() => onNavigate('reports')}
                className="flex items-center justify-center gap-2 py-3 px-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors text-xs sm:text-sm"
              >
                <span>📑</span>
                <span>تقرير القسم</span>
              </button>
              <button
                onClick={() => onNavigate('documents')}
                className="flex items-center justify-center gap-2 py-3 px-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors text-xs sm:text-sm"
              >
                <span>📂</span>
                <span>إضافة وثيقة</span>
              </button>
            </div>
          </section>

          {/* Recent Activity Log Section */}
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-sm sm:text-base font-bold mb-4 flex items-center justify-between text-slate-800">
              <span>آخر الأنشطة والعمليات</span>
              <button
                onClick={() => onNavigate('settings')}
                className="text-blue-600 hover:text-blue-700 text-xs font-medium transition-colors"
              >
                عرض الكل
              </button>
            </h3>
            <div className="space-y-3">
              {activities.length === 0 ? (
                <p className="text-center py-6 text-xs text-slate-400">
                  لا توجد عمليات مسجلة حتى الآن.
                </p>
              ) : (
                activities.slice(0, 5).map((act, index) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl transition-colors hover:bg-slate-100/70"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        index % 3 === 0 ? 'bg-blue-500' : index % 3 === 1 ? 'bg-emerald-500' : 'bg-amber-500'
                      }`} />
                      <div className="text-right truncate">
                        <p className="text-xs sm:text-sm font-semibold text-slate-700 truncate">{act.action}</p>
                        <p className="text-[11px] text-slate-500 truncate">{act.details}</p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0 mr-2">
                      {new Date(act.created_at).toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right 1 Column: Pedagogical Alerts + Educational Tip */}
        <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold mb-4 flex items-center justify-between text-slate-800">
              <span className="flex items-center gap-2">
                <span className="text-rose-500">🔔</span> تنبيهات تربوية
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {alerts.length} تنبيهات
              </span>
            </h3>

            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="p-4 bg-emerald-50 border-r-4 border-emerald-400 rounded-lg">
                  <p className="text-xs font-bold text-emerald-800 mb-0.5">الوضعية ممتازة</p>
                  <p className="text-[11px] text-emerald-700">لا توجد تنبيهات مقلقة حالياً؛ وضعية الأقسام والمتعلمين منتظمة ومستقرة.</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border-r-4 transition-all ${
                      alert.type === 'danger'
                        ? 'bg-rose-50 border-rose-400 text-rose-900'
                        : alert.type === 'warning'
                        ? 'bg-amber-50 border-amber-400 text-amber-900'
                        : 'bg-blue-50 border-blue-400 text-blue-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs sm:text-sm font-bold mb-1 leading-snug">
                        {alert.title}
                      </p>
                      {alert.link && (
                        <button
                          onClick={() => onNavigate('students')}
                          className="text-[11px] font-semibold underline shrink-0 hover:opacity-80"
                        >
                          معاينة
                        </button>
                      )}
                    </div>
                    <p className="text-xs leading-relaxed opacity-90">{alert.desc}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Educational Quote Card */}
          <div className="mt-6 p-4 border border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
            <p className="text-xs text-slate-400 mb-1.5 font-medium">نصيحة اليوم التربوية:</p>
            <p className="text-xs sm:text-sm italic text-slate-600 text-center leading-relaxed">
              «التحفيز الإيجابي هو المفتاح الأول لمعالجة صعوبات التعلم وبناء الثقة في النفس.»
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
