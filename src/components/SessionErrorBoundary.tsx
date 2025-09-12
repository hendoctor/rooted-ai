import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  isRecovering: boolean;
}

/**
 * Session-aware error boundary that can recover from auth-related errors
 */
class SessionErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isRecovering: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Session Error Boundary caught error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Check if this is a session-related error
    const errorMessage = error.message?.toLowerCase() || '';
    const isSessionError = errorMessage.includes('session') || 
                          errorMessage.includes('auth') ||
                          errorMessage.includes('token') ||
                          errorMessage.includes('unauthorized');

    if (isSessionError && this.retryCount < this.maxRetries) {
      console.log('🔄 Attempting session recovery...');
      this.attemptSessionRecovery();
    }
  }

  attemptSessionRecovery = async () => {
    this.setState({ isRecovering: true });
    this.retryCount++;

    try {
      // Clear potentially corrupt session
      await supabase.auth.signOut({ scope: 'local' });
      
      // Small delay to allow state to clear
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to restore session from storage
      const { error } = await supabase.auth.getSession();
      
      if (!error) {
        console.log('✅ Session recovery successful');
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          isRecovering: false
        });
        this.retryCount = 0;
        return;
      }
    } catch (recoveryError) {
      console.error('Session recovery failed:', recoveryError);
    }

    this.setState({ isRecovering: false });
  };

  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.attemptSessionRecovery();
    } else {
      // Force full page reload as last resort
      window.location.reload();
    }
  };

  handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/auth';
    } catch (error) {
      console.error('Sign out error:', error);
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isSessionError = this.state.error?.message?.toLowerCase().includes('session') ||
                            this.state.error?.message?.toLowerCase().includes('auth') ||
                            this.state.error?.message?.toLowerCase().includes('token');

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle>
                {isSessionError ? 'Session Error' : 'Something went wrong'}
              </CardTitle>
              <CardDescription>
                {isSessionError 
                  ? 'Your session has become invalid. Please sign in again.'
                  : 'The application encountered an unexpected error.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.isRecovering && (
                <div className="text-center text-sm text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2" />
                  Attempting to recover...
                </div>
              )}
              
              {!this.state.isRecovering && (
                <div className="flex flex-col gap-2">
                  {this.retryCount < this.maxRetries && (
                    <Button onClick={this.handleRetry} className="w-full">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                  )}
                  
                  {isSessionError && (
                    <Button 
                      onClick={this.handleSignOut} 
                      variant="outline" 
                      className="w-full"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out & Restart
                    </Button>
                  )}
                  
                  <Button 
                    onClick={() => window.location.reload()} 
                    variant="ghost" 
                    className="w-full"
                  >
                    Refresh Page
                  </Button>
                </div>
              )}

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-xs">
                  <summary className="cursor-pointer text-muted-foreground">
                    Error Details
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap break-all">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SessionErrorBoundary;