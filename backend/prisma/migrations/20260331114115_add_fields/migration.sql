/*
  Warnings:

  - You are about to drop the column `descricao` on the `expenses` table. All the data in the column will be lost.
  - You are about to drop the column `elementoDespesa` on the `expenses` table. All the data in the column will be lost.
  - You are about to drop the column `numeroProcesso` on the `expenses` table. All the data in the column will be lost.
  - You are about to drop the column `orgaoSuperior` on the `expenses` table. All the data in the column will be lost.
  - You are about to drop the column `tipo` on the `expenses` table. All the data in the column will be lost.
  - You are about to drop the column `unidadeGestora` on the `expenses` table. All the data in the column will be lost.
  - You are about to drop the column `valor` on the `expenses` table. All the data in the column will be lost.
  - Added the required column `valorOriginal` to the `expenses` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OsStatus" AS ENUM ('AGUARDANDO', 'FATURADO', 'PAGO');

-- AlterTable
ALTER TABLE "expenses" DROP COLUMN "descricao",
DROP COLUMN "elementoDespesa",
DROP COLUMN "numeroProcesso",
DROP COLUMN "orgaoSuperior",
DROP COLUMN "tipo",
DROP COLUMN "unidadeGestora",
DROP COLUMN "valor",
ADD COLUMN     "competencia" TEXT,
ADD COLUMN     "recurso" TEXT,
ADD COLUMN     "saldo" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "valorFaturado" DECIMAL(15,2) NOT NULL DEFAULT 0,
ADD COLUMN     "valorOriginal" DECIMAL(15,2) NOT NULL;

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

    CONSTRAINT "service_orders_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
