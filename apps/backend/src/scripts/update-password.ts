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

async function updateSuperadminPassword() {
  // Create database connection
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

    const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL;
    const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD;

    if (!SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD) {
      console.error('❌ Missing required environment variables: SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD');
      console.log('💡 Set these in your .env file or pass them as environment variables');
      await dataSource.destroy();
      process.exit(1);
    }

    console.log('🔍 Looking for superadmin with email:', SUPERADMIN_EMAIL);

    // Find the superadmin user
    const superadmin = await userRepository.findOne({
      where: { email: SUPERADMIN_EMAIL },
    });

    if (!superadmin) {
      console.error('❌ Superadmin not found with email:', SUPERADMIN_EMAIL);
      console.log('💡 Make sure the email matches the one in your database');
      await dataSource.destroy();
      return;
    }

    console.log('✅ Found superadmin user');
    console.log('🔐 Hashing new password...');

    // Hash the new password
    const passwordHash = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);

    console.log('💾 Updating password in database...');

    // Update the password
    await userRepository.update(
      { email: SUPERADMIN_EMAIL },
      { passwordHash }
    );

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Superadmin password updated successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', SUPERADMIN_EMAIL);
    console.log('🔑 Password:', SUPERADMIN_PASSWORD);
    console.log('🌐 Tenant: You need to login with the "system" subdomain');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('You can now login with these credentials!');

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error updating password:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

updateSuperadminPassword();
