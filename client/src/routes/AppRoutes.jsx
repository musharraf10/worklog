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
import NotFound from '../pages/NotFound';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

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
        <Route path="/reports/weekly" element={<WeeklyReport />} />
        <Route path="/reports/monthly" element={<MonthlyReport />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
