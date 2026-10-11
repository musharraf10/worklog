import { useState, useEffect } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import impactService from '../../services/impactService';

export const ImpactShareInline = ({
  selectedEventIds = [],
  selectedStudentImpactIds = [],
  reportSnapshot = null,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'manage'
  const [expiryOption, setExpiryOption] = useState('48');
  const [label, setLabel] = useState('Manager Appraisal Review');
  const [includeEvents, setIncludeEvents] = useState(true);
  const [includeStudentImpact, setIncludeStudentImpact] = useState(true);
  const [allowStudentPrivateData, setAllowStudentPrivateData] = useState(false);
  const [allowEvidenceDownload, setAllowEvidenceDownload] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [existingLinks, setExistingLinks] = useState([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [error, setError] = useState('');

  const fetchExistingLinks = async () => {
    setIsLoadingLinks(true);
    try {
      const res = await impactService.getMyShareLinks();
      setExistingLinks(res.data || []);
    } catch (err) {
      console.error('Error fetching share links:', err);
    } finally {
      setIsLoadingLinks(false);
    }
  };

  useEffect(() => {
    fetchExistingLinks();
  }, []);

  const handleCreateShare = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setGeneratedLink(null);

    try {
      const payload = {
        label: label.trim() || 'Manager Appraisal Review',
        expiryHours: Number(expiryOption),
        includeEvents,
        includeStudentImpact,
        selectedEventIds: selectedEventIds.length > 0 ? selectedEventIds : undefined,
        selectedStudentImpactIds:
          selectedStudentImpactIds.length > 0 ? selectedStudentImpactIds : undefined,
        allowStudentPrivateData,
        allowEvidenceDownload,
        reportSummarySnapshot: reportSnapshot,
      };

      const res = await impactService.createShareLink(payload);
      if (res.data) {
        const fullUrl = `${window.location.origin}${res.data.shareUrl}`;
        setGeneratedLink({
          ...res.data,
          fullUrl,
        });
        fetchExistingLinks();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create share link');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!generatedLink?.fullUrl) return;
    navigator.clipboard.writeText(generatedLink.fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRevoke = async (linkId) => {
    try {
      await impactService.revokeShareLink(linkId);
      fetchExistingLinks();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to revoke link');
    }
  };

  return (
    <div className="bg-brand-light border border-brand-primary/30 rounded-2xl p-4 sm:p-6 shadow-xs text-left space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-brand-primary/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-soft flex items-center justify-center text-brand-dark shadow-xs shrink-0">
            <svg className="w-5 h-5 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-brand-dark">Manager Read-Only Appraisal Sharing</h2>
            <p className="text-sm text-brand-dark/70 mt-0.5">
              Generate secure, time-limited read-only links for executive appraisals.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-semibold text-brand-dark/80 hover:text-brand-dark px-3 py-1.5 rounded-lg bg-brand-soft/40 hover:bg-brand-soft transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-brand-primary/15 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('create')}
          className={`pb-2 border-b-2 transition-colors ${
            activeTab === 'create'
              ? 'border-brand-dark text-brand-dark font-bold'
              : 'border-transparent text-brand-dark/60 hover:text-brand-dark'
          }`}
        >
          Create Share Link
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('manage')}
          className={`pb-2 border-b-2 transition-colors ${
            activeTab === 'manage'
              ? 'border-brand-dark text-brand-dark font-bold'
              : 'border-transparent text-brand-dark/60 hover:text-brand-dark'
          }`}
        >
          Active Links ({existingLinks.filter((l) => l.status === 'active').length})
        </button>
      </div>

      {error && (
        <div className="p-3 bg-brand-soft border border-brand-dark/30 rounded-xl text-xs font-semibold text-brand-dark">
          {error}
        </div>
      )}

      {activeTab === 'create' ? (
        <form onSubmit={handleCreateShare} className="space-y-4">
          {/* Generated Link Alert */}
          {generatedLink && (
            <div className="p-4 bg-brand-soft border border-brand-primary/40 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-brand-dark">
                <span>Share Link Ready</span>
                <span>Expires in {expiryOption} hours</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLink.fullUrl}
                  className="flex-1 px-3 py-2 bg-brand-light rounded-lg border border-brand-primary/30 text-xs text-brand-dark font-mono select-all"
                />
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleCopy}
                >
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
              </div>
              <p className="text-[11px] text-brand-dark/75">
                Anyone with this link can view the authorized records in read-only mode until expiration.
              </p>
            </div>
          )}

          <div>
            <Input
              label="Share Label / Appraisal Purpose"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Annual Performance Review 2026"
            />
          </div>

          <div>
            <span className="text-sm font-semibold text-brand-dark tracking-wide block mb-1.5">
              Access Duration
            </span>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '24 Hours', val: '24' },
                { label: '48 Hours', val: '48' },
                { label: '7 Days', val: '168' },
                { label: '30 Days', val: '720' },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => setExpiryOption(item.val)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-colors ${
                    expiryOption === item.val
                      ? 'bg-brand-dark text-brand-light border-brand-dark shadow-xs'
                      : 'bg-brand-light text-brand-dark border-brand-dark/20 hover:bg-brand-soft'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy & Safeguards Box */}
          <div className="p-3.5 bg-brand-soft/30 rounded-xl border border-brand-primary/20 space-y-2 text-xs">
            <span className="font-bold text-brand-dark uppercase tracking-wider block">
              Sharing Scope & Privacy Safeguards
            </span>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-brand-dark">
              <input
                type="checkbox"
                checked={includeEvents}
                onChange={(e) => setIncludeEvents(e.target.checked)}
                className="w-4 h-4 text-brand-primary rounded accent-brand-primary"
              />
              <span>Include Events & Initiatives ({selectedEventIds.length > 0 ? `${selectedEventIds.length} Selected` : 'All'})</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-brand-dark">
              <input
                type="checkbox"
                checked={includeStudentImpact}
                onChange={(e) => setIncludeStudentImpact(e.target.checked)}
                className="w-4 h-4 text-brand-primary rounded accent-brand-primary"
              />
              <span>Include Student Impact ({selectedStudentImpactIds.length > 0 ? `${selectedStudentImpactIds.length} Selected` : 'All'})</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-brand-dark">
              <input
                type="checkbox"
                checked={allowEvidenceDownload}
                onChange={(e) => setAllowEvidenceDownload(e.target.checked)}
                className="w-4 h-4 text-brand-primary rounded accent-brand-primary"
              />
              <span>Allow Manager to view and download attached proof documents</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-brand-dark pt-1 border-t border-brand-primary/10">
              <input
                type="checkbox"
                checked={allowStudentPrivateData}
                onChange={(e) => setAllowStudentPrivateData(e.target.checked)}
                className="w-4 h-4 text-brand-primary rounded accent-brand-primary"
              />
              <div>
                <span className="block font-semibold">
                  Authorize full student private records
                </span>
                <span className="text-[11px] text-brand-dark/60 block">
                  (When unchecked, private student identities and sensitive challenges remain masked)
                </span>
              </div>
            </label>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
            >
              Generate Share Link
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          {isLoadingLinks ? (
            <div className="text-center py-6 text-xs font-semibold text-brand-dark/60">
              Loading share links...
            </div>
          ) : existingLinks.length === 0 ? (
            <div className="text-center py-6 text-xs font-semibold text-brand-dark/60">
              No share links created yet.
            </div>
          ) : (
            existingLinks.map((link) => (
              <div
                key={link._id}
                className="p-3.5 rounded-xl border border-brand-primary/20 bg-brand-soft/25 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-brand-dark truncate text-sm">
                      {link.label}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        link.status === 'active'
                          ? 'bg-brand-soft border border-brand-primary text-brand-dark'
                          : 'bg-brand-dark/10 text-brand-dark/70'
                      }`}
                    >
                      {link.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-brand-dark/60 mt-0.5">
                    Expires: {new Date(link.expiresAt).toLocaleString()}
                    {link.lastAccessedAt && (
                      <span> • Last viewed: {new Date(link.lastAccessedAt).toLocaleDateString()}</span>
                    )}
                  </p>
                </div>

                {link.status === 'active' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevoke(link._id)}
                  >
                    Revoke Link
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ImpactShareInline;
