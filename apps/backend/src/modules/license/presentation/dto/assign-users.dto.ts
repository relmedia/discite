import { IsArray, IsString, ArrayMinSize } from 'class-validator';

export class AssignUsersDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  userIds: string[];
}

