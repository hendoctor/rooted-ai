export type Role = 'Admin' | 'Manager' | 'User';

type CRUD = 'create' | 'read' | 'update' | 'delete';

interface RolePermissions {
  pages: Record<string, Role[]>;
  crud: Record<string, Record<Role, CRUD[]>>;
}

const roleHierarchy: Record<Role, Role[]> = {
  Admin: ['Manager', 'User'],
  Manager: ['User'],
  User: []
};

const permissions: RolePermissions = {
  pages: {
    dashboard: ['Admin', 'Manager'],
    reports: ['Admin', 'Manager'],
    profile: ['Admin', 'Manager', 'User'],
    'rbac-demo': ['Admin', 'Manager', 'User']
  },
  crud: {
    users: {
      Admin: ['create', 'read', 'update', 'delete'],
      Manager: ['read', 'update'],
      User: ['read']
    },
    todos: {
      Admin: ['create', 'read', 'update', 'delete'],
      Manager: ['read', 'update'],
      User: ['read']
    }
  }
};

const hasRole = (role: Role, target: Role): boolean => {
  if (role === target) return true;
  const inherits = roleHierarchy[role] || [];
  return inherits.some(r => hasRole(r, target));
};

export const canUser = (role: Role | null, page: string): boolean => {
  if (!role) return false;
  const allowed = permissions.pages[page] || [];
  return allowed.some(r => hasRole(role, r));
};

export const canCRUD = (role: Role | null, resource: string, op: CRUD): boolean => {
  if (!role) return false;
  const resourcePerms = permissions.crud[resource];
  if (!resourcePerms) return false;
  return Object.entries(resourcePerms).some(([r, ops]) =>
    hasRole(role, r as Role) && ops.includes(op)
  );
};

export const accessiblePages = (role: Role | null): string[] => {
  if (!role) return [];
  return Object.entries(permissions.pages)
    .filter(([, roles]) => roles.some(r => hasRole(role, r)))
    .map(([page]) => page);
};
