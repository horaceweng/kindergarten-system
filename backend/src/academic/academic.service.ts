// src/academic/academic.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAcademicYearDto,
  UpdateAcademicYearDto,
  CreateSeasonDto,
  UpdateSeasonDto,
  CreateHolidayDto,
  UpdateEnrollmentDto,
} from './dto';
import { GradeName } from '@prisma/client';

@Injectable()
export class AcademicService {
  constructor(private readonly prisma: PrismaService) {}

  // Academic Years Service
  async findAcademicYearByYear(year: number): Promise<number> {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { year },
    });
    if (!academicYear) {
      throw new NotFoundException(`找不到年度為 ${year} 的學年`);
    }
    return academicYear.id;
  }

  async findAllAcademicYears() {
    return this.prisma.academicYear.findMany({
      orderBy: { year: 'desc' },
    });
  }

  async findOneAcademicYear(id: number) {
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id },
      include: {
        seasons: true,
      },
    });
    if (!academicYear) {
      throw new NotFoundException(`Academic year with ID ${id} not found`);
    }
    return academicYear;
  }

  async createAcademicYear(data: CreateAcademicYearDto, autoPromoteStudents: boolean = false) {
    try {
      // Prevent creating a duplicate academic year (unique constraint on `year`)
      const existingYear = await this.prisma.academicYear.findUnique({ where: { year: data.year } });
      if (existingYear) {
        throw new ConflictException(`學年 ${data.year} 已存在`);
      }
      if (data.isActive) {
        await this.prisma.academicYear.updateMany({
          data: { isActive: false },
        });
      }

      const newYear = await this.prisma.academicYear.create({
        data: {
          ...data,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
        },
      });

      let promotionResults: { 
        promoted: number;
        graduated: number;
        manualNursery: number;
        manualK2: number;
      } | undefined;

      // Auto-promotion is disabled per new business rule.
      // if (autoPromoteStudents) {
      //   promotionResults = await this.promoteStudents(newYear.year);
      // }

      const academicYear = await this.findOneAcademicYear(newYear.id);
      return {
        ...academicYear,
        promotionResults,
      };
    } catch (error) {
      console.error('創建學年失敗:', error);
      throw error;
    }
  }

  async promoteStudents(newSchoolYear: number): Promise<{
    promoted: number;
    graduated: number;
    manualNursery: number;
    manualK2: number;
    nurseryStudentIds: number[];
    k2StudentIds: number[];
  }> {
    const previousSchoolYear = newSchoolYear - 1;
    console.log(`開始處理 ${previousSchoolYear} -> ${newSchoolYear} 學年的升級...`);

    const grades = await this.prisma.grade.findMany({ orderBy: { level: 'asc' } });
    const gradeMap = new Map(grades.map(g => [g.level, g]));
    const gradeNameToLevel = new Map(grades.map(g => [g.name, g.level]));

    const K1_LEVEL = gradeNameToLevel.get(GradeName.K1);
    const K2_LEVEL = gradeNameToLevel.get(GradeName.K2);
    const K3_LEVEL = gradeNameToLevel.get(GradeName.K3);
    const NURSERY_LEVEL = gradeNameToLevel.get(GradeName.NURSERY);

    const activeEnrollments = await this.prisma.enrollment.findMany({
      where: {
        schoolYear: previousSchoolYear,
        student: { status: 'active' },
      },
      include: {
        student: true,
        grade: true,
      },
    });

    console.log(`找到 ${activeEnrollments.length} 筆 ${previousSchoolYear} 學年的活躍註冊紀錄。`);

  const enrollmentsToCreate: any[] = [];
  const k2StudentIds: number[] = [];
  const nurseryStudentIds: number[] = [];
  let graduatedCount = 0;
  let manualNurseryCount = 0;
  let manualK2Count = 0;

    for (const enrollment of activeEnrollments) {
      const currentLevel = enrollment.grade.level;
      const nextLevel = currentLevel + 1;
      const nextGrade = gradeMap.get(nextLevel);

      const existingEnrollment = await this.prisma.enrollment.findFirst({
        where: {
          studentId: enrollment.studentId,
          schoolYear: newSchoolYear,
        },
      });

      if (existingEnrollment) {
        console.log(`學生 ${enrollment.student.name} (ID: ${enrollment.studentId}) 已存在於 ${newSchoolYear} 學年，跳過。`);
        continue;
      }

      if (currentLevel === K1_LEVEL) {
        if (nextGrade) {
          enrollmentsToCreate.push({
            studentId: enrollment.studentId,
            classId: enrollment.classId,
            gradeId: nextGrade.id,
            schoolYear: newSchoolYear,
          });
        }
      } else if (currentLevel === K2_LEVEL) {
        // Promote to K3 (大班) but class assignment needs admin manual adjustment later.
        if (nextGrade) {
          enrollmentsToCreate.push({
            studentId: enrollment.studentId,
            classId: enrollment.classId, // keep same class for now; admin can change via updateEnrollment
            gradeId: nextGrade.id,
            schoolYear: newSchoolYear,
          });
          manualK2Count++;
          k2StudentIds.push(enrollment.studentId);
          console.log(`學生 ${enrollment.student.name} (ID: ${enrollment.studentId}) 從中班升上大班 (暫時保留原班級)，待管理員分派大班班級。`);
        }
      } else if (currentLevel === NURSERY_LEVEL) {
        // Do NOT auto-create enrollment for nursery; admin will decide per student.
        manualNurseryCount++;
        nurseryStudentIds.push(enrollment.studentId);
        console.log(`學生 ${enrollment.student.name} (ID: ${enrollment.studentId}) 為幼幼班，需要管理者手動決定是否升級及分配班級。`);
      } else if (currentLevel === K3_LEVEL) {
        graduatedCount++;
        await this.prisma.student.update({
          where: { id: enrollment.studentId },
          data: { status: 'graduated', departureDate: new Date(), departureReason: '畢業' },
        });
      } else {
        console.warn(`未知的年級層級: ${currentLevel} for student ID: ${enrollment.studentId}`);
      }
    }

    if (enrollmentsToCreate.length > 0) {
      await this.prisma.enrollment.createMany({
        data: enrollmentsToCreate,
        skipDuplicates: true,
      });
    }

    console.log(`升級完成: ${enrollmentsToCreate.length} 位學生自動升級, ${graduatedCount} 位學生畢業, ${manualNurseryCount} 位幼幼班待處理, ${manualK2Count} 位中班升大班待分配班級。`);

    return {
      promoted: enrollmentsToCreate.length,
      graduated: graduatedCount,
      manualNursery: manualNurseryCount,
      manualK2: manualK2Count,
      nurseryStudentIds,
      k2StudentIds,
    };
  }

  async updateEnrollment(id: number, data: UpdateEnrollmentDto) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
    });

    if (!enrollment) {
      throw new NotFoundException(`找不到 ID 為 ${id} 的註冊紀錄`);
    }

    return this.prisma.enrollment.update({
      where: { id },
      data: {
        ...data,
      },
    });
  }

  async updateAcademicYear(id: number, data: UpdateAcademicYearDto) {
    if (data.isActive) {
      await this.prisma.academicYear.updateMany({
        where: { id: { not: id } },
        data: { isActive: false },
      });
    }
    return this.prisma.academicYear.update({
      where: { id },
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
    });
  }

  async removeAcademicYear(id: number) {
    return this.prisma.academicYear.delete({ where: { id } });
  }

  // Seasons Service
  async findAllSeasons(academicYearId?: number) {
    return this.prisma.season.findMany({
      where: { academicYearId },
      include: { academicYear: true },
      orderBy: [{ academicYearId: 'desc' }, { startDate: 'asc' }],
    });
  }

  async findOneSeason(id: number) {
    const season = await this.prisma.season.findUnique({
      where: { id },
      include: { academicYear: true },
    });
    if (!season) {
      throw new NotFoundException(`Season with ID ${id} not found`);
    }
    return season;
  }

  async createSeason(data: CreateSeasonDto) {
    return this.prisma.season.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
      include: { academicYear: true },
    });
  }

  async updateSeason(id: number, data: UpdateSeasonDto) {
    return this.prisma.season.update({
      where: { id },
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
      },
      include: { academicYear: true },
    });
  }

  async removeSeason(id: number) {
    return this.prisma.season.delete({ where: { id } });
  }

  // Holidays Service
  async findAllHolidays(seasonId?: number) {
    return this.prisma.holiday.findMany({
      where: { seasonId },
      include: { season: true },
      orderBy: { date: 'asc' },
    });
  }

  async findOneHoliday(id: number) {
    const holiday = await this.prisma.holiday.findUnique({
      where: { id },
      include: { season: true },
    });

    if (!holiday) {
      throw new NotFoundException(`Holiday with ID ${id} not found`);
    }
    return holiday;
  }

  async createHoliday(data: CreateHolidayDto) {
    return this.prisma.holiday.create({
      data: {
        ...data,
        date: new Date(data.date),
      },
    });
  }

  async removeHoliday(id: number) {
    return this.prisma.holiday.delete({ where: { id } });
  }

  // Grades
  async findAllGrades() {
    return this.prisma.grade.findMany({ orderBy: { level: 'asc' } });
  }

  // Manual assignment for nursery students: create or update enrollment for the given schoolYear
  async manualAssignNursery(data: { studentId: number; schoolYear: number; gradeId: number; classId: number }) {
    const { studentId, schoolYear, gradeId, classId } = data;

    // Ensure student exists
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found`);
    }

    // Ensure target class exists
    const targetClass = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!targetClass) {
      throw new NotFoundException(`Class with ID ${classId} not found`);
    }

    // Ensure target grade exists and is either NURSERY or K1
    const targetGrade = await this.prisma.grade.findUnique({ where: { id: gradeId } });
    if (!targetGrade) {
      throw new NotFoundException(`Grade with ID ${gradeId} not found`);
    }

    const { GradeName } = require('@prisma/client');
    if (![GradeName.NURSERY, GradeName.K1].includes(targetGrade.name as any)) {
      throw new Error('手動調整僅允許將幼幼班保留為幼幼或調整為小班 (K1)');
    }

    // Optional: ensure the student had a nursery enrollment in the previous year
    const prevYear = schoolYear - 1;
    const prevEnrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, schoolYear: prevYear },
      include: { grade: true },
    });
    if (prevEnrollment && prevEnrollment.grade && prevEnrollment.grade.name !== GradeName.NURSERY) {
      // not a nursery student in previous year; warn (but still allow change)
      console.warn(`student ${studentId} previous year grade is ${prevEnrollment.grade.name}, manual nursery assign proceeding anyway.`);
    }

    // Upsert enrollment for the target school year
    const existing = await this.prisma.enrollment.findFirst({
      where: { studentId, schoolYear },
    });

    if (existing) {
      return this.prisma.enrollment.update({
        where: { id: existing.id },
        data: { gradeId, classId },
      });
    }

    return this.prisma.enrollment.create({
      data: { studentId, schoolYear, gradeId, classId },
    });
  }
}