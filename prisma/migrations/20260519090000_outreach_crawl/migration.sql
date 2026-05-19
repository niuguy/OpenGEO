CREATE TABLE "OutreachCrawl" (
    "id" TEXT NOT NULL,
    "leadProspectId" TEXT,
    "sourceLeadName" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "normalizedUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "emails" TEXT[],
    "phoneNumbers" TEXT[],
    "contactPages" JSONB NOT NULL,
    "forms" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutreachCrawl_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OutreachCrawl_leadProspectId_idx" ON "OutreachCrawl"("leadProspectId");
CREATE INDEX "OutreachCrawl_normalizedUrl_idx" ON "OutreachCrawl"("normalizedUrl");
CREATE INDEX "OutreachCrawl_status_idx" ON "OutreachCrawl"("status");
CREATE INDEX "OutreachCrawl_createdAt_idx" ON "OutreachCrawl"("createdAt");

ALTER TABLE "OutreachCrawl"
ADD CONSTRAINT "OutreachCrawl_leadProspectId_fkey"
FOREIGN KEY ("leadProspectId") REFERENCES "LeadProspect"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
