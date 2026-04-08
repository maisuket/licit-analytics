"use client";

import { useState, useCallback } from "react";
import { ApiService } from "../services/api";
import { ContractTimelineResponse } from "../types/dashboard";
import { isValidCnpj, maskCnpj } from "../utils/validators";

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
    setCnpj(maskCnpj(value));
  }, []);

  const fetchTimeline = useCallback(async () => {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    if (!isValidCnpj(cleanCnpj)) {
      setError("CNPJ inválido. Verifique os dígitos e tente novamente.");
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
