export interface Favorecido {
  nome: string;
  cnpjFormatado: string;
}

export interface UnidadeGestora {
  nome: string;
  orgaoSuperior?: string;
}

export interface DashboardEmpenho {
  id: string;
  numeroEmpenho: string;
  dataEmissao: string;
  valorOriginal: string;
  favorecido: Favorecido;
  unidadeGestora: UnidadeGestora;
  processo?: string;
  elemento?: string;
  observacao?: string;
}

export interface DashboardStats {
  totalEmpenhado: string;
  empenhosAtivos: string;
  ultimaAtualizacao: string;
}

export interface DashboardResponse {
  stats: DashboardStats;
  empenhos: DashboardEmpenho[];
}

export interface ImportResponse {
  message: string;
  jobId: string;
}
