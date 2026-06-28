-- AlterTable
ALTER TABLE "Business" ALTER COLUMN "location" SET DEFAULT '',
ADD COLUMN     "targetKind" TEXT NOT NULL DEFAULT 'local_business',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'DRAFT_INTAKE',
ADD COLUMN     "audience" TEXT,
ADD COLUMN     "profile" JSONB;

-- Existing businesses predate the agentic intake flow; treat them as live audits.
UPDATE "Business" SET "status" = 'ACTIVE';

-- AlterTable
ALTER TABLE "Prompt" ADD COLUMN     "rationale" TEXT;
