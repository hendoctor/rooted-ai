// Simplified menu utilities based on 3 rules only
export interface SimpleMenuRoute {
  label: string;
  path: string;
  isActive: boolean;
  isExternal: boolean;
}

export class SimpleMenuManager {
  // Rule 1: Public Users (not authenticated) - Show only About, Services, Reviews, Team, Contact, Client Experience
  static getPublicMenuItems(): SimpleMenuRoute[] {
    return [
      { label: 'About', path: '#about', isActive: false, isExternal: false },
      { label: 'Services', path: '#services', isActive: false, isExternal: false },
      { label: 'Reviews', path: '#reviews', isActive: false, isExternal: false },
      { label: 'Team', path: '#team', isActive: false, isExternal: false },
      { label: 'Contact', path: '#contact', isActive: false, isExternal: false },
      { label: 'Hub Experience', path: '/client-demo', isActive: false, isExternal: false }
    ];
  }

  // Rule 2: Clients (authenticated) - Show public menu items but exclude Hub Experience
  static getClientMenuItems(): SimpleMenuRoute[] {
    return [
      { label: 'About', path: '#about', isActive: false, isExternal: false },
      { label: 'Services', path: '#services', isActive: false, isExternal: false },
      { label: 'Reviews', path: '#reviews', isActive: false, isExternal: false },
      { label: 'Team', path: '#team', isActive: false, isExternal: false },
      { label: 'Contact', path: '#contact', isActive: false, isExternal: false }
    ];
  }

  // Rule 3: Admins - Show public menu items but exclude Hub Experience + Admin menu item
  static getAdminMenuItems(currentPath: string): SimpleMenuRoute[] {
    return [
      { label: 'About', path: '#about', isActive: false, isExternal: false },
      { label: 'Services', path: '#services', isActive: false, isExternal: false },
      { label: 'Reviews', path: '#reviews', isActive: false, isExternal: false },
      { label: 'Team', path: '#team', isActive: false, isExternal: false },
      { label: 'Contact', path: '#contact', isActive: false, isExternal: false },
      { 
        label: 'Admin', 
        path: '/admin', 
        isActive: currentPath === '/admin', 
        isExternal: false 
      }
    ];
  }

  // Get menu items based on user role
  static getMenuItems(userRole: string | null, currentPath: string): SimpleMenuRoute[] {
    if (!userRole) {
      return this.getPublicMenuItems();
    }

    if (userRole === 'Admin') {
      return this.getAdminMenuItems(currentPath);
    }

    // Client role - always show main navigation
    return this.getClientMenuItems();
  }
}