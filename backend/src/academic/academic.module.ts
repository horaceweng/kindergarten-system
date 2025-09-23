// src/academic/academic.module.ts
import { Module } from '@nestjs/common';
import { AcademicController } from './academic.controller';
import { GradesController } from './grades.controller';
import { AcademicService } from './academic.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AcademicController, GradesController],
  providers: [AcademicService],
  exports: [AcademicService]
})
export class AcademicModule {}