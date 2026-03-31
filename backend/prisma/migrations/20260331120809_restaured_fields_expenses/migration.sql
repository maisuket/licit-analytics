/*
  Warnings:

  - Added the required column `descricao` to the `expenses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "descricao" TEXT NOT NULL,
ADD COLUMN     "elementoDespesa" VARCHAR(255),
ADD COLUMN     "numeroProcesso" VARCHAR(100),
ADD COLUMN     "orgaoSuperior" VARCHAR(255),
ADD COLUMN     "tipo" "TipoDespesa" NOT NULL DEFAULT 'EMPENHO',
ADD COLUMN     "unidadeGestora" VARCHAR(255);
