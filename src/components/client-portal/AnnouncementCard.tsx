import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AnnouncementCardProps {
  title: string;
  date: string;
  status?: 'New' | 'Important';
  summary?: string;
  content?: string;
  url?: string;
}

const AnnouncementCard: React.FC<AnnouncementCardProps> = ({
  title,
  date,
  status,
  summary,
  content,
  url,
}) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="py-2 border-b last:border-b-0 cursor-pointer">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</p>
            {status && (
              <Badge className="bg-forest-green/10 text-forest-green">{status}</Badge>
            )}
          </div>
          <p className="text-xs text-slate-gray dark:text-slate-400">{date}</p>
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-2">
          {summary && <p className="text-sm text-slate-gray dark:text-slate-300 break-words">{summary}</p>}
          {content && (
            <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap break-words">{content}</p>
          )}
          {url && (
            <Button
              asChild
              className="mt-4 bg-forest-green text-cream hover:bg-forest-green/90"
            >
              <a href={url} target="_blank" rel="noopener noreferrer">
                Open Link
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AnnouncementCard;
