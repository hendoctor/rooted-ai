// Secure API wrapper to replace global fetch modifications
// This provides a non-intrusive way to monitor and enhance API calls

interface SecureApiConfig {
  enableLogging?: boolean;
  enableRetry?: boolean;
  maxRetries?: number;
  timeout?: number;
}

class SecureApiWrapper {
  private config: SecureApiConfig;
  private originalFetch: typeof fetch;

  constructor(config: SecureApiConfig = {}) {
    this.config = {
      enableLogging: true,
      enableRetry: true,
      maxRetries: 3,
      timeout: 10000,
      ...config
    };
    this.originalFetch = fetch.bind(window);
  }

  // Secure fetch wrapper with monitoring
  async secureFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const startTime = performance.now();
    const requestId = this.generateRequestId();
    
    try {
      // Add security headers
      const secureInit: RequestInit = {
        ...init,
        headers: {
          ...init?.headers,
          'X-Request-ID': requestId,
          'X-Requested-With': 'XMLHttpRequest'
        }
      };

      // Add timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      
      secureInit.signal = controller.signal;

      let lastError: Error | null = null;
      let attempts = 0;
      const maxAttempts = this.config.enableRetry ? this.config.maxRetries! + 1 : 1;

      while (attempts < maxAttempts) {
        try {
          const response = await this.originalFetch(input, secureInit);
          clearTimeout(timeoutId);
          
          if (this.config.enableLogging) {
            this.logRequest(requestId, input, response, performance.now() - startTime, attempts);
          }
          
          return response;
        } catch (error) {
          lastError = error as Error;
          attempts++;
          
          if (attempts < maxAttempts && this.shouldRetry(error as Error)) {
            await this.delay(Math.pow(2, attempts - 1) * 1000); // Exponential backoff
            continue;
          }
          break;
        }
      }
      
      clearTimeout(timeoutId);
      throw lastError;
      
    } catch (error) {
      if (this.config.enableLogging) {
        this.logError(requestId, input, error as Error);
      }
      throw error;
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldRetry(error: Error): boolean {
    // Retry on network errors, not on 4xx client errors
    return error.name === 'TypeError' || error.name === 'AbortError';
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private logRequest(requestId: string, input: RequestInfo | URL, response: Response, duration: number, attempts: number): void {
    console.log(`[SecureAPI] ${requestId}: ${response.status} ${input} (${duration.toFixed(2)}ms, attempt ${attempts})`);
  }

  private logError(requestId: string, input: RequestInfo | URL, error: Error): void {
    console.error(`[SecureAPI] ${requestId}: Error for ${input}:`, error);
  }
}

// Create singleton instance
export const secureApi = new SecureApiWrapper();

// Helper function for components to use
export const secureApiCall = (input: RequestInfo | URL, init?: RequestInit) => {
  return secureApi.secureFetch(input, init);
};

// Export for advanced usage
export { SecureApiWrapper };
export type { SecureApiConfig };