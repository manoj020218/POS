export const appRoles = [
  'PLATFORM_ADMIN',
  'BUSINESS_OWNER',
  'BUSINESS_ADMIN',
  'BRANCH_MANAGER',
  'CASHIER',
  'INVENTORY_MANAGER',
  'REPORT_VIEWER'
] as const;

export type AppRole = (typeof appRoles)[number];
export const tenantAssignableRoles = [
  'BUSINESS_OWNER',
  'BUSINESS_ADMIN',
  'BRANCH_MANAGER',
  'CASHIER',
  'INVENTORY_MANAGER',
  'REPORT_VIEWER'
] as const;
export type TenantAssignableRole = (typeof tenantAssignableRoles)[number];

const tenantCorePermissions = [
  'business:create',
  'business:update',
  'business:view',
  'branch:create',
  'branch:update',
  'branch:view',
  'terminal:create',
  'terminal:disable',
  'terminal:view'
] as const;

const catalogPermissions = [
  'product:create',
  'product:update',
  'product:view',
  'customer:create',
  'customer:update',
  'customer:view',
  'supplier:create',
  'supplier:update',
  'supplier:view',
  'purchase:create',
  'purchase:update',
  'purchase:view'
] as const;

const operatingPermissions = [
  'inventory:adjust',
  'inventory:view',
  'sale:create',
  'sale:refund',
  'sale:view',
  'report:view',
  'settings:manage',
  'sync:pull',
  'sync:push',
  'user:manage'
] as const;

export const appPermissions = [
  'platform:admin',
  ...tenantCorePermissions,
  ...catalogPermissions,
  ...operatingPermissions
] as const;

export type AppPermission = (typeof appPermissions)[number];

const ownerPermissions = [
  ...tenantCorePermissions,
  ...catalogPermissions,
  ...operatingPermissions
] as const satisfies readonly AppPermission[];

const adminPermissions = [
  ...tenantCorePermissions,
  ...catalogPermissions,
  'inventory:adjust',
  'inventory:view',
  'sale:create',
  'sale:refund',
  'sale:view',
  'report:view',
  'user:manage'
] as const satisfies readonly AppPermission[];

export const rolePermissions = {
  PLATFORM_ADMIN: appPermissions,
  BUSINESS_OWNER: ownerPermissions,
  BUSINESS_ADMIN: adminPermissions,
  BRANCH_MANAGER: [
    'branch:view',
    'terminal:view',
    'product:create',
    'product:update',
    'product:view',
    'customer:create',
    'customer:update',
    'customer:view',
    'inventory:view',
    'sale:create',
    'sale:refund',
    'sale:view',
    'report:view',
    'sync:pull',
    'sync:push'
  ],
  CASHIER: [
    'terminal:view',
    'product:view',
    'customer:create',
    'customer:view',
    'sale:create',
    'sync:pull',
    'sync:push'
  ],
  INVENTORY_MANAGER: [
    'branch:view',
    'terminal:view',
    'product:create',
    'product:update',
    'product:view',
    'supplier:create',
    'supplier:update',
    'supplier:view',
    'purchase:create',
    'purchase:update',
    'purchase:view',
    'inventory:adjust',
    'inventory:view',
    'sync:pull',
    'sync:push'
  ],
  REPORT_VIEWER: ['branch:view', 'product:view', 'inventory:view', 'sale:view', 'report:view']
} satisfies Record<AppRole, readonly AppPermission[]>;

export const hasTenantWideBranchAccess = (role?: AppRole) => {
  return role === 'PLATFORM_ADMIN' || role === 'BUSINESS_OWNER' || role === 'BUSINESS_ADMIN';
};

export const getPermissionsForRoles = (roles: readonly AppRole[]) => {
  return [...new Set(roles.flatMap((role) => rolePermissions[role]))];
};

export const hasAllPermissions = (
  assignedPermissions: readonly AppPermission[],
  requiredPermissions: readonly AppPermission[]
) => {
  return requiredPermissions.every((permission) => assignedPermissions.includes(permission));
};

export const resolveGrantedPermissions = (input: {
  permissions?: readonly AppPermission[];
  role?: AppRole;
}) => {
  return [
    ...new Set([...(input.permissions ?? []), ...getPermissionsForRoles(input.role ? [input.role] : [])])
  ];
};
