/**
 * Roles and capabilities (spec §5, §49).
 *
 * This module is the single source of truth. The database seed writes these
 * rows and API routes check against these keys, so the two cannot drift.
 *
 * Checks are always server-side. Hiding a button in the UI is a courtesy to the
 * user, never a security control.
 *
 * SCOPE is a separate axis and is NOT encoded here. "Manager, own branch only"
 * is expressed by UserRole.branchId, where NULL means organisation-wide.
 * Numeric ceilings (a waiter maximum discount) arrive with discounts in M6.
 */

export const ROLE_KEYS = [
  'SUPER_ADMIN',
  'OWNER',
  'MANAGER',
  'CASHIER',
  'WAITER',
  'KITCHEN',
  'INVENTORY',
] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];

export const PERMISSION_KEYS = [
  // platform
  'org.manage',
  'subscription.manage',
  // organisation
  'branch.manage',
  'staff.manage',
  'device.enrol',
  'settings.write',
  'audit.view',
  // menu
  'menu.write',
  'product.price.write',
  // service
  'order.create',
  'order.send_kitchen',
  'order.void',
  'table.manage',
  'kitchen.view',
  'kitchen.update',
  // money
  'payment.take',
  'payment.refund',
  'discount.apply',
  'shift.open',
  'shift.close',
  'cash.drawer',
  // stock
  'inventory.write',
  'purchase_order.write',
  // reporting
  'report.financial',
  'report.inventory',
  // people
  'customer.write',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

/** Everything a person on the floor needs to take an order and run a table. */
const SERVICE_FLOOR: readonly PermissionKey[] = [
  'order.create',
  'order.send_kitchen',
  'table.manage',
  'kitchen.view',
  'kitchen.update',
  'customer.write',
];

/**
 * Which capabilities each role carries.
 *
 * Written out per role rather than derived by inheritance: a reviewer has to be
 * able to read a role's exact powers without composing three levels of
 * "extends", and a capability leaking down a hierarchy by accident is precisely
 * the bug this table exists to prevent.
 */
export const ROLE_PERMISSIONS: Readonly<Record<RoleKey, readonly PermissionKey[]>> = {
  SUPER_ADMIN: PERMISSION_KEYS,

  OWNER: PERMISSION_KEYS.filter((key) => key !== 'org.manage' && key !== 'subscription.manage'),

  MANAGER: [
    'branch.manage',
    'staff.manage',
    'device.enrol',
    'settings.write',
    'audit.view',
    'menu.write',
    'product.price.write',
    ...SERVICE_FLOOR,
    'order.void',
    'payment.take',
    'payment.refund',
    'discount.apply',
    'shift.open',
    'shift.close',
    'cash.drawer',
    'inventory.write',
    'purchase_order.write',
    'report.financial',
    'report.inventory',
  ],

  CASHIER: [
    ...SERVICE_FLOOR,
    'payment.take',
    'discount.apply',
    'shift.open',
    'shift.close',
    'cash.drawer',
  ],

  WAITER: SERVICE_FLOOR,

  KITCHEN: ['kitchen.view', 'kitchen.update'],

  INVENTORY: ['inventory.write', 'purchase_order.write', 'report.inventory'],
};

export const ROLE_NAMES: Readonly<Record<RoleKey, string>> = {
  SUPER_ADMIN: 'Super Admin',
  OWNER: 'Restaurant Owner',
  MANAGER: 'Branch Manager',
  CASHIER: 'Cashier',
  WAITER: 'Waiter',
  KITCHEN: 'Kitchen Staff',
  INVENTORY: 'Inventory Manager',
};

export function roleHasPermission(role: RoleKey, permission: PermissionKey): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** True when any of the roles a user holds grants the capability. */
export function rolesHavePermission(
  roles: readonly RoleKey[],
  permission: PermissionKey,
): boolean {
  return roles.some((role) => roleHasPermission(role, permission));
}
