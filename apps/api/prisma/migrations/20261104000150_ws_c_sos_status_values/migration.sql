-- Split out of 20261104000200: PostgreSQL forbids using an enum value in the same
-- transaction that adds it ("unsafe use of new value"), and 000200 sets DEFAULT 'NEW'.
ALTER TYPE "CorporateSosStatus" ADD VALUE IF NOT EXISTS 'NEW';
ALTER TYPE "CorporateSosStatus" ADD VALUE IF NOT EXISTS 'INVESTIGATING';
ALTER TYPE "CorporateSosStatus" ADD VALUE IF NOT EXISTS 'ESCALATED';
