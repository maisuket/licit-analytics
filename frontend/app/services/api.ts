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

// ---------------------------------------------------------------------------
// Helper: desempacota o envelope { success, data } retornado pelo backend
// ---------------------------------------------------------------------------
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as Partial<ApiResponse<unknown>>;
    const message = err?.error?.message ?? "Erro na requisição.";
    throw new Error(
      response.status === 404 ? "EMPRESA_NAO_ENCONTRADA" : message,
    );
  }

  const json = await response.json() as ApiResponse<T> | T;

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
  // ── GOV INTELLIGENCE ────────────────────────────────────────────────────

  static async getDashboard(cnpj: string): Promise<DashboardResponse> {
    const clean = cnpj.replace(/\D/g, "");
    try {
      return await fetchJson<DashboardResponse>(
        `${API_V1}/analysis/dashboard/${clean}`,
      );
    } catch (error) {
      if (error instanceof Error && error.message === "EMPRESA_NAO_ENCONTRADA") {
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
    try {
      const [empRes, osRes, contRes] = await Promise.all([
        fetchJson<{ data: ErpExpense[] }>(`${API_V1}/expense/${clean}?limit=100`),
        fetchJson<{ data: ErpServiceOrder[] }>(`${API_V1}/operation/os?limit=100`),
        fetchJson<{ data: ErpContract[] }>(`${API_V1}/contract/${clean}?limit=100`).catch(
          () => ({ data: [] as ErpContract[] }),
        ),
      ]);
      return {
        empenhos: empRes.data ?? [],
        ordens: osRes.data ?? [],
        contratos: contRes.data ?? [],
      };
    } catch (e) {
      console.error("Erro no getErpData:", e);
      return { empenhos: [], ordens: [], contratos: [] };
    }
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
