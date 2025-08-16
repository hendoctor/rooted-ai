import React from 'react';
import { useAuth } from '@/hooks/useAuthReliable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Shield, User, AlertTriangle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const AuthMonitor: React.FC = () => {
  const { user, session, userRole, companies, loading, error, refreshAuth } = useAuth();

  const getStatusIcon = () => {
    if (loading) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (error) return <AlertTriangle className="h-4 w-4 text-destructive" />;
    if (user && userRole) return <CheckCircle className="h-4 w-4 text-green-600" />;
    return <Shield className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (loading) return 'Loading...';
    if (error) return 'Error';
    if (user && userRole) return 'Authenticated';
    return 'Not authenticated';
  };

  const getStatusVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (error) return 'destructive';
    if (user && userRole) return 'default';
    return 'secondary';
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Authentication Status</CardTitle>
          </div>
          <Badge variant={getStatusVariant()} className="flex items-center space-x-1">
            {getStatusIcon()}
            <span>{getStatusText()}</span>
          </Badge>
        </div>
        <CardDescription>
          Current authentication and authorization state
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Authentication error: {error}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">User Details</span>
            </div>
            <div className="ml-6 space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Email: </span>
                <span className="font-mono">{user?.email || 'Not available'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">ID: </span>
                <span className="font-mono text-xs">
                  {user?.id ? `${user.id.substring(0, 8)}...` : 'Not available'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Authorization</span>
            </div>
            <div className="ml-6 space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Role: </span>
                <Badge variant={userRole === 'Admin' ? 'default' : 'secondary'}>
                  {userRole || 'Not assigned'}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Companies: </span>
                <span>{companies?.length > 0 ? companies.map(c => c.name).join(', ') : 'None'}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Session Info</span>
          </div>
          <div className="ml-6 space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Status: </span>
              <Badge variant={session ? 'default' : 'secondary'}>
                {session ? 'Active' : 'No session'}
              </Badge>
            </div>
            {session && (
              <div>
                <span className="text-muted-foreground">Expires: </span>
                <span>
                  {session.expires_at 
                    ? new Date(session.expires_at * 1000).toLocaleString()
                    : 'Not available'
                  }
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="pt-2 border-t">
          <Button 
            onClick={refreshAuth} 
            disabled={loading || !user}
            variant="outline" 
            size="sm"
            className="w-full"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Authentication
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};