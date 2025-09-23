import { IsBoolean, IsInt, IsNotEmpty, IsOptional } from 'class-validator';

export class PromoteStudentsDto {
  @IsInt()
  @IsNotEmpty()
  newSchoolYear: number;

  @IsBoolean()
  @IsOptional()
  autoPromoteStudents?: boolean = false;
}