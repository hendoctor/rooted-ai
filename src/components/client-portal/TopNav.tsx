import React from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface TopNavProps {
  company: string;
  /**
   * Optional link for the company name. Defaults to the client portal.
   */
  companyLink?: string;
}

const TopNav: React.FC<TopNavProps> = ({ company, companyLink = '/client-portal' }) => {
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-sage/20 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Link to="/" className="flex items-center space-x-2">
          <img
            src="/Assets/18d38cb4-658a-43aa-8b10-fa6dbd50eae7.png"
            alt="RootedAI Logo"
            className="w-6 h-6"
          />
          <span className="font-bold text-forest-green">RootedAI</span>
        </Link>
        <span className="text-slate-gray">•</span>
        {companyLink ? (
          <Link to={companyLink} className="text-slate-gray">
            {company}
          </Link>
        ) : (
          <span className="text-slate-gray">{company}</span>
        )}
      </div>
      <Button asChild variant="outline" size="sm" className="text-forest-green border-forest-green hover:bg-forest-green hover:text-white">
        <a href="mailto:support@rootedai.com">Support</a>
      </Button>
    </header>
  );
};

export default TopNav;
