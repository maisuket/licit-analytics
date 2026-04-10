import {
  ApiResponse,
  ContractTimelineResponse,
  DashboardResponse,
  ErpContract,
  ErpExpense,
  ErpServiceOrder,
  ImportResponse,
} from "../types/dashboard";

// Backend agora usa prefixo /api/v1/ via versionamento URI
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
const API_V1 = `${API_BASE_URL}/api/v1`;

const TOKEN_KEY = "licit_token";

// ---------------------------------------------------------------------------
// Helper: desempacota o envelope { success, data } retornado pelo backend
// ---------------------------------------------------------------------------
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = ApiService.getToken();

  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  // Não sobrescreve Content-Type quando o body é FormData
  if (
    options?.body &&
    !(options.body instanceof FormData) &&
    !headers["Content-Type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    // 401 — token inválido/expirado: limpa a sessão e sinaliza para redirecionar
    if (response.status === 401) {
      ApiService.clearToken();
      throw new Error("UNAUTHENTICATED");
    }

    const err = (await response
      .json()
      .catch(() => ({}))) as Partial<ApiResponse<unknown>>;
    const message = err?.error?.message ?? "Erro na requisição.";
    throw new Error(
      response.status === 404 ? "EMPRESA_NAO_ENCONTRADA" : message,
    );
  }

  const json = (await response.json()) as ApiResponse<T> | T;

  // Suporte ao envelope { success, data } e resposta direta (fallback)
  if (json !== null && typeof json === "object" && "success" in json) {
    return (json as ApiResponse<T>).data;
  }
  return json as T;
}

// ---------------------------------------------------------------------------
// ApiService
// ---------------------------------------------------------------------------
export class ApiService {
  // ── AUTENTICAÇÃO ─────────────────────────────────────────────────────────

  static getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  }

  static setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  }

  static clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  static isAuthenticated(): boolean {
    return !!ApiService.getToken();
  }

  static async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; user: { name: string; email: string; role: string } }> {
    const response = await fetch(`${API_V1}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const json = (await response.json().catch(() => ({}))) as
      | ApiResponse<{ accessToken: string; user: { name: string; email: string; role: string } }>
      | { accessToken: string; user: { name: string; email: string; role: string } };

    if (!response.ok) {
      const err = json as Partial<ApiResponse<unknown>>;
      throw new Error(err?.error?.message ?? "Credenciais inválidas.");
    }

    // Desempacota o envelope se presente
    const data =
      "success" in json
        ? (json as ApiResponse<{ accessToken: string; user: { name: string; email: string; role: string } }>).data
        : (json as { accessToken: string; user: { name: string; email: string; role: string } });

    ApiService.setToken(data.accessToken);
    return data;
  }

  // ── GOV INTELLIGENCE ────────────────────────────────────────────────────

  static async getDashboard(cnpj: string): Promise<DashboardResponse> {
    const clean = cnpj.replace(/\D/g, "");
    try {
      return await fetchJson<DashboardResponse>(
        `${API_V1}/analysis/dashboard/${clean}`,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === "EMPRESA_NAO_ENCONTRADA" ||
          error.message === "UNAUTHENTICATED")
      ) {
        throw error;
      }
      console.warn("Backend inacessível. Retornando dados de demonstração.", error);
      return DEMO_DASHBOARD;
    }
  }

  static async getContractTimeline(
    cnpj: string,
  ): Promise<ContractTimelineResponse> {
    const clean = cnpj.replace(/\D/g, "");
    return fetchJson<ContractTimelineResponse>(
      `${API_V1}/analysis/contract-timeline/${clean}`,
    );
  }

  static async importExpenses(
    cnpj: string,
    year: number,
  ): Promise<ImportResponse> {
    const clean = cnpj.replace(/\D/g, "");
    try {
      return await fetchJson<ImportResponse>(`${API_V1}/expense/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnpj: clean, year }),
      });
    } catch (error) {
      if (error instanceof Error && error.message === "UNAUTHENTICATED") throw error;
      console.warn("Simulando importação — backend inacessível.", error);
      return { message: "Simulação de importação iniciada.", jobId: "simulated-job-123" };
    }
  }

  // ── ERP INTERNO ─────────────────────────────────────────────────────────

  static async getErpData(cnpj: string): Promise<{
    empenhos: ErpExpense[];
    ordens: ErpServiceOrder[];
    contratos: ErpContract[];
  }> {
    const clean = cnpj.replace(/\D/g, "");
    const [empRes, osRes, contRes] = await Promise.all([
      fetchJson<{ data: ErpExpense[] }>(`${API_V1}/expense/${clean}?limit=100`),
      fetchJson<{ data: ErpServiceOrder[] }>(`${API_V1}/operation/os?limit=100`),
      fetchJson<{ data: ErpContract[] }>(
        `${API_V1}/contract/${clean}?limit=100`,
      ).catch(() => ({ data: [] as ErpContract[] })),
    ]);
    return {
      empenhos: empRes.data ?? [],
      ordens: osRes.data ?? [],
      contratos: contRes.data ?? [],
    };
  }

  static async createServiceOrder(
    data: Record<string, unknown>,
  ): Promise<unknown> {
    return fetchJson<unknown>(`${API_V1}/operation/os`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  static async updateOsStatus(
    id: string,
    status: string,
    nf?: string,
  ): Promise<unknown> {
    return fetchJson<unknown>(`${API_V1}/operation/os/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, nf }),
    });
  }

  static async importCsv(
    cnpj: string,
    type: "empenho" | "os",
    file: File,
  ): Promise<{ message: string; imported: number }> {
    const clean = cnpj.replace(/\D/g, "");
    const formData = new FormData();
    formData.append("file", file);
    return fetchJson<{ message: string; imported: number }>(
      `${API_V1}/operation/import-csv/${clean}/${type}`,
      { method: "POST", body: formData },
    );
  }

  static async syncContracts(cnpj: string): Promise<{ count: number }> {
    const clean = cnpj.replace(/\D/g, "");
    return fetchJson<{ count: number }>(`${API_V1}/contract/sync/${clean}`, {
      method: "POST",
    });
  }
}

// ---------------------------------------------------------------------------
// Dados de demonstração (fallback quando o backend está offline)
// ---------------------------------------------------------------------------
const DEMO_DASHBOARD: DashboardResponse = {
  stats: {
    totalEmpenhado: "R$ 150.500,00",
    empenhosAtivos: "03",
    ultimaAtualizacao: "Hoje, 12:45",
  },
  empenhos: [
    {
      id: "1",
      numeroEmpenho: "2024NE000123",
      dataEmissao: "15/03/2024",
      valorOriginal: "150.500,00",
      processo: "23000.123456/2024-12",
      elemento: "30 - Material de Consumo",
      observacao: "AQUISIÇÃO DE EQUIPAMENTOS...",
      favorecido: {
        nome: "EMPRESA DE DEMONSTRAÇÃO S.A.",
        cnpjFormatado: "12.345.678/0001-00",
      },
      unidadeGestora: {
        nome: "CENTRO DE INTENDENCIA DA MARINHA EM MANAUS",
        orgaoSuperior: "Ministério da Defesa",
      },
    },
  ],
  contratos: [
    {
      id: "c1",
      numero: "102014",
      objeto: "Contratação de empresa especializada...",
      dataAssinatura: "23/05/2014",
      vigencia: "23/05/2014 até 22/05/2015",
      valorFinal: "14.828,00",
      situacao: "Publicado",
      orgao: "IFAM - CAMPUS MANAUS CENTRO",
    },
  ],
};
