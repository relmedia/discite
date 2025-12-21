import { IsArray, ArrayMinSize, ValidateNested, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class LessonOrderItem {
  @IsUUID()
  id: string;

  @IsInt()
  @Min(0)
  orderIndex: number;
}

export class ReorderLessonsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LessonOrderItem)
  lessons: LessonOrderItem[];
}
