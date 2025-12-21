import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import * as dns from 'dns/promises';
import { TenantEntity, TenantType } from '@/infrastructure/database/entities/tenant.entity';
import { TenantAggregate } from '../../domain/tenant.aggregate';
import { CreateTenantDto } from '../../presentation/dto/create-tenant.dto';
import { UpdateTenantDto } from '../../presentation/dto/update-tenant.dto';
import type { DomainVerificationInstructions } from '@repo/shared';

@Injectable()
export class TenantService {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
  ) {}

  async createTenant(dto: CreateTenantDto): Promise<TenantEntity> {
    // Check if subdomain already exists
    const existing = await this.tenantRepository.findOne({
      where: { subdomain: dto.subdomain },
    });

    if (existing) {
      throw new ConflictException('Subdomain already exists');
    }

    // Create tenant using domain logic
    const tenantData = TenantAggregate.create({
      name: dto.name,
      subdomain: dto.subdomain,
      settings: dto.settings,
    });

    const tenant = this.tenantRepository.create(tenantData);
    return await this.tenantRepository.save(tenant);
  }

  async getTenantById(id: string): Promise<TenantEntity> {
    const tenant = await this.tenantRepository.findOne({ where: { id } });
    
    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }
    
    return tenant;
  }

  async getTenantBySubdomain(subdomain: string): Promise<TenantEntity> {
    const tenant = await this.tenantRepository.findOne({ where: { subdomain } });
    
    if (!tenant) {
      throw new NotFoundException(`Tenant with subdomain ${subdomain} not found`);
    }
    
    return tenant;
  }

  async getAllTenants(): Promise<TenantEntity[]> {
    return await this.tenantRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async updateTenant(id: string, dto: UpdateTenantDto): Promise<TenantEntity> {
    const tenant = await this.getTenantById(id);

    // Update only the fields that are provided
    if (dto.name !== undefined) {
      tenant.name = dto.name;
    }

    if (dto.isActive !== undefined) {
      tenant.isActive = dto.isActive;
    }

    if (dto.settings !== undefined) {
      tenant.settings = { ...tenant.settings, ...dto.settings };
    }

    return await this.tenantRepository.save(tenant);
  }

  async deleteTenant(id: string): Promise<void> {
    const tenant = await this.getTenantById(id);

    // Prevent deletion of the public tenant (Individual Learners)
    if (tenant.type === TenantType.PUBLIC) {
      throw new BadRequestException('Cannot delete the Individual Learners tenant');
    }

    await this.tenantRepository.remove(tenant);
  }

  /**
   * Set custom domain for a tenant
   */
  async setCustomDomain(
    id: string,
    customDomain: string,
  ): Promise<{ tenant: TenantEntity; verificationInstructions: DomainVerificationInstructions }> {
    const tenant = await this.getTenantById(id);

    // Check if domain is already used by another tenant
    const existingTenant = await this.tenantRepository.findOne({
      where: { customDomain },
    });

    if (existingTenant && existingTenant.id !== id) {
      throw new ConflictException('This domain is already in use by another tenant');
    }

    // Generate verification token
    const verificationToken = randomBytes(32).toString('hex');

    tenant.customDomain = customDomain;
    tenant.customDomainVerified = false;
    tenant.customDomainVerificationToken = verificationToken;

    const savedTenant = await this.tenantRepository.save(tenant);

    return {
      tenant: savedTenant,
      verificationInstructions: {
        type: 'TXT',
        name: `_discite-verification.${customDomain}`,
        value: `discite-verify=${verificationToken}`,
      },
    };
  }

  /**
   * Remove custom domain from a tenant
   */
  async removeCustomDomain(id: string): Promise<TenantEntity> {
    const tenant = await this.getTenantById(id);

    tenant.customDomain = null;
    tenant.customDomainVerified = false;
    tenant.customDomainVerificationToken = null;

    return await this.tenantRepository.save(tenant);
  }

  /**
   * Verify custom domain ownership via DNS TXT record
   */
  async verifyCustomDomain(id: string): Promise<{ verified: boolean; message: string }> {
    const tenant = await this.getTenantById(id);

    if (!tenant.customDomain) {
      throw new BadRequestException('No custom domain configured for this tenant');
    }

    if (tenant.customDomainVerified) {
      return { verified: true, message: 'Domain is already verified' };
    }

    try {
      // Check for TXT record: _discite-verification.{domain}
      const txtRecords = await dns.resolveTxt(`_discite-verification.${tenant.customDomain}`);
      const flatRecords = txtRecords.flat();

      const expectedValue = `discite-verify=${tenant.customDomainVerificationToken}`;

      if (flatRecords.includes(expectedValue)) {
        tenant.customDomainVerified = true;
        await this.tenantRepository.save(tenant);
        return { verified: true, message: 'Domain verified successfully' };
      }

      return {
        verified: false,
        message: 'Verification TXT record not found. Please add the DNS record and try again.',
      };
    } catch (error) {
      return {
        verified: false,
        message: 'Could not verify domain. Please ensure DNS records are properly configured.',
      };
    }
  }

  /**
   * Get verification instructions for a tenant's custom domain
   */
  async getVerificationInstructions(id: string): Promise<DomainVerificationInstructions | null> {
    const tenant = await this.getTenantById(id);

    if (!tenant.customDomain || !tenant.customDomainVerificationToken) {
      return null;
    }

    return {
      type: 'TXT',
      name: `_discite-verification.${tenant.customDomain}`,
      value: `discite-verify=${tenant.customDomainVerificationToken}`,
    };
  }

  /**
   * Get tenant by custom domain
   */
  async getTenantByCustomDomain(customDomain: string): Promise<TenantEntity | null> {
    return await this.tenantRepository.findOne({
      where: {
        customDomain,
        customDomainVerified: true,
        isActive: true,
      },
    });
  }
}