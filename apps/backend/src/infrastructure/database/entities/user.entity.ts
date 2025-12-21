import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index,
  } from 'typeorm';
  import { TenantEntity } from './tenant.entity';
  import { GroupEntity } from './group.entity';
  import { UserRole } from '@repo/shared';
  
  @Entity('users')
  @Index(['tenantId', 'email'], { unique: true })
  export class UserEntity {
    @PrimaryGeneratedColumn('uuid')
    id: string;
  
    @Column()
    email: string;
  
    @Column()
    name: string;
  
    @Column()
    tenantId: string;
  
    @ManyToOne(() => TenantEntity, (tenant) => tenant.users)
    @JoinColumn({ name: 'tenantId' })
    tenant: TenantEntity;
  
    @Column({
      type: 'enum',
      enum: UserRole,
      default: UserRole.STUDENT,
    })
    role: UserRole;

    @Column({ nullable: true })
    groupId: string | null;

    @ManyToOne(() => GroupEntity, (group) => group.members, { nullable: true })
    @JoinColumn({ name: 'groupId' })
    group: GroupEntity;

    @OneToMany(() => GroupEntity, (group) => group.leader)
    ledGroups: GroupEntity[];

    @OneToMany(() => GroupEntity, (group) => group.trainer)
    assignedGroups: GroupEntity[];

    @Column({ nullable: true })
    passwordHash: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
  }