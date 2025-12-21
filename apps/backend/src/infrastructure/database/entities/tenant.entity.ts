import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
  } from 'typeorm';
  import { UserEntity } from './user.entity';
  import { GroupEntity } from './group.entity';

  // Define enum locally to avoid import issues with TypeORM
  export enum TenantType {
    PUBLIC = 'PUBLIC',
    ORGANIZATION = 'ORGANIZATION',
  }

  @Entity('tenants')
  export class TenantEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column({ unique: true })
    name: string;
  
    @Column({ unique: true })
    subdomain: string;

    @Column({
      type: 'enum',
      enum: TenantType,
      default: TenantType.ORGANIZATION,
    })
    type: TenantType;
  
    @Column({ default: true })
    isActive: boolean;
  
    @Column('jsonb', { nullable: true })
    settings: {
      maxUsers: number;
      features: string[];
      customization: {
        theme: string;
        logo?: string;
      };
    };

    @Column({ type: 'varchar', nullable: true, unique: true })
    customDomain: string | null;

    @Column({ type: 'boolean', default: false })
    customDomainVerified: boolean;

    @Column({ type: 'varchar', nullable: true })
    customDomainVerificationToken: string | null;
  
    @OneToMany(() => UserEntity, (user) => user.tenant)
    users: UserEntity[];

    @OneToMany(() => GroupEntity, (group) => group.tenant)
    groups: GroupEntity[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
  }