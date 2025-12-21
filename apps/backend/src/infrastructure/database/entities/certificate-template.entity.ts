import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TenantEntity } from './tenant.entity';

// Element style for visual editor
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

// Visual editor element
export interface CertificateElement {
  id: string;
  type: 'text' | 'placeholder' | 'image' | 'shape' | 'line';
  content: string;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
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
  // Visual editor fields
  elements?: CertificateElement[];
  useVisualEditor?: boolean;
}

@Entity('certificate_templates')
@Index(['tenantId', 'isDefault'])
export class CertificateTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => TenantEntity)
  @JoinColumn({ name: 'tenantId' })
  tenant: TenantEntity;

  @Column()
  name: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('jsonb')
  design: CertificateDesign;

  @Column('text')
  titleText: string; // e.g., "Certificate of Completion"

  @Column('text')
  bodyTemplate: string; // Template with placeholders like {{studentName}}, {{courseName}}, {{completionDate}}

  @Column('text', { nullable: true })
  signatureText: string; // e.g., "Course Instructor"

  @Column({ nullable: true })
  signatureImageUrl: string;

  @Column('text', { nullable: true })
  issuedByText: string; // e.g., "UTFÄRDAT AV AUSAB FÖR"

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  previewImageUrl: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

