-- wire/safety-support: SOS escalation ladder + auto-escalation scan index
-- Migration 20261104000600_wire_safety_support (additive only)

-- Escalation level: incremented once per acknowledgement-SLA breach (auto) or manual escalation.
ALTER TABLE "corporate_sos_alerts"
  ADD COLUMN IF NOT EXISTS "escalation_level" INTEGER NOT NULL DEFAULT 0;

-- The SOS escalation scheduler scans open alerts by status and age every poll.
CREATE INDEX IF NOT EXISTS "corporate_sos_alerts_status_created_at_idx"
  ON "corporate_sos_alerts"("status", "created_at");
