import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Dashboard from '../pages/Dashboard';
import DailyLogs from '../pages/DailyLogs';
import WeeklyReport from '../pages/WeeklyReport';
import MonthlyReport from '../pages/MonthlyReport';
import Profile from '../pages/Profile';
import ManagerView from '../pages/ManagerView';
import MentorLogs from '../pages/MentorLogs';
import { lazy, Suspense } from 'react';
import SharedPortalLayout from '../pages/shared/SharedPortalLayout';
import NotFound from '../pages/NotFound';

const SharedImpactPortal = lazy(() => import('../pages/shared/SharedImpactPortal'));
const ImpactAchievements = lazy(() => import('../pages/ImpactAchievements'));

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Public Shared Impact Portal */}
      <Route
        path="/shared-impact/:token"
        element={
          <Suspense fallback={<div className="min-h-screen bg-brand-light flex items-center justify-center p-6 text-brand-dark font-semibold text-sm">Loading shared appraisal portal...</div>}>
            <SharedImpactPortal />
          </Suspense>
        }
      />

      {/* Public Shared Portal (no login required, secured by random token hash) */}
      <Route path="/shared/:token/*" element={<SharedPortalLayout />} />
      <Route path="/shared/:token" element={<SharedPortalLayout />} />

      {/* Standalone Full-Screen Manager View (no sidebar, no header) */}
      <Route
        path="/manager-view"
        element={
          <ProtectedRoute>
            <ManagerView />
          </ProtectedRoute>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/worklogs" element={<DailyLogs />} />
        <Route path="/mentor-logs" element={<MentorLogs />} />
        <Route
          path="/impact"
          element={
            <Suspense fallback={<div className="p-12 text-center text-sm font-semibold text-brand-dark/60">Loading Impact & Achievements...</div>}>
              <ImpactAchievements />
            </Suspense>
          }
        />
        <Route path="/reports/weekly" element={<WeeklyReport />} />
        <Route path="/reports/monthly" element={<MonthlyReport />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
