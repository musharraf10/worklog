import { forwardRef } from 'react';

export const Select = forwardRef(
  (
    {
      label,
      options = [],
      error,
      helperText,
      id,
      name,
      value,
      onChange,
      disabled = false,
      required = false,
      placeholder,
      className = '',
      ...props
    },
    ref,
  ) => {
    const selectId = id || name;

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-semibold text-brand-dark tracking-wide"
          >
            {label}
            {required && <span className="ml-1 text-brand-dark/70">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            name={name}
            value={value}
            onChange={onChange}
            disabled={disabled}
            required={required}
            className={`w-full px-4 py-2.5 text-base bg-brand-light text-brand-dark rounded-lg border appearance-none transition-all duration-150 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed pr-9 cursor-pointer leading-normal ${
              error
                ? 'border-brand-dark ring-1 ring-brand-dark bg-brand-soft/20'
                : 'border-brand-dark/20 focus:border-brand-dark focus:ring-brand-primary/60 hover:border-brand-dark/40'
            } ${className}`}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => {
              const optVal = typeof opt === 'object' ? opt.value : opt;
              const optLabel = typeof opt === 'object' ? opt.label : opt;
              return (
                <option key={optVal} value={optVal} className="bg-brand-light text-brand-dark">
                  {optLabel}
                </option>
              );
            })}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-brand-dark/60">
            <svg
              className="w-4 h-4 fill-current"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
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

Select.displayName = 'Select';

export default Select;
