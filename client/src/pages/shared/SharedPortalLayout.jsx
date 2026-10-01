import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import sharedPortalService from '../../services/sharedPortalService';
import SharedDashboard from './SharedDashboard';
import SharedWorkLogs from './SharedWorkLogs';
import SharedMentorLogs from './SharedMentorLogs';
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
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'worklogs' | 'mentorlogs' | 'weekly' | 'monthly'
  const [portalMeta, setPortalMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorState, setErrorState] = useState(null); // { code, message }
  const [remarks, setRemarks] = useState([]);

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
        <div className="max-w-md w-full bg-brand-light border border-brand-primary/30 rounded-3xl p-8 text-center shadow-xl space-y-4">
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

          <h2 className="text-2xl font-extrabold text-brand-dark">
            {isExpired
              ? 'This shared portal link has expired.'
              : isRevoked
              ? 'This shared portal link has been revoked.'
              : 'Shared Portal Inaccessible'}
          </h2>

          <p className="text-sm text-brand-dark/70 font-medium">
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

  return (
    <div className="min-h-screen bg-brand-light font-sans text-brand-dark flex flex-col">
      {/* 1. TOP BANNER: Shared Portal — Read Only | Remarks Enabled */}
      <div className="bg-brand-dark text-brand-light px-4 py-3 sm:px-6 shadow-sm border-b border-brand-primary/30 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-extrabold uppercase tracking-wider">
              Shared Portal — Read Only
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Remarks Enabled
            </span>
            <span className="text-xs sm:text-sm font-semibold text-brand-light/85 truncate">
              Viewing Work Log of <strong className="text-brand-light">{owner?.name || 'User'}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-brand-light/75 self-start sm:self-auto">
            {portalMeta?.expiresAt && (
              <span className="flex items-center gap-1 font-medium bg-brand-light/10 px-2.5 py-1 rounded-lg">
                <svg className="w-3.5 h-3.5 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {remainingTimeStr}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. PORTAL NAVIGATION BAR */}
      <div className="bg-brand-light/95 backdrop-blur-xs border-b border-brand-primary/20 px-4 sm:px-6 py-2.5 sticky top-[49px] z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          {/* Brand mark & Owner identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-dark flex items-center justify-center text-brand-light font-extrabold text-base shadow-xs shrink-0">
              W
            </div>
            <div className="text-left">
              <h1 className="text-base sm:text-lg font-bold text-brand-dark leading-tight">
                {owner?.name ? `${owner.name}'s Portal` : 'Work Log Portal'}
              </h1>
              <p className="text-xs text-brand-dark/65 font-medium leading-none mt-0.5">
                {owner?.email || ''}
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'worklogs', label: 'Work Logs' },
              { id: 'mentorlogs', label: 'Mentor Logs' },
              { id: 'weekly', label: 'Weekly Report' },
              { id: 'monthly', label: 'Monthly Report' },
            ].map((tab) => (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-brand-primary text-brand-dark shadow-xs'
                    : 'text-brand-dark/75 hover:bg-brand-soft/50 hover:text-brand-dark'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

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
      <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 max-w-7xl mx-auto w-full">
        {activeTab === 'dashboard' && (
          <SharedDashboard
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
