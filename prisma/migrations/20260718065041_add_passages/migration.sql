-- CreateTable
CREATE TABLE "Passage" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Passage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Passage_isActive_sort_idx" ON "Passage"("isActive", "sort");
