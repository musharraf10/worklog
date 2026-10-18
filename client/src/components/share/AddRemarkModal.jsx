import { useState } from 'react';

export const AddRemarkModal = ({
  isOpen,
  onClose,
  onSubmit,
  targetTitle = '',
  targetType = 'WorkLog',
  isSubmitting = false,
}) => {
  const [remark, setRemark] = useState('');
  const [authorName, setAuthorName] = useState('Manager');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!remark.trim()) {
      setError('Please enter a remark');
      return;
    }
    setError('');
    try {
      await onSubmit({ remark: remark.trim(), authorName: authorName.trim() || 'Manager' });
      setRemark('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to submit remark');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-brand-light border border-brand-primary/30 rounded-2xl p-5 sm:p-6 shadow-2xl text-left"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between pb-3.5 border-b border-brand-primary/20">
          <div>
            <h3 className="text-lg font-bold text-brand-dark">Add Manager Remark</h3>
            {targetTitle && (
              <p className="text-xs text-brand-dark/70 font-medium mt-0.5 truncate max-w-xs sm:max-w-sm">
                [{targetType}] {targetTitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-brand-dark/60 hover:text-brand-dark p-1 rounded-lg hover:bg-brand-soft/50 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-brand-dark/70 mb-1.5">
              Reviewer / Manager Name
            </label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="e.g. Manager / Lead"
              maxLength={100}
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-primary/30 bg-brand-light text-brand-dark text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-brand-dark/70 mb-1.5">
              Remark / Comment <span className="text-rose-600">*</span>
            </label>
            <textarea
              value={remark}
              onChange={(e) => {
                setRemark(e.target.value);
                if (error) setError('');
              }}
              placeholder="Write your feedback, instruction, or note here..."
              rows={4}
              maxLength={2000}
              className="w-full px-3.5 py-2.5 rounded-xl border border-brand-primary/30 bg-brand-light text-brand-dark text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40 font-medium resize-y"
              autoFocus
            />
            <div className="flex justify-between items-center mt-1 text-[11px] text-brand-dark/50">
              <span>Remarks are stored separately and do not edit the original log.</span>
              <span>{remark.length}/2000</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-primary/20">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-brand-dark/25 text-sm font-semibold text-brand-dark hover:bg-brand-soft/40 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !remark.trim()}
              className="px-5 py-2 rounded-xl bg-brand-dark text-brand-light text-sm font-bold shadow-xs hover:bg-brand-dark/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting && (
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              Add Remark
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRemarkModal;
