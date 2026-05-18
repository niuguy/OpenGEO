CREATE TABLE "WebsiteAudit" (
    "id" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "error" TEXT,
    "businessId" TEXT,
    "inferredName" TEXT,
    "inferredCategory" TEXT,
    "inferredLocation" TEXT,
    "inferredAttributes" TEXT[],
    "pages" JSONB NOT NULL,
    "summaryText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteAudit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadProspect" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "phone" TEXT,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "address" TEXT,
    "mapsUrl" TEXT,
    "raw" JSONB,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadProspect_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebsiteAudit_normalizedUrl_idx" ON "WebsiteAudit"("normalizedUrl");
CREATE INDEX "WebsiteAudit_businessId_idx" ON "WebsiteAudit"("businessId");
CREATE INDEX "WebsiteAudit_createdAt_idx" ON "WebsiteAudit"("createdAt");
CREATE UNIQUE INDEX "LeadProspect_source_sourceId_key" ON "LeadProspect"("source", "sourceId");
CREATE INDEX "LeadProspect_category_location_idx" ON "LeadProspect"("category", "location");
CREATE INDEX "LeadProspect_status_idx" ON "LeadProspect"("status");

ALTER TABLE "WebsiteAudit"
ADD CONSTRAINT "WebsiteAudit_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
