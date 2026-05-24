-- AlterTable
ALTER TABLE "Prompt" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'generated',
ALTER COLUMN "status" SET DEFAULT 'DRAFT';
