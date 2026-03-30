import { DashboardResponse, ImportResponse } from "../types/dashboard";

const API_BASE_URL = "http://localhost:3000";

export class ApiService {
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
            observacao: "AQUISIÇÃO DE EQUIPAMENTOS PARA O MINISTÉRIO...",
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
}
