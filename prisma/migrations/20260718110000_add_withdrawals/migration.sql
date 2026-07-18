-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('GCASH', 'MAYA', 'PAYPAL', 'WISE', 'BANK');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Withdrawal" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "method" "PayoutMethod" NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "accountName" TEXT NOT NULL,
    "accountRef" TEXT NOT NULL,
    "details" TEXT,
    "honorAmount" INTEGER NOT NULL,
    "rateHonorPerDollar" INTEGER NOT NULL,
    "grossCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL,
    "netCents" INTEGER NOT NULL,
    "reference" TEXT,
    "adminNote" TEXT,
    "resolvedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Withdrawal_profileId_status_createdAt_idx" ON "Withdrawal"("profileId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Withdrawal_status_createdAt_idx" ON "Withdrawal"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Withdrawal_profileId_createdAt_idx" ON "Withdrawal"("profileId", "createdAt");

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

