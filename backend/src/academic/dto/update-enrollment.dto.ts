import { IsInt, IsOptional } from 'class-validator';

export class UpdateEnrollmentDto {
  @IsOptional()
  @IsInt()
  classId?: number;

  @IsOptional()
  @IsInt()
  gradeId?: number;
}
