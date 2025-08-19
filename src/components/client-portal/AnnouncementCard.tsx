import React from 'react';
import { Badge } from '@/components/ui/badge';

interface AnnouncementCardProps {
  title: string;
  date: string;
  status?: 'New' | 'Important';
}

const AnnouncementCard: React.FC<AnnouncementCardProps> = ({ title, date, status }) => {
  return (
    <div className="py-2 border-b last:border-b-0">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</p>
        {status && (
          <Badge className="bg-forest-green/10 text-forest-green">{status}</Badge>
        )}
      </div>
      <p className="text-xs text-slate-gray">{date}</p>
    </div>
  );
};

export default AnnouncementCard;
