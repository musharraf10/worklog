import { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import SyncStatus from '../worklogs/SyncStatus';
import SharePortalModal from '../share/SharePortalModal';
import shareLinkService from '../../services/shareLinkService';
import { subscribeToRemarksUpdated } from '../../utils/storageUtils';

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [unreadRemarks, setUnreadRemarks] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const res = await shareLinkService.getUnreadRemarksCount();
        if (isMounted && res && typeof res.unreadCount === 'number') {
          setUnreadRemarks(res.unreadCount);
        }
      } catch (err) {
        // Silently catch in header
      }
    };

    fetchUnread();
    const unsubscribe = subscribeToRemarksUpdated(() => {
      fetchUnread();
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleRemarksClick = () => {
    if (location.pathname === '/dashboard') {
      const el = document.getElementById('manager-remarks');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate('/dashboard#manager-remarks');
    }
  };

  const title = PAGE_TITLES[location.pathname] || 'Work Log';

  return (
    <>
      <header className="min-w-0 shrink-0 bg-brand-light/95 backdrop-blur-xs border-b border-brand-primary/20 px-3 sm:px-6 flex items-center justify-between gap-2 sticky top-0 z-30 h-16">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
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

          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-brand-dark tracking-tight truncate">{title}</h1>
          </div>
        </div>

        <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 min-w-0 shrink-0">
          {/* Manager Remarks Indicator */}
          <button
            type="button"
            onClick={handleRemarksClick}
            className="relative p-2 rounded-lg text-brand-dark/80 hover:text-brand-dark hover:bg-brand-soft/40 transition-colors shrink-0"
            title={unreadRemarks > 0 ? `${unreadRemarks} unread manager remarks` : 'Manager Remarks'}
            aria-label="Manager Remarks"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            {unreadRemarks > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-amber-600 rounded-full ring-2 ring-brand-light">
                {unreadRemarks > 99 ? '99+' : unreadRemarks}
              </span>
            )}
          </button>

          {/* Share Portal Button */}
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg bg-brand-primary text-brand-dark text-xs sm:text-sm font-bold shadow-xs hover:bg-brand-primary/90 transition-colors shrink-0"
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
            className="hidden md:inline-flex items-center gap-1.5 px-2 lg:px-3 py-1.5 rounded-lg bg-brand-soft/50 hover:bg-brand-soft text-brand-dark text-xs lg:text-sm font-semibold border border-brand-primary/40 transition-colors shrink-0"
            title="Open Manager View (Spreadsheet)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 4h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Manager View
          </Link>

          <div className="shrink-0 [&>div]:px-2 [&>div]:sm:px-3 [&>div]:gap-1.5"><SyncStatus compact showSyncButton /></div>

          <Link
            to="/profile"
            className="flex items-center gap-2 p-1 sm:px-2 lg:px-3 sm:py-1.5 rounded-lg hover:bg-brand-soft/40 transition-colors shrink-0 min-w-0"
            title="Go to profile"
          >
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover border border-brand-primary/40 flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-brand-soft text-brand-dark font-bold text-sm flex items-center justify-center border border-brand-primary/40 flex-shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <span className="inline-block min-w-0 max-w-[72px] sm:max-w-[100px] lg:max-w-[140px] truncate text-xs sm:text-sm font-semibold text-brand-dark">
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
