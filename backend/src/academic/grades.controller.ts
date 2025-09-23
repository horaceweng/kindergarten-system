import { Controller, Get } from '@nestjs/common';
import { AcademicService } from './academic.service';

@Controller('grades')
export class GradesController {
  constructor(private readonly academicService: AcademicService) {}

  @Get()
  findAll() {
    return this.academicService.findAllGrades();
  }
}
