-- AlterTable
ALTER TABLE "ExtractionResult" ADD COLUMN     "detectionMethod" TEXT NOT NULL DEFAULT 'llm';

-- AlterTable
ALTER TABLE "PromptRun" ADD COLUMN     "seed" BIGINT,
ADD COLUMN     "systemFingerprint" TEXT,
ADD COLUMN     "temperature" DOUBLE PRECISION;
