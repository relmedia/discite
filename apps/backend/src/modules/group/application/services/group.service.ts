import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupEntity } from '@/infrastructure/database/entities/group.entity';
import { UserEntity } from '@/infrastructure/database/entities/user.entity';
import { UserRole } from '@repo/shared';
import { CreateGroupDto } from '../../presentation/dto/create-group.dto';
import { UpdateGroupDto } from '../../presentation/dto/update-group.dto';

@Injectable()
export class GroupService {
  constructor(
    @InjectRepository(GroupEntity)
    private readonly groupRepository: Repository<GroupEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async createGroup(tenantId: string, createGroupDto: CreateGroupDto): Promise<GroupEntity> {
    const { name, description, leaderId } = createGroupDto;

    // Verify the leader exists and has TEAM_LEADER role
    const leader = await this.userRepository.findOne({
      where: { id: leaderId, tenantId },
    });

    if (!leader) {
      throw new NotFoundException('Leader not found in this tenant');
    }

    if (leader.role !== UserRole.TEAM_LEADER) {
      throw new BadRequestException('User must have TEAM_LEADER role to lead a group');
    }

    // Check if leader already leads another group
    const existingGroup = await this.groupRepository.findOne({
      where: { leaderId },
    });

    if (existingGroup) {
      throw new BadRequestException('This user already leads another group');
    }

    const group = this.groupRepository.create({
      name,
      description,
      tenantId,
      leaderId,
    });

    return this.groupRepository.save(group);
  }

  async assignTrainer(groupId: string, trainerId: string, _requestingUserId: string): Promise<GroupEntity> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['tenant', 'leader'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Verify the trainer exists and has TRAINER role
    const trainer = await this.userRepository.findOne({
      where: { id: trainerId, tenantId: group.tenantId },
    });

    if (!trainer) {
      throw new NotFoundException('Trainer not found in this tenant');
    }

    if (trainer.role !== UserRole.TRAINER) {
      throw new BadRequestException('User must have TRAINER role');
    }

    // Check if trainer is already assigned to another group
    const existingAssignment = await this.groupRepository.findOne({
      where: { trainerId },
    });

    if (existingAssignment) {
      throw new BadRequestException('This trainer is already assigned to another group');
    }

    group.trainerId = trainerId;
    return this.groupRepository.save(group);
  }

  async addStudent(groupId: string, studentId: string): Promise<UserEntity> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const student = await this.userRepository.findOne({
      where: { id: studentId, tenantId: group.tenantId },
    });

    if (!student) {
      throw new NotFoundException('Student not found in this tenant');
    }

    if (student.role !== UserRole.STUDENT) {
      throw new BadRequestException('User must have STUDENT role');
    }

    student.groupId = groupId;
    return this.userRepository.save(student);
  }

  async removeStudent(groupId: string, studentId: string): Promise<UserEntity> {
    const student = await this.userRepository.findOne({
      where: { id: studentId, groupId },
    });

    if (!student) {
      throw new NotFoundException('Student not found in this group');
    }

    student.groupId = null;
    return this.userRepository.save(student);
  }

  async getGroupMembers(groupId: string): Promise<UserEntity[]> {
    return this.userRepository.find({
      where: { groupId },
      relations: ['group'],
    });
  }

  async getAllGroupsInTenant(tenantId: string): Promise<GroupEntity[]> {
    return this.groupRepository.find({
      where: { tenantId },
      relations: ['leader', 'trainer', 'members'],
    });
  }

  async getGroupById(groupId: string): Promise<GroupEntity> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['leader', 'trainer', 'members', 'tenant'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return group;
  }

  async updateGroup(groupId: string, updateGroupDto: UpdateGroupDto, _requestingUserId: string): Promise<GroupEntity> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // If changing leader, verify new leader
    if (updateGroupDto.leaderId) {
      const newLeader = await this.userRepository.findOne({
        where: { id: updateGroupDto.leaderId, tenantId: group.tenantId },
      });

      if (!newLeader || newLeader.role !== UserRole.TEAM_LEADER) {
        throw new BadRequestException('New leader must have TEAM_LEADER role');
      }

      // Check if new leader already leads another group
      const existingGroup = await this.groupRepository.findOne({
        where: { leaderId: updateGroupDto.leaderId },
      });

      if (existingGroup && existingGroup.id !== groupId) {
        throw new BadRequestException('This user already leads another group');
      }
    }

    // If changing trainer, verify new trainer
    if (updateGroupDto.trainerId) {
      const newTrainer = await this.userRepository.findOne({
        where: { id: updateGroupDto.trainerId, tenantId: group.tenantId },
      });

      if (!newTrainer || newTrainer.role !== UserRole.TRAINER) {
        throw new BadRequestException('New trainer must have TRAINER role');
      }

      // Check if new trainer is already assigned to another group
      const existingAssignment = await this.groupRepository.findOne({
        where: { trainerId: updateGroupDto.trainerId },
      });

      if (existingAssignment && existingAssignment.id !== groupId) {
        throw new BadRequestException('This trainer is already assigned to another group');
      }
    }

    Object.assign(group, updateGroupDto);
    return this.groupRepository.save(group);
  }

  async deleteGroup(groupId: string): Promise<void> {
    const group = await this.groupRepository.findOne({
      where: { id: groupId },
      relations: ['members'],
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Remove group association from all members
    if (group.members && group.members.length > 0) {
      await this.userRepository.update(
        { groupId },
        { groupId: null }
      );
    }

    await this.groupRepository.remove(group);
  }
}
