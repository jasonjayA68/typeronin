-- CreateTable
CREATE TABLE "MissionClaim" (
    "profileId" UUID NOT NULL,
    "missionKey" TEXT NOT NULL,
    "honor" INTEGER NOT NULL DEFAULT 0,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionClaim_pkey" PRIMARY KEY ("profileId","missionKey")
);

-- CreateIndex
CREATE INDEX "MissionClaim_profileId_claimedAt_idx" ON "MissionClaim"("profileId", "claimedAt");

-- AddForeignKey
ALTER TABLE "MissionClaim" ADD CONSTRAINT "MissionClaim_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
