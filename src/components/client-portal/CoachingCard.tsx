import React from 'react';
import { Button } from '@/components/ui/button';
import EmptyState from './EmptyState';

interface CoachingCardProps {
  nextSession?: string;
}

const CoachingCard: React.FC<CoachingCardProps> = ({ nextSession }) => {
  if (!nextSession) {
    return (
      <EmptyState
        message="Pick a time to continue your roadmap."
        actionLabel="Book a 30-min session"
        actionHref="#"
      />
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-gray">Next session: {nextSession}</p>
      <Button className="bg-forest-green text-white">Book a 30-min session</Button>
    </div>
  );
};

export default CoachingCard;
