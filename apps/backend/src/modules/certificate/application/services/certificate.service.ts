import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CertificateEntity } from '@/infrastructure/database/entities/certificate.entity';
import { CertificateTemplateEntity, CertificateDesign } from '@/infrastructure/database/entities/certificate-template.entity';
import { CourseEntity } from '@/infrastructure/database/entities/course.entity';
import { EnrollmentEntity, EnrollmentStatus } from '@/infrastructure/database/entities/enrollment.entity';
import { UserEntity } from '@/infrastructure/database/entities/user.entity';
import { CreateCertificateTemplateDto } from '../../presentation/dto/create-certificate-template.dto';
import { UpdateCertificateTemplateDto } from '../../presentation/dto/update-certificate-template.dto';
import { IssueCertificateDto, RevokeCertificateDto } from '../../presentation/dto/issue-certificate.dto';
import { NotificationService } from '@/modules/notification/application/services/notification.service';
import { randomUUID } from 'crypto';

@Injectable()
export class CertificateService {
  constructor(
    @InjectRepository(CertificateEntity)
    private readonly certificateRepository: Repository<CertificateEntity>,
    @InjectRepository(CertificateTemplateEntity)
    private readonly templateRepository: Repository<CertificateTemplateEntity>,
    @InjectRepository(CourseEntity)
    private readonly courseRepository: Repository<CourseEntity>,
    @InjectRepository(EnrollmentEntity)
    private readonly enrollmentRepository: Repository<EnrollmentEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly notificationService: NotificationService,
  ) {}

  // ============== TEMPLATE METHODS ==============

  async createTemplate(tenantId: string, dto: CreateCertificateTemplateDto): Promise<CertificateTemplateEntity> {
    // If this is being set as default, unset other defaults
    if (dto.isDefault) {
      await this.templateRepository.update(
        { tenantId, isDefault: true },
        { isDefault: false }
      );
    }

    const template = this.templateRepository.create({
      tenantId,
      ...dto,
      design: dto.design as CertificateDesign,
    });

    return this.templateRepository.save(template);
  }

