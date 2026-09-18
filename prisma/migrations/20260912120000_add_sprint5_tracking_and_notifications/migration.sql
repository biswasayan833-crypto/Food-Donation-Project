-- AlterTable User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "locationUpdatedAt" TIMESTAMP(3);

-- AlterTable Claim
ALTER TABLE "Claim" ADD COLUMN IF NOT EXISTS "assignedAt" TIMESTAMP(3);
ALTER TABLE "Claim" ADD COLUMN IF NOT EXISTS "pickupStartedAt" TIMESTAMP(3);
ALTER TABLE "Claim" ADD COLUMN IF NOT EXISTS "pickedUpAt" TIMESTAMP(3);
ALTER TABLE "Claim" ADD COLUMN IF NOT EXISTS "inTransitAt" TIMESTAMP(3);
ALTER TABLE "Claim" ADD COLUMN IF NOT EXISTS "driverLatitude" DOUBLE PRECISION;
ALTER TABLE "Claim" ADD COLUMN IF NOT EXISTS "driverLongitude" DOUBLE PRECISION;
ALTER TABLE "Claim" ADD COLUMN IF NOT EXISTS "driverLocationUpdatedAt" TIMESTAMP(3);

-- CreateTable Notification
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "claimId" TEXT,
    "foodListingId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Claim_driverId_idx" ON "Claim"("driverId");
CREATE INDEX IF NOT EXISTS "Claim_deliveryStatus_idx" ON "Claim"("deliveryStatus");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Notification_userId_fkey'
    ) THEN
        ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
