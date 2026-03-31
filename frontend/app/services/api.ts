import {
  DashboardResponse,
  ErpContract,
  ErpExpense,
  ErpServiceOrder,
  ImportResponse,
} from "../types/dashboard";

const API_BASE_URL = "http://localhost:3000";

export class ApiService {
  // --- MÓDULO: INTELIGÊNCIA GOV ---
  static async getDashboard(cnpj: string): Promise<DashboardResponse> {
    const cleanCnpj = cnpj.replace(/\D/g, "");

    try {
      const response = await fetch(
        `${API_BASE_URL}/analysis/dashboard/${cleanCnpj}`,
        {
          headers: { Accept: "application/json" },
        },
      );

      if (!response.ok) {
        if (response.status === 404) throw new Error("EMPRESA_NAO_ENCONTRADA");
        throw new Error("Erro ao buscar dados do dashboard.");
      }

      return response.json();
    } catch (error) {
      console.warn(
        "Backend local inacessível. A mostrar dados de demonstração.",
        error,
      );
      if (error instanceof Error && error.message === "EMPRESA_NAO_ENCONTRADA")
        throw error;

      return {
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
    }
  }

  static async importExpenses(
    cnpj: string,
    year: number,
  ): Promise<ImportResponse> {
    const cleanCnpj = cnpj.replace(/\D/g, "");

    try {
      const response = await fetch(`${API_BASE_URL}/expense/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnpj: cleanCnpj, year }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Erro ao solicitar importação.");
      }

      return response.json();
    } catch (error) {
      console.warn(
        "Simulando importação devido a falta de backend local.",
        error,
      );
      return {
        message: "Simulação de importação iniciada.",
        jobId: "simulated-job-123",
      };
    }
  }

  // --- MÓDULO: OPERAÇÃO ERP (Dados Internos) ---

  static async getErpData(
    cnpj: string,
  ): Promise<{
    empenhos: ErpExpense[];
    ordens: ErpServiceOrder[];
    contratos: ErpContract[];
  }> {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    try {
      const [empRes, osRes, contRes] = await Promise.all([
        fetch(`${API_BASE_URL}/expense/${cleanCnpj}?limit=100`),
        fetch(`${API_BASE_URL}/operation/os?limit=100`),
        fetch(`${API_BASE_URL}/contract/${cleanCnpj}?limit=100`),
      ]);

      if (!empRes.ok || !osRes.ok) {
        throw new Error("Backend offline ou limite de requisição excedido.");
      }

      const empJson = await empRes.json();
      const osJson = await osRes.json();
      const contJson = contRes.ok ? await contRes.json() : { data: [] };

      // Extraímos a propriedade `.data` porque o Backend agora retorna paginação { data, meta }
      // Mantemos o fallback para Array caso alguma rota ainda não tenha paginação.
      return {
        empenhos: Array.isArray(empJson) ? empJson : empJson.data || [],
        ordens: Array.isArray(osJson) ? osJson : osJson.data || [],
        contratos: Array.isArray(contJson) ? contJson : contJson.data || [],
      };
    } catch (e) {
      console.error("Erro no getErpData:", e);
      return { empenhos: [], ordens: [], contratos: [] };
    }
  }

  // AGORA CONECTADO AO BACKEND REAL: Lança a O.S. de verdade
  static async createServiceOrder(data: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/operation/os`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Erro ao salvar a Ordem de Serviço.");
      }
      return response.json();
    } catch (error: any) {
      console.error("Falha ao criar OS:", error);
      throw error;
    }
  }

  // AGORA CONECTADO AO BACKEND REAL: Atualiza o status e NF
  static async updateOsStatus(id: string, status: string, nf?: string) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/operation/os/${id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, nf }),
        },
      );

      if (!response.ok) {
        throw new Error("Erro ao atualizar o status da Ordem de Serviço.");
      }
      return response.json();
    } catch (error: any) {
      console.error("Falha ao atualizar status:", error);
      throw error;
    }
  }

  static async importCsv(
    cnpj: string,
    type: "empenho" | "os",
    file: File,
  ): Promise<{ message: string; imported: number }> {
    const cleanCnpj = cnpj.replace(/\D/g, "");

    // Para envio de ficheiros, usamos FormData nativo do navegador
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        `${API_BASE_URL}/operation/import-csv/${cleanCnpj}/${type}`,
        {
          method: "POST",
          // NOTA DE SÊNIOR: Não defina o cabeçalho 'Content-Type' manualmente aqui!
          // O Fetch define automaticamente como 'multipart/form-data' e insere o 'boundary' correto.
          body: formData,
        },
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `Erro ao importar arquivo de ${type}.`);
      }

      return response.json();
    } catch (error: any) {
      console.error(`Falha no upload de ${type}:`, error);
      throw error;
    }
  }

  static async syncContracts(cnpj: string): Promise<{ count: number }> {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    const response = await fetch(`${API_BASE_URL}/contract/sync/${cleanCnpj}`, {
      method: "POST",
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        err.message || "Erro ao sincronizar contratos com o Governo.",
      );
    }
    return response.json();
  }
}
