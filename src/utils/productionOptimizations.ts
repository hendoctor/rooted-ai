// Production optimization utilities for B2B application

interface OptimizationConfig {
  enablePreload: boolean;
  enablePrefetch: boolean;
  enableDnsPrefetch: boolean;
  enableModulePreload: boolean;
  enableCriticalResourceHints: boolean;
}

interface ResourceHint {
  rel: 'preload' | 'prefetch' | 'dns-prefetch' | 'modulepreload' | 'preconnect';
  href: string;
  as?: string;
  type?: string;
  crossorigin?: 'anonymous' | 'use-credentials';
}

class ProductionOptimizer {
  private config: OptimizationConfig;
  private addedHints = new Set<string>();

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = {
      enablePreload: true,
      enablePrefetch: true,
      enableDnsPrefetch: true,
      enableModulePreload: true,
      enableCriticalResourceHints: true,
      ...config
    };
  }

  // Initialize production optimizations
  initialize() {
    if (typeof window === 'undefined') return;

    // Add critical resource hints
    if (this.config.enableCriticalResourceHints) {
      this.addCriticalResourceHints();
    }

    // Setup performance observers
    this.setupPerformanceObservers();

    // Optimize fonts loading
    this.optimizeFonts();

    // Setup intersection observer for lazy loading
    this.setupLazyLoading();

    console.log('🚀 Production optimizations initialized');
  }

  // Add critical resource hints to document head
  private addCriticalResourceHints() {
    const hints: ResourceHint[] = [
      // DNS prefetch for external domains
      { rel: 'dns-prefetch', href: '//fonts.googleapis.com' },
      { rel: 'dns-prefetch', href: '//fonts.gstatic.com' },
      { rel: 'dns-prefetch', href: '//ylewpehqfgltbhpkaout.supabase.co' },
      
      // Preconnect to critical origins
      { rel: 'preconnect', href: 'https://ylewpehqfgltbhpkaout.supabase.co', crossorigin: 'anonymous' },
      
      // Preload critical resources
      { rel: 'preload', href: '/assets/styles/index.css', as: 'style' },
      { rel: 'preload', href: '/favicon.ico', as: 'image' },
    ];

    hints.forEach(hint => this.addResourceHint(hint));
  }

  // Add a resource hint to the document head
  private addResourceHint(hint: ResourceHint) {
    const key = `${hint.rel}-${hint.href}`;
    if (this.addedHints.has(key)) return;

    const link = document.createElement('link');
    link.rel = hint.rel;
    link.href = hint.href;
    
    if (hint.as) link.setAttribute('as', hint.as);
    if (hint.type) link.setAttribute('type', hint.type);
    if (hint.crossorigin) link.setAttribute('crossorigin', hint.crossorigin);

    document.head.appendChild(link);
    this.addedHints.add(key);
  }

  // Setup performance observers for monitoring
  private setupPerformanceObservers() {
    if (!('PerformanceObserver' in window)) return;

    try {
      // Monitor long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 50) {
            console.warn('Long task detected:', {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name
            });
          }
        });
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });

      // Monitor layout shifts
      const layoutShiftObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        
        if (clsValue > 0.1) {
          console.warn('High cumulative layout shift detected:', clsValue);
        }
      });
      layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });

      // Monitor resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          // Flag slow loading resources
          if (entry.duration > 3000) {
            console.warn('Slow resource detected:', {
              name: entry.name,
              duration: entry.duration,
              transferSize: entry.transferSize
            });
          }
        });
      });
      resourceObserver.observe({ entryTypes: ['resource'] });

    } catch (error) {
      console.warn('Performance observer setup failed:', error);
    }
  }

  // Optimize font loading
  private optimizeFonts() {
    // Preload critical fonts
    const criticalFonts = [
      '/fonts/inter-var.woff2',
      '/fonts/inter-var-latin.woff2'
    ];

    criticalFonts.forEach(font => {
      this.addResourceHint({
        rel: 'preload',
        href: font,
        as: 'font',
        type: 'font/woff2',
        crossorigin: 'anonymous'
      });
    });

    // Add font-display: swap to existing stylesheets
    const styles = document.querySelectorAll('style');
    styles.forEach(style => {
      if (style.textContent?.includes('@font-face')) {
        style.textContent = style.textContent.replace(
          /@font-face\s*{([^}]*)}/g,
          (match, content) => {
            if (!content.includes('font-display')) {
              return `@font-face {${content}font-display: swap;}`;
            }
            return match;
          }
        );
      }
    });
  }

  // Setup lazy loading for images and components
  private setupLazyLoading() {
    if (!('IntersectionObserver' in window)) return;

    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01
    });

    // Observe all images with data-src
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => imageObserver.observe(img));

    // Setup mutation observer to watch for new lazy images
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            const lazyImgs = element.querySelectorAll('img[data-src]');
            lazyImgs.forEach(img => imageObserver.observe(img));
          }
        });
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  // Prefetch route components
  prefetchRoute(routePath: string) {
    if (!this.config.enablePrefetch) return;

    // Dynamic import routes for prefetching
    const routeMap: Record<string, () => Promise<any>> = {
      '/admin': () => import('@/pages/AdminDashboard'),
      '/profile': () => import('@/pages/Profile'),
      '/auth': () => import('@/pages/Auth'),
    };

    const importFn = routeMap[routePath];
    if (importFn) {
      // Prefetch with low priority
      requestIdleCallback(() => {
        importFn().catch(() => {
          // Ignore prefetch errors
        });
      });
    }
  }

  // Preload critical data
  preloadCriticalData(dataLoaders: Array<() => Promise<any>>) {
    if (!this.config.enablePreload) return;

    // Execute data loaders in parallel with error handling
    Promise.allSettled(dataLoaders.map(loader => loader()))
      .then((results) => {
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length > 0) {
          console.warn(`${failed.length} critical data preloads failed`);
        }
      });
  }

  // Optimize bundle loading
  optimizeBundleLoading() {
    if (!this.config.enableModulePreload) return;

    // Preload critical chunks
    const criticalChunks = [
      '/assets/vendor/react-vendor.js',
      '/assets/vendor/ui-vendor.js',
      '/assets/chunks/auth-components.js'
    ];

    criticalChunks.forEach(chunk => {
      this.addResourceHint({
        rel: 'modulepreload',
        href: chunk
      });
    });
  }

  // Setup connection optimizations
  setupConnectionOptimizations() {
    // Enable keep-alive for fetch requests
    const originalFetch = window.fetch;
    window.fetch = function(input, init = {}) {
      const headers = new Headers(init.headers);
      headers.set('Connection', 'keep-alive');
      
      return originalFetch(input, {
        ...init,
        headers
      });
    };

    // Setup request prioritization
    this.setupRequestPrioritization();
  }

  // Setup request prioritization
  private setupRequestPrioritization() {
    // Intercept XMLHttpRequest for prioritization
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      // Set priority based on request type
      if (typeof url === 'string') {
        if (url.includes('/auth/') || url.includes('/users/')) {
          this.priority = 'high';
        } else if (url.includes('/analytics/') || url.includes('/logs/')) {
          this.priority = 'low';
        }
      }
      
      return originalOpen.call(this, method, url, ...args);
    };
  }

  // Cleanup function
  cleanup() {
    // Remove added resource hints
    this.addedHints.forEach(hint => {
      const [rel, href] = hint.split('-', 2);
      const element = document.querySelector(`link[rel="${rel}"][href="${href}"]`);
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    });
    
    this.addedHints.clear();
  }
}

// Export singleton instance
export const productionOptimizer = new ProductionOptimizer();

// Initialize optimizations when imported
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  productionOptimizer.initialize();
}

// Helper functions
export const preloadRoute = (route: string) => productionOptimizer.prefetchRoute(route);
export const preloadData = (loaders: Array<() => Promise<any>>) => productionOptimizer.preloadCriticalData(loaders);
export const optimizeBundles = () => productionOptimizer.optimizeBundleLoading();
