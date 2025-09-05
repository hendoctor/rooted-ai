import { useState, useEffect, useCallback, useRef } from 'react';
import { CacheManager } from '@/lib/cacheManager';

interface ProgressiveDataOptions<T> {
  cacheKey: string;
  fetcher: () => Promise<T>;
  enabled?: boolean;
  staleTime?: number;
  placeholderData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface ProgressiveDataResult<T> {
  data: T | null;
  isLoading: boolean;
  isStale: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  prefetch: () => Promise<void>;
}

export function useProgressiveData<T>({
  cacheKey,
  fetcher,
  enabled = true,
  staleTime = 300000, // 5 minutes
  placeholderData,
  onSuccess,
  onError
}: ProgressiveDataOptions<T>): ProgressiveDataResult<T> {
  const [data, setData] = useState<T | null>(placeholderData || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  // Check for cached data immediately
  useEffect(() => {
    if (!enabled) return;

    const cached = CacheManager.get<T>(cacheKey);
    if (cached) {
      setData(cached);
      setIsStale(false);
      setError(null);
    } else if (!data) {
      // No cached data and no placeholder, start loading
      fetchData();
    }

    return () => {
      mountedRef.current = false;
    };
  }, [cacheKey, enabled]);

  const fetchData = useCallback(async (background = false) => {
    if (!enabled || fetchingRef.current) return;

    try {
      fetchingRef.current = true;
      
      if (!background) {
        setIsLoading(true);
        setError(null);
      }

      const result = await fetcher();
      
      if (!mountedRef.current) return;

      // Cache the result
      CacheManager.set(cacheKey, result, staleTime);
      
      setData(result);
      setIsStale(false);
      setError(null);
      onSuccess?.(result);
    } catch (err) {
      if (!mountedRef.current) return;
      
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
      
      // If we have stale data, mark it as stale instead of clearing it
      if (data) {
        setIsStale(true);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        fetchingRef.current = false;
      }
    }
  }, [cacheKey, fetcher, enabled, staleTime, data, onSuccess, onError]);

  // Background refresh for stale-while-revalidate pattern
  useEffect(() => {
    if (!enabled || !data) return;

    const cached = CacheManager.get<T>(cacheKey);
    if (!cached && data) {
      // Data exists but not in cache, it might be stale
      setIsStale(true);
      // Refresh in background
      fetchData(true);
    }
  }, [cacheKey, data, enabled, fetchData]);

  const refetch = useCallback(async () => {
    // Clear cache and refetch
    CacheManager.invalidate(cacheKey);
    await fetchData();
  }, [cacheKey, fetchData]);

  const prefetch = useCallback(async () => {
    // Only prefetch if not already cached
    const cached = CacheManager.get<T>(cacheKey);
    if (!cached) {
      await fetchData(true);
    }
  }, [cacheKey, fetchData]);

  return {
    data,
    isLoading,
    isStale,
    error,
    refetch,
    prefetch
  };
}

// Hook for progressive list data with pagination
export function useProgressiveList<T>({
  cacheKey,
  fetcher,
  enabled = true,
  pageSize = 20,
  placeholderData = [],
  onSuccess,
  onError
}: {
  cacheKey: string;
  fetcher: (page: number, limit: number) => Promise<T[]>;
  enabled?: boolean;
  pageSize?: number;
  placeholderData?: T[];
  onSuccess?: (data: T[]) => void;
  onError?: (error: Error) => void;
}) {
  const [data, setData] = useState<T[]>(placeholderData);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const fetchingRef = useRef(false);

  const fetchPage = useCallback(async (pageNum: number, append = false) => {
    if (fetchingRef.current) return;

    try {
      fetchingRef.current = true;
      
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setError(null);
      }

      const pageKey = `${cacheKey}_page_${pageNum}`;
      let result = CacheManager.get<T[]>(pageKey);

      if (!result) {
        result = await fetcher(pageNum, pageSize);
        CacheManager.set(pageKey, result, 300000); // 5 minutes
      }

      if (append) {
        setData(prev => [...prev, ...result]);
      } else {
        setData(result);
      }

      setHasMore(result.length === pageSize);
      onSuccess?.(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      fetchingRef.current = false;
    }
  }, [cacheKey, fetcher, pageSize, onSuccess, onError]);

  useEffect(() => {
    if (enabled) {
      fetchPage(1);
    }
  }, [enabled, fetchPage]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPage(nextPage, true);
    }
  }, [hasMore, isLoadingMore, page, fetchPage]);

  const refetch = useCallback(() => {
    // Clear all cached pages
    for (let i = 1; i <= page; i++) {
      CacheManager.invalidate(`${cacheKey}_page_${i}`);
    }
    setPage(1);
    fetchPage(1);
  }, [cacheKey, page, fetchPage]);

  return {
    data,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refetch
  };
}