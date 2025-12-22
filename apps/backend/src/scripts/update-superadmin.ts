import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { UserEntity } from '../infrastructure/database/entities/user.entity';
import { TenantEntity } from '../infrastructure/database/entities/tenant.entity';
import { GroupEntity } from '../infrastructure/database/entities/group.entity';
import { CourseEntity } from '../infrastructure/database/entities/course.entity';
import { LessonEntity } from '../infrastructure/database/entities/lesson.entity';
import { QuizEntity } from '../infrastructure/database/entities/quiz.entity';
import { EnrollmentEntity } from '../infrastructure/database/entities/enrollment.entity';
import { UserRole } from '@repo/shared';

// Load environment variables from the backend .env file
const possibleEnvPaths = [
  resolve(__dirname, '../../.env'),
  resolve(__dirname, '../../../../../apps/backend/.env'),
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), 'apps/backend/.env'),
];
const envPath = possibleEnvPaths.find(p => existsSync(p));
if (envPath) {
  console.log(`Loading environment from: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

async function updateSuperadmin() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'myapp',
    entities: [
      TenantEntity,
      UserEntity,
      GroupEntity,
      CourseEntity,
      LessonEntity,
      QuizEntity,
      EnrollmentEntity,
    ],
    synchronize: false,
  });

  try {
    console.log('📡 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Connected to database');

    const userRepository = dataSource.getRepository(UserEntity);

    const NEW_EMAIL = process.env.SUPERADMIN_EMAIL;
    const NEW_PASSWORD = process.env.SUPERADMIN_PASSWORD;
    const NEW_NAME = process.env.SUPERADMIN_NAME || 'SuperAdmin';

    if (!NEW_EMAIL || !NEW_PASSWORD) {
      console.error('❌ Missing required environment variables: SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD');
      console.log('💡 Set these in your .env file or pass them as environment variables');
      await dataSource.destroy();
      process.exit(1);
    }

    console.log('🔍 Looking for existing SUPERADMIN user...');

    // Find the existing superadmin user (regardless of email)
    const existingSuperadmin = await userRepository.findOne({
      where: { role: UserRole.SUPERADMIN },
      relations: ['tenant'],
    });

    if (!existingSuperadmin) {
      console.error('❌ No SUPERADMIN user found in the database');
      console.log('💡 You may need to run the seed script first');
      await dataSource.destroy();
      return;
    }

    console.log(`✅ Found SUPERADMIN user: ${existingSuperadmin.email}`);
    console.log('🔐 Hashing new password...');

    // Hash the new password
    const passwordHash = await bcrypt.hash(NEW_PASSWORD, 10);

    console.log('💾 Updating superadmin credentials...');

    // Update email, name, and password
    await userRepository.update(
      { id: existingSuperadmin.id },
      {
        email: NEW_EMAIL.toLowerCase(),
        name: NEW_NAME,
        passwordHash
      }
    );

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Superadmin credentials updated successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', NEW_EMAIL);
    console.log('🔑 Password:', NEW_PASSWORD);
    console.log('👤 Name:', NEW_NAME);
    console.log(`🌐 Tenant: ${existingSuperadmin.tenant.subdomain} (${existingSuperadmin.tenant.name})`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('✨ You can now login with these new credentials!');
    console.log(`   Use tenant subdomain: "${existingSuperadmin.tenant.subdomain}"`);

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error updating superadmin:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

updateSuperadmin();
