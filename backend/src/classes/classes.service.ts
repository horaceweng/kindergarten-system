// in src/classes/classes.service.ts --- UPDATED

import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role, Prisma } from '@prisma/client';

@Injectable()
export class ClassesService {
    constructor(private prisma: PrismaService) {}

    async findAll(user: { userId: number; role: string }) {
        if (!user || !user.role) return [];

        // 找出當前活躍的學年
        const activeAcademicYear = await this.prisma.academicYear.findFirst({
            where: { isActive: true },
            select: { year: true }
        });

        // 如果沒有活躍學年，回傳所有班級（但老師只回傳自己被指派的班級）
        if (!activeAcademicYear) {
            if (user.role === 'GA_specialist') {
                return this.prisma.class.findMany({ orderBy: { id: 'asc' } });
            }
            if (user.role === 'teacher') {
                const assignments = await this.prisma.teacherClassAssignment.findMany({
                    where: { teacherId: user.userId, isActive: true },
                    select: { classId: true }
                });
                const classIds = assignments.map(a => a.classId);
                return this.prisma.class.findMany({ where: { id: { in: classIds.length ? classIds : [0] } }, orderBy: { id: 'asc' } });
            }
            return [];
        }

        const activeYear = activeAcademicYear.year;

        // 取得在該學年有註冊紀錄的班級 id
        const enrollments = await this.prisma.enrollment.findMany({
            where: { schoolYear: activeYear },
            select: { classId: true }
        });
        const enrolledClassIds = Array.from(new Set(enrollments.map(e => e.classId)));

        if (user.role === 'GA_specialist') {
            // 管理員（GA_specialist）應該能看到所有班級，
            // 包括剛建立但尚未有學生註冊的班級，避免前端建立後看不到新班級的情況。
            return this.prisma.class.findMany({ orderBy: { id: 'asc' } });
        }

        if (user.role === 'teacher') {
            // 先找出該老師在此學年的所有指派
            const assignments = await this.prisma.teacherClassAssignment.findMany({
                where: { teacherId: user.userId, isActive: true, schoolYear: String(activeYear) },
                select: { classId: true }
            });
            const assignedClassIds = Array.from(new Set(assignments.map(a => a.classId)));
            if (assignedClassIds.length === 0) return [];
            // 回傳老師在該學年被指派的班級
            return this.prisma.class.findMany({ where: { id: { in: assignedClassIds } }, orderBy: { id: 'asc' } });
        }

        return [];
    }

    async checkIsAdmin(user: { userId: number; role: string }) {
        if (!user || user.role !== 'GA_specialist') {
            throw new ForbiddenException('Only administrators can perform this action');
        }
    }

    async create(data: { name: string }, user: { userId: number; role: string }) {
        await this.checkIsAdmin(user);
        // Normalize name
        const normalized = (data.name || '').trim();
        if (!normalized) throw new BadRequestException('Class name cannot be empty');

        // Check duplicate (case-insensitive) before attempting create using raw SQL
        const existingRows: Array<{ id: number }> = await this.prisma.$queryRaw`
            SELECT id FROM classes WHERE LOWER(name) = LOWER(${normalized}) LIMIT 1
        ` as any;
        if (existingRows && existingRows.length > 0) {
            throw new ConflictException('班級名稱已存在');
        }

        try {
            return await this.prisma.class.create({ data: { name: normalized } });
        } catch (err) {
            if (err instanceof Prisma.PrismaClientKnownRequestError) {
                if (err.code === 'P2002') {
                    throw new ConflictException('班級名稱已存在');
                }
            }
            throw err;
        }
    }

    async update(id: number, data: { name?: string }, user: { userId: number; role: string }) {
        await this.checkIsAdmin(user);
        const classRecord = await this.prisma.class.findUnique({ where: { id } });
        if (!classRecord) throw new NotFoundException(`Class with ID ${id} not found`);
        // If updating name, normalize and check duplicates
        if (data.name !== undefined) {
            const normalized = (data.name || '').trim();
            if (!normalized) throw new BadRequestException('Class name cannot be empty');
            const existingRows: Array<{ id: number }> = await this.prisma.$queryRaw`
                SELECT id FROM classes WHERE LOWER(name) = LOWER(${normalized}) AND id != ${id} LIMIT 1
            ` as any;
            if (existingRows && existingRows.length > 0) throw new ConflictException('班級名稱已存在');
            return this.prisma.class.update({ where: { id }, data: { ...data, name: normalized } });
        }

        return this.prisma.class.update({ where: { id }, data });
    }

    async remove(id: number, user: { userId: number; role: string }) {
        await this.checkIsAdmin(user);
        const classRecord = await this.prisma.class.findUnique({ where: { id } });
        if (!classRecord) throw new NotFoundException(`Class with ID ${id} not found`);

        // 檢查是否有學生在此班級（任何學年）
        const studentCount = await this.prisma.enrollment.count({ where: { classId: id } });
        if (studentCount > 0) {
            throw new ForbiddenException(`Cannot delete class with ID ${id} because it has ${studentCount} students`);
        }

        return this.prisma.class.delete({ where: { id } });
    }

    async getClassTeachers(classId: number, user: { userId: number; role: string }) {
        const classRecord = await this.prisma.class.findUnique({ where: { id: classId } });
        if (!classRecord) throw new NotFoundException(`Class with ID ${classId} not found`);

        return this.prisma.teacherClassAssignment.findMany({
            where: { classId },
            include: {
                teacher: { select: { id: true, name: true } }
            },
            orderBy: [ { isActive: 'desc' }, { startDate: 'desc' } ]
        });
    }

    async assignTeacher(data: {
        classId: number;
        teacherId: number;
        schoolYear: string;
        startDate?: string | null;
        endDate?: string | null;
        isActive?: boolean;
        notes?: string | null;
    }, user: { userId: number; role: string }) {
        await this.checkIsAdmin(user);

        const classRecord = await this.prisma.class.findUnique({ where: { id: data.classId } });
        if (!classRecord) throw new NotFoundException(`Class with ID ${data.classId} not found`);

        const teacher = await this.prisma.user.findFirst({ where: { id: data.teacherId, role: Role.teacher } });
        if (!teacher) throw new NotFoundException(`Teacher with ID ${data.teacherId} not found`);

        const startDate = data.startDate ? new Date(data.startDate) : null;
        const endDate = data.endDate ? new Date(data.endDate) : null;

        return this.prisma.teacherClassAssignment.create({
            data: {
                teacherId: data.teacherId,
                classId: data.classId,
                schoolYear: data.schoolYear,
                startDate,
                endDate,
                isActive: data.isActive ?? true,
                notes: data.notes || null,
            },
            include: {
                teacher: { select: { id: true, name: true } }
            }
        });
    }
}