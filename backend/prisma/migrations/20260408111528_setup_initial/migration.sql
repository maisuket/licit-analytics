-- CreateEnum
CREATE TYPE "TipoDespesa" AS ENUM ('EMPENHO', 'LIQUIDACAO', 'PAGAMENTO');

-- CreateEnum
CREATE TYPE "OsStatus" AS ENUM ('AGUARDANDO', 'FATURADO', 'PAGO');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "cnpj" VARCHAR(14) NOT NULL,
    "name" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "numeroDocumento" TEXT NOT NULL,
    "orgao" TEXT NOT NULL,
    "orgaoSuperior" VARCHAR(255),
    "unidadeGestora" VARCHAR(255),
    "tipo" "TipoDespesa" NOT NULL DEFAULT 'EMPENHO',
    "descricao" TEXT NOT NULL,
    "numeroProcesso" VARCHAR(100),
    "elementoDespesa" VARCHAR(255),
    "valorOriginal" DECIMAL(15,2) NOT NULL,
    "recurso" TEXT,
    "competencia" TEXT,
    "valorFaturado" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "saldo" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "data" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "contractId" TEXT,
    "correlationScore" DOUBLE PRECISION,
    "correlationStrategy" TEXT,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "numero" VARCHAR(100) NOT NULL,
    "objeto" TEXT NOT NULL,
    "dataAssinatura" TIMESTAMP(3),
    "dataInicioVigencia" TIMESTAMP(3),
    "dataFimVigencia" TIMESTAMP(3),
    "valorInicial" DECIMAL(15,2) NOT NULL,
    "valorFinal" DECIMAL(15,2) NOT NULL,
    "situacao" VARCHAR(100) NOT NULL,
    "unidadeGestora" VARCHAR(255) NOT NULL,
    "orgaoSuperior" VARCHAR(255),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_orders" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "numeroOS" VARCHAR(50) NOT NULL,
    "unidade" VARCHAR(255) NOT NULL,
    "dataExecucao" TIMESTAMP(3) NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "descricao" TEXT,
    "executante" VARCHAR(100),
    "custo" DECIMAL(15,2) NOT NULL,
    "valorFinal" DECIMAL(15,2) NOT NULL,
    "margem" DECIMAL(5,4) NOT NULL,
    "status" "OsStatus" NOT NULL DEFAULT 'AGUARDANDO',
    "competencia" VARCHAR(50),
    "numeroNF" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amendments" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "value" DECIMAL(18,2) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "amendments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grants" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "object" TEXT NOT NULL,
    "valueGlobal" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "companies_cnpj_key" ON "companies"("cnpj");

-- CreateIndex
CREATE INDEX "expenses_contractId_idx" ON "expenses"("contractId");

-- CreateIndex
CREATE INDEX "expenses_companyId_tipo_idx" ON "expenses"("companyId", "tipo");

-- CreateIndex
CREATE INDEX "expenses_numeroProcesso_idx" ON "expenses"("numeroProcesso");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_companyId_numeroDocumento_tipo_key" ON "expenses"("companyId", "numeroDocumento", "tipo");

-- CreateIndex
CREATE INDEX "contracts_companyId_idx" ON "contracts"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "amendments_externalId_key" ON "amendments"("externalId");

-- CreateIndex
CREATE INDEX "amendments_companyId_idx" ON "amendments"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "grants_externalId_key" ON "grants"("externalId");

-- CreateIndex
CREATE INDEX "grants_companyId_idx" ON "grants"("companyId");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amendments" ADD CONSTRAINT "amendments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grants" ADD CONSTRAINT "grants_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
