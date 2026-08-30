-- Quantity can never go negative. This was a CHECK constraint in the original
-- schema; Prisma's schema language can't express check constraints, so it lives
-- here as a hand-written migration (Prisma applies and preserves it, and does
-- not treat it as drift).
ALTER TABLE "patia_entries"
  ADD CONSTRAINT "patia_entries_quantity_check" CHECK ("quantity" >= 0);

ALTER TABLE "pawa_entries"
  ADD CONSTRAINT "pawa_entries_quantity_check" CHECK ("quantity" >= 0);
