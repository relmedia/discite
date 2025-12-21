import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { TenantEntity } from '../infrastructure/database/entities/tenant.entity';
import { TenantType } from '../infrastructure/database/entities/tenant.entity';

async function bootstrap() {
  console.log('🚀 Starting public tenant seed...\n');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const tenantRepo = dataSource.getRepository(TenantEntity);

  // Check if public tenant already exists
  let publicTenant = await tenantRepo.findOne({
    where: { type: TenantType.PUBLIC },
  });

  if (publicTenant) {
    console.log('✅ Public tenant already exists:');
    console.log(`   Name: ${publicTenant.name}`);
    console.log(`   Subdomain: ${publicTenant.subdomain}`);
    console.log(`   ID: ${publicTenant.id}`);
  } else {
    // Also check by subdomain in case the type wasn't set
    publicTenant = await tenantRepo.findOne({
      where: { subdomain: 'public' },
    });

    if (publicTenant) {
      // Update existing tenant to have PUBLIC type
      publicTenant.type = TenantType.PUBLIC;
      publicTenant.settings = {
        maxUsers: 999999,
        features: ['basic'],
        customization: {
          theme: 'default',
        },
      };
      await tenantRepo.save(publicTenant);
      console.log('✅ Updated existing public tenant with PUBLIC type');
    } else {
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
      publicTenant = await tenantRepo.save(publicTenant);
      console.log('🎉 Public tenant created:');
      console.log(`   Name: ${publicTenant.name}`);
      console.log(`   Subdomain: ${publicTenant.subdomain}`);
      console.log(`   ID: ${publicTenant.id}`);
    }
  }

  // Update all existing tenants to ORGANIZATION type if they don't have a type
  const tenantsWithoutType = await tenantRepo
    .createQueryBuilder('tenant')
    .where('tenant.type IS NULL OR tenant.type = :empty', { empty: '' })
    .getMany();

  if (tenantsWithoutType.length > 0) {
    console.log(`\n📝 Updating ${tenantsWithoutType.length} tenants to ORGANIZATION type...`);
    for (const tenant of tenantsWithoutType) {
      if (tenant.id !== publicTenant.id) {
        tenant.type = TenantType.ORGANIZATION;
        await tenantRepo.save(tenant);
        console.log(`   Updated: ${tenant.name}`);
      }
    }
  }

  console.log('\n✅ Public tenant seed completed!');
  await app.close();
}

bootstrap().catch((error) => {
  console.error('❌ Error seeding public tenant:', error);
  process.exit(1);
});

