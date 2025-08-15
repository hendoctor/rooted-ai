import React from 'react';
import { useAuth } from '@/hooks/useAuthSecure';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AuthDebug = () => {
  const { user, userRole, loading, session, profile, clientName } = useAuth();

  if (!user) {
    return (
      <Card className="fixed top-4 right-4 z-50 w-80">
        <CardHeader>
          <CardTitle className="text-sm">Auth Debug</CardTitle>
        </CardHeader>
        <CardContent className="text-xs">
          <div>Status: Not logged in</div>
          <div>Loading: {loading ? 'Yes' : 'No'}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="fixed top-4 right-4 z-50 w-80">
      <CardHeader>
        <CardTitle className="text-sm">Auth Debug</CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-1">
        <div><strong>Email:</strong> {user.email}</div>
        <div><strong>Role:</strong> {userRole || 'Not set'}</div>
        <div><strong>Client:</strong> {clientName || 'Not set'}</div>
        <div><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</div>
        <div><strong>Session:</strong> {session ? 'Present' : 'None'}</div>
        <div><strong>Profile:</strong> {profile ? 'Loaded' : 'Not loaded'}</div>
        <div><strong>User ID:</strong> {user.id}</div>
      </CardContent>
    </Card>
  );
};

export default AuthDebug;