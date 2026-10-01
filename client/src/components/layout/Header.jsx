import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import SyncStatus from '../worklogs/SyncStatus';
import SharePortalModal from '../share/SharePortalModal';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/worklogs': 'Work Logs',
  '/mentor-logs': 'Mentor Logs',
  '/reports/weekly': 'Weekly Summary Report',
  '/reports/monthly': 'Monthly Summary Report',
  '/profile': 'My Profile',
};

export const Header = ({ onOpenSidebar }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const title = PAGE_TITLES[location.pathname] || 'Work Log';

  return (
    <>
      <header className="h-16 bg-brand-light/95 backdrop-blur-xs border-b border-brand-primary/20 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="lg:hidden p-2 text-brand-dark/70 hover:text-brand-dark hover:bg-brand-soft/40 rounded-lg"
            aria-label="Open sidebar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div>
            <h1 className="text-lg sm:text-xl font-bold text-brand-dark tracking-tight">{title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3.5">
          {/* Share Portal Button */}
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-primary text-brand-dark text-xs sm:text-sm font-bold shadow-xs hover:bg-brand-primary/90 transition-colors"
            title="Generate secure share link for manager"
          >
            <svg className="w-4 h-4 text-brand-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span className="hidden sm:inline">Share Portal</span>
            <span className="sm:hidden">Share</span>
          </button>

          <Link
            to="/manager-view"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-soft/50 hover:bg-brand-soft text-brand-dark text-xs sm:text-sm font-semibold border border-brand-primary/40 transition-colors"
            title="Open Manager View (Spreadsheet)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 4h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Manager View
          </Link>

          <SyncStatus compact showSyncButton />

          <Link
            to="/profile"
            className="flex items-center gap-2.5 p-1 sm:px-3 sm:py-1.5 rounded-lg hover:bg-brand-soft/40 transition-colors"
            title="Go to profile"
          >
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border border-brand-primary/40"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-soft text-brand-dark font-bold text-sm flex items-center justify-center border border-brand-primary/40">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <span className="hidden md:inline text-sm font-semibold text-brand-dark max-w-[140px] truncate">
              {user?.name || 'Account'}
            </span>
          </Link>
        </div>
      </header>

      <SharePortalModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </>
  );
};

export default Header;
