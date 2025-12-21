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
import { UserEntity } from './user.entity';
import { TenantEntity } from './tenant.entity';
import { CourseEntity } from './course.entity';
import { GroupEntity } from './group.entity';

export enum ConversationType {
  DIRECT = 'direct',           // 1:1 messaging
  GROUP = 'group',             // Group chat (learning group)
  COURSE = 'course',           // Course discussion
  ANNOUNCEMENT = 'announcement', // Broadcast (one-way)
}

@Entity('conversations')
@Index(['tenantId', 'type'])
@Index(['courseId'])
@Index(['groupId'])
export class ConversationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenantId' })
  tenant: TenantEntity;

  @Column({
    type: 'enum',
    enum: ConversationType,
    default: ConversationType.DIRECT,
  })
  type: ConversationType;

  @Column({ nullable: true })
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  courseId: string;

  @ManyToOne(() => CourseEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'courseId' })
  course: CourseEntity;

  @Column({ nullable: true })
  groupId: string;

  @ManyToOne(() => GroupEntity, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'groupId' })
  group: GroupEntity;

  @Column()
  createdById: string;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdById' })
  createdBy: UserEntity;

  @Column({ nullable: true })
  lastMessageAt: Date;

  @Column({ nullable: true })
  lastMessagePreview: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => ConversationParticipantEntity, (participant) => participant.conversation)
  participants: ConversationParticipantEntity[];

  @OneToMany(() => MessageEntity, (message) => message.conversation)
  messages: MessageEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

export enum ParticipantRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Entity('conversation_participants')
@Index(['conversationId', 'userId'], { unique: true })
@Index(['userId', 'lastReadAt'])
export class ConversationParticipantEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversationId: string;

  @ManyToOne(() => ConversationEntity, (conversation) => conversation.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: ConversationEntity;

  @Column()
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({
    type: 'enum',
    enum: ParticipantRole,
    default: ParticipantRole.MEMBER,
  })
  role: ParticipantRole;

  @Column({ nullable: true })
  lastReadAt: Date;

  @Column({ default: false })
  isMuted: boolean;

  @Column({ default: false })
  hasLeft: boolean;

  @CreateDateColumn()
  joinedAt: Date;
}

@Entity('messages')
@Index(['conversationId', 'createdAt'])
@Index(['senderId'])
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversationId: string;

  @ManyToOne(() => ConversationEntity, (conversation) => conversation.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversationId' })
  conversation: ConversationEntity;

  @Column()
  senderId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'senderId' })
  sender: UserEntity;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  attachments: { type: string; url: string; name: string; size?: number }[];

  @Column({ nullable: true })
  replyToId: string;

  @ManyToOne(() => MessageEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'replyToId' })
  replyTo: MessageEntity;

  @Column({ default: false })
  isEdited: boolean;

  @Column({ nullable: true })
  editedAt: Date;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ nullable: true })
  deletedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
