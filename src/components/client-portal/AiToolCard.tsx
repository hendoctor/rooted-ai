import React from 'react';
import { Bot, ExternalLink } from 'lucide-react';

interface AiToolCardProps {
  title: string;
  url?: string;
  comments?: string;
}

const AiToolCard: React.FC<AiToolCardProps> = ({ title, url, comments }) => {
  const content = (
    <div className="p-3 border border-sage/20 dark:border-sage/30 rounded-lg hover:bg-sage/5 dark:hover:bg-sage/10 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-forest-green dark:text-sage" />
          <span className="text-sm font-medium text-forest-green dark:text-sage">{title}</span>
        </div>
        {url && <ExternalLink className="h-3 w-3 text-slate-gray dark:text-slate-300" />}
      </div>
      {comments && (
        <p className="text-xs text-slate-gray dark:text-slate-300">{comments}</p>
      )}
    </div>
  );

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-green/40 rounded-lg"
      >
        {content}
      </a>
    );
  }

  return content;
};

export default AiToolCard;
