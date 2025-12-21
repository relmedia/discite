import { User, UserRole } from '@repo/shared';

export class UserAggregate implements User {
  constructor(
    public readonly id: string,
    public email: string,
    public name: string,
    public readonly tenantId: string,
    public role: UserRole,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {}

  static create(data: {
    email: string;
    name: string;
    tenantId: string;
    role?: UserRole;
  }): Pick<UserAggregate, 'email' | 'name' | 'tenantId' | 'role'> {
    return {
      email: data.email.toLowerCase(),
      name: data.name,
      tenantId: data.tenantId,
      role: data.role || UserRole.STUDENT,
    };
  }

  updateRole(newRole: UserRole): void {
    this.role = newRole;
    this.updatedAt = new Date();
  }

  updateProfile(data: { name?: string; email?: string }): void {
    if (data.name) this.name = data.name;
    if (data.email) this.email = data.email.toLowerCase();
    this.updatedAt = new Date();
  }
}