// Centralized API client for «مساعد الأستاذ»
export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('mosaid_token');
  const headers = new Headers(options.headers || {});
  
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (response.status === 401) {
    localStorage.removeItem('mosaid_token');
    // Dispatch custom event so AuthContext knows immediately
    window.dispatchEvent(new Event('auth:unauthorized'));
    throw new Error('انتهت صلاحية الجلسة، يرجى إعادة تسجيل الدخول');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `خطأ في الخادم (${response.status})`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (credentials: any) => apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  logout: () => apiRequest('/api/auth/logout', { method: 'POST' }),
  getMe: () => apiRequest('/api/auth/me'),
  updateProfile: (profile: any) => apiRequest('/api/auth/profile', { method: 'PUT', body: JSON.stringify(profile) }),
  changePassword: (data: any) => apiRequest('/api/auth/password', { method: 'PUT', body: JSON.stringify(data) }),

  // Dashboard
  getDashboardStats: () => apiRequest('/api/dashboard/stats'),

  // Students
  getStudents: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') q.append(k, String(v));
    });
    return apiRequest(`/api/students?${q.toString()}`);
  },
  getStudent: (id: string) => apiRequest(`/api/students/${id}`),
  createStudent: (data: any) => apiRequest('/api/students', { method: 'POST', body: JSON.stringify(data) }),
  updateStudent: (id: string, data: any) => apiRequest(`/api/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteStudent: (id: string) => apiRequest(`/api/students/${id}`, { method: 'DELETE' }),
  previewCsv: (rows: any[], defaultClassId?: string) => apiRequest('/api/students/csv-preview', { method: 'POST', body: JSON.stringify({ rows, defaultClassId }) }),
  commitCsv: (records: any[], targetClassId?: string) => apiRequest('/api/students/csv-commit', { method: 'POST', body: JSON.stringify({ records, targetClassId }) }),

  // Classes
  getClasses: (includeArchived = false) => apiRequest(`/api/classes?includeArchived=${includeArchived}`),
  createClass: (data: any) => apiRequest('/api/classes', { method: 'POST', body: JSON.stringify(data) }),
  updateClass: (id: string, data: any) => apiRequest(`/api/classes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClass: (id: string) => apiRequest(`/api/classes/${id}`, { method: 'DELETE' }),
  createGroup: (classId: string, data: any) => apiRequest(`/api/classes/${classId}/groups`, { method: 'POST', body: JSON.stringify(data) }),

  // Placements
  getPlacementDomains: () => apiRequest('/api/placements/domains'),
  getPlacements: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams(params as any);
    return apiRequest(`/api/placements?${q.toString()}`);
  },
  createPlacement: (data: any) => apiRequest('/api/placements', { method: 'POST', body: JSON.stringify(data) }),
  batchPlacements: (data: any) => apiRequest('/api/placements/batch', { method: 'POST', body: JSON.stringify(data) }),

  // Difficulties
  getDifficultyCategories: () => apiRequest('/api/difficulties/categories'),
  getDifficulties: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams(params as any);
    return apiRequest(`/api/difficulties?${q.toString()}`);
  },
  createDifficulty: (data: any) => apiRequest('/api/difficulties', { method: 'POST', body: JSON.stringify(data) }),
  updateDifficulty: (id: string, data: any) => apiRequest(`/api/difficulties/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDifficulty: (id: string) => apiRequest(`/api/difficulties/${id}`, { method: 'DELETE' }),
  saveCollectiveDifficulties: (data: any) => apiRequest('/api/difficulties/collective-matrix', { method: 'POST', body: JSON.stringify(data) }),

  // Strengths
  getStrengths: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams(params as any);
    return apiRequest(`/api/strengths?${q.toString()}`);
  },
  createStrength: (data: any) => apiRequest('/api/strengths', { method: 'POST', body: JSON.stringify(data) }),
  deleteStrength: (id: string) => apiRequest(`/api/strengths/${id}`, { method: 'DELETE' }),

  // Attendance
  getMonthlyAttendance: (classId: string, year: number, month: number) =>
    apiRequest(`/api/attendance/month?classId=${classId}&year=${year}&month=${month}`),
  saveAttendanceBatch: (records: any[]) =>
    apiRequest('/api/attendance/batch', { method: 'POST', body: JSON.stringify({ records }) }),
  markDayHoliday: (date: string, classId?: string) =>
    apiRequest('/api/attendance/mark-day-holiday', { method: 'POST', body: JSON.stringify({ date, classId }) }),

  // Holidays
  getHolidays: () => apiRequest('/api/holidays'),
  createHoliday: (data: any) => apiRequest('/api/holidays', { method: 'POST', body: JSON.stringify(data) }),
  deleteHoliday: (id: string) => apiRequest(`/api/holidays/${id}`, { method: 'DELETE' }),

  // Assignments
  getAssignments: (classId?: string) => apiRequest(`/api/assignments${classId ? `?classId=${classId}` : ''}`),
  getAssignment: (id: string) => apiRequest(`/api/assignments/${id}`),
  createAssignment: (data: any) => apiRequest('/api/assignments', { method: 'POST', body: JSON.stringify(data) }),
  updateAssignmentBatchStatus: (id: string, records: any[]) =>
    apiRequest(`/api/assignments/${id}/batch-status`, { method: 'POST', body: JSON.stringify({ records }) }),
  deleteAssignment: (id: string) => apiRequest(`/api/assignments/${id}`, { method: 'DELETE' }),

  // Assessments
  getAssessments: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams(params as any);
    return apiRequest(`/api/assessments?${q.toString()}`);
  },
  createAssessment: (data: any) => apiRequest('/api/assessments', { method: 'POST', body: JSON.stringify(data) }),
  deleteAssessment: (id: string) => apiRequest(`/api/assessments/${id}`, { method: 'DELETE' }),

  // Documents & Folders
  getDocumentCategories: () => apiRequest('/api/documents/categories'),
  getDocuments: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams(params as any);
    return apiRequest(`/api/documents?${q.toString()}`);
  },
  getDocument: (id: string) => apiRequest(`/api/documents/${id}`),
  createDocument: (data: any) => apiRequest('/api/documents', { method: 'POST', body: JSON.stringify(data) }),
  updateDocument: (id: string, data: any) => apiRequest(`/api/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleFavoriteDocument: (id: string) => apiRequest(`/api/documents/${id}/favorite`, { method: 'POST' }),
  linkDocumentToStudent: (docId: string, studentId: string, relationType?: string) =>
    apiRequest(`/api/documents/${docId}/link-student`, { method: 'POST', body: JSON.stringify({ student_id: studentId, relation_type: relationType }) }),
  deleteDocument: (id: string) => apiRequest(`/api/documents/${id}`, { method: 'DELETE' }),

  getFolders: () => apiRequest('/api/folders'),
  createFolder: (name: string, parentId?: string | null) =>
    apiRequest('/api/folders', { method: 'POST', body: JSON.stringify({ name, parent_id: parentId }) }),
  deleteFolder: (id: string) => apiRequest(`/api/folders/${id}`, { method: 'DELETE' }),

  // Reports
  getStudentReport: (studentId: string) => apiRequest(`/api/reports/student/${studentId}`),
  getFamilyReport: (studentId: string) => apiRequest(`/api/reports/family/${studentId}`),
  getClassReport: (classId: string) => apiRequest(`/api/reports/class/${classId}`),

  // Media & Attachments
  getMedia: (params: Record<string, any> = {}) => {
    const q = new URLSearchParams(params as any);
    return apiRequest(`/api/media?${q.toString()}`);
  },
  uploadMedia: (formData: FormData) => apiRequest('/api/media/upload', { method: 'POST', body: formData }),
  deleteMedia: (id: string) => apiRequest(`/api/media/${id}`, { method: 'DELETE' }),

  // Settings & Logs
  getSettings: () => apiRequest('/api/settings'),
  updateSettings: (data: any) => apiRequest('/api/settings', { method: 'POST', body: JSON.stringify(data) }),
  exportBackup: () => apiRequest('/api/settings/backup/json'),
  importBackup: (data: any) => apiRequest('/api/settings/backup/import', { method: 'POST', body: JSON.stringify(data) }),
  getAcademicYears: () => apiRequest('/api/settings/years'),
  createAcademicYear: (data: any) => apiRequest('/api/settings/years', { method: 'POST', body: JSON.stringify(data) }),
  activateAcademicYear: (id: string) => apiRequest(`/api/settings/years/${id}/activate`, { method: 'POST' }),
  getActivityLogs: (limit = 50) => apiRequest(`/api/settings/activity-logs?limit=${limit}`),

  // Search
  globalSearch: (q: string) => apiRequest(`/api/search?q=${encodeURIComponent(q)}`),

  // AI Pedagogical Advice
  getAIPedagogicalAdvice: (data: any) => apiRequest('/api/ai/pedagogical-advice', { method: 'POST', body: JSON.stringify(data) })
};
