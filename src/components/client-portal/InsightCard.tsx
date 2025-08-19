import React from 'react';
import { ArrowRight } from 'lucide-react';

interface InsightCardProps {
  summary: string;
  timestamp: string;
}

const InsightCard: React.FC<InsightCardProps> = ({ summary, timestamp }) => {
  return (
    <div className="p-3 rounded-lg border border-sage/20 hover:shadow-sm focus-within:ring-2 focus-within:ring-forest-green">
      <p className="text-sm text-slate-gray mb-2">{summary}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-gray">{timestamp}</span>
        <button className="text-sm text-forest-green inline-flex items-center hover:underline">
          View details
          <ArrowRight className="h-4 w-4 ml-1" />
        </button>
      </div>
    </div>
  );
};

export default InsightCard;
