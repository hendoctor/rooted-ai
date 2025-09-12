import React from 'react';

const logoSrc = '/Assets/22badab3-8f25-475f-92d7-167cbc732868.png';

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
    <div className={`relative mx-auto flex items-center justify-center ${sizeClasses[size]} ${className}`}>
      <img
        src={logoSrc}
        alt="RootedAI logo"
        className="w-full h-full object-contain"
      />
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        fill="none"
      >
        <g stroke="#16a34a" strokeWidth="4" strokeLinecap="round">
          <path d="M50 60 L50 90" strokeDasharray="30" strokeDashoffset="30">
            <animate
              attributeName="stroke-dashoffset"
              values="30;0;30"
              dur="2s"
              repeatCount="indefinite"
            />
          </path>
          <path d="M50 75 L40 90" strokeDasharray="22" strokeDashoffset="22">
            <animate
              attributeName="stroke-dashoffset"
              values="22;0;22"
              dur="2s"
              repeatCount="indefinite"
            />
          </path>
          <path d="M50 75 L60 90" strokeDasharray="22" strokeDashoffset="22">
            <animate
              attributeName="stroke-dashoffset"
              values="22;0;22"
              dur="2s"
              repeatCount="indefinite"
            />
          </path>
          {/* Additional root outlines */}
          <path d="M50 65 L45 80" strokeDasharray="16" strokeDashoffset="16">
            <animate
              attributeName="stroke-dashoffset"
              values="16;0;16"
              dur="2s"
              repeatCount="indefinite"
            />
          </path>
          <path d="M50 65 L55 80" strokeDasharray="16" strokeDashoffset="16">
            <animate
              attributeName="stroke-dashoffset"
              values="16;0;16"
              dur="2s"
              repeatCount="indefinite"
            />
          </path>
          <path d="M50 80 L43 90" strokeDasharray="12" strokeDashoffset="12">
            <animate
              attributeName="stroke-dashoffset"
              values="12;0;12"
              dur="2s"
              repeatCount="indefinite"
            />
          </path>
          <path d="M50 80 L57 90" strokeDasharray="12" strokeDashoffset="12">
            <animate
              attributeName="stroke-dashoffset"
              values="12;0;12"
              dur="2s"
              repeatCount="indefinite"
            />
          </path>
        </g>
      </svg>
    </div>
  );
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  text,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center space-y-2 ${className}`}>
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