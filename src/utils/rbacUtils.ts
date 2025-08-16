// Centralized Role-Based Access Control utilities
import { supabase } from '@/integrations/supabase/client';

export interface MenuRoute {
  path: string;
  label: string;
  icon?: string;
  requiresAuth: boolean;
  roles: string[];
  companyId?: string;
}

export class RBACManager {
  // Define all application routes with their access requirements
  private static routes: MenuRoute[] = [
    {
      path: '/',
      label: 'Home',
      requiresAuth: false,
      roles: []
    },
    {
      path: '/profile',
      label: 'Profile',
      requiresAuth: true,
      roles: ['Admin', 'Client']
    },
    {
      path: '/admin',
      label: 'Admin Dashboard',
      requiresAuth: true,
      roles: ['Admin']
    }
  ];

  // Check if user has access to specific route
  static async hasRouteAccess(
    path: string, 
    userRole: string | null, 
    companyId?: string
  ): Promise<boolean> {
    const route = this.routes.find(r => r.path === path);
    
    if (!route) {
      // For unknown routes, allow access (let component handle)
      return true;
    }

    // Public routes
    if (!route.requiresAuth) {
      return true;
    }

    // Must be authenticated
    if (!userRole) {
      return false;
    }

    // Admin has access to everything
    if (userRole === 'Admin') {
      return true;
    }

    // Check role requirements
    if (route.roles.length === 0) {
      return true; // No specific role required, just auth
    }

    // Check if user role matches required roles
    const hasGlobalAccess = route.roles.includes(userRole);
    
    // If company-specific route, check company membership
    if (route.companyId || companyId) {
      return await this.hasCompanyAccess(companyId || route.companyId!, route.roles);
    }

    return hasGlobalAccess;
  }

  // Check company-specific access
  private static async hasCompanyAccess(
    companyId: string, 
    requiredRoles: string[]
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('require_role', {
        required_roles: requiredRoles,
        company_id_param: companyId
      });

      if (error) {
        console.warn('Company access check failed:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking company access:', error);
      return false;
    }
  }

  // Get accessible routes for current user
  static async getAccessibleRoutes(
    userRole: string | null,
    companies: Array<{ id: string; slug: string; name: string }>
  ): Promise<MenuRoute[]> {
    const accessible: MenuRoute[] = [];

    // Check base routes
    for (const route of this.routes) {
      const hasAccess = await this.hasRouteAccess(route.path, userRole);
      if (hasAccess) {
        accessible.push(route);
      }
    }

    // Add company portal routes
    if (userRole && companies.length > 0) {
      for (const company of companies) {
        accessible.push({
          path: `/${company.slug}`,
          label: company.name,
          requiresAuth: true,
          roles: ['Admin', 'Client'],
          companyId: company.id
        });
      }
    }

    return accessible;
  }

  // Build navigation menu from accessible routes
  static buildNavigationMenu(
    accessibleRoutes: MenuRoute[],
    currentPath: string
  ): Array<{
    label: string;
    path: string;
    isActive: boolean;
    isExternal: boolean;
  }> {
    return accessibleRoutes.map(route => ({
      label: route.label,
      path: route.path,
      isActive: currentPath === route.path || 
                (route.path !== '/' && currentPath.startsWith(route.path)),
      isExternal: false
    }));
  }

  // Validate invitation redemption with proper role assignment
  static async redeemInvitation(token: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      // Validate token first
      const { data: validationData, error: validationError } = await supabase.rpc(
        'validate_invitation_secure',
        { token_input: token }
      );

      const result = validationData as any;
      if (validationError || !result?.valid) {
        return {
          success: false,
          error: result?.error || 'Invalid invitation token'
        };
      }

      const invitation = result.invitation;

      // Create company if needed
      if (invitation.client_name) {
        const companySlug = invitation.client_name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');

        const { error: companyError } = await supabase
          .from('companies')
          .upsert({
            name: invitation.client_name,
            slug: companySlug
          }, { onConflict: 'name' });

        if (companyError) {
          console.warn('Failed to create company:', companyError);
        }
      }

      return {
        success: true,
        data: invitation
      };
    } catch (error) {
      console.error('Invitation redemption failed:', error);
      return {
        success: false,
        error: 'Failed to process invitation'
      };
    }
  }

  // Invalidate caches when roles change
  static clearRoleCache(): void {
    // Clear any cached permission data
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('role_') || key.startsWith('permission_')) {
        sessionStorage.removeItem(key);
      }
    });
  }
}