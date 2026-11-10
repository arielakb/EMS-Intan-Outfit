import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import { ProtectedRoute, GuestRoute } from './components/auth/ProtectedRoute';
import { useAuthStore } from './stores/authStore';
import { OwnerLayout } from './layouts/OwnerLayout';
import { EmployeeLayout } from './layouts/EmployeeLayout';

// Auth pages
import { LoginPage } from './pages/auth/LoginPage';
import { ActivatePage } from './pages/auth/ActivatePage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

// Owner pages
import { OwnerDashboardPage } from './pages/owner/DashboardPage';
import { OwnerEmployeesPage } from './pages/owner/EmployeesPage';
import { OwnerEmployeeDetailPage } from './pages/owner/EmployeeDetailPage';
import { OwnerSchedulePage } from './pages/owner/SchedulePage';
import { OwnerAttendancePage } from './pages/owner/AttendancePage';
import { OwnerLeavePage } from './pages/owner/LeavePage';
import { OwnerSalesPage } from './pages/owner/SalesPage';
import { OwnerBonusPage } from './pages/owner/BonusPage';
import { OwnerPayrollPage } from './pages/owner/PayrollPage';
import { OwnerReportsPage } from './pages/owner/ReportsPage';
import { OwnerNotificationsPage } from './pages/owner/NotificationsPage';
import { OwnerAuditLogPage } from './pages/owner/AuditLogPage';
import { OwnerSettingsPage } from './pages/owner/SettingsPage';

// Employee pages
import { EmployeeDashboardPage } from './pages/employee/DashboardPage';
import { EmployeeAttendancePage } from './pages/employee/AttendancePage';
import { EmployeeSchedulePage } from './pages/employee/SchedulePage';
import { EmployeeLeavePage } from './pages/employee/LeavePage';
import { EmployeeSalesPage } from './pages/employee/SalesPage';
import { EmployeeBonusPage } from './pages/employee/BonusPage';
import { EmployeePayrollPage } from './pages/employee/PayrollPage';
import { EmployeeProfilePage } from './pages/employee/ProfilePage';
import { EmployeeNotificationsPage } from './pages/employee/NotificationsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const RootRedirect: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated && user) {
    return <Navigate to={user.role === 'OWNER' ? '/owner/dashboard' : '/employee/dashboard'} replace />;
  }
  return <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public / Guest routes */}
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          {/* Public (token from URL) */}
          <Route path="/activate" element={<ActivatePage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Owner routes */}
          <Route element={<ProtectedRoute allowedRoles={['OWNER']} />}>
            <Route element={<OwnerLayout />}>
              <Route path="/owner/dashboard" element={<OwnerDashboardPage />} />
              <Route path="/owner/employees" element={<OwnerEmployeesPage />} />
              <Route path="/owner/employees/:id" element={<OwnerEmployeeDetailPage />} />
              <Route path="/owner/schedules" element={<OwnerSchedulePage />} />
              <Route path="/owner/attendance" element={<OwnerAttendancePage />} />
              <Route path="/owner/leaves" element={<OwnerLeavePage />} />
              <Route path="/owner/sales" element={<OwnerSalesPage />} />
              <Route path="/owner/bonuses" element={<OwnerBonusPage />} />
              <Route path="/owner/payroll" element={<OwnerPayrollPage />} />
              <Route path="/owner/reports" element={<OwnerReportsPage />} />
              <Route path="/owner/notifications" element={<OwnerNotificationsPage />} />
              <Route path="/owner/audit-logs" element={<OwnerAuditLogPage />} />
              <Route path="/owner/settings" element={<OwnerSettingsPage />} />
            </Route>
          </Route>

          {/* Employee routes */}
          <Route element={<ProtectedRoute allowedRoles={['EMPLOYEE']} />}>
            <Route element={<EmployeeLayout />}>
              <Route path="/employee/dashboard" element={<EmployeeDashboardPage />} />
              <Route path="/employee/attendance" element={<EmployeeAttendancePage />} />
              <Route path="/employee/schedule" element={<EmployeeSchedulePage />} />
              <Route path="/employee/leaves" element={<EmployeeLeavePage />} />
              <Route path="/employee/sales" element={<EmployeeSalesPage />} />
              <Route path="/employee/bonuses" element={<EmployeeBonusPage />} />
              <Route path="/employee/payroll" element={<EmployeePayrollPage />} />
              <Route path="/employee/profile" element={<EmployeeProfilePage />} />
              <Route path="/employee/notifications" element={<EmployeeNotificationsPage />} />
            </Route>
          </Route>

          {/* Root redirect */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: { fontSize: '14px', maxWidth: '380px' },
          success: { iconTheme: { primary: '#16A34A', secondary: '#fff' } },
          error: { iconTheme: { primary: '#DC2626', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}

