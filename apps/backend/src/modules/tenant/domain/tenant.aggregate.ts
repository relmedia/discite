import { Tenant, TenantSettings, TenantType } from '@repo/shared';

export class TenantAggregate implements Tenant {
  constructor(
    public readonly id: string,
    public name: string,
    public subdomain: string,
    public type: TenantType,
    public isActive: boolean,
    public settings: TenantSettings,
    public customDomain: string | null,
    public customDomainVerified: boolean,
    public customDomainVerificationToken: string | null,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  static create(data: {
    name: string;
    subdomain: string;
    type?: TenantType;
    settings?: Partial<TenantSettings>;
  }): Pick<TenantAggregate, 'name' | 'subdomain' | 'type' | 'isActive' | 'settings' | 'customDomain' | 'customDomainVerified' | 'customDomainVerificationToken'> {
    return {
      name: data.name,
      subdomain: data.subdomain.toLowerCase(),
      type: data.type || TenantType.ORGANIZATION,
      isActive: true,
      settings: {
        maxUsers: data.settings?.maxUsers || 10,
        features: data.settings?.features || ['basic'],
        customization: {
          theme: data.settings?.customization?.theme || 'default',
          logo: data.settings?.customization?.logo,
        },
      },
      customDomain: null,
      customDomainVerified: false,
      customDomainVerificationToken: null,
    };
  }

  updateSettings(newSettings: Partial<TenantSettings>): void {
    this.settings = {
      ...this.settings,
      ...newSettings,
    };
    this.updatedAt = new Date();
  }

  deactivate(): void {
    this.isActive = false;
    this.updatedAt = new Date();
  }

  activate(): void {
    this.isActive = true;
    this.updatedAt = new Date();
  }
}