import { useMemo } from "react";
import { ErpServiceOrder } from "../types/dashboard";

// Define o tipo de retorno para maior segurança e clareza.
export interface ProductionSummaryItem {
  id: string;
  orgao: string;
  local: string;
  qtdTotal: number;
  valorTotal: number;
  status: "FATURADO" | "PARCIAL" | "AGUARDANDO";
  media: number;
}

/**
 * Hook customizado para calcular o resumo de produção (PS).
 * Agrupa as Ordens de Serviço por Contrato/Órgão e Local,
 * consolidando quantidades, valores e status.
 * @param ordens - A lista de todas as Ordens de Serviço do ERP.
 * @returns Um array com os dados de produção consolidados e ordenados.
 */
export function useProductionSummary(
  ordens: ErpServiceOrder[],
): ProductionSummaryItem[] {
  return useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        orgao: string;
        local: string;
        qtdTotal: number;
        valorTotal: number;
        hasFaturado: boolean;
        hasAguardando: boolean;
      }
    >();

    ordens.forEach((os) => {
      const orgao = os.contrato || os.expense?.orgao || "OUTROS";

      const localInfo =
        os.municipio && !os.unidade.includes(os.municipio)
          ? `${os.municipio} - ${os.unidade}`
          : os.unidade;
      const compInfo = os.competencia ? ` ${os.competencia}` : "";
      const local = `${localInfo}${compInfo}`;

      const key = `${orgao}-${local}`;

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          orgao,
          local,
          qtdTotal: 0,
          valorTotal: 0,
          hasFaturado: false,
          hasAguardando: false,
        });
      }

      const item = map.get(key)!;
      item.qtdTotal += Number(os.quantidade) || 0;
      item.valorTotal += Number(os.valorFinal) || 0;

      if (os.status === "FATURADO" || os.status === "PAGO")
        item.hasFaturado = true;
      if (os.status === "AGUARDANDO") item.hasAguardando = true;
    });

    return Array.from(map.values())
      .map((item): ProductionSummaryItem => {
        let statusText: "FATURADO" | "PARCIAL" | "AGUARDANDO";
        if (item.hasFaturado && !item.hasAguardando) statusText = "FATURADO";
        else if (item.hasFaturado && item.hasAguardando) statusText = "PARCIAL";
        else statusText = "AGUARDANDO";

        return {
          ...item,
          status: statusText,
          media: item.qtdTotal > 0 ? item.valorTotal / item.qtdTotal : 0,
        };
      })
      .sort((a, b) => a.orgao.localeCompare(b.orgao));
  }, [ordens]);
}
