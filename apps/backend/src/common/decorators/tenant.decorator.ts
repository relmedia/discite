import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@repo/shared';

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    // If user is SUPERADMIN and X-Tenant-Id header is present, use it for tenant switching
    if (user?.role === UserRole.SUPERADMIN) {
      const headerTenantId = request.headers['x-tenant-id'] as string;
      if (headerTenantId) {
        return headerTenantId;
      }
    }
    
    // Otherwise, get tenantId from authenticated user (set by JWT strategy) or middleware
    return user?.tenantId || request.tenantId;
  },
);

export const TenantSubdomain = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenantSubdomain;
  },
);