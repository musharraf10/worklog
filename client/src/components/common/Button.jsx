export const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  onClick,
  icon,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeStyles = {
    sm: 'text-sm px-3.5 py-2 gap-2 font-medium',
    md: 'text-base px-5 py-2.5 gap-2.5 font-medium',
    lg: 'text-lg px-6 py-3 gap-3 font-semibold',
  };

  const variantStyles = {
    primary:
      'bg-brand-dark text-brand-light hover:bg-brand-dark/90 focus:ring-brand-primary shadow-sm active:scale-[0.99]',
    secondary:
      'bg-brand-soft text-brand-dark hover:bg-brand-primary/40 focus:ring-brand-primary active:scale-[0.99]',
    brand:
      'bg-gradient-to-r from-brand-primary to-brand-soft text-brand-dark hover:opacity-90 focus:ring-brand-dark active:scale-[0.99] font-semibold shadow-sm',
    outline:
      'border border-brand-dark/30 text-brand-dark bg-transparent hover:bg-brand-soft/30 focus:ring-brand-primary',
    ghost:
      'text-brand-dark bg-transparent hover:bg-brand-soft/40 focus:ring-brand-primary',
    danger:
      'border border-brand-dark/50 bg-brand-soft text-brand-dark hover:bg-brand-primary/80 focus:ring-brand-dark font-semibold',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};

export default Button;
