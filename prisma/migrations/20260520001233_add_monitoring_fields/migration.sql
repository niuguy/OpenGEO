-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "lastMonitoredAt" TIMESTAMP(3),
ADD COLUMN     "monitoringEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "monitoringIntervalDays" INTEGER NOT NULL DEFAULT 7;

-- CreateIndex
CREATE INDEX "Business_monitoringEnabled_lastMonitoredAt_idx" ON "Business"("monitoringEnabled", "lastMonitoredAt");
