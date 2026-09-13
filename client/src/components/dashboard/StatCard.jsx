export const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  className = '',
}) => {
  return (
    <div
      className={`bg-brand-light border border-brand-primary/25 rounded-2xl p-4 shadow-xs hover:border-brand-primary/60 transition-all duration-200 flex flex-col justify-between text-left sm:p-5 ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] sm:text-sm font-bold uppercase tracking-wide text-brand-dark/75 leading-snug">
          {title}
        </span>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-brand-soft/80 flex items-center justify-center text-brand-dark shrink-0 shadow-xs sm:w-9 sm:h-9 sm:rounded-xl">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3 sm:mt-4">
        <h3 className="text-2xl sm:text-4xl font-extrabold text-brand-dark tracking-tight">
          {value}
        </h3>
        {subtitle && (
          <p className="hidden sm:block text-sm text-brand-dark/70 mt-1.5 font-medium">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
