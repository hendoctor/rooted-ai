import { useState, useEffect } from 'react';

interface LoadingState {
  stage: 'checking' | 'authenticating' | 'loading-profile' | 'almost-ready' | 'complete';
  message: string;
  progress: number;
}

/**
 * Hook to provide progressive loading states with meaningful messages
 * Enhances user experience during authentication flows
 */
export const useProgressiveLoading = (isLoading: boolean, hasUser: boolean, hasProfile: boolean) => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    stage: 'checking',
    message: 'Checking session...',
    progress: 0
  });

  useEffect(() => {
    if (!isLoading) {
      setLoadingState({
        stage: 'complete',
        message: 'Ready',
        progress: 100
      });
      return;
    }

    // Progressive loading stages
    if (!hasUser) {
      setLoadingState({
        stage: 'checking',
        message: 'Checking session...',
        progress: 25
      });
    } else if (hasUser && !hasProfile) {
      setLoadingState({
        stage: 'loading-profile',
        message: 'Loading profile...',
        progress: 60
      });
    } else if (hasUser && hasProfile) {
      setLoadingState({
        stage: 'almost-ready',
        message: 'Almost ready...',
        progress: 90
      });
    }
  }, [isLoading, hasUser, hasProfile]);

  // Auto-advance through stages with timing
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (loadingState.stage === 'checking' && isLoading) {
      timer = setTimeout(() => {
        setLoadingState(prev => ({
          ...prev,
          stage: 'authenticating',
          message: 'Authenticating...',
          progress: 40
        }));
      }, 1000);
    }

    return () => clearTimeout(timer);
  }, [loadingState.stage, isLoading]);

  return loadingState;
};