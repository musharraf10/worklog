export const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  className = '',
}) => {
  return (
    <div
      className={`bg-brand-light border border-brand-primary/25 rounded-2xl p-6 shadow-xs hover:border-brand-primary/60 transition-all flex flex-col justify-between text-left ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-bold uppercase tracking-wide text-brand-dark/75">
          {title}
        </span>
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-brand-soft/80 flex items-center justify-center text-brand-dark shrink-0 shadow-xs">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4">
        <h3 className="text-3xl sm:text-4xl font-extrabold text-brand-dark tracking-tight">
          {value}
        </h3>
        {subtitle && (
          <p className="text-sm text-brand-dark/70 mt-1.5 font-medium">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
