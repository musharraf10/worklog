import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import sharedPortalService from '../../services/sharedPortalService';
import SharedDashboard from './SharedDashboard';
import SharedWorkLogs from './SharedWorkLogs';
import SharedMentorLogs from './SharedMentorLogs';
import SharedManagerView from './SharedManagerView';
import SharedWeeklyReport from './SharedWeeklyReport';
import SharedMonthlyReport from './SharedMonthlyReport';
import AddRemarkModal from '../../components/share/AddRemarkModal';
import Loader from '../../components/common/Loader';

const computeRemainingTime = (expiresAt) => {
  if (!expiresAt) return '';
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h remaining`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }
  return `${minutes}m remaining`;
};

export const SharedPortalLayout = () => {
  const { token } = useParams();
  const location = useLocation();

  const initialTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/manager-view') || path.includes('/managerview')) {
      return 'managerview';
    }
    if (path.includes('/worklogs') || path.includes('/work-logs')) {
      return 'worklogs';
    }
    if (path.includes('/mentorlogs') || path.includes('/mentor-logs')) {
      return 'mentorlogs';
    }
    if (path.includes('/weekly')) {
      return 'weekly';
    }
    if (path.includes('/monthly')) {
      return 'monthly';
    }
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (
      tabParam &&
      ['dashboard', 'managerview', 'worklogs', 'mentorlogs', 'weekly', 'monthly'].includes(
        tabParam.toLowerCase(),
      )
    ) {
      return tabParam.toLowerCase();
    }
    return 'dashboard';
  }, [location.pathname, location.search]);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [portalMeta, setPortalMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorState, setErrorState] = useState(null); // { code, message }
  const [remarks, setRemarks] = useState([]);

  // Mobile menu dropdown open state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeStatusHint, setActiveStatusHint] = useState(null);

  // Add remark modal state
  const [remarkModal, setRemarkModal] = useState({
    isOpen: false,
    targetType: 'WorkLog',
    targetId: '',
    targetTitle: '',
  });
  const [isSubmittingRemark, setIsSubmittingRemark] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const fetchRemarks = useCallback(async () => {
    if (!token) return;
    try {
      const res = await sharedPortalService.getRemarks(token);
      setRemarks(res.data || []);
    } catch (err) {
      console.warn('Could not fetch remarks:', err);
    }
  }, [token]);

  useEffect(() => {
    let isMounted = true;

    const verifyPortal = async () => {
      setIsLoading(true);
      setErrorState(null);

      try {
        const res = await sharedPortalService.verifyToken(token);
        if (isMounted) {
          setPortalMeta(res.data);
          fetchRemarks();
        }
      } catch (err) {
        if (isMounted) {
          const resData = err.response?.data;
          setErrorState({
            code: resData?.code || 'ERROR',
            message:
              resData?.message ||
              err.message ||
              'Unable to access this shared portal.',
          });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    verifyPortal();

    return () => {
      isMounted = false;
    };
  }, [token, fetchRemarks]);

  const remarksByTarget = useMemo(() => {
    const map = {};
    for (const r of remarks) {
      if (!map[r.targetId]) {
        map[r.targetId] = [];
      }
      map[r.targetId].push(r);
    }
    return map;
  }, [remarks]);

  const handleOpenAddRemark = (target) => {
    setRemarkModal({
      isOpen: true,
      targetType: target.targetType || 'WorkLog',
      targetId: target.targetId,
      targetTitle: target.targetTitle || '',
    });
  };

  const handleCloseAddRemark = () => {
    setRemarkModal((prev) => ({ ...prev, isOpen: false }));
  };

  const handleSubmitRemark = async ({ remark, authorName }) => {
    setIsSubmittingRemark(true);
    try {
      const res = await sharedPortalService.addRemark(token, {
        targetType: remarkModal.targetType,
        targetId: remarkModal.targetId,
        remark,
        authorName,
      });

      const newRemark = res.data;
      setRemarks((prev) => [newRemark, ...prev]);

      setToastMessage('Remark submitted successfully');
      setTimeout(() => setToastMessage(''), 3000);
    } finally {
      setIsSubmittingRemark(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-light flex items-center justify-center p-4">
        <Loader text="Verifying shared portal access..." />
      </div>
    );
  }

  // Handle Expiration, Revocation, or Invalid Link
  if (errorState) {
    const isExpired =
      errorState.code === 'LINK_EXPIRED' ||
      /expired/i.test(errorState.message);
    const isRevoked =
      errorState.code === 'LINK_REVOKED' ||
      /revoked/i.test(errorState.message);

    return (
      <div className="min-h-screen bg-brand-light flex items-center justify-center p-4 text-brand-dark">
        <div className="max-w-md w-full bg-brand-light border border-brand-primary/30 rounded-3xl p-6 sm:p-8 text-center shadow-xl space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-700">
            {isExpired ? (
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : isRevoked ? (
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-brand-dark">
            {isExpired
              ? 'This shared portal link has expired.'
              : isRevoked
              ? 'This shared portal link has been revoked.'
              : 'Shared Portal Inaccessible'}
          </h2>

          <p className="text-xs sm:text-sm text-brand-dark/70 font-medium">
            {isExpired
              ? 'The manager review period for this link has ended. Please contact the portal owner to generate a new share link.'
              : isRevoked
              ? 'The owner has terminated access for this shared link. Please contact the owner if you require access.'
              : errorState.message}
          </p>

          <div className="pt-2">
            <span className="text-xs text-brand-dark/50">
              Work Log Portal • Secure Read-Only Access
            </span>
          </div>
        </div>
      </div>
    );
  }

  const owner = portalMeta?.owner;
  const remainingTimeStr = computeRemainingTime(portalMeta?.expiresAt);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'managerview', label: 'Manager View' },
    { id: 'worklogs', label: 'Work Logs' },
    { id: 'mentorlogs', label: 'Mentor Logs' },
    { id: 'weekly', label: 'Weekly Report' },
    { id: 'monthly', label: 'Monthly Report' },
  ];

  const currentTabLabel = tabs.find((t) => t.id === activeTab)?.label || 'Dashboard';

  return (
    <div className="min-h-screen bg-brand-light font-sans text-brand-dark flex flex-col w-full overflow-x-hidden">
      {/* 1. HIERARCHY LEVEL 1: TOP BANNER (Shared Access, Expiry, Remarks Permission) */}
      <header className="bg-brand-dark text-brand-light px-4 py-3 sm:px-6 shadow-sm border-b border-brand-primary/30 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <div className="group relative">
            <button type="button" title="Shared Portal — Read Only" aria-label="Shared Portal — Read Only" aria-expanded={activeStatusHint === 'access'} onClick={() => setActiveStatusHint(activeStatusHint === 'access' ? null : 'access')} className="min-h-8 inline-flex items-center px-2.5 py-1 rounded-md bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-extrabold uppercase tracking-wider">
              <span className="hidden sm:inline">Shared Portal — Read Only</span><span className="sm:hidden">Read-only</span>
            </button>
            {activeStatusHint === 'access' && <span role="tooltip" className="absolute left-0 top-full z-50 mt-2 w-max max-w-[calc(100vw-2rem)] rounded-lg bg-brand-light px-3 py-2 text-xs font-semibold text-brand-dark shadow-lg">Shared Portal — Read Only</span>}
          </div>
          <div className="group relative">
            <button type="button" title="Remarks Enabled" aria-label="Remarks Enabled" aria-expanded={activeStatusHint === 'remarks'} onClick={() => setActiveStatusHint(activeStatusHint === 'remarks' ? null : 'remarks')} className="min-h-8 inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold uppercase tracking-wider gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="hidden sm:inline">Remarks Enabled</span><span className="sm:hidden">Remarks</span>
            </button>
            {activeStatusHint === 'remarks' && <span role="tooltip" className="absolute left-0 top-full z-50 mt-2 w-max max-w-[calc(100vw-2rem)] rounded-lg bg-brand-light px-3 py-2 text-xs font-semibold text-brand-dark shadow-lg">Remarks are enabled for this portal</span>}
          </div>
          <div className="group relative">
            <button type="button" title={`Viewing Work Log of ${owner?.name || 'User'}`} aria-label={`Viewing Work Log of ${owner?.name || 'User'}`} aria-expanded={activeStatusHint === 'viewer'} onClick={() => setActiveStatusHint(activeStatusHint === 'viewer' ? null : 'viewer')} className="min-h-8 inline-flex items-center gap-1.5 rounded-lg bg-brand-light/10 px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-brand-light/90 max-w-full">
              <svg className="h-3.5 w-3.5 shrink-0 text-brand-light/70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              <span className="truncate">Viewing: {owner?.name || 'User'}</span>
            </button>
            {activeStatusHint === 'viewer' && <span role="tooltip" className="absolute left-0 top-full z-50 mt-2 w-max max-w-[calc(100vw-2rem)] rounded-lg bg-brand-light px-3 py-2 text-xs font-semibold text-brand-dark shadow-lg">Viewing Work Log of {owner?.name || 'User'}</span>}
          </div>
          {portalMeta?.expiresAt && (
            <div className="group relative sm:ml-auto">
              <button type="button" title={`Access expires in ${remainingTimeStr}`} aria-label={`Access expires in ${remainingTimeStr}`} aria-expanded={activeStatusHint === 'expiry'} onClick={() => setActiveStatusHint(activeStatusHint === 'expiry' ? null : 'expiry')} className="min-h-8 inline-flex items-center gap-1.5 font-medium bg-brand-light/10 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm text-brand-light/75">
                <svg className="w-3.5 h-3.5 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="sm:hidden">{remainingTimeStr.replace(' remaining', '')}</span><span className="hidden sm:inline">{remainingTimeStr}</span>
              </button>
              {activeStatusHint === 'expiry' && <span role="tooltip" className="absolute right-0 top-full z-50 mt-2 w-max max-w-[calc(100vw-2rem)] rounded-lg bg-brand-light px-3 py-2 text-xs font-semibold text-brand-dark shadow-lg">Access expires in {remainingTimeStr}</span>}
            </div>
          )}
        </div>
      </header>

      {/* 2. HIERARCHY LEVEL 2: PORTAL IDENTITY AND NAVIGATION */}
      <nav
        aria-label="Portal Navigation"
        className="bg-brand-light/95 backdrop-blur-xs border-b border-brand-primary/20 px-4 sm:px-6 py-2.5 sticky top-[88px] sm:top-[49px] z-30"
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Brand mark & Owner identity */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-brand-dark flex items-center justify-center text-brand-light font-extrabold text-sm sm:text-base shadow-xs shrink-0">
                W
              </div>
              <div className="text-left">
                <h1 className="text-sm sm:text-base font-bold text-brand-dark leading-tight">
                  {owner?.name ? `${owner.name}'s Portal` : 'Work Log Portal'}
                </h1>
                <p className="text-[11px] sm:text-xs text-brand-dark/65 font-medium leading-none mt-0.5 truncate max-w-[220px] sm:max-w-xs">
                  {owner?.email || 'Shared Access'}
                </p>
              </div>
            </div>

            {/* Mobile Dropdown Menu Toggle */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden flex items-center gap-1 px-3 py-1.5 rounded-xl border border-brand-primary/30 bg-brand-soft/60 text-xs font-bold text-brand-dark"
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              <span>{currentTabLabel}</span>
              <svg className="w-4 h-4 ml-0.5 text-brand-dark/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          {/* Desktop Navigation Tabs */}
          <div className="hidden md:flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const isManagerView = tab.id === 'managerview';

              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 min-h-[38px] flex items-center gap-1.5 ${
                    isActive
                      ? isManagerView
                        ? 'bg-brand-dark text-brand-light shadow-xs ring-1 ring-brand-primary/50'
                        : 'bg-brand-primary text-brand-dark shadow-xs'
                      : isManagerView
                      ? 'bg-brand-soft/80 text-brand-dark border border-brand-primary/30 hover:bg-brand-soft'
                      : 'text-brand-dark/75 hover:bg-brand-soft/50 hover:text-brand-dark'
                  }`}
                >
                  {isManagerView && (
                    <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mobile Collapsible Navigation Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden grid grid-cols-2 gap-1.5 pt-2 pb-1 border-t border-brand-primary/20 animate-in fade-in slide-in-from-top-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold text-center transition-all ${
                      isActive
                        ? 'bg-brand-dark text-brand-light shadow-xs'
                        : 'bg-brand-soft/40 text-brand-dark/80 hover:bg-brand-soft'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-brand-dark text-brand-light px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-brand-primary/40 animate-in fade-in slide-in-from-bottom-2">
          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 3. MAIN WORKSPACE CONTENT */}
      <main className="flex-1 px-3.5 py-5 sm:px-6 sm:py-8 max-w-7xl mx-auto w-full">
        {activeTab === 'dashboard' && (
          <SharedDashboard
            token={token}
            onAddRemark={handleOpenAddRemark}
            remarksByTarget={remarksByTarget}
            onNavigateTab={setActiveTab}
          />
        )}
        {activeTab === 'managerview' && (
          <SharedManagerView
            token={token}
            onAddRemark={handleOpenAddRemark}
            remarksByTarget={remarksByTarget}
          />
        )}
        {activeTab === 'worklogs' && (
          <SharedWorkLogs
            token={token}
            onAddRemark={handleOpenAddRemark}
            remarksByTarget={remarksByTarget}
          />
        )}
        {activeTab === 'mentorlogs' && (
          <SharedMentorLogs
            token={token}
            onAddRemark={handleOpenAddRemark}
            remarksByTarget={remarksByTarget}
          />
        )}
        {activeTab === 'weekly' && <SharedWeeklyReport token={token} />}
        {activeTab === 'monthly' && <SharedMonthlyReport token={token} />}
      </main>

      {/* Remark Modal */}
      <AddRemarkModal
        isOpen={remarkModal.isOpen}
        onClose={handleCloseAddRemark}
        onSubmit={handleSubmitRemark}
        targetTitle={remarkModal.targetTitle}
        targetType={remarkModal.targetType}
        isSubmitting={isSubmittingRemark}
      />
    </div>
  );
};

export default SharedPortalLayout;
