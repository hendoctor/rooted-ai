import React from 'react';
import { Button } from '@/components/ui/button';
import { Leaf } from 'lucide-react';

interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  actionHref?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ message, actionLabel, actionHref }) => {
  return (
    <div className="flex flex-col items-center text-center py-6">
      <Leaf className="h-8 w-8 text-sage mb-4 shrink-0" />
      <p className="text-sm text-slate-gray mb-4">{message}</p>
      {actionLabel && actionHref && (
        <Button asChild className="bg-forest-green text-white">
          <a href={actionHref}>{actionLabel}</a>
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
