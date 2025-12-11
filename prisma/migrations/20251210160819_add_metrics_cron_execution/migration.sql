-- CreateTable
CREATE TABLE "MetricsCronExecution" (
    "id" TEXT NOT NULL,
    "executionDate" DATE NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "storesProcessed" INTEGER NOT NULL DEFAULT 0,
    "storesTotal" INTEGER NOT NULL DEFAULT 0,
    "executionTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricsCronExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetricsCronExecution_executionDate_idx" ON "MetricsCronExecution"("executionDate");

-- CreateIndex
CREATE UNIQUE INDEX "MetricsCronExecution_executionDate_key" ON "MetricsCronExecution"("executionDate");
