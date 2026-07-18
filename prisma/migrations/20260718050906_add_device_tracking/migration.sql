-- CreateTable
CREATE TABLE "Device" (
    "id" UUID NOT NULL,
    "cookieId" TEXT NOT NULL,
    "fingerprint" TEXT,
    "trusted" BOOLEAN NOT NULL DEFAULT false,
    "flaggedAt" TIMESTAMP(3),
    "lastIp" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceAccount" (
    "deviceId" UUID NOT NULL,
    "profileId" UUID NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeviceAccount_pkey" PRIMARY KEY ("deviceId","profileId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Device_cookieId_key" ON "Device"("cookieId");

-- CreateIndex
CREATE INDEX "Device_fingerprint_idx" ON "Device"("fingerprint");

-- CreateIndex
CREATE INDEX "Device_flaggedAt_idx" ON "Device"("flaggedAt");

-- CreateIndex
CREATE INDEX "DeviceAccount_profileId_idx" ON "DeviceAccount"("profileId");

-- AddForeignKey
ALTER TABLE "DeviceAccount" ADD CONSTRAINT "DeviceAccount_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceAccount" ADD CONSTRAINT "DeviceAccount_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
