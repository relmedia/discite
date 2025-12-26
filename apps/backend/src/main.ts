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
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) {
        callback(null, true);
        return;
      }
      
      // Allow any localhost origin for development
      if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
        callback(null, true);
        return;
      }
      
      // Check against FRONTEND_URL (allow both http and https)
      if (process.env.FRONTEND_URL) {
        const frontendDomain = process.env.FRONTEND_URL.replace(/^https?:\/\//, '');
        const originDomain = origin.replace(/^https?:\/\//, '');
        
        if (originDomain === frontendDomain || originDomain === `www.${frontendDomain}`) {
          callback(null, true);
          return;
        }
      }
      
      // In production, also allow the domain from environment
      if (process.env.NODE_ENV === 'production' && process.env.ALLOWED_ORIGINS) {
        const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
        if (allowedOrigins.some(allowed => origin.includes(allowed))) {
          callback(null, true);
          return;
        }
      }
      
      console.log(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
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
