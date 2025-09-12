import React from 'react';
import heroPlantLight from '@/assets/hero-plants-light.jpg';
import heroPlantDark from '@/assets/hero-plants-dark.jpg';

interface RootedBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

const RootedBackground: React.FC<RootedBackgroundProps> = ({ children, className = '' }) => {
  return (
    <div className={`relative isolate min-h-screen overflow-hidden bg-background ${className}`}>
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-300 dark:hidden"
        style={{ backgroundImage: `url(${heroPlantLight})` }}
      />
      <div
        className="absolute inset-0 hidden bg-cover bg-center bg-no-repeat transition-all duration-300 dark:block"
        style={{ backgroundImage: `url(${heroPlantDark})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/80 to-white/85 dark:from-slate-950/95 dark:via-slate-950/80 dark:to-slate-950/50" />
      <div className="absolute inset-0 [background-image:radial-gradient(1.5px_1.5px_at_12px_12px,rgba(16,185,129,.35)_1px,transparent_1px)] [background-size:24px_24px] dark:[background-image:radial-gradient(1.5px_1.5px_at_12px_12px,rgba(110,231,183,.28)_1px,transparent_1px)]" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(16,185,129,.22)_35%,transparent_70%)] dark:bg-[linear-gradient(115deg,transparent_0%,rgba(34,197,94,.28)_35%,transparent_70%)]" />
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
};

export default RootedBackground;
