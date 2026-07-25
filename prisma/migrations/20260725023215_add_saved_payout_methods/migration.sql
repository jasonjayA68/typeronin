
-- CreateTable
CREATE TABLE "SavedPayoutMethod" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "method" "PayoutMethod" NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountRef" TEXT NOT NULL,
    "details" TEXT,
    "qrUrl" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedPayoutMethod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedPayoutMethod_profileId_isDefault_idx" ON "SavedPayoutMethod"("profileId", "isDefault");

-- AddForeignKey
ALTER TABLE "SavedPayoutMethod" ADD CONSTRAINT "SavedPayoutMethod_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
