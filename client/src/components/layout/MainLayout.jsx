import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import SyncStatus from '../worklogs/SyncStatus';

export const MainLayout = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('worklog_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('worklog_sidebar_collapsed', String(next));
      } catch (err) {
        console.warn('Could not save sidebar collapsed preference:', err);
      }
      return next;
    });
  };

  return (
    <div className="flex h-screen w-full bg-brand-light overflow-hidden font-sans text-brand-dark">
      {/* Desktop Collapsible Sidebar */}
      <div className="hidden lg:block h-full shrink-0">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
        />
      </div>

      {/* Mobile Drawer Backdrop and Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-brand-dark/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative z-10 w-64 h-full bg-brand-light shadow-xl animate-in slide-in-from-left duration-200">
            <Sidebar onClose={() => setIsMobileSidebarOpen(false)} isCollapsed={false} />
          </div>
        </div>
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <Header onOpenSidebar={() => setIsMobileSidebarOpen(true)} />

        {/* Global Offline / Pending Sync Notification Banner if active */}
        <div className="px-4 sm:px-6">
          <SyncStatus compact={false} showSyncButton />
        </div>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-6 focus:outline-none">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
