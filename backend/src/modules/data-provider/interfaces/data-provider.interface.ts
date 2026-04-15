import { TipoDespesa } from '@prisma/client';

// Fases de despesa conforme a API do Portal da Transparência
// 1 = Empenho | 2 = Liquidação | 3 = Pagamento
export type DespesaFase = 1 | 2 | 3;

export const DESPESA_FASE_MAP: Record<DespesaFase, TipoDespesa> = {
  1: TipoDespesa.EMPENHO,
  2: TipoDespesa.LIQUIDACAO,
  3: TipoDespesa.PAGAMENTO,
};

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
  /** ID numérico retornado pela API do Portal (ex: 123456). Usado para buscar documentos relacionados. */
  id: number;
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

/**
 * Representa um documento (empenho) vinculado a um contrato,
 * retornado pelo endpoint GET /contratos/documentos-relacionados?id={id}.
 */
export interface RawContractDocument {
  /** Número completo do empenho (ex: "2024NE000503") */
  empenho: string;
  /** Número resumido do empenho — chave de correlação com Expense.numeroDocumento */
  empenhoResumido: string;
  dataEmissao: string | null;
  observacao: string | null;
  valor: number;
}

export const DATA_PROVIDER_TOKEN = Symbol('DATA_PROVIDER');

export interface IDataProvider {
  /**
   * Busca documentos de despesa por CNPJ, Ano e Fase.
   * fase=1 → Empenhos | fase=2 → Liquidações | fase=3 → Pagamentos
   * @param pagina Paginação (padrão: 1)
   */
  fetchExpensesByCnpjAndYear(
    cnpj: string,
    year: number,
    fase?: DespesaFase,
    pagina?: number,
  ): Promise<RawExpenseData[]>;

  /**
   * Busca contratos públicos por CNPJ com paginação.
   */
  fetchContractsByCnpj(
    cnpj: string,
    pagina?: number,
  ): Promise<RawContractData[]>;

  /**
   * Busca os documentos de empenho vinculados a um contrato pelo seu ID numérico.
   * Endpoint: GET /contratos/documentos-relacionados?id={contractId}
   * Devolve todos os documentos numa única resposta (sem paginação).
   */
  fetchContractDocuments(contractId: number): Promise<RawContractDocument[]>;
}
