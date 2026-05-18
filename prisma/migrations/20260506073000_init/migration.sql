CREATE TYPE "PromptStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "RunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');
CREATE TYPE "Sentiment" AS ENUM ('positive', 'neutral', 'negative', 'unknown');

CREATE TABLE "Business" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "targetAttributes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Business_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Prompt" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" "PromptStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PromptRun" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "rawAnswer" TEXT,
    "status" "RunStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PromptRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExtractionResult" (
    "id" TEXT NOT NULL,
    "promptRunId" TEXT NOT NULL,
    "targetAppears" BOOLEAN NOT NULL,
    "targetRank" INTEGER,
    "sentiment" "Sentiment" NOT NULL,
    "reasons" TEXT[],
    "sources" TEXT[],
    "confidence" DOUBLE PRECISION NOT NULL,
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtractionResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MentionedBusiness" (
    "id" TEXT NOT NULL,
    "extractionResultId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rank" INTEGER,
    "sentiment" "Sentiment" NOT NULL DEFAULT 'unknown',
    "reasons" TEXT[],

    CONSTRAINT "MentionedBusiness_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SemanticAttribute" (
    "id" TEXT NOT NULL,
    "extractionResultId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "evidence" TEXT,

    CONSTRAINT "SemanticAttribute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VisibilitySnapshot" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "visibilityScore" DOUBLE PRECISION NOT NULL,
    "averageRank" DOUBLE PRECISION,
    "totalPrompts" INTEGER NOT NULL,
    "mentionedPrompts" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisibilitySnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgencyInquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "agencyName" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgencyInquiry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TelemetryEvent" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'local',
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelemetryEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Business_name_idx" ON "Business"("name");
CREATE INDEX "Competitor_businessId_idx" ON "Competitor"("businessId");
CREATE UNIQUE INDEX "Competitor_businessId_name_key" ON "Competitor"("businessId", "name");
CREATE INDEX "Prompt_businessId_idx" ON "Prompt"("businessId");
CREATE UNIQUE INDEX "Prompt_businessId_text_key" ON "Prompt"("businessId", "text");
CREATE INDEX "PromptRun_promptId_runAt_idx" ON "PromptRun"("promptId", "runAt");
CREATE UNIQUE INDEX "ExtractionResult_promptRunId_key" ON "ExtractionResult"("promptRunId");
CREATE INDEX "MentionedBusiness_extractionResultId_idx" ON "MentionedBusiness"("extractionResultId");
CREATE INDEX "MentionedBusiness_name_idx" ON "MentionedBusiness"("name");
CREATE INDEX "SemanticAttribute_extractionResultId_idx" ON "SemanticAttribute"("extractionResultId");
CREATE INDEX "SemanticAttribute_label_idx" ON "SemanticAttribute"("label");
CREATE INDEX "VisibilitySnapshot_businessId_createdAt_idx" ON "VisibilitySnapshot"("businessId", "createdAt");
CREATE INDEX "AgencyInquiry_email_idx" ON "AgencyInquiry"("email");
CREATE INDEX "AgencyInquiry_createdAt_idx" ON "AgencyInquiry"("createdAt");
CREATE INDEX "TelemetryEvent_eventName_idx" ON "TelemetryEvent"("eventName");
CREATE INDEX "TelemetryEvent_createdAt_idx" ON "TelemetryEvent"("createdAt");

ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Prompt" ADD CONSTRAINT "Prompt_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromptRun" ADD CONSTRAINT "PromptRun_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExtractionResult" ADD CONSTRAINT "ExtractionResult_promptRunId_fkey" FOREIGN KEY ("promptRunId") REFERENCES "PromptRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MentionedBusiness" ADD CONSTRAINT "MentionedBusiness_extractionResultId_fkey" FOREIGN KEY ("extractionResultId") REFERENCES "ExtractionResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SemanticAttribute" ADD CONSTRAINT "SemanticAttribute_extractionResultId_fkey" FOREIGN KEY ("extractionResultId") REFERENCES "ExtractionResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VisibilitySnapshot" ADD CONSTRAINT "VisibilitySnapshot_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
