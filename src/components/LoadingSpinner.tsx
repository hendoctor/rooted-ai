import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
}

const logoSizeClasses: Record<NonNullable<LoadingSpinnerProps['size']>, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8 sm:h-10 sm:w-10',
  xl: 'h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20',
};

const barWidthClasses: Record<NonNullable<LoadingSpinnerProps['size']>, string> = {
  sm: 'w-16',
  md: 'w-24',
  lg: 'w-32',
  xl: 'w-40',
};

const barHeightClasses: Record<NonNullable<LoadingSpinnerProps['size']>, string> = {
  sm: 'h-1.5',
  md: 'h-2',
  lg: 'h-2.5',
  xl: 'h-3',
};

interface LoadingIconProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const LoadingIcon: React.FC<LoadingIconProps> = ({ size = 'md', className = '' }) => {
  return (
    <div
      className={`inline-flex items-center justify-center ${logoSizeClasses[size]} ${className}`}
      aria-hidden="true"
    >
      <img
        src="/Assets/22badab3-8f25-475f-92d7-167cbc732868.png"
        alt=""
        className="h-full w-full object-contain drop-shadow-sm"
      />
    </div>
  );
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  className = ''
}) => {
  const accessibleLabel = text ?? 'Loading';

  return (
    <div
      className={`flex flex-col items-center justify-center space-y-3 ${className}`}
      role="status"
      aria-label={accessibleLabel}
      aria-live="polite"
    >
      <LoadingIcon size={size} />
      <div
        className={`loading-bar ${barWidthClasses[size]} ${barHeightClasses[size]} bg-muted/80`}
        role="presentation"
      >
        <div className="loading-bar__fill bg-[hsl(var(--forest-green))]" />
      </div>
      {text && (
        <p className="text-sm text-muted-foreground text-center animate-pulse">{text}</p>
      )}
    </div>
  );
};

// Full-screen loading component
export const FullScreenLoader: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <LoadingSpinner size="xl" text={text} />
    </div>
  );
};

// Inline loading for components
export const InlineLoader: React.FC<{ text?: string }> = ({ text }) => {
  return (
    <div className="flex items-center justify-center p-8">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
};
