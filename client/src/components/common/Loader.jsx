export const Loader = ({ size = 'md', fullScreen = false, text }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeClasses[size] || sizeClasses.md} rounded-full animate-spin border-brand-soft border-t-brand-dark`}
      />
      {text && <p className="text-sm font-medium text-brand-dark/80">{text}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-light/80 backdrop-blur-xs">
        {spinner}
      </div>
    );
  }

  return <div className="py-8 flex items-center justify-center">{spinner}</div>;
};

export default Loader;
