"use client";

import { useState, useCallback } from "react";
import { ApiService } from "../services/api";
import { ContractTimelineResponse } from "../types/dashboard";

interface UseContractTimelineReturn {
  cnpj: string;
  data: ContractTimelineResponse | null;
  loading: boolean;
  error: string | null;
  handleCnpjChange: (value: string) => void;
  fetchTimeline: () => Promise<void>;
  reset: () => void;
}

export function useContractTimeline(): UseContractTimelineReturn {
  const [cnpj, setCnpj] = useState("");
  const [data, setData] = useState<ContractTimelineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCnpjChange = useCallback((value: string) => {
    let formatted = value.replace(/\D/g, "");
    if (formatted.length > 14) formatted = formatted.slice(0, 14);

    if (formatted.length > 2)
      formatted = formatted.replace(/^(\d{2})(\d)/, "$1.$2");
    if (formatted.length > 5)
      formatted = formatted.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
    if (formatted.length > 8)
      formatted = formatted.replace(/\.(\d{3})(\d)/, ".$1/$2");
    if (formatted.length > 12)
      formatted = formatted.replace(/(\d{4})(\d)/, "$1-$2");

    setCnpj(formatted);
  }, []);

  const fetchTimeline = useCallback(async () => {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) {
      setError("Por favor, insira um CNPJ válido com 14 dígitos.");
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const result = await ApiService.getContractTimeline(cleanCnpj);
      setData(result);
      if (result.totalContratos === 0) {
        setError("Nenhum contrato encontrado para este CNPJ no Portal da Transparência.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido.";
      setError(
        message === "EMPRESA_NAO_ENCONTRADA"
          ? "Empresa não encontrada. Verifique o CNPJ e tente novamente."
          : "Falha ao consultar a timeline de contratos. Verifique se o backend está online.",
      );
    } finally {
      setLoading(false);
    }
  }, [cnpj]);

  const reset = useCallback(() => {
    setCnpj("");
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { cnpj, data, loading, error, handleCnpjChange, fetchTimeline, reset };
}
