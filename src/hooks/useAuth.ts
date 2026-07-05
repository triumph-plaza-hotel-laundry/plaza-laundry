import { useAuthContext } from '@/context/auth-context';
import type { PermissionAction, PermissionResource } from '@/features/auth/types';

export function useAuth() {
  return useAuthContext();
}

export function usePermissions(defaultResource?: PermissionResource) {
  const auth = useAuthContext();

  const forResource = (resource: PermissionResource = defaultResource ?? 'dashboard') => ({
    canView: auth.can(resource, 'view'),
    canCreate: auth.can(resource, 'create'),
    canEdit: auth.can(resource, 'edit') || auth.can(resource, 'update'),
    canDelete: auth.can(resource, 'delete'),
    canExport: auth.can(resource, 'export'),
    canManage: auth.canManage(resource),
    assertView: () => auth.assertCan(resource, 'view'),
    assertCreate: () => auth.assertCan(resource, 'create'),
    assertEdit: () => auth.assertCan(resource, 'edit'),
    assertDelete: () => auth.assertCan(resource, 'delete'),
    assertExport: () => auth.assertCan(resource, 'export'),
    assertAction: (action: PermissionAction) => auth.assertCan(resource, action),
  });

  return {
    ...auth,
    forResource,
    canView: (resource: PermissionResource) => auth.can(resource, 'view'),
    canCreate: (resource: PermissionResource) => auth.can(resource, 'create'),
    canEdit: (resource: PermissionResource) =>
      auth.can(resource, 'edit') || auth.can(resource, 'update'),
    canDelete: (resource: PermissionResource) => auth.can(resource, 'delete'),
    canExport: (resource: PermissionResource) => auth.can(resource, 'export'),
    canManage: (resource: PermissionResource) => auth.canManage(resource),
    assertAction: (resource: PermissionResource, action: PermissionAction) =>
      auth.assertCan(resource, action),
  };
}
