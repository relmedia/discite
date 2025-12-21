import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { TenantEntity } from '../entities/tenant.entity';
import { UserEntity } from '../entities/user.entity';
import { UserRole } from '@repo/shared';

export async function seedSuperadmin(dataSource: DataSource) {
  const tenantRepository = dataSource.getRepository(TenantEntity);
  const userRepository = dataSource.getRepository(UserEntity);

  // Superadmin credentials
  const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'superadmin@discite.com';
  const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin@123';
  const SUPERADMIN_NAME = process.env.SUPERADMIN_NAME || 'Super Administrator';

  console.log('🌱 Starting superadmin seed...');

  // Check if superadmin already exists
  const existingSuperadmin = await userRepository.findOne({
    where: { email: SUPERADMIN_EMAIL },
  });

  if (existingSuperadmin) {
    console.log('✓ Superadmin already exists:', SUPERADMIN_EMAIL);

    // Update to SUPERADMIN role if not already
    if (existingSuperadmin.role !== UserRole.SUPERADMIN) {
      await userRepository.update(
        { email: SUPERADMIN_EMAIL },
        { role: UserRole.SUPERADMIN }
      );
      console.log('✓ Updated existing user to SUPERADMIN role');
    }

    return;
  }

  // Create or get the default tenant for superadmin
  let tenant = await tenantRepository.findOne({
    where: { subdomain: 'system' },
  });

  if (!tenant) {
    tenant = tenantRepository.create({
      name: 'System',
      subdomain: 'system',
      isActive: true,
      settings: {
        maxUsers: -1, // Unlimited
        features: ['all'],
        customization: {
          theme: 'default',
        },
      },
    });
    await tenantRepository.save(tenant);
    console.log('✓ Created system tenant');
  }

  // Hash the password
  const passwordHash = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);

  // Create superadmin user
  const superadmin = userRepository.create({
    email: SUPERADMIN_EMAIL,
    name: SUPERADMIN_NAME,
    tenantId: tenant.id,
    role: UserRole.SUPERADMIN,
    passwordHash,
  });

  await userRepository.save(superadmin);

  console.log('✓ Superadmin account created successfully!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 Email:', SUPERADMIN_EMAIL);
  console.log('🔑 Password:', SUPERADMIN_PASSWORD);
  console.log('⚠️  Please change the password after first login!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}
