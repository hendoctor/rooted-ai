import React from 'react';
import { Button } from '@/components/ui/button';
import { Bot, ExternalLink } from 'lucide-react';

interface AiToolCardProps {
  title: string;
  url?: string;
  comments?: string;
}

const AiToolCard: React.FC<AiToolCardProps> = ({ title, url, comments }) => {
  const handleClick = () => {
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="p-3 border border-sage/20 rounded-lg hover:bg-sage/5 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-forest-green" />
          <span className="text-sm font-medium text-forest-green">{title}</span>
        </div>
        {url && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleClick}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        )}
      </div>
      {comments && (
        <p className="text-xs text-slate-gray">{comments}</p>
      )}
    </div>
  );
};

export default AiToolCard;