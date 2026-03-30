-- CreateEnum
CREATE TYPE "TipoDespesa" AS ENUM ('EMPENHO', 'LIQUIDACAO', 'PAGAMENTO');

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "cnpj" VARCHAR(14) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "orgao" TEXT NOT NULL,
    "orgaoSuperior" VARCHAR(255),
    "unidadeGestora" VARCHAR(255),
    "tipo" "TipoDespesa" NOT NULL,
    "valor" DECIMAL(15,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "descricao" TEXT NOT NULL,
    "numeroDocumento" TEXT NOT NULL,
    "numeroProcesso" VARCHAR(100),
    "elementoDespesa" VARCHAR(255),

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

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_cnpj_key" ON "companies"("cnpj");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
