import React from 'react';
import EmptyState from './EmptyState';

interface CoachingCardProps {
  nextSession?: string;
}

const CoachingCard: React.FC<CoachingCardProps> = ({ nextSession }) => {
  if (!nextSession) {
    return <EmptyState message="Pick a time to continue your roadmap." />;
  }

  return (
    <p className="text-sm text-slate-gray dark:text-slate-300">Next session: {nextSession}</p>
  );
};

export default CoachingCard;
