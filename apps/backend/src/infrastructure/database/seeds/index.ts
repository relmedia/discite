import { DataSource } from 'typeorm';
import { seedSuperadmin } from './superadmin.seed';
import { seedPublicTenant } from './public-tenant.seed';

export async function runSeeds(dataSource: DataSource) {
  try {
    console.log('🌱 Running database seeds...\n');

    // Seed public tenant first (needed for public registrations)
    await seedPublicTenant(dataSource);

    // Seed superadmin
    await seedSuperadmin(dataSource);

    console.log('\n✅ All seeds completed successfully!');
  } catch (error) {
    console.error('❌ Error running seeds:', error);
    throw error;
  }
}
