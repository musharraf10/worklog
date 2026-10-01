import { useState, useEffect } from 'react';
import shareLinkService from '../../services/shareLinkService';

export const SharePortalModal = ({ isOpen, onClose }) => {
  const [expiryOption, setExpiryOption] = useState('24'); // '1' | '6' | '24' | '168' | 'custom'
  const [customExpiry, setCustomExpiry] = useState('');
  const [label, setLabel] = useState('Manager Access');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [links, setLinks] = useState([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'manage'

  const fetchLinks = async () => {
    setIsLoadingLinks(true);
    try {
      const res = await shareLinkService.getMyShareLinks();
      setLinks(res.data || []);
    } catch (err) {
      console.error('Error fetching share links:', err);
    } finally {
      setIsLoadingLinks(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLinks();
      setGeneratedLink(null);
      setError('');
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerate = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    setError('');

    try {
      const payload = { label: label.trim() || 'Manager Access' };
      if (expiryOption === 'custom') {
        if (!customExpiry) {
          setError('Please select a custom expiry date and time');
          setIsGenerating(false);
          return;
        }
        payload.customExpiresAt = new Date(customExpiry).toISOString();
      } else {
        payload.expiryHours = Number(expiryOption);
      }

      const res = await shareLinkService.createShareLink(payload);
      const fullUrl = `${window.location.origin}${res.data.shareUrl}`;
      setGeneratedLink({ ...res.data, fullUrl });
      fetchLinks();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate share link');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this share link immediately?')) return;
    try {
      await shareLinkService.revokeShareLink(id);
      fetchLinks();
      if (generatedLink && generatedLink._id === id) {
        setGeneratedLink(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to revoke link');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-brand-light border border-brand-primary/30 rounded-2xl p-5 sm:p-6 shadow-2xl text-left max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-brand-primary/20 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-brand-dark">Share Complete Portal</h3>
            <p className="text-xs sm:text-sm text-brand-dark/70 font-medium mt-0.5">
              Secure read-only manager access with remarks enabled
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-brand-dark/60 hover:text-brand-dark p-1.5 rounded-lg hover:bg-brand-soft/50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 mt-4 border-b border-brand-primary/15 pb-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'create'
                ? 'bg-brand-dark text-brand-light shadow-xs'
                : 'text-brand-dark/70 hover:bg-brand-soft/50'
            }`}
          >
            Generate New Link
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'manage'
                ? 'bg-brand-dark text-brand-light shadow-xs'
                : 'text-brand-dark/70 hover:bg-brand-soft/50'
            }`}
          >
            Active & Past Links
            <span className="px-1.5 py-0.2 rounded-full text-xs bg-brand-soft border border-brand-primary/30 text-brand-dark">
              {links.length}
            </span>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto py-4 space-y-4 flex-1 pr-1">
          {activeTab === 'create' ? (
            <>
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold">
                  {error}
                </div>
              )}

              {/* Generated link display */}
              {generatedLink && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-brand-dark space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      Share Link Generated Successfully
                    </span>
                    <span className="text-xs text-emerald-700 font-medium">
                      Expires: {new Date(generatedLink.expiresAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedLink.fullUrl}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-emerald-300 text-xs font-mono text-brand-dark select-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(generatedLink.fullUrl)}
                      className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shrink-0 flex items-center gap-1"
                    >
                      {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-800/80">
                    Your manager can access your complete dashboard, logs, mentor sessions, and reports without a login.
                  </p>
                </div>
              )}

              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-dark/70 mb-1.5">
                    Link Label / Purpose
                  </label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Weekly Review - Manager"
                    maxLength={100}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-brand-primary/30 bg-brand-light text-brand-dark text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-dark/70 mb-1.5">
                    Expiration Duration
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { label: '1 Hour', value: '1' },
                      { label: '6 Hours', value: '6' },
                      { label: '24 Hours', value: '24' },
                      { label: '7 Days', value: '168' },
                      { label: 'Custom', value: 'custom' },
                    ].map((opt) => (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setExpiryOption(opt.value)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center ${
                          expiryOption === opt.value
                            ? 'bg-brand-primary text-brand-dark border-brand-primary shadow-xs'
                            : 'bg-brand-soft/30 border-brand-primary/20 text-brand-dark/80 hover:bg-brand-soft'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {expiryOption === 'custom' && (
                    <div className="mt-3">
                      <label className="block text-[11px] font-semibold text-brand-dark/70 mb-1">
                        Select Custom Expiry Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={customExpiry}
                        onChange={(e) => setCustomExpiry(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className="w-full px-3.5 py-2 rounded-xl border border-brand-primary/30 bg-brand-light text-brand-dark text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                      />
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-brand-soft/40 border border-brand-primary/20 text-xs text-brand-dark/75 space-y-1">
                  <p className="font-bold text-brand-dark flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Security & Permissions Guarantee
                  </p>
                  <p>• The manager gets read-only access to all your historical logs, calendar, and reports.</p>
                  <p>• The manager CANNOT edit or delete your records, nor access your credentials.</p>
                  <p>• The manager CAN add remarks, which are stored separately without altering your logs.</p>
                  <p>• The link automatically expires and can be revoked at any time.</p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-dark text-brand-light text-sm font-bold shadow-xs hover:bg-brand-dark/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isGenerating && (
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    )}
                    Generate Secure Link
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="space-y-3">
              {isLoadingLinks ? (
                <p className="text-center py-8 text-sm text-brand-dark/60">Loading share links...</p>
              ) : links.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-brand-primary/30 rounded-2xl p-4">
                  <p className="text-sm font-bold text-brand-dark">No share links yet</p>
                  <p className="text-xs text-brand-dark/60 mt-1">Generate a link to share your portal with your manager.</p>
                </div>
              ) : (
                links.map((link) => {
                  const isActive = link.status === 'active';
                  const isRevoked = link.status === 'revoked';
                  const isExpired = link.status === 'expired';

                  return (
                    <div
                      key={link._id}
                      className="p-3.5 rounded-xl border border-brand-primary/20 bg-brand-light hover:bg-brand-soft/20 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-brand-dark">{link.label}</span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : isRevoked
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-300'
                            }`}
                          >
                            {link.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-brand-dark/65">
                          <span>Created: {new Date(link.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>Expires: {new Date(link.expiresAt).toLocaleString()}</span>
                          {link.lastAccessedAt && (
                            <>
                              <span>•</span>
                              <span>Last accessed: {new Date(link.lastAccessedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {isActive && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRevoke(link._id)}
                            className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors"
                          >
                            Revoke Link
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SharePortalModal;
