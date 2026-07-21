export type UserRole =
  | 'OWNER'
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'MANAGER'
  | 'EMPLOYEE';

export type PermissionAction =
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'edit'
  | 'export';

export type PermissionResource =
  | 'dashboard'
  | 'programs'
  | 'chemicals'
  | 'fabrics'
  | 'stains'
  | 'careSymbols'
  | 'priceList'
  | 'employees'
  | 'shifts'
  | 'training'
  | 'inventory'
  | 'admin'
  | 'leaves';

export type AdminType = 'Admin';

export type AuthUser = {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  isOwner: boolean;
  isProtected: boolean;
  isActive: boolean;
  adminType: AdminType;
  laundryEmployeeId?: string | null;
};

export type AuthSession = {
  user: AuthUser;
  signedInAt: string;
};
