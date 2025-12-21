import { apiClient } from './client';

// Element types for drag-and-drop certificate builder
export type CertificateElementType = 'text' | 'placeholder' | 'image' | 'shape' | 'line';

export interface CertificateElementStyle {
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  textAlign: 'left' | 'center' | 'right';
  color: string;
  backgroundColor?: string;
  letterSpacing?: number;
  lineHeight?: number;
  opacity?: number;
  rotation?: number;
}

export interface CertificateElement {
  id: string;
  type: CertificateElementType;
  content: string; // Text content, image URL, or placeholder like {{studentName}}
  position: {
    x: number; // Percentage from left (0-100)
    y: number; // Percentage from top (0-100)
  };
  size: {
    width: number; // In pixels or percentage
    height?: number;
  };
  style: CertificateElementStyle;
  locked?: boolean;
  visible?: boolean;
  zIndex?: number;
}

export interface CertificateDesign {
  backgroundColor: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  logoUrl?: string;
  backgroundImageUrl?: string;
  borderStyle: 'none' | 'simple' | 'ornate' | 'modern' | 'all-around';
  borderThickness?: number; // Border thickness in pixels (1-40)
  borderColor?: string; // Border color (hex)
  layout: 'classic' | 'modern' | 'minimal' | 'elegant' | 'swedish' | 'custom';
  // Swedish/Professional certificate specific fields
  companyName?: string;
  companyAddress?: string;
  companyContact?: string;
  complianceText?: string;
  showPersonalNumber?: boolean;
  // Element-based design for drag-and-drop editor
  elements?: CertificateElement[];
  useVisualEditor?: boolean;
}

export interface CertificateTemplate {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  design: CertificateDesign;
  titleText: string;
  bodyTemplate: string;
  signatureText?: string;
  signatureImageUrl?: string;
  // Additional fields for Swedish/professional certificates
  issuedByText?: string; // e.g., "UTFÄRDAT AV AUSAB FÖR"
  isDefault: boolean;
  isActive: boolean;
  previewImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Certificate {
  id: string;
  tenantId: string;
  userId: string;
  courseId: string;
  templateId: string;
  certificateNumber: string;
  studentName: string;
  courseName: string;
  instructorName?: string;
  personalNumber?: string; // Swedish personal ID number (personnummer)
  finalGrade?: number;
  completionDate: string;
  issueDate: string;
  expiryDate?: string;
  pdfUrl?: string;
  metadata?: {
    totalLessons?: number;
    totalQuizzes?: number;
    totalTimeSpentMinutes?: number;
    averageQuizScore?: number;
  };
  isRevoked: boolean;
  revokedAt?: string;
  revokedReason?: string;
  course?: {
    id: string;
    title: string;
    thumbnailUrl?: string;
  };
  template?: CertificateTemplate;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateCertificateTemplateDto {
  name: string;
  description?: string;
  design: CertificateDesign;
  titleText: string;
  bodyTemplate: string;
  signatureText?: string;
  signatureImageUrl?: string;
  issuedByText?: string;
  isDefault?: boolean;
}

export interface UpdateCertificateTemplateDto {
  name?: string;
  description?: string;
  design?: Partial<CertificateDesign>;
  titleText?: string;
  bodyTemplate?: string;
  signatureText?: string;
  signatureImageUrl?: string;
  issuedByText?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface IssueCertificateDto {
  courseId: string;
  userId: string;
  templateId?: string;
  studentNameOverride?: string;
  finalGrade?: number;
}

export interface VerificationResult {
  valid: boolean;
  message?: string;
  certificate?: {
    certificateNumber: string;
    studentName: string;
    courseName: string;
    issueDate: string;
    expiryDate?: string;
    instructorName?: string;
  };
}

export const certificatesApi = {
  // Template operations
  async getTemplates(): Promise<CertificateTemplate[]> {
    const response = await apiClient.get<CertificateTemplate[]>('/api/certificates/templates');
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch templates');
    }
    return response.data!;
  },

  async getTemplateById(templateId: string): Promise<CertificateTemplate> {
    const response = await apiClient.get<CertificateTemplate>(`/api/certificates/templates/${templateId}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch template');
    }
    return response.data!;
  },

  async createTemplate(data: CreateCertificateTemplateDto): Promise<CertificateTemplate> {
    const response = await apiClient.post<CertificateTemplate>('/api/certificates/templates', data);
    if (!response.success) {
      throw new Error(response.error || 'Failed to create template');
    }
    return response.data!;
  },

  async updateTemplate(templateId: string, data: UpdateCertificateTemplateDto): Promise<CertificateTemplate> {
    const response = await apiClient.put<CertificateTemplate>(`/api/certificates/templates/${templateId}`, data);
    if (!response.success) {
      throw new Error(response.error || 'Failed to update template');
    }
    return response.data!;
  },

  async deleteTemplate(templateId: string): Promise<void> {
    const response = await apiClient.delete(`/api/certificates/templates/${templateId}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete template');
    }
  },

  // Certificate operations
  async issueCertificate(data: IssueCertificateDto): Promise<Certificate> {
    const response = await apiClient.post<Certificate>('/api/certificates/issue', data);
    if (!response.success) {
      throw new Error(response.error || 'Failed to issue certificate');
    }
    return response.data!;
  },

  async getMyCertificates(): Promise<Certificate[]> {
    const response = await apiClient.get<Certificate[]>('/api/certificates/my-certificates');
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch certificates');
    }
    return response.data!;
  },

  async getCertificatesByUser(userId: string): Promise<Certificate[]> {
    const response = await apiClient.get<Certificate[]>(`/api/certificates/by-user/${userId}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch certificates');
    }
    return response.data!;
  },

  async getCertificatesByCourse(courseId: string): Promise<Certificate[]> {
    const response = await apiClient.get<Certificate[]>(`/api/certificates/by-course/${courseId}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch certificates');
    }
    return response.data!;
  },

  async getCertificateById(certificateId: string): Promise<Certificate> {
    const response = await apiClient.get<Certificate>(`/api/certificates/${certificateId}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch certificate');
    }
    return response.data!;
  },

  async revokeCertificate(certificateId: string, reason: string): Promise<Certificate> {
    const response = await apiClient.post<Certificate>(`/api/certificates/${certificateId}/revoke`, { reason });
    if (!response.success) {
      throw new Error(response.error || 'Failed to revoke certificate');
    }
    return response.data!;
  },

  async verifyCertificate(certificateNumber: string): Promise<VerificationResult> {
    const response = await apiClient.get<VerificationResult>(`/api/certificates/verify/${certificateNumber}`);
    if (!response.success) {
      throw new Error(response.error || 'Failed to verify certificate');
    }
    return response.data!;
  },
};

