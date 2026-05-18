ALTER TABLE "PromptRun"
ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'chatgpt';

ALTER TABLE "VisibilitySnapshot"
ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'chatgpt';

CREATE INDEX "PromptRun_provider_idx" ON "PromptRun"("provider");
CREATE INDEX "VisibilitySnapshot_businessId_provider_createdAt_idx" ON "VisibilitySnapshot"("businessId", "provider", "createdAt");
