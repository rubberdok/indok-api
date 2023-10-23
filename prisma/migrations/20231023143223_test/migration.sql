/*
  Warnings:

  - Added the required column `test` to the `GoogleDocument` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GoogleDocument" ADD COLUMN     "test" TEXT NOT NULL;
