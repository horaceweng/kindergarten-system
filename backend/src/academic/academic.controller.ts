// src/academic/academic.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AcademicService } from './academic.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import {
  CreateAcademicYearDto,
  UpdateAcademicYearDto,
  CreateSeasonDto,
  UpdateSeasonDto,
  CreateHolidayDto,
  PromoteStudentsDto,
  UpdateEnrollmentDto,
  ManualNurseryAssignmentDto,
} from './dto';

@Controller('academic')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AcademicController {
  constructor(private readonly academicService: AcademicService) {}

  // Academic Years
  @Get('years')
  findAllAcademicYears() {
    return this.academicService.findAllAcademicYears();
  }

  @Get('years/:id')
  findOneAcademicYear(@Param('id', ParseIntPipe) id: number) {
    return this.academicService.findOneAcademicYear(id);
  }

  @Post('years')
  @Roles(Role.GA_specialist)
  createAcademicYear(@Body() data: CreateAcademicYearDto) {
    const autoPromote = data.autoPromoteStudents === true;
    return this.academicService.createAcademicYear(data, autoPromote);
  }

  @Patch('years/:id')
  @Roles(Role.GA_specialist)
  updateAcademicYear(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateAcademicYearDto,
  ) {
    return this.academicService.updateAcademicYear(id, data);
  }

  @Delete('years/:id')
  @Roles(Role.GA_specialist)
  removeAcademicYear(@Param('id', ParseIntPipe) id: number) {
    return this.academicService.removeAcademicYear(id);
  }

  // Student Promotion
  @Post('promote')
  @Roles(Role.GA_specialist)
  promoteStudents(@Body() promoteStudentsDto: PromoteStudentsDto) {
    return this.academicService.promoteStudents(promoteStudentsDto.newSchoolYear);
  }

  // Promote students for a specific created academic year
  @Post('years/:id/promote')
  @Roles(Role.GA_specialist)
  promoteStudentsForYear(@Param('id', ParseIntPipe) id: number) {
    // find the academic year by id to get the year number
    return this.academicService.findOneAcademicYear(id).then((ay) => {
      return this.academicService.promoteStudents(ay.year);
    });
  }

  // Enrollments
  @Patch('enrollments/:id')
  @Roles(Role.GA_specialist, Role.teacher)
  updateEnrollment(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEnrollmentDto: UpdateEnrollmentDto,
  ) {
    return this.academicService.updateEnrollment(id, updateEnrollmentDto);
  }

  // Manual nursery assignment (promote or keep as nursery for next year)
  @Post('nursery-assign')
  @Roles(Role.GA_specialist)
  manualNurseryAssign(@Body() dto: ManualNurseryAssignmentDto) {
    return this.academicService.manualAssignNursery(dto);
  }

  // Seasons
  @Get('seasons')
  findAllSeasons(@Query('academicYearId') academicYearId?: string) {
    return this.academicService.findAllSeasons(
      academicYearId ? +academicYearId : undefined,
    );
  }

  @Get('seasons/:id')
  findOneSeason(@Param('id', ParseIntPipe) id: number) {
    return this.academicService.findOneSeason(id);
  }

  @Post('seasons')
  @Roles(Role.GA_specialist)
  createSeason(@Body() data: CreateSeasonDto) {
    return this.academicService.createSeason(data);
  }

  @Patch('seasons/:id')
  @Roles(Role.GA_specialist)
  updateSeason(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateSeasonDto,
  ) {
    return this.academicService.updateSeason(id, data);
  }

  @Delete('seasons/:id')
  @Roles(Role.GA_specialist)
  removeSeason(@Param('id', ParseIntPipe) id: number) {
    return this.academicService.removeSeason(id);
  }

  // Holidays
  @Get('holidays')
  findAllHolidays(@Query('seasonId') seasonId?: string) {
    return this.academicService.findAllHolidays(
      seasonId ? +seasonId : undefined,
    );
  }

  @Get('holidays/:id')
  findOneHoliday(@Param('id', ParseIntPipe) id: number) {
    return this.academicService.findOneHoliday(id);
  }

  @Post('holidays')
  @Roles(Role.GA_specialist)
  createHoliday(@Body() data: CreateHolidayDto) {
    return this.academicService.createHoliday(data);
  }

  @Delete('holidays/:id')
  @Roles(Role.GA_specialist)
  removeHoliday(@Param('id', ParseIntPipe) id: number) {
    return this.academicService.removeHoliday(id);
  }
}