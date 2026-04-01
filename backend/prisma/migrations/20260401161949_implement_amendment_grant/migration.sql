-- CreateTable
CREATE TABLE "Amendment" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "value" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "Amendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grant" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "object" TEXT NOT NULL,
    "valueGlobal" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "Grant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Amendment_externalId_key" ON "Amendment"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Grant_externalId_key" ON "Grant"("externalId");

-- AddForeignKey
ALTER TABLE "Amendment" ADD CONSTRAINT "Amendment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grant" ADD CONSTRAINT "Grant_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
