/*
  Warnings:

  - Added the required column `businessImplications` to the `Report` table without a default value. This is not possible if the table is not empty.
  - Added the required column `conclusions` to the `Report` table without a default value. This is not possible if the table is not empty.
  - Added the required column `risks` to the `Report` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trends` to the `Report` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "businessImplications" JSONB NOT NULL,
ADD COLUMN     "conclusions" JSONB NOT NULL,
ADD COLUMN     "risks" JSONB NOT NULL,
ADD COLUMN     "trends" JSONB NOT NULL;
