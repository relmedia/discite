import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { TenantEntity } from './infrastructure/database/entities/tenant.entity';
import { TenantType } from '@repo/shared';

async function ensurePublicTenant(dataSource: DataSource) {
  const tenantRepo = dataSource.getRepository(TenantEntity);

  // Check if public tenant exists
  let publicTenant = await tenantRepo.findOne({
    where: { subdomain: 'public' },
  });

  if (!publicTenant) {
    console.log('📦 Creating public tenant...');
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
    console.log('✅ Public tenant created');
  } else if (publicTenant.type !== TenantType.PUBLIC) {
    publicTenant.type = TenantType.PUBLIC;
    await tenantRepo.save(publicTenant);
    console.log('✅ Public tenant updated');
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  
  app.enableCors({
    origin: (origin, callback) => {
      // Allow any localhost origin for development
      if (!origin || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  // Ensure public tenant exists on startup
  const dataSource = app.get(DataSource);
  await ensurePublicTenant(dataSource);
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}`);
}

bootstrap();
