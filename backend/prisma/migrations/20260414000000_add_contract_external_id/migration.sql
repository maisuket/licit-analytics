-- AlterTable
ALTER TABLE "contracts" ADD COLUMN "externalId" INTEGER;

-- CreateIndex
CREATE INDEX "contracts_externalId_idx" ON "contracts"("externalId");
