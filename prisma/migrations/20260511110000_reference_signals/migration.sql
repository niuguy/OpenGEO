-- Add structured model-cited reference signals extracted from prompt answers.
CREATE TABLE "ReferenceSignal" (
    "id" TEXT NOT NULL,
    "extractionResultId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT,
    "evidence" TEXT,
    "mentionedForBusinesses" TEXT[],

    CONSTRAINT "ReferenceSignal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReferenceSignal_extractionResultId_idx" ON "ReferenceSignal"("extractionResultId");
CREATE INDEX "ReferenceSignal_sourceType_idx" ON "ReferenceSignal"("sourceType");
CREATE INDEX "ReferenceSignal_label_idx" ON "ReferenceSignal"("label");

ALTER TABLE "ReferenceSignal"
ADD CONSTRAINT "ReferenceSignal_extractionResultId_fkey"
FOREIGN KEY ("extractionResultId") REFERENCES "ExtractionResult"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
