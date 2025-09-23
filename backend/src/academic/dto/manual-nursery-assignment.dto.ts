import { IsInt } from 'class-validator';

export class ManualNurseryAssignmentDto {
  @IsInt()
  studentId: number;

  @IsInt()
  schoolYear: number;

  @IsInt()
  gradeId: number;

  @IsInt()
  classId: number;
}
