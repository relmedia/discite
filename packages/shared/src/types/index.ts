export interface User {
    id: string;
    email: string;
    name: string;
    tenantId: string;
    role: UserRole;
    groupId?: string;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export enum UserRole {
    SUPERADMIN = 'SUPERADMIN',
    ADMIN = 'ADMIN',
    TEAM_LEADER = 'TEAM_LEADER',
    TRAINER = 'TRAINER',
    STUDENT = 'STUDENT'
  }
  
  export enum TenantType {
    PUBLIC = 'PUBLIC',
    ORGANIZATION = 'ORGANIZATION',
  }

  export interface Tenant {
    id: string;
    name: string;
    subdomain: string;
    type: TenantType;
    isActive: boolean;
    settings: TenantSettings;
    // Custom domain fields
    customDomain?: string | null;
    customDomainVerified: boolean;
    customDomainVerificationToken?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }

  // Domain verification status enum
  export enum DomainVerificationStatus {
    PENDING = 'PENDING',
    VERIFIED = 'VERIFIED',
    FAILED = 'FAILED',
  }

  // Custom domain verification instructions
  export interface DomainVerificationInstructions {
    type: 'TXT';
    name: string;
    value: string;
  }
  
  export interface TenantSettings {
    maxUsers: number;
    features: string[];
    customization: {
      theme: string;
      logo?: string;
    };
  }
  
  export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
  }

  // Course-related types
  export enum CourseLevel {
    BEGINNER = 'Beginner',
    INTERMEDIATE = 'Intermediate',
    ADVANCED = 'Advanced',
  }

  export enum CourseStatus {
    DRAFT = 'DRAFT',
    PUBLISHED = 'PUBLISHED',
    ARCHIVED = 'ARCHIVED',
  }

  export interface Course {
    id: string;
    slug: string;
    title: string;
    description: string;
    instructorId: string;
    instructorName?: string;
    thumbnailUrl?: string;
    durationHours: number;  // Duration in hours
    level: CourseLevel;
    status: CourseStatus;
    studentsEnrolled: number;
    lessonsCount: number;
    quizzesCount: number;
    tags: string[];
    // Certificate settings
    enableCertificate?: boolean;
    certificateTemplateId?: string;
    certificateExpiryMonths?: number;
    includeGradeOnCertificate?: boolean;
    createdAt: Date;
    updatedAt: Date;
  }

  export enum EnrollmentStatus {
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    DROPPED = 'DROPPED',
  }

  export interface Enrollment {
    id: string;
    userId: string;
    courseId: string;
    status: EnrollmentStatus;
    progressPercentage: number;
    enrolledAt: Date;
    completedAt?: Date;
    lastAccessedAt?: Date;
  }

  // Lesson-related types
  export enum LessonType {
    VIDEO = 'VIDEO',
    TEXT = 'TEXT',
    DOCUMENT = 'DOCUMENT',
    MIXED = 'MIXED',
  }

  export interface Lesson {
    id: string;
    courseId: string;
    tenantId: string;
    title: string;
    content?: string;  // Markdown content
    type: LessonType;
    videoUrl?: string;
    documentUrl?: string;
    orderIndex: number;
    durationMinutes: number;
    isPublished: boolean;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface LessonProgress {
    lessonId: string;
    completed: boolean;
    completedAt?: Date;
    timeSpentMinutes: number;
  }

  export interface LessonWithAccess extends Lesson {
    isLocked: boolean;  // Is this lesson locked for student?
    progress?: LessonProgress;  // Student's progress on this lesson
  }

  // Quiz-related types
  export enum QuizQuestionType {
    MULTIPLE_CHOICE = 'multiple_choice',
    TRUE_FALSE = 'true_false',
    SHORT_ANSWER = 'short_answer',
  }

  export interface QuizQuestion {
    id: string;
    question: string;
    type: QuizQuestionType;
    options?: string[];
    correctAnswer: string | string[];
    points: number;
  }

  export interface Quiz {
    id: string;
    courseId: string;
    tenantId: string;
    title: string;
    description?: string;
    questions: QuizQuestion[];
    orderIndex: number;
    passingScore: number;
    durationMinutes: number;
    isPublished: boolean;
    requiredLessonIds: string[];
    attachedToLessonId?: string;
    maxAttempts?: number;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface QuizAttempt {
    quizId: string;
    attempts: {
      attemptNumber: number;
      score: number;
      totalPoints: number;
      passed: boolean;
      completedAt: Date;
    }[];
    bestScore: number;
  }

  export interface QuizWithAccess extends Quiz {
    isLocked: boolean;
    canRetake: boolean;
    bestScore?: number;
    attemptsCount?: number;
  }

  export interface QuizSubmission {
    quizId: string;
    answers: {
      questionId: string;
      answer: string | string[];
    }[];
  }

  export interface QuizResult {
    score: number;
    passed: boolean;
    totalPoints: number;
    correctAnswers: number;
    totalQuestions: number;
  }

  // Curriculum types
  export enum CurriculumItemType {
    LESSON = 'lesson',
    QUIZ = 'quiz',
  }

  // Marketplace types
  export enum MarketplaceCourseStatus {
    DRAFT = 'DRAFT',
    PUBLISHED = 'PUBLISHED',
    ARCHIVED = 'ARCHIVED',
  }

  export enum LicenseType {
    SEAT = 'SEAT',           // Pay per user seat
    UNLIMITED = 'UNLIMITED', // All users in tenant can access
    TIME_LIMITED = 'TIME_LIMITED', // Access expires after period
  }

  export enum LicenseStatus {
    ACTIVE = 'ACTIVE',
    EXPIRED = 'EXPIRED',
    CANCELLED = 'CANCELLED',
    PENDING = 'PENDING',
  }

  export enum AccessStatus {
    ACTIVE = 'ACTIVE',
    REVOKED = 'REVOKED',
    COMPLETED = 'COMPLETED',
  }

  export interface LicenseOption {
    type: LicenseType;
    price: number;
    seatCount?: number;
    durationMonths?: number;
    isSubscription: boolean;
  }

  export interface MarketplaceCourse {
    id: string;
    title: string;
    slug: string;
    description: string;
    thumbnailUrl?: string;
    durationHours: number;  // Duration in hours
    level: CourseLevel;
    status: MarketplaceCourseStatus;
    tags: string[];
    category?: string;
    basePrice: number;
    currency: string;
    isFree: boolean;
    licenseOptions: LicenseOption[];
    stripeProductId?: string;
    publishedByTenantId?: string;
    publishedByTenantName?: string;
    createdById: string;
    createdByName?: string;
    purchaseCount: number;
    totalEnrollments: number;
    averageRating: number;
    reviewCount: number;
    includesCertificate: boolean;
    lessonsCount: number;
    quizzesCount: number;
    sourceCourseId?: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface TenantCourseLicense {
    id: string;
    tenantId: string;
    marketplaceCourseId: string;
    marketplaceCourse?: MarketplaceCourse;
    licenseType: LicenseType;
    status: LicenseStatus;
    seatCount?: number;
    seatsUsed: number;
    validFrom: Date;
    validUntil?: Date;
    amountPaid: number;
    currency: string;
    isSubscription: boolean;
    subscriptionInterval?: string;
    nextBillingDate?: Date;
    purchasedById: string;
    purchasedByName?: string;
    purchasedAt: Date;
    cancelledAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface UserCourseAccess {
    id: string;
    tenantId: string;
    userId: string;
    userName?: string;
    userEmail?: string;
    licenseId: string;
    marketplaceCourseId: string;
    marketplaceCourse?: MarketplaceCourse;
    status: AccessStatus;
    progressPercentage: number;
    completedAt?: Date;
    lastAccessedAt?: Date;
    assignedById?: string;
    assignedByName?: string;
    assignedAt: Date;
    revokedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
  }

  // DTOs for marketplace
  export interface CreateMarketplaceCourseDto {
    title: string;
    description: string;
    thumbnailUrl?: string;
    durationHours: number;  // Duration in hours
    level: CourseLevel;
    tags?: string[];
    category?: string;
    basePrice: number;
    currency?: string;
    isFree?: boolean;
    licenseOptions: LicenseOption[];
    includesCertificate?: boolean;
    sourceCourseId?: string;
  }

  export interface UpdateMarketplaceCourseDto {
    title?: string;
    description?: string;
    thumbnailUrl?: string;
    durationHours?: number;  // Duration in hours
    level?: CourseLevel;
    tags?: string[];
    category?: string;
    basePrice?: number;
    currency?: string;
    isFree?: boolean;
    licenseOptions?: LicenseOption[];
    includesCertificate?: boolean;
  }

  export interface PurchaseLicenseDto {
    marketplaceCourseId: string;
    licenseType: LicenseType;
    seatCount?: number;
  }

  export interface AssignUserAccessDto {
    licenseId: string;
    userIds: string[];
  }

  export interface RevokeUserAccessDto {
    accessId: string;
    reason?: string;
  }

  export interface CheckoutSessionResponse {
    sessionId: string;
    url: string;
  }