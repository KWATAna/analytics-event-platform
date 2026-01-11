-- CreateTable
CREATE TABLE "events" (
    "event_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "funnel_stage" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "purchase_amount" DECIMAL(10,2),
    "data" JSONB NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE INDEX "events_timestamp_idx" ON "events"("timestamp");

-- CreateIndex
CREATE INDEX "events_source_funnel_stage_idx" ON "events"("source", "funnel_stage");

-- CreateIndex
CREATE INDEX "events_event_type_idx" ON "events"("event_type");
