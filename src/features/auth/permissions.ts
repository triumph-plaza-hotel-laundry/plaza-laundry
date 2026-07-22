import type {
  PermissionAction,
  PermissionResource,
  UserRole,
} from '@/features/auth/types';

const ALL_ROLES: UserRole[] = [
  'OWNER',
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'EMPLOYEE',
];
const ADMIN_ROLES: UserRole[] = ['OWNER', 'SUPER_ADMIN', 'ADMIN'];

const ADMIN_PORTAL_ROLES: UserRole[] = [
  'OWNER',
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
];

export function canAccessAdminPortal(role: UserRole | null): boolean {
  if (!role) {
    return false;
  }

  return ADMIN_PORTAL_ROLES.includes(role);
}

export const PERMISSION_DENIED = 'Permission denied';

export const routeResourceMap: Record<string, PermissionResource> = {
  '/': 'dashboard',
  '/programs': 'programs',
  '/chemicals': 'chemicals',
  '/fabrics': 'fabrics',
  '/stains': 'stains',
  '/care-symbols': 'careSymbols',
  '/price-list': 'priceList',
  '/employees': 'employees',
  '/shifts': 'shifts',
  '/training': 'training',
  '/inventory': 'inventory',
  '/hotel-employee-assets': 'inventory',
  '/admin': 'admin',
  '/admin/leaves': 'leaves',
};

const routeAccess: Record<PermissionResource, UserRole[]> = {
  dashboard: ALL_ROLES,
  programs: ADMIN_ROLES,
  chemicals: ADMIN_ROLES,
  fabrics: ADMIN_ROLES,
  stains: ADMIN_ROLES,
  careSymbols: ADMIN_ROLES,
  priceList: ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  employees: ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  shifts: ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'],
  training: ADMIN_ROLES,
  inventory: ALL_ROLES,
  admin: ADMIN_PORTAL_ROLES,
  leaves: ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'],
};

const writeActions: PermissionAction[] = ['create', 'update', 'delete', 'edit'];

const resourceActions: Record<
  PermissionResource,
  Partial<Record<UserRole, PermissionAction[]>>
> = {
  dashboard: {
    OWNER: ['view'],
    SUPER_ADMIN: ['view'],
    ADMIN: ['view'],
    MANAGER: ['view'],
    EMPLOYEE: ['view'],
  },
  programs: {
    OWNER: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    SUPER_ADMIN: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    ADMIN: ['view', 'create', 'update', 'delete', 'edit', 'export'],
  },
  chemicals: {
    OWNER: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    SUPER_ADMIN: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    ADMIN: ['view', 'create', 'update', 'delete', 'edit', 'export'],
  },
  fabrics: {
    OWNER: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    SUPER_ADMIN: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    ADMIN: ['view', 'create', 'update', 'delete', 'edit', 'export'],
  },
  stains: {
    OWNER: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    SUPER_ADMIN: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    ADMIN: ['view', 'create', 'update', 'delete', 'edit', 'export'],
  },
  careSymbols: {
    OWNER: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    SUPER_ADMIN: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    ADMIN: ['view', 'create', 'update', 'delete', 'edit', 'export'],
  },
  priceList: {
    OWNER: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    SUPER_ADMIN: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    ADMIN: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    MANAGER: ['view', 'export'],
  },
  employees: {
    OWNER: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    SUPER_ADMIN: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    ADMIN: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    MANAGER: ['view', 'export'],
  },
  shifts: {
    OWNER: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    SUPER_ADMIN: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    ADMIN: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    EMPLOYEE: ['view'],
  },
  training: {
    OWNER: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    SUPER_ADMIN: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    ADMIN: ['view', 'create', 'update', 'delete', 'edit', 'export'],
  },
  inventory: {
    OWNER: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    SUPER_ADMIN: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    ADMIN: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    MANAGER: ['view', 'export'],
    EMPLOYEE: ['view'],
  },
  admin: {
    OWNER: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    SUPER_ADMIN: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    ADMIN: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    MANAGER: ['view', 'export'],
  },
  leaves: {
    OWNER: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    SUPER_ADMIN: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    ADMIN: ['view', 'create', 'update', 'delete', 'edit', 'export'],
    MANAGER: ['view', 'export'],
  },
};

export function resolveResourceFromPath(pathname: string): PermissionResource {
  if (pathname === '/') {
    return 'dashboard';
  }

  const normalized = pathname.replace(/\/+$/, '') || '/';

  if (normalized.startsWith('/admin/login')) {
    return 'dashboard';
  }

  if (normalized.startsWith('/admin/leaves')) {
    return 'leaves';
  }

  if (normalized.startsWith('/admin')) {
    return 'admin';
  }

  return routeResourceMap[normalized] ?? 'dashboard';
}

export function canAccessRoute(role: UserRole, pathname: string): boolean {
  const resource = resolveResourceFromPath(pathname);
  return routeAccess[resource]?.includes(role) ?? false;
}

export function hasPermission(
  role: UserRole,
  resource: PermissionResource,
  action: PermissionAction,
): boolean {
  const allowed = resourceActions[resource]?.[role] ?? [];
  return allowed.includes(action);
}

export function assertPermission(
  role: UserRole,
  resource: PermissionResource,
  action: PermissionAction,
): void {
  if (!hasPermission(role, resource, action)) {
    throw new Error(PERMISSION_DENIED);
  }
}

export function canManageResource(
  role: UserRole,
  resource: PermissionResource,
): boolean {
  return writeActions.some((action) => hasPermission(role, resource, action));
}

const navigationAccess: Record<PermissionResource, UserRole[]> = {
  dashboard: ['OWNER', 'SUPER_ADMIN', 'MANAGER'],
  programs: ADMIN_ROLES,
  chemicals: ADMIN_ROLES,
  fabrics: ADMIN_ROLES,
  stains: ADMIN_ROLES,
  careSymbols: ADMIN_ROLES,
  priceList: ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  employees: ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'],
  shifts: ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'],
  training: ADMIN_ROLES,
  inventory: ALL_ROLES,
  admin: ADMIN_ROLES,
  leaves: ['OWNER', 'SUPER_ADMIN', 'ADMIN', 'MANAGER'],
};

export function canSeeNavigation(
  role: UserRole,
  resource: PermissionResource,
): boolean {
  return navigationAccess[resource]?.includes(role) ?? false;
}

export function getVisibleNavigationResources(
  role: UserRole,
): PermissionResource[] {
  return (Object.keys(navigationAccess) as PermissionResource[]).filter(
    (resource) => canSeeNavigation(role, resource),
  );
}

export function navigationPathForResource(
  resource: PermissionResource,
): string {
  if (resource === 'dashboard') {
    return '/';
  }

  if (resource === 'admin') {
    return '/admin';
  }

  if (resource === 'leaves') {
    return '/admin/leaves';
  }

  const entry = Object.entries(routeResourceMap).find(
    ([, value]) => value === resource,
  );
  return entry?.[0] ?? '/';
}
