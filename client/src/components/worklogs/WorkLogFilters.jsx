import { CATEGORIES, STATUS_OPTIONS, PRIORITY_OPTIONS } from '../../constants/workLogConstants';

export const WorkLogFilters = ({
  filters,
  onChange,
  onReset,
  categoryOptions = CATEGORIES,
}) => {
  const handleChange = (key, value) => {
    onChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.date ||
      filters.category ||
      filters.status ||
      filters.priority,
  );

  return (
    <div className="bg-brand-light border border-brand-primary/25 rounded-2xl p-4 sm:p-5 shadow-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="relative">
          <input
            type="text"
            placeholder="Search tasks or remarks..."
            value={filters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            className="w-full pl-10 pr-3.5 py-2.5 text-sm sm:text-base bg-brand-light text-brand-dark rounded-lg border border-brand-dark/20 focus:border-brand-dark focus:ring-1 focus:ring-brand-primary placeholder-brand-dark/40 leading-normal"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-brand-dark/50">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div>
          <input
            type="date"
            value={filters.date || ''}
            onChange={(e) => handleChange('date', e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm sm:text-base bg-brand-light text-brand-dark rounded-lg border border-brand-dark/20 focus:border-brand-dark focus:ring-1 focus:ring-brand-primary leading-normal"
          />
        </div>

        <div>
          <select
            value={filters.category || ''}
            onChange={(e) => handleChange('category', e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm sm:text-base bg-brand-light text-brand-dark rounded-lg border border-brand-dark/20 focus:border-brand-dark focus:ring-1 focus:ring-brand-primary leading-normal"
          >
            <option value="">All Categories</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={filters.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm sm:text-base bg-brand-light text-brand-dark rounded-lg border border-brand-dark/20 focus:border-brand-dark focus:ring-1 focus:ring-brand-primary leading-normal"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filters.priority || ''}
            onChange={(e) => handleChange('priority', e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm sm:text-base bg-brand-light text-brand-dark rounded-lg border border-brand-dark/20 focus:border-brand-dark focus:ring-1 focus:ring-brand-primary leading-normal"
          >
            <option value="">All Priorities</option>
            {PRIORITY_OPTIONS.map((pr) => (
              <option key={pr} value={pr}>
                {pr}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="px-3.5 py-2.5 text-sm font-semibold text-brand-dark hover:bg-brand-soft/50 rounded-lg border border-brand-dark/20 transition-colors shrink-0"
              title="Reset all filters"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkLogFilters;
