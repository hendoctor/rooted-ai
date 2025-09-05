import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface CardSkeletonProps {
  showHeader?: boolean;
  showFooter?: boolean;
  headerHeight?: 'sm' | 'md' | 'lg';
  contentRows?: number;
  className?: string;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  showHeader = true,
  showFooter = false,
  headerHeight = 'md',
  contentRows = 3,
  className = ''
}) => {
  const headerHeightClasses = {
    sm: 'h-4',
    md: 'h-6',
    lg: 'h-8'
  };

  return (
    <Card className={`animate-fade-in ${className}`}>
      {showHeader && (
        <CardHeader>
          <Skeleton className={`${headerHeightClasses[headerHeight]} w-3/4`} />
          <Skeleton className="h-3 w-1/2" />
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {Array.from({ length: contentRows }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ))}
      </CardContent>
      {showFooter && (
        <div className="px-6 pb-4">
          <Skeleton className="h-10 w-full" />
        </div>
      )}
    </Card>
  );
};

export const ClientPortalSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-warm-beige animate-fade-in">
      {/* Header Skeleton */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center space-x-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>

      {/* Progress Section Skeleton */}
      <div className="mt-16 bg-sage/10 text-center py-8">
        <Skeleton className="h-6 w-64 mx-auto mb-2" />
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>

      {/* Main Content Skeleton */}
      <main className="flex-1 container mx-auto px-4 py-10 space-y-8">
        {/* Company Settings Card Skeleton */}
        <Card className="mb-6">
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>

        {/* Primary Grid Skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <CardSkeleton showFooter contentRows={2} />
          <CardSkeleton showFooter contentRows={3} />
          <CardSkeleton showFooter contentRows={2} />
          <CardSkeleton showFooter contentRows={1} />
        </div>

        {/* Secondary Grid Skeleton */}
        <div className="grid gap-6 md:grid-cols-3">
          <CardSkeleton contentRows={4} />
          <CardSkeleton contentRows={3} />
          <CardSkeleton contentRows={3} />
        </div>
      </main>

      {/* Footer Skeleton */}
      <div className="bg-slate-gray text-center py-6 mt-10">
        <Skeleton className="h-4 w-64 mx-auto mb-2 bg-slate-500" />
        <div className="flex justify-center gap-4">
          <Skeleton className="h-4 w-24 bg-slate-500" />
          <Skeleton className="h-4 w-32 bg-slate-500" />
        </div>
      </div>
    </div>
  );
};