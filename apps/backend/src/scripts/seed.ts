import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { TenantEntity } from '../infrastructure/database/entities/tenant.entity';
import { UserEntity } from '../infrastructure/database/entities/user.entity';
import { GroupEntity } from '../infrastructure/database/entities/group.entity';
import { runSeeds } from '../infrastructure/database/seeds';

// Load environment variables
config();

const configService = new ConfigService();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get('DB_PORT', 5432),
  username: configService.get('DB_USERNAME', 'postgres'),
  password: configService.get('DB_PASSWORD', 'postgres'),
  database: configService.get('DB_DATABASE', 'myapp'),
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
