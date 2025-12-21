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
import { UserEntity } from './user.entity';

@Entity('groups')
@Index(['tenantId'])
export class GroupEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  tenantId: string;

  @Column()
  leaderId: string;

  @Column({ nullable: true })
  trainerId: string;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.groups)
  @JoinColumn({ name: 'tenantId' })
  tenant: TenantEntity;

  @ManyToOne(() => UserEntity, (user) => user.ledGroups)
  @JoinColumn({ name: 'leaderId' })
  leader: UserEntity;

  @ManyToOne(() => UserEntity, (user) => user.assignedGroups, { nullable: true })
  @JoinColumn({ name: 'trainerId' })
  trainer: UserEntity;

  @OneToMany(() => UserEntity, (user) => user.group)
  members: UserEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
