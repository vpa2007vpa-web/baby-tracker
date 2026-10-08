-- Store only a SHA-256 hash of invite codes (ADR-043). Rename instead of
-- drop/add so no row is lost; any pre-existing plain code stops matching,
-- which is the intended invalidation.
ALTER TABLE "household_invites" RENAME COLUMN "code" TO "code_hash";
ALTER INDEX "household_invites_code_key" RENAME TO "household_invites_code_hash_key";
