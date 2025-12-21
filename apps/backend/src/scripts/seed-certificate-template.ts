import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { CertificateTemplateEntity } from '../infrastructure/database/entities/certificate-template.entity';
import { TenantEntity } from '../infrastructure/database/entities/tenant.entity';
import { TenantType } from '../infrastructure/database/entities/tenant.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  const tenantRepo = dataSource.getRepository(TenantEntity);

  // First, ensure the public tenant exists
  let publicTenant = await tenantRepo.findOne({
    where: { type: TenantType.PUBLIC },
  });

  if (!publicTenant) {
    console.log('Creating public tenant for individual learners...');
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
    console.log(`🎉 Public tenant created: ${publicTenant.name} (${publicTenant.id})`);
  } else {
    console.log(`✅ Public tenant already exists: ${publicTenant.name}`);
  }

  // Get the first organization tenant for certificate template
  const tenant = await tenantRepo.findOne({ 
    where: { type: TenantType.ORGANIZATION },
  });

  if (!tenant) {
    console.log('ℹ️ No organization tenant found. Certificate template will be created for public tenant.');
  }

  const targetTenant = tenant || publicTenant;
  console.log(`✅ Using tenant for certificate template: ${targetTenant.name} (${targetTenant.id})`);

  const templateRepo = dataSource.getRepository(CertificateTemplateEntity);

  // Check if default template already exists
  const existingTemplate = await templateRepo.findOne({
    where: { tenantId: targetTenant.id, isDefault: true },
  });

  if (existingTemplate) {
    console.log('✅ Default template already exists:', existingTemplate.name);
    await app.close();
    return;
  }

  // Create default template
  const defaultTemplate = templateRepo.create({
    tenantId: targetTenant.id,
    name: 'Professional Certificate',
    description: 'A classic professional certificate design with elegant styling',
    design: {
      backgroundColor: '#FFFEF7',
      primaryColor: '#1A1A2E',
      secondaryColor: '#4A5568',
      fontFamily: 'Georgia',
      borderStyle: 'ornate',
      layout: 'classic',
    },
    titleText: 'Certificate of Completion',
    bodyTemplate: `This is to certify that

{{studentName}}

has successfully completed the course

{{courseName}}

on {{completionDate}}

demonstrating dedication and mastery of the subject matter.`,
    signatureText: 'Course Instructor',
    isDefault: true,
    isActive: true,
  });

  await templateRepo.save(defaultTemplate);
  console.log('✅ Default certificate template created successfully!');
  console.log('   Name:', defaultTemplate.name);
  console.log('   ID:', defaultTemplate.id);

  // Create a modern template as well
  const modernTemplate = templateRepo.create({
    tenantId: targetTenant.id,
    name: 'Modern Certificate',
    description: 'A clean, modern certificate design',
    design: {
      backgroundColor: '#FFFFFF',
      primaryColor: '#2563EB',
      secondaryColor: '#64748B',
      fontFamily: 'sans-serif',
      borderStyle: 'modern',
      layout: 'modern',
    },
    titleText: 'Certificate of Achievement',
    bodyTemplate: `Awarded to

{{studentName}}

For successfully completing

{{courseName}}

{{completionDate}}`,
    signatureText: 'Instructor',
    isDefault: false,
    isActive: true,
  });

  await templateRepo.save(modernTemplate);
  console.log('✅ Modern certificate template created!');
  console.log('   Name:', modernTemplate.name);
  console.log('   ID:', modernTemplate.id);

  await app.close();
}

bootstrap();

