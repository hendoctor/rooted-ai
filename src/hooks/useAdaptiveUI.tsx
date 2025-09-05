import { useEffect, useState, useCallback } from 'react';

interface ConnectionQuality {
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g';
  downlink: number;
  rtt: number;
  saveData: boolean;
}

interface AdaptiveUIConfig {
  enableAnimations: boolean;
  enableImages: boolean;
  enableVideoAutoplay: boolean;
  prefetchLevel: 'high' | 'medium' | 'low' | 'none';
  compressionLevel: 'high' | 'medium' | 'low';
}

export const useAdaptiveUI = () => {
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality | null>(null);
  const [adaptiveConfig, setAdaptiveConfig] = useState<AdaptiveUIConfig>({
    enableAnimations: true,
    enableImages: true,
    enableVideoAutoplay: true,
    prefetchLevel: 'high',
    compressionLevel: 'low'
  });

  // Update adaptive configuration based on connection quality
  const updateAdaptiveConfig = useCallback((quality: ConnectionQuality) => {
    const config: AdaptiveUIConfig = {
      enableAnimations: true,
      enableImages: true,
      enableVideoAutoplay: true,
      prefetchLevel: 'high',
      compressionLevel: 'low'
    };

    // Adapt based on connection speed
    if (quality.effectiveType === 'slow-2g' || quality.effectiveType === '2g') {
      config.enableAnimations = false;
      config.enableImages = false;
      config.enableVideoAutoplay = false;
      config.prefetchLevel = 'none';
      config.compressionLevel = 'high';
    } else if (quality.effectiveType === '3g') {
      config.enableAnimations = quality.downlink > 1;
      config.enableImages = true;
      config.enableVideoAutoplay = false;
      config.prefetchLevel = 'low';
      config.compressionLevel = 'medium';
    } else if (quality.effectiveType === '4g') {
      config.enableAnimations = true;
      config.enableImages = true;
      config.enableVideoAutoplay = quality.downlink > 5;
      config.prefetchLevel = quality.downlink > 10 ? 'high' : 'medium';
      config.compressionLevel = 'low';
    }

    // Respect data saver preference
    if (quality.saveData) {
      config.enableAnimations = false;
      config.enableVideoAutoplay = false;
      config.prefetchLevel = 'none';
      config.compressionLevel = 'high';
    }

    setAdaptiveConfig(config);
    
    // Apply CSS custom properties for adaptive styling
    document.documentElement.style.setProperty(
      '--enable-animations', 
      config.enableAnimations ? '1' : '0'
    );
    document.documentElement.style.setProperty(
      '--image-quality', 
      config.compressionLevel === 'high' ? '0.7' : 
      config.compressionLevel === 'medium' ? '0.85' : '1'
    );
  }, []);

  // Monitor network connection
  useEffect(() => {
    try {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        
        const updateConnection = () => {
          try {
            const quality: ConnectionQuality = {
              effectiveType: connection.effectiveType || '4g',
              downlink: connection.downlink || 10,
              rtt: connection.rtt || 100,
              saveData: connection.saveData || false
            };
            
            setConnectionQuality(quality);
            updateAdaptiveConfig(quality);
          } catch (error) {
            console.warn('Error updating connection:', error);
          }
        };

        // Initial check
        updateConnection();

        // Listen for changes
        connection.addEventListener('change', updateConnection);
        
        return () => {
          connection.removeEventListener('change', updateConnection);
        };
      } else {
        // Fallback for browsers without Network Information API
        const fallbackQuality: ConnectionQuality = {
          effectiveType: '4g',
          downlink: 10,
          rtt: 100,
          saveData: false
        };
        setConnectionQuality(fallbackQuality);
        updateAdaptiveConfig(fallbackQuality);
      }
    } catch (error) {
      console.warn('Error initializing network monitoring:', error);
      // Fallback
      const fallbackQuality: ConnectionQuality = {
        effectiveType: '4g',
        downlink: 10,
        rtt: 100,
        saveData: false
      };
      setConnectionQuality(fallbackQuality);
      updateAdaptiveConfig(fallbackQuality);
    }
  }, [updateAdaptiveConfig]);


  // Get adaptive class names for components
  const getAdaptiveClasses = useCallback((baseClasses: string = '') => {
    const classes = [baseClasses];
    
    if (!adaptiveConfig.enableAnimations) {
      classes.push('motion-reduce');
    }
    
    if (connectionQuality?.saveData) {
      classes.push('data-saver');
    }
    
    if (connectionQuality?.effectiveType) {
      classes.push(`connection-${connectionQuality.effectiveType}`);
    }
    
    return classes.filter(Boolean).join(' ');
  }, [adaptiveConfig.enableAnimations, connectionQuality]);

  // Get optimized image source based on connection
  const getOptimizedImageSrc = useCallback((originalSrc: string, options?: {
    width?: number;
    height?: number;
    quality?: number;
  }) => {
    if (!adaptiveConfig.enableImages) {
      return ''; // Return empty for very slow connections
    }

    // In a real implementation, this would use a CDN with image optimization
    // For now, we'll just return the original source with query parameters
    const params = new URLSearchParams();
    
    if (options?.width) params.set('w', options.width.toString());
    if (options?.height) params.set('h', options.height.toString());
    
    // Set quality based on adaptive config
    const quality = options?.quality || 
      (adaptiveConfig.compressionLevel === 'high' ? 70 :
       adaptiveConfig.compressionLevel === 'medium' ? 85 : 95);
    
    params.set('q', quality.toString());
    
    return `${originalSrc}${params.toString() ? '?' + params.toString() : ''}`;
  }, [adaptiveConfig.enableImages, adaptiveConfig.compressionLevel]);

  // Determine if content should be prefetched
  const shouldPrefetch = useCallback((priority: 'high' | 'medium' | 'low' = 'medium'): boolean => {
    const levels = { none: 0, low: 1, medium: 2, high: 3 };
    const currentLevel = levels[adaptiveConfig.prefetchLevel];
    const contentLevel = levels[priority];
    
    return currentLevel >= contentLevel;
  }, [adaptiveConfig.prefetchLevel]);

  // Get adaptive loading strategy
  const getLoadingStrategy = useCallback(() => {
    if (connectionQuality?.effectiveType === 'slow-2g' || connectionQuality?.effectiveType === '2g') {
      return 'sequential'; // Load one thing at a time
    } else if (connectionQuality?.effectiveType === '3g') {
      return 'batched'; // Load in small batches
    }
    return 'parallel'; // Load everything in parallel
  }, [connectionQuality]);

  return {
    connectionQuality,
    adaptiveConfig,
    getAdaptiveClasses,
    getOptimizedImageSrc,
    shouldPrefetch,
    getLoadingStrategy,
    isSlowConnection: connectionQuality?.effectiveType === 'slow-2g' || connectionQuality?.effectiveType === '2g',
    isSaveDataMode: connectionQuality?.saveData || false
  };
};