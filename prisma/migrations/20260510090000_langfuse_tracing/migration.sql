-- Add internal tracing and sampling metadata. Langfuse fields are nullable so
-- prompt runs remain fully owned by the application database when tracing is off.
ALTER TABLE "Prompt"
ADD COLUMN "clusterId" TEXT,
ADD COLUMN "clusterIntent" TEXT;

UPDATE "Prompt"
SET
  "clusterId" = lower(regexp_replace("template", '[^a-zA-Z0-9]+', '-', 'g')),
  "clusterIntent" = "template"
WHERE "clusterId" IS NULL OR "clusterIntent" IS NULL;

ALTER TABLE "Prompt"
ALTER COLUMN "clusterId" SET NOT NULL,
ALTER COLUMN "clusterIntent" SET NOT NULL;

ALTER TABLE "PromptRun"
ADD COLUMN "evaluationRunId" TEXT,
ADD COLUMN "sampleIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "tokenUsage" JSONB,
ADD COLUMN "langfuseTraceId" TEXT,
ADD COLUMN "langfuseObservationId" TEXT,
ADD COLUMN "langfuseTraceUrl" TEXT,
ADD COLUMN "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "VisibilitySnapshot"
ADD COLUMN "recommendationConsistency" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "competitorShare" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "volatilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "sourceMentions" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "PromptRun_evaluationRunId_idx" ON "PromptRun"("evaluationRunId");
CREATE INDEX "PromptRun_langfuseTraceId_idx" ON "PromptRun"("langfuseTraceId");
