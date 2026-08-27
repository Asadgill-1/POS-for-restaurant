import { describe, expect, it } from 'vitest';
import {
  PERMISSION_KEYS,
  ROLE_KEYS,
  ROLE_PERMISSIONS,
  roleHasPermission,
  rolesHavePermission,
  type PermissionKey,
  type RoleKey,
} from './permissions.ts';

describe('catalogue integrity', () => {
  it('has an entry for every role', () => {
    for (const role of ROLE_KEYS) {
      expect(ROLE_PERMISSIONS[role]).toBeDefined();
    }
  });

  it('grants only permissions that exist, so a typo cannot become a silent deny', () => {
    for (const role of ROLE_KEYS) {
      for (const permission of ROLE_PERMISSIONS[role]) {
        expect(PERMISSION_KEYS).toContain(permission);
      }
    }
  });

  it('lists no permission twice within a role', () => {
    for (const role of ROLE_KEYS) {
      const granted = ROLE_PERMISSIONS[role];
      expect(new Set(granted).size).toBe(granted.length);
    }
  });
});

describe('the security matrix (spec §94)', () => {
  // The denials the specification calls out by name. If one of these ever
  // flips to true, that is a privilege escalation, not a failing test.
  const mustDeny: [RoleKey, PermissionKey][] = [
    ['WAITER', 'payment.refund'],
    ['WAITER', 'payment.take'],
    ['WAITER', 'report.financial'],
    ['WAITER', 'order.void'],
    ['WAITER', 'product.price.write'],
    ['CASHIER', 'payment.refund'],
    ['CASHIER', 'report.financial'],
    ['CASHIER', 'settings.write'],
    ['CASHIER', 'order.void'],
    ['KITCHEN', 'report.financial'],
    ['KITCHEN', 'payment.take'],
    ['KITCHEN', 'order.create'],
    ['INVENTORY', 'report.financial'],
    ['INVENTORY', 'payment.take'],
    ['MANAGER', 'org.manage'],
    ['MANAGER', 'subscription.manage'],
    ['OWNER', 'org.manage'],
    ['OWNER', 'subscription.manage'],
  ];

  it.each(mustDeny)('%s must NOT have %s', (role, permission) => {
    expect(roleHasPermission(role, permission)).toBe(false);
  });

  const mustAllow: [RoleKey, PermissionKey][] = [
    ['WAITER', 'order.create'],
    ['WAITER', 'order.send_kitchen'],
    ['WAITER', 'table.manage'],
    ['CASHIER', 'payment.take'],
    ['CASHIER', 'cash.drawer'],
    ['CASHIER', 'shift.open'],
    ['MANAGER', 'payment.refund'],
    ['MANAGER', 'order.void'],
    ['MANAGER', 'audit.view'],
    ['MANAGER', 'device.enrol'],
    ['KITCHEN', 'kitchen.update'],
    ['INVENTORY', 'inventory.write'],
    ['OWNER', 'report.financial'],
    ['SUPER_ADMIN', 'org.manage'],
  ];

  it.each(mustAllow)('%s must have %s', (role, permission) => {
    expect(roleHasPermission(role, permission)).toBe(true);
  });

  it('gives SUPER_ADMIN everything and KITCHEN only its two screens', () => {
    expect(ROLE_PERMISSIONS.SUPER_ADMIN.length).toBe(PERMISSION_KEYS.length);
    expect(ROLE_PERMISSIONS.KITCHEN.length).toBe(2);
  });

  it('never lets a non-platform role reach a platform capability', () => {
    for (const role of ROLE_KEYS) {
      if (role === 'SUPER_ADMIN') continue;
      expect(roleHasPermission(role, 'org.manage')).toBe(false);
      expect(roleHasPermission(role, 'subscription.manage')).toBe(false);
    }
  });
});

describe('rolesHavePermission', () => {
  it('is true when any held role grants it', () => {
    expect(rolesHavePermission(['WAITER', 'MANAGER'], 'payment.refund')).toBe(true);
  });

  it('is false when no held role grants it', () => {
    expect(rolesHavePermission(['WAITER', 'KITCHEN'], 'payment.refund')).toBe(false);
  });

  it('is false for a user with no roles at all', () => {
    expect(rolesHavePermission([], 'order.create')).toBe(false);
  });
});
