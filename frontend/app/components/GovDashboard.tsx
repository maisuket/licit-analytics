"use client";

import React, { useState } from "react";
import {
  Search,
  Loader2,
  ShieldCheck,
  Building,
  FileText,
  Clock,
  AlertCircle,
} from "lucide-react";
import { DashboardResponse } from "../types/dashboard";
import { ApiService } from "../services/api";

// Assumindo que a classe ApiService está acessível neste ficheiro, ou importe-a:
// import { ApiService } from "../services/api";

export function GovDashboard() {
  const [searchCnpj, setSearchCnpj] = useState("");
  const [govData, setGovData] = useState<DashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCnpj || searchCnpj.trim() === "") return;

    setIsLoading(true);
    setError(null);
    setGovData(null);

    try {
      // O seu serviço já está preparado para ir à API buscar os dados públicos
      const data = await ApiService.getDashboard(searchCnpj);
      setGovData(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (message === "EMPRESA_NAO_ENCONTRADA") {
        setError(
          "Não foram encontrados dados públicos para este CNPJ no Portal da Transparência.",
        );
      } else if (message === "UNAUTHENTICATED") {
        setError("Sessão expirada. Por favor, faça login novamente.");
      } else {
        setError(message || "Ocorreu um erro ao consultar a API Governamental.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 1. BARRA DE PESQUISA (RADAR DE MERCADO) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <ShieldCheck size={120} />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
            <Search className="text-blue-600" size={20} />
            Radar de Mercado e Transparência
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            Insira o CNPJ da sua empresa para auditoria ou de um concorrente
            para analisar os contratos e empenhos públicos vigentes.
          </p>

          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Digite apenas os números do CNPJ (Ex: 23008295000148)"
                className="pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 w-full outline-none font-mono"
                value={searchCnpj}
                onChange={(e) =>
                  setSearchCnpj(e.target.value.replace(/\D/g, ""))
                }
                maxLength={14}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || searchCnpj.length < 14}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl text-sm font-medium flex items-center gap-2 transition-all shadow-md"
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Search size={18} />
              )}
              Investigar
            </button>
          </form>
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2 border border-red-100">
              <AlertCircle size={16} /> {error}
            </div>
          )}
        </div>
      </div>

      {/* 2. DADOS RETORNADOS DA API (Se houver) */}
      {govData && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          {/* Métricas Globais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">
                Total Empenhado (Ativo)
              </p>
              <p className="text-2xl font-black text-blue-600">
                {govData.stats.totalEmpenhado}
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">
                Empenhos em Execução
              </p>
              <p className="text-2xl font-black text-slate-800">
                {govData.stats.empenhosAtivos}
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 border-l-4 border-l-emerald-500">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">
                Sincronização Oficial
              </p>
              <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Clock size={16} className="text-emerald-500" />{" "}
                {govData.stats.ultimaAtualizacao}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista de Contratos */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Building size={18} className="text-indigo-500" /> Contratos
                Públicos Vigentes
              </h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {govData.contratos.map((contrato) => (
                  <div
                    key={contrato.id}
                    className="border border-slate-100 rounded-xl p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-slate-800 text-sm">
                        {contrato.numero}
                      </span>
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                        {contrato.situacao}
                      </span>
                    </div>
                    <p
                      className="text-xs text-slate-600 mb-3 line-clamp-2"
                      title={contrato.objeto}
                    >
                      {contrato.objeto}
                    </p>
                    <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-3">
                      <span className="text-slate-500">{contrato.orgao}</span>
                      <span className="font-black text-slate-700">
                        R$ {contrato.valorFinal}
                      </span>
                    </div>
                  </div>
                ))}
                {govData.contratos.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-8">
                    Nenhum contrato encontrado para este CNPJ.
                  </p>
                )}
              </div>
            </div>

            {/* Lista de Empenhos */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FileText size={18} className="text-amber-500" /> Últimas Notas
                de Empenho (NE)
              </h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {govData.empenhos.map((emp) => (
                  <div
                    key={emp.id}
                    className="border border-slate-100 rounded-xl p-4 hover:bg-slate-50 transition-colors border-l-4 border-l-blue-400"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold font-mono text-blue-700 text-sm">
                        {emp.numeroEmpenho}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {emp.dataEmissao}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mb-2">
                      {emp.unidadeGestora?.nome || "Órgão não especificado"}
                    </p>
                    <div className="bg-slate-100 px-3 py-2 rounded-lg flex justify-between items-center text-xs mt-2">
                      <span className="text-slate-500 font-medium">
                        Valor Original (Teto)
                      </span>
                      <span className="font-black text-slate-800">
                        R$ {emp.valorOriginal}
                      </span>
                    </div>
                  </div>
                ))}
                {govData.empenhos.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-8">
                    Nenhum empenho encontrado para este CNPJ.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
