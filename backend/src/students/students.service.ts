import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StudentStatus } from '@prisma/client';

@Injectable()
export class StudentsService {
    constructor(private prisma: PrismaService) {}

    // 根據 classId 查詢學生
    findAllByClass(classId: number) {
        return this.prisma.student.findMany({
            where: {
                enrollments: {
                    some: {
                        classId: classId,
                    },
                },
            },
        });
    }
    
    // 獲取所有學生資料，可選根據狀態過濾，可選包含班級註冊資訊
    findAll(status?: string, includeEnrollments?: boolean) {
        const where = status && status !== 'all' 
            ? { status: status as StudentStatus } 
            : {};
            
        return this.prisma.student.findMany({
            where,
            include: includeEnrollments ? {
                enrollments: {
                    include: {
                        class: true,
                        grade: true,
                    },
                    orderBy: {
                        id: 'desc'
                    }
                }
            } : undefined,
            orderBy: [
                { status: 'asc' },
                { name: 'asc' }
            ],
        });
    }
    
    // 獲取單一學生資料
    findOne(id: number) {
        return this.prisma.student.findUnique({
            where: { id },
            include: {
                enrollments: {
                    include: {
                        class: true,
                        grade: true,
                    }
                }
            }
        });
    }
    
    // 新增學生資料
    create(data: any) {
        const createData: any = {
            name: data.name,
            gender: data.gender,
            status: data.status || 'active',
            departureReason: data.departureReason || null,
        };

        if (data.birthday) createData.birthday = new Date(data.birthday);
        if (data.enrollmentDate) createData.enrollmentDate = new Date(data.enrollmentDate);
        else createData.enrollmentDate = new Date();
        if (data.departureDate) createData.departureDate = new Date(data.departureDate);

        return this.prisma.student.create({ data: createData });
    }
    
    // 更新學生資料
    update(id: number, data: any) {
        const updateData: any = {
            name: data.name,
            gender: data.gender,
            status: data.status,
            departureReason: data.departureReason || null,
        };

        if (data.birthday) updateData.birthday = new Date(data.birthday);
        if (data.enrollmentDate) updateData.enrollmentDate = new Date(data.enrollmentDate);
        if (data.departureDate) updateData.departureDate = new Date(data.departureDate);

        return this.prisma.student.update({ where: { id }, data: updateData });
    }
    
    // 刪除學生資料
    async remove(id: number) {
        // 刪除學生相關的出缺勤紀錄
        await this.prisma.attendanceRecord.deleteMany({
            where: { studentId: id }
        });
        
        // 刪除學生相關的請假申請
        await this.prisma.leaveRequest.deleteMany({
            where: { studentId: id }
        });
        
        // 刪除學生的註冊紀錄 (Enrollment)
        await this.prisma.enrollment.deleteMany({
            where: { studentId: id }
        });
        
        // 刪除學生本身
        return this.prisma.student.delete({
            where: { id }
        });
    }
    
    // 獲取學生的註冊記錄 (Enrollment)
    getStudentEnrollments(studentId: number) {
        return this.prisma.enrollment.findMany({
            where: {
                studentId
            },
            include: {
                class: true,
                grade: true,
            },
            orderBy: {
                id: 'desc'
            }
        });
    }
    
    // 創建學生註冊
    createStudentEnrollment(data: any) {
        // Expect data: { studentId, classId, gradeId, schoolYear }
        return this.prisma.enrollment.create({
            data: {
                studentId: data.studentId,
                classId: data.classId,
                gradeId: data.gradeId,
                schoolYear: Number(data.schoolYear),
            }
        });
    }
    
    // 更新學生註冊
    updateStudentEnrollment(id: number, data: any) {
        return this.prisma.enrollment.update({
            where: { id },
            data: {
                classId: data.classId,
                gradeId: data.gradeId,
                schoolYear: data.schoolYear ? Number(data.schoolYear) : undefined,
            }
        });
    }
    
    // 刪除學生註冊
    removeStudentEnrollment(id: number) {
        return this.prisma.enrollment.delete({
            where: { id }
        });
    }
}