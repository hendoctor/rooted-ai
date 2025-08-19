import React from 'react';
import { Button } from '@/components/ui/button';

interface TopNavProps {
  company: string;
}

const TopNav: React.FC<TopNavProps> = ({ company }) => {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-sage/20 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <img
          src="/Assets/18d38cb4-658a-43aa-8b10-fa6dbd50eae7.png"
          alt="RootedAI Logo"
          className="w-6 h-6"
        />
        <span className="font-bold text-forest-green">RootedAI</span>
        <span className="text-slate-gray">{company}</span>
      </div>
      <Button asChild variant="outline" size="sm" className="text-forest-green">
        <a href="mailto:support@rootedai.com">Support</a>
      </Button>
    </header>
  );
};

export default TopNav;
