-- apps/server/prisma/migrations/20261029000000_init_and_safety_constraints/migration.sql
-- Lead Row Database Safety Net Constraints
-- Reference: AGENTS.md Rule 2.4, Rule 6, PRD Section 8

-- 1. Partial Unique Index for Active Seat Allocations
-- Guarantees that at most one active (CONFIRMED) allocation can exist for a given (showtime_id, seat_id).
-- Using a partial index ensures historical cancellations and refunds do not permanently block subsequent legitimate bookings.
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_seat_allocation 
ON booking_seats (showtime_id, seat_id) 
WHERE status = 'CONFIRMED';

-- 2. Check Constraints for Monetary Integrity
-- Guarantees that financial values stored as integer minor units (kobo) are strictly non-negative.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_bookings_subtotal_positive'
    ) THEN
        ALTER TABLE bookings ADD CONSTRAINT chk_bookings_subtotal_positive CHECK (subtotal_kobo >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_bookings_total_positive'
    ) THEN
        ALTER TABLE bookings ADD CONSTRAINT chk_bookings_total_positive CHECK (total_amount_kobo >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_ledger_amount_positive'
    ) THEN
        ALTER TABLE ledger_entries ADD CONSTRAINT chk_ledger_amount_positive CHECK (amount_kobo >= 0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_payments_expected_positive'
    ) THEN
        ALTER TABLE payments ADD CONSTRAINT chk_payments_expected_positive CHECK (expected_amount_kobo >= 0);
    END IF;
END $$;

