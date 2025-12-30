import { DataSource } from 'typeorm';
import { TenantEntity, TenantType } from '../entities/tenant.entity';

export async function seedPublicTenant(dataSource: DataSource) {
  const tenantRepo = dataSource.getRepository(TenantEntity);

  console.log('📦 Seeding public tenant...');

  // Check if public tenant already exists
  let publicTenant = await tenantRepo.findOne({
    where: { subdomain: 'public' },
  });

  if (publicTenant) {
    // Ensure it has the PUBLIC type
    if (publicTenant.type !== TenantType.PUBLIC) {
      publicTenant.type = TenantType.PUBLIC;
      await tenantRepo.save(publicTenant);
      console.log('  ✓ Updated existing public tenant with PUBLIC type');
    } else {
      console.log('  ✓ Public tenant already exists');
    }
    return publicTenant;
  }

  // Create new public tenant
  publicTenant = tenantRepo.create({
    name: 'Individual Learners',
    subdomain: 'public',
    type: TenantType.PUBLIC,
    isActive: true,
    settings: {
      maxUsers: 999999,
      features: ['basic'],
      customization: {
        theme: 'default',
      },
    },
  });

  await tenantRepo.save(publicTenant);
  console.log('  ✓ Public tenant created');

  return publicTenant;
}

