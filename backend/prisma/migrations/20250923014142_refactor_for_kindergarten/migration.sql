/*
  Warnings:

  - You are about to drop the column `grade_id` on the `classes` table. All the data in the column will be lost.
  - You are about to drop the column `school_year` on the `classes` table. All the data in the column will be lost.
  - You are about to alter the column `name` on the `grades` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `Enum(EnumId(0))`.
  - You are about to drop the column `student_id` on the `students` table. All the data in the column will be lost.
  - You are about to drop the `student_class_enrollments` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[year]` on the table `academic_years` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `classes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[level]` on the table `grades` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[date]` on the table `holidays` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `leave_types` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `level` to the `grades` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `classes` DROP FOREIGN KEY `classes_grade_id_fkey`;

-- DropForeignKey
ALTER TABLE `student_class_enrollments` DROP FOREIGN KEY `student_class_enrollments_class_id_fkey`;

-- DropForeignKey
ALTER TABLE `student_class_enrollments` DROP FOREIGN KEY `student_class_enrollments_student_id_fkey`;

-- DropIndex
DROP INDEX `classes_grade_id_fkey` ON `classes`;

-- DropIndex
DROP INDEX `students_student_id_key` ON `students`;

-- AlterTable
ALTER TABLE `classes` DROP COLUMN `grade_id`,
    DROP COLUMN `school_year`;

-- AlterTable
ALTER TABLE `grades` ADD COLUMN `level` INTEGER NOT NULL,
    MODIFY `name` ENUM('NURSERY', 'K1', 'K2', 'K3') NOT NULL;

-- AlterTable
ALTER TABLE `students` DROP COLUMN `student_id`,
    MODIFY `enrollment_date` DATE NOT NULL;

-- DropTable
DROP TABLE `student_class_enrollments`;

-- CreateTable
CREATE TABLE `enrollments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id` INTEGER NOT NULL,
    `class_id` INTEGER NOT NULL,
    `grade_id` INTEGER NOT NULL,
    `school_year` YEAR NOT NULL,

    UNIQUE INDEX `enrollments_student_id_school_year_key`(`student_id`, `school_year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `academic_years_year_key` ON `academic_years`(`year`);

-- CreateIndex
CREATE UNIQUE INDEX `classes_name_key` ON `classes`(`name`);

-- CreateIndex
CREATE UNIQUE INDEX `grades_level_key` ON `grades`(`level`);

-- CreateIndex
CREATE UNIQUE INDEX `holidays_date_key` ON `holidays`(`date`);

-- CreateIndex
CREATE UNIQUE INDEX `leave_types_name_key` ON `leave_types`(`name`);

-- AddForeignKey
ALTER TABLE `enrollments` ADD CONSTRAINT `enrollments_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enrollments` ADD CONSTRAINT `enrollments_class_id_fkey` FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enrollments` ADD CONSTRAINT `enrollments_grade_id_fkey` FOREIGN KEY (`grade_id`) REFERENCES `grades`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
