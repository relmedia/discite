import 'reflect-metadata';
import { DataSource } from 'typeorm';
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

async function listUsers() {
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
    console.log('✅ Connected to database\n');

    const userRepository = dataSource.getRepository(UserEntity);
    const users = await userRepository.find({
      relations: ['tenant'],
    });

    console.log(`Found ${users.length} user(s):\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    users.forEach((user, index) => {
      console.log(`User #${index + 1}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Tenant: ${user.tenant.subdomain} (${user.tenant.name})`);
      console.log(`  Has Password: ${user.passwordHash ? 'Yes' : 'No (OAuth only)'}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

listUsers();
