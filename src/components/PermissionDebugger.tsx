// Debug component to test Client permissions
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PermissionDebugger: React.FC = () => {
  const { user, userRole, companies } = useAuth();
  const { canAccessPage, canPerformAction, hasRoleForCompany, isMemberOfCompany, isAdminOfCompany, capabilities } = usePermissions();

  if (!user) {
    return (
      <Card className="m-4 p-4">
        <CardHeader>
          <CardTitle>Permission Debugger</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No user logged in</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="m-4 p-4">
      <CardHeader>
        <CardTitle>Permission Debugger - Client Access Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold">User Info:</h3>
          <p>Role: {userRole}</p>
          <p>Email: {user.email}</p>
          <p>Companies: {companies.length}</p>
        </div>
        
        <div>
          <h3 className="font-semibold">Page Access:</h3>
          <p>client-portal: {canAccessPage('client-portal') ? '✅' : '❌'}</p>
          <p>profile: {canAccessPage('profile') ? '✅' : '❌'}</p>
          <p>dashboard: {canAccessPage('dashboard') ? '✅' : '❌'}</p>
        </div>
        
        <div>
          <h3 className="font-semibold">CRUD Permissions:</h3>
          <p>companies read: {canPerformAction('companies', 'read') ? '✅' : '❌'}</p>
          <p>companies update: {canPerformAction('companies', 'update') ? '✅' : '❌'}</p>
          <p>client-portal read: {canPerformAction('client-portal', 'read') ? '✅' : '❌'}</p>
        </div>
        
        <div>
          <h3 className="font-semibold">Role Checks:</h3>
          <p>Has Client role for first company: {companies[0] ? hasRoleForCompany(['Client'], companies[0].id) ? '✅' : '❌' : 'No companies'}</p>
          <p>Is member of first company: {companies[0] ? isMemberOfCompany(companies[0].id) ? '✅' : '❌' : 'No companies'}</p>
          <p>Is admin of first company: {companies[0] ? isAdminOfCompany(companies[0].id) ? '✅' : '❌' : 'No companies'}</p>
          <p>Has Admin role: {hasRoleForCompany(['Admin']) ? '✅' : '❌'}</p>
        </div>
        
        <div>
          <h3 className="font-semibold">Capabilities:</h3>
          <p>Can manage companies: {capabilities.canManageCompanies ? '✅' : '❌'}</p>
          <p>Can view reports: {capabilities.canViewReports ? '✅' : '❌'}</p>
          <p>Is Client: {capabilities.isClient ? '✅' : '❌'}</p>
          <p>Is Admin: {capabilities.isAdmin ? '✅' : '❌'}</p>
        </div>
        
        {companies.map((company, index) => (
          <div key={company.id}>
            <h3 className="font-semibold">Company {index + 1}: {company.name}</h3>
            <p>Slug: {company.slug}</p>
            <p>User Role: {company.userRole}</p>
            <p>Is Admin: {company.isAdmin ? '✅' : '❌'}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default PermissionDebugger;