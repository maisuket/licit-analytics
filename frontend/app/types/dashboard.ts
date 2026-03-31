export interface DashboardResponse {
  stats: {
    totalEmpenhado: string;
    empenhosAtivos: string;
    ultimaAtualizacao: string;
  };
  empenhos: any[];
  contratos: any[];
}

export interface ErpExpense {
  id: string;
  numeroDocumento: string;
  orgao: string;
  recurso: string | null;
  competencia: string | null;
  valorOriginal: number; // Teto
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
