import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { TenantEntity } from '../infrastructure/database/entities/tenant.entity';
import { UserEntity } from '../infrastructure/database/entities/user.entity';
import { GroupEntity } from '../infrastructure/database/entities/group.entity';
import { runSeeds } from '../infrastructure/database/seeds';

// Load environment variables from the backend .env file
// Try multiple possible locations (handles both dev and compiled scenarios)
const possibleEnvPaths = [
  resolve(__dirname, '../../.env'),                    // From src/scripts (dev)
  resolve(__dirname, '../../../../../apps/backend/.env'), // From dist/apps/backend/src/scripts (compiled)
  resolve(process.cwd(), '.env'),                      // Current working directory
  resolve(process.cwd(), 'apps/backend/.env'),         // From project root
];

const envPath = possibleEnvPaths.find(p => existsSync(p));
if (envPath) {
  console.log(`Loading environment from: ${envPath}`);
  config({ path: envPath });
} else {
  console.warn('Warning: No .env file found, using environment variables');
  config();
}

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'myapp',
  entities: [TenantEntity, UserEntity, GroupEntity],
  synchronize: false,
  logging: false,
});

async function seed() {
  try {
    console.log('Connecting to database...');
    await AppDataSource.initialize();
    console.log('✓ Database connected\n');

    await runSeeds(AppDataSource);

    await AppDataSource.destroy();
    console.log('\n✓ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

seed();
