import { forwardRef } from 'react';

export const Input = forwardRef(
  (
    {
      label,
      error,
      helperText,
      id,
      name,
      type = 'text',
      className = '',
      required = false,
      disabled = false,
      ...props
    },
    ref,
  ) => {
    const inputId = id || name;

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-semibold text-brand-dark tracking-wide"
          >
            {label}
            {required && <span className="ml-1 text-brand-dark/70">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            name={name}
            type={type}
            disabled={disabled}
            required={required}
            className={`w-full px-4 py-2.5 text-base bg-brand-light text-brand-dark placeholder-brand-dark/40 rounded-lg border transition-all duration-150 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed leading-normal ${
              error
                ? 'border-brand-dark ring-1 ring-brand-dark bg-brand-soft/20'
                : 'border-brand-dark/20 focus:border-brand-dark focus:ring-brand-primary/60 hover:border-brand-dark/40'
            } ${className}`}
            {...props}
          />
        </div>
        {error && (
          <p className="text-sm font-medium text-brand-dark flex items-center gap-1.5 mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-brand-dark"></span>
            {error}
          </p>
        )}
        {!error && helperText && (
          <p className="text-sm text-brand-dark/70 mt-1">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
