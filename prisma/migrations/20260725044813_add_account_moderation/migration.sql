
-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "isFlagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedById" UUID,
ADD COLUMN     "moderationNote" TEXT,
ADD COLUMN     "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "withdrawalsFrozen" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Withdrawal" ADD COLUMN     "onHold" BOOLEAN NOT NULL DEFAULT false;

