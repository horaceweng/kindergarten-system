// prisma/seed.ts
import { PrismaClient, Gender, GradeName, StudentStatus, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  await prisma.$transaction(async (tx) => {
    // 1. Clean up database
    console.log('Cleaning up existing data...');
    // Delete records in order of dependency
    await tx.attendanceRecord.deleteMany();
    await tx.leaveRequest.deleteMany();
    await tx.enrollment.deleteMany();
    await tx.teacherClassAssignment.deleteMany();
    await tx.student.deleteMany();
    await tx.user.deleteMany(); // Assuming we might want to clear users too
    await tx.class.deleteMany();
    await tx.grade.deleteMany();
    await tx.leaveType.deleteMany();
    await tx.holiday.deleteMany();
    await tx.season.deleteMany();
    await tx.academicYear.deleteMany();
    console.log('Cleanup complete.');

    // --- 使用 upsert 安全地建立假別資料 ---
    console.log('Upserting leave types...');
    const leaveTypes = [
      { name: '事假', description: 'Personal leave' },
      { name: '病假', description: 'Sick leave' },
      { name: '公假', description: 'Official leave' },
      { name: '喪假', description: 'Bereavement leave' },
    ];

    for (const lt of leaveTypes) {
      const existing = await tx.leaveType.findFirst({ where: { name: lt.name } });
      if (existing) {
        await tx.leaveType.update({ where: { id: existing.id }, data: lt });
      } else {
        await tx.leaveType.create({ data: lt });
      }
    }
    console.log('Leave types upserted.');

    // 2. Create Grades
    console.log('Creating grades...');
    const nurseryGrade = await tx.grade.create({
      data: { name: GradeName.NURSERY, level: 0 },
    });
    const k1Grade = await tx.grade.create({
      data: { name: GradeName.K1, level: 1 },
    });
    const k2Grade = await tx.grade.create({
      data: { name: GradeName.K2, level: 2 },
    });
    const k3Grade = await tx.grade.create({
      data: { name: GradeName.K3, level: 3 },
    });
    console.log('Grades created.');

    // 3. Create Classes
    console.log('Creating classes...');
    const squirrelClass = await tx.class.create({
      data: { name: '松鼠班' },
    });
    const rainbowClass = await tx.class.create({
      data: { name: '彩虹班' },
    });
    const nurseryClass = await tx.class.create({
      data: { name: '幼幼班' },
    });
    console.log('Classes created.');

    // 4. Create Academic Year
    console.log('Creating academic year...');
    const schoolYear = 2025; // 民國114年
    await tx.academicYear.create({
      data: {
        year: schoolYear,
        name: `${schoolYear} 學年度`,
        startDate: new Date(`${schoolYear}-08-01`),
        endDate: new Date(`${schoolYear + 1}-07-31`),
        isActive: true,
      },
    });
    console.log('Academic year created.');

    // 5. Create Users
    console.log('Creating users...');
    await tx.user.createMany({
      data: [
        {
          name: 'admin',
          role: Role.GA_specialist,
        },
        {
          name: '怡慧',
          role: Role.GA_specialist,
        },
        {
          name: '安妮',
          role: Role.GA_specialist,
        },
        {
          name: '高孟汝',
          role: Role.teacher,
        },
        {
          name: '廖芳琪',
          role: Role.teacher,
        },
        {
          name: '劉倩妏',
          role: Role.teacher,
        },
      ],
    });
    console.log('Users created.');

    // 6. Create Students and Enrollments
    console.log('Creating students and enrollments...');

    const getBirthYear = (gradeName: GradeName) => {
      const currentYear = 2025;
      switch (gradeName) {
        case GradeName.NURSERY:
          return currentYear - 3; // Approx. 3 years old
        case GradeName.K1:
          return currentYear - 4; // Approx. 4 years old
        case GradeName.K2:
          return currentYear - 5; // Approx. 5 years old
        case GradeName.K3:
          return currentYear - 6; // Approx. 6 years old
        default:
          return currentYear - 5; // Default fallback
      }
    };

    const studentsData = [
      // 松鼠班
      { name: '詹蕓鳳', gender: Gender.female, grade: k1Grade, class: squirrelClass },
      { name: '馮筱淇', gender: Gender.female, grade: k1Grade, class: squirrelClass },
      { name: '江孟澄', gender: Gender.female, grade: k1Grade, class: squirrelClass },
      { name: '翁昱恆', gender: Gender.female, grade: k1Grade, class: squirrelClass },
      { name: '葉羿嘉', gender: Gender.male, grade: k1Grade, class: squirrelClass },
      { name: '方馨禾', gender: Gender.female, grade: k2Grade, class: squirrelClass },
      { name: '張哲閎', gender: Gender.male, grade: k2Grade, class: squirrelClass },
      { name: '李祿易', gender: Gender.male, grade: k2Grade, class: squirrelClass },
      { name: '李偉德', gender: Gender.female, grade: k2Grade, class: squirrelClass },
      { name: '曾歆', gender: Gender.female, grade: k2Grade, class: squirrelClass },
      { name: '王詩語', gender: Gender.female, grade: k2Grade, class: squirrelClass },
      // 彩虹班
      { name: '李宜芹', gender: Gender.female, grade: k3Grade, class: rainbowClass },
      { name: '高湘苹', gender: Gender.female, grade: k3Grade, class: rainbowClass },
      { name: '江可晴', gender: Gender.female, grade: k3Grade, class: rainbowClass },
      { name: '王百玄', gender: Gender.female, grade: k3Grade, class: rainbowClass },
      { name: '陳語睫', gender: Gender.female, grade: k3Grade, class: rainbowClass },
      { name: '蔡允宸', gender: Gender.male, grade: k3Grade, class: rainbowClass },
      { name: '喬羿昕', gender: Gender.male, grade: k3Grade, class: rainbowClass },
      { name: '吳愷', gender: Gender.female, grade: k3Grade, class: rainbowClass },
      { name: '曹瑄慈', gender: Gender.female, grade: k3Grade, class: rainbowClass },
      { name: '楊布慕慈櫟', gender: Gender.male, grade: k3Grade, class: rainbowClass },
      { name: '石晴光', gender: Gender.female, grade: k3Grade, class: rainbowClass },
      // 幼幼班
      { name: '邱帟睿', gender: Gender.male, grade: nurseryGrade, class: nurseryClass },
      { name: '喬以甯', gender: Gender.female, grade: nurseryGrade, class: nurseryClass },
    ];

    for (const s of studentsData) {
      const birthYear = getBirthYear(s.grade.name);
      // Generate a random month and day
      const month = Math.floor(Math.random() * 12) + 1;
      const day = Math.floor(Math.random() * 28) + 1; // Use 28 to be safe for all months

      const student = await tx.student.create({
        data: {
          name: s.name,
          gender: s.gender,
          birthday: new Date(`${birthYear}-${month}-${day}`),
          status: StudentStatus.active,
          enrollmentDate: new Date(`${schoolYear}-08-01`),
        },
      });

      await tx.enrollment.create({
        data: {
          studentId: student.id,
          classId: s.class.id,
          gradeId: s.grade.id,
          schoolYear: schoolYear,
        },
      });
    }
    console.log(`${studentsData.length} students and enrollments created.`);
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });