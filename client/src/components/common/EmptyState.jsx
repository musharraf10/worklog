export const EmptyState = ({
  title = 'No records found',
  description = 'There are no items matching your criteria yet.',
  action,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-dashed border-brand-primary/40 bg-brand-light/40 my-4">
      <div className="w-12 h-12 mb-3 rounded-full bg-brand-soft/50 flex items-center justify-center text-brand-dark">
        {icon || (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
      </div>
      <h4 className="text-lg font-bold text-brand-dark mb-1.5">{title}</h4>
      <p className="text-base text-brand-dark/75 max-w-md mb-5 leading-relaxed">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export default EmptyState;
