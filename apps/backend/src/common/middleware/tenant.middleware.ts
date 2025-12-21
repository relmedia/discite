import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TENANT_HEADER, TENANT_SUBDOMAIN_HEADER, TENANT_CUSTOM_DOMAIN_HEADER } from '@repo/shared';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenantSubdomain?: string;
      tenantCustomDomain?: string;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const tenantId = req.headers[TENANT_HEADER.toLowerCase()] as string;
    const tenantSubdomain = req.headers[TENANT_SUBDOMAIN_HEADER.toLowerCase()] as string;
    const tenantCustomDomain = req.headers[TENANT_CUSTOM_DOMAIN_HEADER.toLowerCase()] as string;

    // Skip tenant validation for public endpoints
    const publicPaths = ['/api/tenants', '/api/auth/login', '/api/auth/register'];
    const isPublicPath = publicPaths.some((path) => req.path.startsWith(path));

    if (isPublicPath) {
      return next();
    }

    // Skip tenant header check if Authorization header is present
    // (tenant info will be extracted from JWT token by TenantId decorator)
    const hasAuthToken = req.headers.authorization?.startsWith('Bearer ');
    if (hasAuthToken) {
      return next();
    }

    if (!tenantId && !tenantSubdomain && !tenantCustomDomain) {
      throw new BadRequestException('Tenant information is required');
    }

    req.tenantId = tenantId;
    req.tenantSubdomain = tenantSubdomain;
    req.tenantCustomDomain = tenantCustomDomain;

    next();
  }
}
