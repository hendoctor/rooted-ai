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
      target={href ? "_blank" : undefined}
      rel={href ? "noopener noreferrer" : undefined}
      className="block p-3 rounded-lg border border-sage/20 dark:border-sage/30 hover:shadow-lg hover:-translate-y-0.5 dark:hover:bg-sage/10 focus:outline-none focus:ring-2 focus:ring-forest-green transition-all duration-200"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-black dark:text-sage">{title}</p>
        <Badge className="bg-sage/20 dark:bg-sage/30 text-forest-green dark:text-sage">{type}</Badge>
      </div>
      <div className="text-sm text-forest-green dark:text-sage inline-flex items-center">
        {href ? 'Open' : 'Start'}
        <ArrowRight className="h-4 w-4 ml-1" />
      </div>
    </a>
  );
};

export default ResourceCard;
