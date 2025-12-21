import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { GroupService } from '../application/services/group.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { UserRole, ApiResponse } from '@repo/shared';

@Controller('api/groups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  async createGroup(
    @CurrentUser() user: any,
    @Body() createGroupDto: CreateGroupDto,
  ): Promise<ApiResponse<any>> {
    const group = await this.groupService.createGroup(user.tenantId, createGroupDto);
    return {
      success: true,
      data: group,
      message: 'Group created successfully',
    };
  }

  @Put(':id/assign-trainer')
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER)
  async assignTrainer(
    @Param('id') groupId: string,
    @Body('trainerId') trainerId: string,
    @CurrentUser() user: any,
  ): Promise<ApiResponse<any>> {
    const group = await this.groupService.assignTrainer(groupId, trainerId, user.userId);
    return {
      success: true,
      data: group,
      message: 'Trainer assigned successfully',
    };
  }

  @Post(':id/students')
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER, UserRole.TRAINER)
  async addStudent(
    @Param('id') groupId: string,
    @Body('studentId') studentId: string,
  ): Promise<ApiResponse<any>> {
    const student = await this.groupService.addStudent(groupId, studentId);
    return {
      success: true,
      data: student,
      message: 'Student added to group successfully',
    };
  }

  @Delete(':id/students/:studentId')
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER, UserRole.TRAINER)
  async removeStudent(
    @Param('id') groupId: string,
    @Param('studentId') studentId: string,
  ): Promise<ApiResponse<any>> {
    const student = await this.groupService.removeStudent(groupId, studentId);
    return {
      success: true,
      data: student,
      message: 'Student removed from group successfully',
    };
  }

  @Get(':id/members')
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER, UserRole.TRAINER, UserRole.STUDENT)
  async getGroupMembers(@Param('id') groupId: string): Promise<ApiResponse<any>> {
    const members = await this.groupService.getGroupMembers(groupId);
    return {
      success: true,
      data: members,
    };
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER, UserRole.TRAINER)
  async getAllGroups(@CurrentUser() user: any): Promise<ApiResponse<any>> {
    const groups = await this.groupService.getAllGroupsInTenant(user.tenantId);
    return {
      success: true,
      data: groups,
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER, UserRole.TRAINER, UserRole.STUDENT)
  async getGroup(@Param('id') groupId: string): Promise<ApiResponse<any>> {
    const group = await this.groupService.getGroupById(groupId);
    return {
      success: true,
      data: group,
    };
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.TEAM_LEADER)
  async updateGroup(
    @Param('id') groupId: string,
    @Body() updateGroupDto: UpdateGroupDto,
    @CurrentUser() user: any,
  ): Promise<ApiResponse<any>> {
    const group = await this.groupService.updateGroup(groupId, updateGroupDto, user.userId);
    return {
      success: true,
      data: group,
      message: 'Group updated successfully',
    };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async deleteGroup(@Param('id') groupId: string): Promise<ApiResponse<any>> {
    await this.groupService.deleteGroup(groupId);
    return {
      success: true,
      message: 'Group deleted successfully',
    };
  }
}
