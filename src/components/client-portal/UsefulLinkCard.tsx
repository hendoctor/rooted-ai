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
      className="block p-3 rounded-lg border border-sage/20 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-forest-green"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-forest-green">{title}</p>
        <ArrowRight className="h-4 w-4 text-forest-green" />
      </div>
    </a>
  );
};

export default UsefulLinkCard;
