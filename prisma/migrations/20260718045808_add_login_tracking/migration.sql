-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "lastLogoutAt" TIMESTAMP(3),
ADD COLUMN     "region" TEXT,
ADD COLUMN     "registrationSource" TEXT,
ADD COLUMN     "timezone" TEXT;

-- CreateTable
CREATE TABLE "LoginEvent" (
    "id" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "ip" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "device" TEXT,
    "country" CHAR(2),
    "region" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginEvent_profileId_createdAt_idx" ON "LoginEvent"("profileId", "createdAt");

-- AddForeignKey
ALTER TABLE "LoginEvent" ADD CONSTRAINT "LoginEvent_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
