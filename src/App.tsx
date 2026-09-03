import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { LoginView } from './components/views/LoginView';
import { DashboardView } from './components/views/DashboardView';
import { StudentsListView } from './components/views/StudentsListView';
import { StudentDetailView } from './components/views/StudentDetailView';
import { ClassesView } from './components/views/ClassesView';
import { PlacementsView } from './components/views/PlacementsView';
import { DifficultiesView } from './components/views/DifficultiesView';
import { StrengthsView } from './components/views/StrengthsView';
import { AttendanceView } from './components/views/AttendanceView';
import { AssignmentsView } from './components/views/AssignmentsView';
import { AssessmentsView } from './components/views/AssessmentsView';
import { DocumentsView } from './components/views/DocumentsView';
import { MediaView } from './components/views/MediaView';
import { ReportsView } from './components/views/ReportsView';
import { SettingsView } from './components/views/SettingsView';
import { api } from './lib/api';
import { SchoolClass } from './types';
import { Loader2 } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [reportParams, setReportParams] = useState<{
    studentId?: string;
    classId?: string;
    type?: 'pedagogical' | 'family' | 'class';
  }>({});

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadClasses();
    }
  }, [user]);

  const loadClasses = async () => {
    try {
      const res = await api.getClasses();
      setClasses(res.classes || []);
    } catch (e) {
      console.error('Failed to load classes:', e);
    }
  };

  const handleNavigate = (view: string, payload?: any) => {
    if (view === 'student-detail' && payload?.studentId) {
      setSelectedStudentId(payload.studentId);
    } else if (view === 'reports' && payload) {
      setReportParams(payload);
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectStudent = (id: string) => {
    setSelectedStudentId(id);
    setCurrentView('student-detail');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
          <p className="text-xs font-bold text-slate-600">جاري تحميل منصة «مساعد الأستاذ»...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-800 antialiased selection:bg-blue-100 selection:text-blue-900 overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => handleNavigate(view)}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Area with Header & Scrollable Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <Header
          onOpenSearch={() => setIsSearchOpen(true)}
          onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onNavigate={(view) => handleNavigate(view)}
        />

        {/* Main Content View Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
            {currentView === 'dashboard' && (
              <DashboardView
                onNavigate={handleNavigate}
                onSelectStudent={handleSelectStudent}
              />
            )}

            {currentView === 'students' && (
              <StudentsListView
                classes={classes}
                onSelectStudent={handleSelectStudent}
              />
            )}

            {currentView === 'student-detail' && selectedStudentId && (
              <StudentDetailView
                studentId={selectedStudentId}
                onBack={() => setCurrentView('students')}
                onOpenReport={(type) => {
                  setReportParams({ studentId: selectedStudentId, type });
                  setCurrentView('reports');
                }}
              />
            )}

            {currentView === 'classes' && (
              <ClassesView
                onSelectClassStudents={() => setCurrentView('students')}
              />
            )}

            {currentView === 'placements' && (
              <PlacementsView classes={classes} />
            )}

            {currentView === 'difficulties' && (
              <DifficultiesView classes={classes} />
            )}

            {currentView === 'strengths' && (
              <StrengthsView classes={classes} />
            )}

            {currentView === 'attendance' && (
              <AttendanceView classes={classes} />
            )}

            {currentView === 'assignments' && (
              <AssignmentsView classes={classes} />
            )}

            {currentView === 'assessments' && (
              <AssessmentsView classes={classes} />
            )}

            {currentView === 'documents' && (
              <DocumentsView
                onSelectStudentProfile={handleSelectStudent}
              />
            )}

            {currentView === 'media' && (
              <MediaView classes={classes} />
            )}

            {currentView === 'reports' && (
              <ReportsView
                classes={classes}
                initialStudentId={reportParams.studentId}
                initialClassId={reportParams.classId}
                initialType={reportParams.type || 'pedagogical'}
              />
            )}

            {currentView === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>

      {/* Global Instant Search Modal (Cmd+K) */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectStudent={handleSelectStudent}
        onSelectDocument={() => setCurrentView('documents')}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