  async updateTemplate(
    tenantId: string,
    templateId: string,
    dto: UpdateCertificateTemplateDto
  ): Promise<CertificateTemplateEntity> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Certificate template not found');
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.templateRepository.update(
        { tenantId, isDefault: true },
        { isDefault: false }
      );
    }

    // Merge design if provided
    if (dto.design) {
      template.design = { ...template.design, ...dto.design };
    }

    Object.assign(template, {
      ...dto,
      design: dto.design ? template.design : template.design,
    });

    return this.templateRepository.save(template);
  }

  async getTemplates(tenantId: string): Promise<CertificateTemplateEntity[]> {
    return this.templateRepository.find({
      where: { tenantId, isActive: true },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async getTemplateById(tenantId: string, templateId: string): Promise<CertificateTemplateEntity> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Certificate template not found');
    }

    return template;
  }

  async deleteTemplate(tenantId: string, templateId: string): Promise<void> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId, tenantId },
    });

    if (!template) {
      throw new NotFoundException('Certificate template not found');
    }

    // Check if template is in use by any courses
    const coursesUsingTemplate = await this.courseRepository.count({
      where: { tenantId, certificateTemplateId: templateId },
    });

    if (coursesUsingTemplate > 0) {
      throw new ConflictException(
        `This template is used by ${coursesUsingTemplate} course(s). Please update those courses before deleting.`
      );
    }

    // Soft delete by setting isActive to false
    template.isActive = false;
    await this.templateRepository.save(template);
  }

  async getDefaultTemplate(tenantId: string): Promise<CertificateTemplateEntity | null> {
    return this.templateRepository.findOne({
      where: { tenantId, isDefault: true, isActive: true },
    });
  }

  // ============== CERTIFICATE METHODS ==============

  async issueCertificate(tenantId: string, dto: IssueCertificateDto): Promise<CertificateEntity> {
    // Verify course exists and has certificates enabled
    const course = await this.courseRepository.findOne({
      where: { id: dto.courseId, tenantId },
      relations: ['instructor'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (!course.enableCertificate) {
      throw new BadRequestException('Certificates are not enabled for this course');
    }

    // Verify enrollment and completion first (this proves user has access to the course)
    const enrollment = await this.enrollmentRepository.findOne({
      where: { userId: dto.userId, courseId: dto.courseId, tenantId },
    });

    if (!enrollment) {
      throw new BadRequestException('User is not enrolled in this course');
    }

    if (enrollment.status !== EnrollmentStatus.COMPLETED && enrollment.progressPercentage < 100) {
      throw new BadRequestException('User has not completed this course');
    }

    // Verify user exists - look up by ID only since enrollment already proves access
    // This allows cross-tenant users (like SUPERADMINs) to receive certificates
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if certificate already exists
    const existingCertificate = await this.certificateRepository.findOne({
      where: { userId: dto.userId, courseId: dto.courseId, tenantId, isRevoked: false },
    });

    if (existingCertificate) {
      throw new ConflictException('Certificate already exists for this user and course');
    }

    // Get template
    const templateId = dto.templateId || course.certificateTemplateId;
    if (!templateId) {
      throw new BadRequestException('No certificate template specified for this course');
    }

    const template = await this.templateRepository.findOne({
      where: { id: templateId, tenantId, isActive: true },
    });

    if (!template) {
      throw new NotFoundException('Certificate template not found');
    }

    // Calculate certificate metadata
    const metadata = this.calculateCertificateMetadata(enrollment);

    // Generate unique certificate number
    const certificateNumber = this.generateCertificateNumber(tenantId);

    // Calculate expiry date if applicable
    let expiryDate: Date | undefined;
    if (course.certificateExpiryMonths) {
      expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + course.certificateExpiryMonths);
    }

    const certificate = this.certificateRepository.create({
      tenantId,
      userId: dto.userId,
      courseId: dto.courseId,
      templateId: template.id,
      certificateNumber,
      studentName: dto.studentNameOverride || user.name,
      courseName: course.title,
      instructorName: course.instructor?.name,
      finalGrade: course.includeGradeOnCertificate ? dto.finalGrade : undefined,
      completionDate: enrollment.completedAt || new Date(),
      issueDate: new Date(),
      expiryDate,
      metadata,
    });

    const savedCertificate = await this.certificateRepository.save(certificate);
    
    // Send notification about certificate issuance
    try {
      await this.notificationService.notifyCertificateIssued(
        dto.userId,
        tenantId,
        course.title,
        savedCertificate.id,
      );
    } catch (error) {
      console.error('Failed to send certificate notification:', error);
    }
    
    // Load template relation for response
    const certificateWithRelations = await this.certificateRepository.findOne({
      where: { id: savedCertificate.id },
      relations: ['template', 'course'],
    });
    
    // Return certificate with relations if found, otherwise return saved certificate
    // (savedCertificate is guaranteed to exist since we just saved it)
    if (certificateWithRelations) {
      return certificateWithRelations;
    }
    return savedCertificate;
  }

  async getCertificatesByUser(_tenantId: string, userId: string): Promise<CertificateEntity[]> {
    // Fetch all certificates for this user regardless of tenant
    // This allows users with cross-tenant access to see all their certificates
    return this.certificateRepository.find({
      where: { userId, isRevoked: false },
      relations: ['course', 'template'],
      order: { issueDate: 'DESC' },
    });
  }

  async getCertificatesByCourse(tenantId: string, courseId: string): Promise<CertificateEntity[]> {
    return this.certificateRepository.find({
      where: { tenantId, courseId },
      relations: ['user', 'template'],
      order: { issueDate: 'DESC' },
    });
  }

  async getCertificateById(_tenantId: string, certificateId: string): Promise<CertificateEntity> {
    // Find certificate by ID only - tenant filtering is relaxed for cross-tenant viewing
    const certificate = await this.certificateRepository.findOne({
      where: { id: certificateId },
      relations: ['course', 'template', 'user'],
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    return certificate;
  }

  async verifyCertificate(certificateNumber: string): Promise<CertificateEntity | null> {
    // Public verification - no tenant restriction
    const certificate = await this.certificateRepository.findOne({
      where: { certificateNumber },
      relations: ['course', 'user'],
    });

    if (!certificate) {
      return null;
    }

    // Check if expired
    if (certificate.expiryDate && certificate.expiryDate < new Date()) {
      return null;
    }

    // Check if revoked
    if (certificate.isRevoked) {
      return null;
    }

    return certificate;
  }

  async revokeCertificate(
    tenantId: string,
    certificateId: string,
    dto: RevokeCertificateDto
  ): Promise<CertificateEntity> {
    const certificate = await this.certificateRepository.findOne({
      where: { id: certificateId, tenantId },
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    if (certificate.isRevoked) {
      throw new BadRequestException('Certificate is already revoked');
    }

    certificate.isRevoked = true;
    certificate.revokedAt = new Date();
    certificate.revokedReason = dto.reason;

    return this.certificateRepository.save(certificate);
  }

  async autoIssueCertificate(tenantId: string, userId: string, courseId: string): Promise<CertificateEntity | null> {
    console.log('🎓 Auto-issue certificate check:', { tenantId, userId, courseId });
    
    // Check if course has auto-issue enabled (certificates enabled)
    const course = await this.courseRepository.findOne({
      where: { id: courseId, tenantId },
    });

    if (!course) {
      console.log('⚠️ Auto-issue: Course not found for courseId:', courseId, 'tenantId:', tenantId);
      return null;
    }

    console.log('📚 Course found:', { 
      title: course.title, 
      enableCertificate: course.enableCertificate, 
      certificateTemplateId: course.certificateTemplateId 
    });

    if (!course.enableCertificate) {
      console.log('⚠️ Auto-issue: Certificates are DISABLED for course:', course.title);
      console.log('   → Enable "Enable Certificate" in course edit page under Settings tab');
      return null;
    }

    if (!course.certificateTemplateId) {
      console.log('⚠️ Auto-issue: No certificate template assigned to course:', course.title);
      console.log('   → Select a certificate template in course edit page under Settings tab');
      return null;
    }

    // Check if certificate already exists
    const existingCertificate = await this.certificateRepository.findOne({
      where: { userId, courseId, tenantId, isRevoked: false },
    });

    if (existingCertificate) {
      console.log('ℹ️ Auto-issue: Certificate already exists:', existingCertificate.certificateNumber);
      return existingCertificate; // Already issued
    }

    try {
      console.log('🎉 Issuing new certificate for user:', userId);
      const certificate = await this.issueCertificate(tenantId, { userId, courseId });
      console.log('✅ Certificate issued successfully:', certificate.certificateNumber);
      return certificate;
    } catch (error) {
      // Log error but don't throw - auto-issue should be non-blocking
      console.error(`❌ Failed to auto-issue certificate for user ${userId} course ${courseId}:`, error);
      return null;
    }
  }

  // ============== HELPER METHODS ==============

  private generateCertificateNumber(tenantId: string): string {
    const prefix = tenantId.substring(0, 4).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = randomUUID().substring(0, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  private calculateCertificateMetadata(enrollment: EnrollmentEntity) {
    const totalLessons = enrollment.lessonProgress?.length || 0;
    const totalQuizzes = enrollment.quizAttempts?.length || 0;
    
    let totalTimeSpentMinutes = 0;
    let totalQuizScore = 0;
    let quizCount = 0;

    enrollment.lessonProgress?.forEach(lp => {
      totalTimeSpentMinutes += lp.timeSpentMinutes || 0;
    });

    enrollment.quizAttempts?.forEach(qa => {
      if (qa.bestScore !== undefined) {
        totalQuizScore += qa.bestScore;
        quizCount++;
      }
    });

    return {
      totalLessons,
      totalQuizzes,
      totalTimeSpentMinutes,
      averageQuizScore: quizCount > 0 ? totalQuizScore / quizCount : undefined,
    };
  }
}

