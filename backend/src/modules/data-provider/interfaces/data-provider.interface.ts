import { TipoDespesa } from '@prisma/client';

export interface RawExpenseData {
  orgao: string;
  orgaoSuperior?: string;
  unidadeGestora?: string;
  tipo: TipoDespesa;
  valor: number;
  data: Date;
  descricao: string;
  numeroDocumento: string;
  numeroProcesso?: string;
  elementoDespesa?: string;
}

export const DATA_PROVIDER_TOKEN = Symbol('DATA_PROVIDER');

export interface IDataProvider {
  /**
   * Procura despesas públicas por CNPJ e Ano.
   * Retorna os dados num formato normalizado independente da fonte (Portal da Transparência, Web Scraping, etc).
   */
  fetchExpensesByCnpjAndYear(
    cnpj: string,
    year: number,
  ): Promise<RawExpenseData[]>;
}
