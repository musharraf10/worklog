import { formatDate } from '../../utils/dateUtils';

const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const RemarkList = ({ remarks = [] }) => {
  if (!remarks || remarks.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-brand-primary/15 space-y-2.5">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-dark/70">
        <svg className="w-3.5 h-3.5 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <span>Manager Remarks ({remarks.length})</span>
      </div>

      <div className="space-y-2">
        {remarks.map((r) => (
          <div
            key={r._id || r.createdAt}
            className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 text-left text-brand-dark text-xs sm:text-sm space-y-1"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-amber-900 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 inline-block" />
                {r.authorName || 'Manager'}
              </span>
              <span className="text-[11px] text-amber-800/70 font-medium">
                {formatDateTime(r.createdAt)}
              </span>
            </div>
            <p className="text-brand-dark/90 leading-relaxed font-medium whitespace-pre-wrap">
              {r.remark}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RemarkList;
