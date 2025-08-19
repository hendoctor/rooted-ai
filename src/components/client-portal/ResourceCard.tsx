import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';

interface ResourceCardProps {
  title: string;
  type: 'Guide' | 'Video' | 'Slide';
  href?: string;
}

const ResourceCard: React.FC<ResourceCardProps> = ({ title, type, href }) => {
  return (
    <a
      href={href}
      className="block p-3 rounded-lg border border-sage/20 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-forest-green"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-forest-green">{title}</p>
        <Badge className="bg-sage/20 text-forest-green">{type}</Badge>
      </div>
      <div className="text-sm text-forest-green inline-flex items-center">
        {href ? 'Open' : 'Start'}
        <ArrowRight className="h-4 w-4 ml-1" />
      </div>
    </a>
  );
};

export default ResourceCard;
