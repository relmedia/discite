import { UserRole } from '@repo/shared';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPERADMIN]: 5,
  [UserRole.ADMIN]: 4,
  [UserRole.TEAM_LEADER]: 3,
  [UserRole.TRAINER]: 2,
  [UserRole.STUDENT]: 1,
};

export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function canPromoteTo(promoterRole: UserRole, targetRole: UserRole): boolean {
  // A user can only promote to roles below their own level
  return ROLE_HIERARCHY[promoterRole] > ROLE_HIERARCHY[targetRole];
}
