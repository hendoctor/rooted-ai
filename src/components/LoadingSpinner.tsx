import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  text?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  // Add responsive sizing so the logo scales with screen size
  lg: 'h-8 w-8 sm:h-10 sm:w-10',
  xl: 'h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20',
};

interface LoadingIconProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const LoadingIcon: React.FC<LoadingIconProps> = ({ size = 'md', className = '' }) => {
  return (
    <div
      className={`plant-loader mx-auto ${sizeClasses[size]} ${className}`}
      aria-hidden="true"
    >
      <div className="plant-loader__cycle" />
      <div className="plant-loader__soil" />
      <div className="plant-loader__seed" />
      <div className="plant-loader__sprout">
        <span className="plant-loader__stem" />
        <span className="plant-loader__leaf plant-loader__leaf--left" />
        <span className="plant-loader__leaf plant-loader__leaf--right" />
      </div>
      <div className="plant-loader__roots">
        <span className="plant-loader__root plant-loader__root--left" />
        <span className="plant-loader__root plant-loader__root--center" />
        <span className="plant-loader__root plant-loader__root--right" />
      </div>
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
      className={`flex flex-col items-center justify-center space-y-2 ${className}`}
      role="status"
      aria-label={accessibleLabel}
      aria-live="polite"
    >
      <LoadingIcon size={size} />
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
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
