import { useState } from "react";
import { ApiService } from "../services/api";
import { DashboardResponse } from "../types/dashboard";
import { isValidCnpj, maskCnpj } from "../utils/validators";

interface UseDashboardReturn {
  cnpj: string;
  ano: number;
  data: DashboardResponse | null;
  loading: boolean;
  importing: boolean;
  error: string | null;
  needsImport: boolean; // NOVO: Controle de estado explícito e seguro
  handleCnpjChange: (value: string) => void; // NOVO: Manipulador com máscara
  setAno: (ano: number) => void;
  handleSearch: () => Promise<void>;
  handleImport: () => Promise<void>;
}

export function useDashboard(): UseDashboardReturn {
  const [cnpj, setCnpj] = useState("");
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsImport, setNeedsImport] = useState(false);

  const handleCnpjChange = (value: string) => {
    setCnpj(maskCnpj(value));
  };

  const handleSearch = async () => {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    if (!isValidCnpj(cleanCnpj)) {
      setError("CNPJ inválido. Verifique os dígitos e tente novamente.");
      setNeedsImport(false);
      return;
    }

    setLoading(true);
    setError(null);
    setData(null);
    setNeedsImport(false);

    try {
      const result = await ApiService.getDashboard(cleanCnpj);
      setData(result);

      // Proteção extra com ?. para garantir que empenhos existe
      const isDummyData =
        result.empenhos?.length > 0 &&
        result.empenhos.every(
          (e) =>
            e.numeroEmpenho === "S/N" ||
            e.valorOriginal === "0,00" ||
            e.valorOriginal === "0",
        );

      if (!result.empenhos || result.empenhos.length === 0) {
        setNeedsImport(true); // Ativa o botão verde explicitamente
        setError(
          `Nenhum empenho encontrado na base local. Clique em "Importar ${ano}" para consultar a API da Transparência.`,
        );
      } else if (isDummyData) {
        setNeedsImport(true); // Ativa o botão verde explicitamente
        setError(
          `Apenas dados de processamento inicial encontrados. Clique em "Importar ${ano}" para atualizar com a API da Transparência.`,
        );
      } else {
        // Dados reais encontrados, mas permitimos a sincronização
        setNeedsImport(true);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (message === "EMPRESA_NAO_ENCONTRADA") {
        setNeedsImport(true);
        setError(
          `Empresa não encontrada na base local. Clique em "Importar ${ano}" para buscar no Governo.`,
        );
      } else {
        setError("Falha ao comunicar com o servidor.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    const cleanCnpj = cnpj.replace(/\D/g, "");
    setImporting(true);
    setError(null);

    try {
      await ApiService.importExpenses(cleanCnpj, ano);
      setError(
        `Importação iniciada para o ano ${ano} em segundo plano! Aguarde alguns instantes e clique em "Consultar" novamente.`,
      );
      setNeedsImport(false); // Esconde o botão após o clique para evitar spam de cliques
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao iniciar importação.";
      setError(message);
      setNeedsImport(true); // Mostra o botão novamente se falhar
    } finally {
      setImporting(false);
    }
  };

  return {
    cnpj,
    ano,
    data,
    loading,
    importing,
    error,
    needsImport,
    handleCnpjChange,
    setAno,
    handleSearch,
    handleImport,
  };
}
