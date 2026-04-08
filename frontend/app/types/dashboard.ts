// ---------------------------------------------------------------------------
// Envelope padrão do backend { success: true, data: T }
// ---------------------------------------------------------------------------
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: { field: string; messages: string[] }[];
  };
}

// ---------------------------------------------------------------------------
// Módulo Gov — Dashboard (endpoint legado /analysis/dashboard)
// ---------------------------------------------------------------------------
export interface GovEmpenho {
  id: string;
  numeroEmpenho: string;
  dataEmissao: string;
  valorOriginal: string;
  processo: string | null;
  elemento: string | null;
  observacao: string | null;
  favorecido: {
    nome: string;
    cnpjFormatado: string;
  };
  unidadeGestora: {
    nome: string;
    orgaoSuperior: string | null;
  };
}

export interface GovContrato {
  id: string;
  numero: string;
  objeto: string;
  dataAssinatura: string;
  vigencia: string;
  valorFinal: string;
  situacao: string;
  orgao: string;
}

export interface DashboardResponse {
  stats: {
    totalEmpenhado: string;
    empenhosAtivos: string;
    ultimaAtualizacao: string;
  };
  empenhos: GovEmpenho[];
  contratos: GovContrato[];
}

// ---------------------------------------------------------------------------
// Módulo ERP — Tipos internos
// ---------------------------------------------------------------------------
export interface ErpExpense {
  id: string;
  numeroDocumento: string;
  orgao: string;
  recurso: string | null;
  competencia: string | null;
  valorOriginal: number;
  valorFaturado: number;
  saldo: number;
}

export interface ErpServiceOrder {
  id: string;
  expenseId: string;
  numeroOS: string;
  unidade: string;
  dataExecucao: string;
  quantidade: number;
  descricao: string | null;
  municipio: string | null;
  executante: string | null;
  custoTotal: number;
  valorFinal: number;
  margem: number;
  status: "AGUARDANDO" | "FATURADO" | "PAGO";
  numeroNF: string | null;
  contrato?: string | null;
  expense?: { numeroDocumento: string; orgao: string };
}

export interface ErpContract {
  id: string;
  numero: string;
  objeto: string;
  dataAssinatura: string | null;
  dataInicioVigencia: string | null;
  dataFimVigencia: string | null;
  valorInicial: number;
  valorFinal: number;
  situacao: string;
  unidadeGestora: string;
}

export interface ImportResponse {
  message: string;
  jobId: string;
}

// ---------------------------------------------------------------------------
// Módulo Timeline de Contratos — endpoint GET /analysis/contract-timeline/:cnpj
// ---------------------------------------------------------------------------
export type DespesaTipo = "EMPENHO" | "LIQUIDACAO" | "PAGAMENTO";

export interface ExpenseTimelineItem {
  id: string;
  numeroDocumento: string;
  tipo: DespesaTipo;
  orgao: string;
  orgaoSuperior: string | null;
  unidadeGestora: string | null;
  valorOriginal: number;
  data: string;
  numeroProcesso: string | null;
  elementoDespesa: string | null;
  descricao: string;
}

export interface ContractFinancialSummary {
  totalEmpenhado: number;
  totalLiquidado: number;
  totalPago: number;
  saldoAReceber: number;
  percentualLiquidado: number;
  percentualPago: number;
}

export interface ContractTimelineItem {
  id: string;
  numero: string;
  objeto: string;
  dataAssinatura: string | null;
  dataInicioVigencia: string | null;
  dataFimVigencia: string | null;
  valorInicial: number;
  valorFinal: number;
  situacao: string;
  unidadeGestora: string;
  orgaoSuperior: string | null;
  resumoFinanceiro: ContractFinancialSummary;
  empenhos: ExpenseTimelineItem[];
  liquidacoes: ExpenseTimelineItem[];
  pagamentos: ExpenseTimelineItem[];
}

export interface ContractTimelineResponse {
  cnpj: string;
  empresa: string;
  totalContratos: number;
  totalEmpenhos: number;
  empenhosSemContrato: number;
  contratos: ContractTimelineItem[];
}
