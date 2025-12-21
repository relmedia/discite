export interface ITenantContext {
    tenantId: string;
    tenant: any;
  }
  
  export interface IRepository<T> {
    findById(id: string, tenantId: string): Promise<T | null>;
    findAll(tenantId: string): Promise<T[]>;
    create(data: Partial<T>, tenantId: string): Promise<T>;
    update(id: string, data: Partial<T>, tenantId: string): Promise<T>;
    delete(id: string, tenantId: string): Promise<boolean>;
  }