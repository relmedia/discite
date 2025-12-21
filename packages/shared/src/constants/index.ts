export const TENANT_HEADER = 'X-Tenant-ID';
export const TENANT_SUBDOMAIN_HEADER = 'X-Tenant-Subdomain';
export const TENANT_CUSTOM_DOMAIN_HEADER = 'X-Tenant-Custom-Domain';

export const DATABASE_ERRORS = {
  NOT_FOUND: 'ENTITY_NOT_FOUND',
  DUPLICATE: 'DUPLICATE_ENTRY',
  CONSTRAINT: 'CONSTRAINT_VIOLATION'
} as const;