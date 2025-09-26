import React from 'react';
import { ArrowRight } from 'lucide-react';

interface UsefulLinkCardProps {
  title: string;
  url: string;
}

const UsefulLinkCard: React.FC<UsefulLinkCardProps> = ({ title, url }) => {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 rounded-lg border border-sage/20 dark:border-sage/30 hover:shadow-lg hover:-translate-y-0.5 dark:hover:bg-sage/10 focus:outline-none focus:ring-2 focus:ring-forest-green transition-all duration-200"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-black dark:text-sage">{title}</p>
        <ArrowRight className="h-4 w-4 text-forest-green dark:text-sage" />
      </div>
    </a>
  );
};

export default UsefulLinkCard;
