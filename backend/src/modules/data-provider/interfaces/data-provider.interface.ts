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

export interface RawContractData {
  numero: string;
  objeto: string;
  dataAssinatura: Date | null;
  dataInicioVigencia: Date | null;
  dataFimVigencia: Date | null;
  valorInicial: number;
  valorFinal: number;
  situacao: string;
  unidadeGestora: string;
  orgaoSuperior: string | null;
}

export const DATA_PROVIDER_TOKEN = Symbol('DATA_PROVIDER');

export interface IDataProvider {
  /**
   * Procura despesas públicas por CNPJ e Ano.
   * Retorna os dados num formato normalizado independente da fonte (Portal da Transparência, Web Scraping, etc).
   * @param pagina Parâmetro opcional para paginação na API.
   */
  fetchExpensesByCnpjAndYear(
    cnpj: string,
    year: number,
    pagina?: number,
  ): Promise<RawExpenseData[]>;

  /**
   * Procura contratos públicos por CNPJ.
   * Retorna os dados num formato normalizado independente da fonte.
   * @param pagina Parâmetro opcional para paginação na API.
   */
  fetchContractsByCnpj(
    cnpj: string,
    pagina?: number,
  ): Promise<RawContractData[]>;
}
