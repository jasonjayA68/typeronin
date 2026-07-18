-- CreateTable
CREATE TABLE "ScrollSession" (
    "id" UUID NOT NULL,
    "profileId" UUID,
    "difficulty" "Difficulty" NOT NULL,
    "categoryId" UUID,
    "questionCount" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "wrongCount" INTEGER NOT NULL,
    "maxCombo" INTEGER NOT NULL DEFAULT 0,
    "honorEarned" INTEGER NOT NULL DEFAULT 0,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScrollSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScrollSession_profileId_playedAt_idx" ON "ScrollSession"("profileId", "playedAt");

-- AddForeignKey
ALTER TABLE "ScrollSession" ADD CONSTRAINT "ScrollSession_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScrollSession" ADD CONSTRAINT "ScrollSession_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
