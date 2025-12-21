import { IsString, IsInt, Min, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum CurriculumItemType {
  LESSON = 'lesson',
  QUIZ = 'quiz',
}

export class CurriculumItemOrderDto {
  @IsString()
  id: string;

  @IsEnum(CurriculumItemType)
  type: CurriculumItemType;

  @IsInt()
  @Min(0)
  orderIndex: number;
}

export class ReorderCurriculumDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CurriculumItemOrderDto)
  items: CurriculumItemOrderDto[];
}

