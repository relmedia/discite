import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ConversationEntity,
  ConversationType,
  ConversationParticipantEntity,
  ParticipantRole,
  MessageEntity,
} from '@/infrastructure/database/entities/conversation.entity';
import { UserEntity } from '@/infrastructure/database/entities/user.entity';
import { UserRole } from '@repo/shared';
import { NotificationService } from '@/modules/notification/application/services/notification.service';
import { NotificationType } from '@/infrastructure/database/entities/notification.entity';

export interface CreateConversationDto {
  type: ConversationType;
  title?: string;
  description?: string;
  participantIds: string[];
  courseId?: string;
  groupId?: string;
}

export interface SendMessageDto {
  content: string;
  attachments?: { type: string; url: string; name: string; size?: number }[];
  replyToId?: string;
}

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversationRepository: Repository<ConversationEntity>,
    @InjectRepository(ConversationParticipantEntity)
    private readonly participantRepository: Repository<ConversationParticipantEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly notificationService: NotificationService,
  ) {}

  // ============== CONVERSATION METHODS ==============

  async createConversation(
    dto: CreateConversationDto,
    creatorId: string,
    tenantId: string,
  ): Promise<ConversationEntity> {
    // For direct messages, check if conversation already exists
    if (dto.type === ConversationType.DIRECT) {
      if (dto.participantIds.length !== 1) {
        throw new BadRequestException('Direct messages must have exactly one other participant');
      }

      const existingConversation = await this.findExistingDirectConversation(
        creatorId,
        dto.participantIds[0],
        tenantId,
      );

      if (existingConversation) {
        return existingConversation;
      }
    }

    // Create conversation
    const conversation = this.conversationRepository.create({
      tenantId,
      type: dto.type,
      title: dto.title,
      description: dto.description,
      courseId: dto.courseId,
      groupId: dto.groupId,
      createdById: creatorId,
    });

    const savedConversation = await this.conversationRepository.save(conversation);

    // Add creator as owner
    await this.participantRepository.save({
      conversationId: savedConversation.id,
      userId: creatorId,
      role: ParticipantRole.OWNER,
      lastReadAt: new Date(),
    });

    // Add other participants
    const participantRecords = dto.participantIds
      .filter((id) => id !== creatorId)
      .map((userId) => ({
        conversationId: savedConversation.id,
        userId,
        role: ParticipantRole.MEMBER,
      }));

    if (participantRecords.length > 0) {
      await this.participantRepository.save(participantRecords);
    }

    return this.getConversationById(savedConversation.id, creatorId);
  }

  private async findExistingDirectConversation(
    userId1: string,
    userId2: string,
    tenantId: string,
  ): Promise<ConversationEntity | null> {
    // Find conversations where both users are participants
    const conversations = await this.conversationRepository
      .createQueryBuilder('conversation')
      .innerJoin('conversation.participants', 'p1', 'p1.userId = :userId1', { userId1 })
      .innerJoin('conversation.participants', 'p2', 'p2.userId = :userId2', { userId2 })
      .where('conversation.type = :type', { type: ConversationType.DIRECT })
      .andWhere('conversation.tenantId = :tenantId', { tenantId })
      .andWhere('conversation.isActive = true')
      .getOne();

    return conversations;
  }

  async getConversationById(
    conversationId: string,
    userId: string,
  ): Promise<ConversationEntity> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['participants', 'participants.user', 'course', 'group', 'createdBy'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Check if user is a participant
    const isParticipant = conversation.participants.some(
      (p) => p.userId === userId && !p.hasLeft,
    );

    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    return conversation;
  }

  async getUserConversations(
    userId: string,
    tenantId: string,
    options?: {
      type?: ConversationType;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ conversations: ConversationEntity[]; total: number }> {
    const { type, limit = 20, offset = 0 } = options || {};

    const queryBuilder = this.conversationRepository
      .createQueryBuilder('conversation')
      .innerJoin(
        'conversation.participants',
        'participant',
        'participant.userId = :userId AND participant.hasLeft = false',
        { userId },
      )
      .leftJoinAndSelect('conversation.participants', 'allParticipants')
      .leftJoinAndSelect('allParticipants.user', 'participantUser')
      .leftJoinAndSelect('conversation.course', 'course')
      .leftJoinAndSelect('conversation.group', 'group')
      .where('conversation.tenantId = :tenantId', { tenantId })
      .andWhere('conversation.isActive = true');

    if (type) {
      queryBuilder.andWhere('conversation.type = :type', { type });
    }

    const [conversations, total] = await queryBuilder
      .orderBy('conversation.lastMessageAt', 'DESC', 'NULLS LAST')
      .addOrderBy('conversation.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getManyAndCount();

    return { conversations, total };
  }

  async getOrCreateDirectConversation(
    userId: string,
    otherUserId: string,
    tenantId: string,
  ): Promise<ConversationEntity> {
    // Check if other user exists
    const otherUser = await this.userRepository.findOne({
      where: { id: otherUserId },
    });

    if (!otherUser) {
      throw new NotFoundException('User not found');
    }

    // Find existing or create new
    const existing = await this.findExistingDirectConversation(userId, otherUserId, tenantId);
    
    if (existing) {
      return this.getConversationById(existing.id, userId);
    }

    return this.createConversation(
      {
        type: ConversationType.DIRECT,
        participantIds: [otherUserId],
      },
      userId,
      tenantId,
    );
  }

  // ============== MESSAGE METHODS ==============

  async sendMessage(
    conversationId: string,
    dto: SendMessageDto,
    senderId: string,
  ): Promise<MessageEntity> {
    // Verify user is participant
    const participant = await this.participantRepository.findOne({
      where: { conversationId, userId: senderId, hasLeft: false },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    // Create message
    const message = this.messageRepository.create({
      conversationId,
      senderId,
      content: dto.content,
      attachments: dto.attachments,
      replyToId: dto.replyToId,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Update conversation's last message
    const preview = dto.content.substring(0, 100) + (dto.content.length > 100 ? '...' : '');
    await this.conversationRepository.update(conversationId, {
      lastMessageAt: new Date(),
      lastMessagePreview: preview,
    });

    // Update sender's last read time
    await this.participantRepository.update(
      { conversationId, userId: senderId },
      { lastReadAt: new Date() },
    );

    // Notify other participants
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['participants'],
    });

    if (conversation) {
      const sender = await this.userRepository.findOne({ where: { id: senderId } });
      const senderName = sender?.name || 'Someone';

      for (const p of conversation.participants) {
        if (p.userId !== senderId && !p.isMuted && !p.hasLeft) {
          try {
            await this.notificationService.create({
              userId: p.userId,
              tenantId: conversation.tenantId,
              type: NotificationType.SYSTEM,
              title: 'New Message',
              message: `${senderName}: ${preview}`,
              data: { conversationId, messageId: savedMessage.id },
              link: `/dashboard/messages/${conversationId}`,
            });
          } catch (error) {
            console.error('Failed to send message notification:', error);
          }
        }
      }
    }

    // Return message with sender info
    return this.messageRepository.findOne({
      where: { id: savedMessage.id },
      relations: ['sender', 'replyTo', 'replyTo.sender'],
    }) as Promise<MessageEntity>;
  }

  async getMessages(
    conversationId: string,
    userId: string,
    options?: {
      limit?: number;
      before?: string; // Message ID to load messages before (for pagination)
    },
  ): Promise<{ messages: MessageEntity[]; hasMore: boolean }> {
    // Verify user is participant
    const participant = await this.participantRepository.findOne({
      where: { conversationId, userId, hasLeft: false },
    });

    if (!participant) {
      throw new ForbiddenException('You are not a participant in this conversation');
    }

    const { limit = 50, before } = options || {};

    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.replyTo', 'replyTo')
      .leftJoinAndSelect('replyTo.sender', 'replyToSender')
      .where('message.conversationId = :conversationId', { conversationId })
      .andWhere('message.isDeleted = false');

    if (before) {
      const beforeMessage = await this.messageRepository.findOne({
        where: { id: before },
      });
      if (beforeMessage) {
        queryBuilder.andWhere('message.createdAt < :beforeDate', {
          beforeDate: beforeMessage.createdAt,
        });
      }
    }

    const messages = await queryBuilder
      .orderBy('message.createdAt', 'DESC')
      .take(limit + 1) // Get one extra to check if there are more
      .getMany();

    const hasMore = messages.length > limit;
    if (hasMore) {
      messages.pop(); // Remove the extra message
    }

    // Reverse to get chronological order
    messages.reverse();

    return { messages, hasMore };
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await this.participantRepository.update(
      { conversationId, userId },
      { lastReadAt: new Date() },
    );
  }

  async getUnreadCount(userId: string, tenantId: string): Promise<number> {
    const result = await this.conversationRepository
      .createQueryBuilder('conversation')
      .innerJoin(
        'conversation.participants',
        'participant',
        'participant.userId = :userId AND participant.hasLeft = false',
        { userId },
      )
      .innerJoin('conversation.messages', 'message', 'message.isDeleted = false')
      .where('conversation.tenantId = :tenantId', { tenantId })
      .andWhere('conversation.isActive = true')
      .andWhere('message.senderId != :userId', { userId })
      .andWhere('(participant.lastReadAt IS NULL OR message.createdAt > participant.lastReadAt)')
      .select('COUNT(DISTINCT conversation.id)', 'count')
      .getRawOne();

    return parseInt(result?.count || '0', 10);
  }

  async editMessage(
    messageId: string,
    content: string,
    userId: string,
  ): Promise<MessageEntity> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId, senderId: userId, isDeleted: false },
    });

    if (!message) {
      throw new NotFoundException('Message not found or you cannot edit it');
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();

    return this.messageRepository.save(message);
  }

  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId, senderId: userId },
    });

    if (!message) {
      throw new NotFoundException('Message not found or you cannot delete it');
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = '[Message deleted]';

    await this.messageRepository.save(message);
  }

  // ============== PARTICIPANT METHODS ==============

  async addParticipants(
    conversationId: string,
    userIds: string[],
    addedById: string,
  ): Promise<void> {
    const conversation = await this.getConversationById(conversationId, addedById);

    // Check if user has permission to add participants
    const adderParticipant = conversation.participants.find((p) => p.userId === addedById);
    if (!adderParticipant || adderParticipant.role === ParticipantRole.MEMBER) {
      throw new ForbiddenException('You do not have permission to add participants');
    }

    // Filter out existing participants
    const existingUserIds = new Set(conversation.participants.map((p) => p.userId));
    const newUserIds = userIds.filter((id) => !existingUserIds.has(id));

    if (newUserIds.length === 0) {
      return;
    }

    const newParticipants = newUserIds.map((userId) => ({
      conversationId,
      userId,
      role: ParticipantRole.MEMBER,
    }));

    await this.participantRepository.save(newParticipants);
  }

  async removeParticipant(
    conversationId: string,
    userIdToRemove: string,
    removedById: string,
  ): Promise<void> {
    const conversation = await this.getConversationById(conversationId, removedById);

    // Check if user has permission
    const removerParticipant = conversation.participants.find((p) => p.userId === removedById);
    const targetParticipant = conversation.participants.find((p) => p.userId === userIdToRemove);

    if (!targetParticipant) {
      throw new NotFoundException('Participant not found');
    }

    // Users can remove themselves, or admins/owners can remove others
    const canRemove =
      userIdToRemove === removedById ||
      removerParticipant?.role === ParticipantRole.OWNER ||
      (removerParticipant?.role === ParticipantRole.ADMIN &&
        targetParticipant.role === ParticipantRole.MEMBER);

    if (!canRemove) {
      throw new ForbiddenException('You do not have permission to remove this participant');
    }

    await this.participantRepository.update(
      { conversationId, userId: userIdToRemove },
      { hasLeft: true },
    );
  }

  async leaveConversation(conversationId: string, userId: string): Promise<void> {
    await this.removeParticipant(conversationId, userId, userId);
  }

  async toggleMute(conversationId: string, userId: string): Promise<boolean> {
    const participant = await this.participantRepository.findOne({
      where: { conversationId, userId, hasLeft: false },
    });

    if (!participant) {
      throw new NotFoundException('Participant not found');
    }

    participant.isMuted = !participant.isMuted;
    await this.participantRepository.save(participant);

    return participant.isMuted;
  }

  // ============== HELPER METHODS ==============

  async getAvailableUsers(
    userId: string,
    tenantId: string,
    userRole: UserRole,
    search?: string,
  ): Promise<UserEntity[]> {
    console.log('getAvailableUsers called:', { userId, tenantId, userRole, search });
    
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.id != :userId', { userId });

    // SUPERADMINs can see all users across all tenants
    // Others are restricted to their tenant
    if (userRole !== UserRole.SUPERADMIN && tenantId) {
      queryBuilder.andWhere('user.tenantId = :tenantId', { tenantId });
      
      // Students can only message trainers, admins, and team leaders
      if (userRole === UserRole.STUDENT) {
        queryBuilder.andWhere('user.role IN (:...roles)', {
          roles: [UserRole.TRAINER, UserRole.ADMIN, UserRole.TEAM_LEADER, UserRole.SUPERADMIN],
        });
      }
    }

    if (search) {
      queryBuilder.andWhere('(user.name ILIKE :search OR user.email ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    const users = await queryBuilder.orderBy('user.name', 'ASC').take(50).getMany();
    console.log('getAvailableUsers found:', users.length, 'users');
    
    return users;
  }
}
