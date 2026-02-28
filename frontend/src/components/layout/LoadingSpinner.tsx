// ─── LoadingSpinner ────────────────────────────────────────────────────────────

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const sizeClass: Record<NonNullable<LoadingSpinnerProps['size']>, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
};

export function LoadingSpinner({ size = 'md', label = 'Loading…' }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2" role="status" aria-label={label}>
      <div
        className={`animate-spin rounded-full border-blue-600 border-t-transparent ${sizeClass[size]}`}
      />
      {label && <span className="text-sm text-gray-500">{label}</span>}
    </div>
  );
}
