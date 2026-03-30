import React, { useState } from "react";
import {
  DollarSign,
  Calendar,
  Download,
  FileText,
  Receipt,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { DashboardResponse } from "../types/dashboard";

interface DashboardViewProps {
  data: DashboardResponse;
}

export default function DashboardView({ data }: DashboardViewProps) {
  const { stats, empenhos, contratos } = data;
  const [activeTab, setActiveTab] = useState<"empenhos" | "contratos">(
    "empenhos",
  );

  // Garante que contratos existe mesmo que o backend devolva undefined num primeiro momento
  const safeContratos = contratos || [];

  return (
    <>
      {/* 4 Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-transform hover:-translate-y-1">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
              <DollarSign size={24} />
            </div>
            <h3 className="text-slate-500 font-medium text-sm">
              Total Empenhado
            </h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {stats.totalEmpenhado}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-transform hover:-translate-y-1">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
              <Receipt size={24} />
            </div>
            <h3 className="text-slate-500 font-medium text-sm">
              Empenhos Ativos
            </h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {stats.empenhosAtivos}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-transform hover:-translate-y-1">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
              <FileText size={24} />
            </div>
            <h3 className="text-slate-500 font-medium text-sm">
              Contratos Firmados
            </h3>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {String(safeContratos.length).padStart(2, "0")}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-transform hover:-translate-y-1">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
              <Calendar size={24} />
            </div>
            <h3 className="text-slate-500 font-medium text-sm">
              Última Atualização
            </h3>
          </div>
          <p className="text-xl font-bold text-slate-900">
            {stats.ultimaAtualizacao}
          </p>
        </div>
      </div>

      {/* Área Principal: Abas e Tabela */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Navegação por Abas */}
        <div className="flex flex-col sm:flex-row justify-between items-center border-b border-slate-100 bg-slate-50/50 px-4 pt-2">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("empenhos")}
              className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm transition-all border-b-2 ${
                activeTab === "empenhos"
                  ? "text-blue-600 border-blue-600 bg-white rounded-t-lg"
                  : "text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100 rounded-t-lg"
              }`}
            >
              <Receipt size={18} /> Empenhos Emitidos
            </button>
            <button
              onClick={() => setActiveTab("contratos")}
              className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm transition-all border-b-2 ${
                activeTab === "contratos"
                  ? "text-blue-600 border-blue-600 bg-white rounded-t-lg"
                  : "text-slate-500 border-transparent hover:text-slate-800 hover:bg-slate-100 rounded-t-lg"
              }`}
            >
              <FileText size={18} /> Contratos Reais
            </button>
          </div>

          <button
            className="text-slate-400 hover:text-blue-600 transition-colors p-2 hidden sm:block"
            title="Exportar CSV"
          >
            <Download size={20} />
          </button>
        </div>

        {/* Tabela Condicional (Alterna consoante a aba selecionada) */}
        <div className="overflow-x-auto">
          {/* TABELA DE EMPENHOS */}
          {activeTab === "empenhos" && (
            <table className="w-full text-left border-collapse animate-in fade-in duration-300">
              <thead>
                <tr className="bg-white text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-4 font-semibold">
                    Documento / Processo
                  </th>
                  <th className="px-6 py-4 font-semibold">
                    Favorecido / Objeto
                  </th>
                  <th className="px-6 py-4 font-semibold">Órgão Solicitante</th>
                  <th className="px-6 py-4 font-semibold text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {empenhos.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                    title={item.observacao}
                  >
                    <td className="px-6 py-4 align-top">
                      <div className="font-bold text-slate-700 text-sm">
                        {item.numeroEmpenho}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {item.dataEmissao}
                      </div>
                      {item.processo &&
                        item.processo !== "-8" &&
                        item.processo !== "S/N" && (
                          <div className="text-[11px] font-mono text-blue-600 bg-blue-50 inline-block px-2 py-0.5 rounded mt-2 border border-blue-100">
                            Proc: {item.processo}
                          </div>
                        )}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div
                        className="font-medium text-slate-700 text-sm uppercase line-clamp-2"
                        title={item.favorecido.nome}
                      >
                        {item.favorecido.nome}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-1 mb-2">
                        {item.favorecido.cnpjFormatado}
                      </div>
                      {item.elemento && (
                        <div
                          className="text-[11px] text-slate-500 bg-slate-100 inline-block px-2 py-0.5 rounded border border-slate-200 line-clamp-1"
                          title={item.elemento}
                        >
                          {item.elemento}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top">
                      {item.unidadeGestora.orgaoSuperior && (
                        <div
                          className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-1 line-clamp-1"
                          title={item.unidadeGestora.orgaoSuperior}
                        >
                          {item.unidadeGestora.orgaoSuperior}
                        </div>
                      )}
                      <div
                        className="text-sm text-slate-700 font-medium line-clamp-2"
                        title={item.unidadeGestora.nome}
                      >
                        {item.unidadeGestora.nome}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right align-top">
                      <div className="text-sm font-bold text-slate-800">
                        R$ {item.valorOriginal}
                      </div>
                    </td>
                  </tr>
                ))}
                {empenhos.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-slate-400 bg-slate-50/50"
                    >
                      Nenhum empenho encontrado. Clique em "Sincronizar" para
                      buscar na API.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* TABELA DE CONTRATOS */}
          {activeTab === "contratos" && (
            <table className="w-full text-left border-collapse animate-in fade-in duration-300">
              <thead>
                <tr className="bg-white text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-4 font-semibold w-48">
                    Contrato / Vigência
                  </th>
                  <th className="px-6 py-4 font-semibold">Objeto / Situação</th>
                  <th className="px-6 py-4 font-semibold w-64">
                    Órgão Solicitante
                  </th>
                  <th className="px-6 py-4 font-semibold text-right w-40">
                    Valor Final
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {safeContratos.map((item) => {
                  const isActive =
                    item.situacao.toLowerCase().includes("publicado") ||
                    item.situacao.toLowerCase().includes("ativo");
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-blue-50/30 transition-colors group cursor-default"
                    >
                      <td className="px-6 py-4 align-top">
                        <div className="font-bold text-slate-700 text-sm flex items-center gap-2">
                          <FileText size={14} className="text-slate-400" />
                          Nº {item.numero}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-2">
                          Assinatura:{" "}
                          <span className="font-medium text-slate-700">
                            {item.dataAssinatura}
                          </span>
                        </div>
                        <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-100">
                          <div className="text-[10px] text-slate-400 uppercase tracking-wide flex items-center gap-1 mb-1">
                            <Clock size={10} /> Período de Vigência
                          </div>
                          <div className="text-xs text-slate-700 font-medium">
                            {item.vigencia}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div
                          className="text-sm text-slate-600 leading-relaxed line-clamp-3 mb-3"
                          title={item.objeto}
                        >
                          {item.objeto}
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {isActive && <CheckCircle2 size={12} />}
                          {item.situacao}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="text-sm text-slate-700 font-medium line-clamp-3 leading-relaxed">
                          {item.orgao}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right align-top">
                        <div className="text-sm font-bold text-slate-800">
                          R$ {item.valorFinal}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {safeContratos.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-slate-400 bg-slate-50/50"
                    >
                      Nenhum contrato formalizado encontrado para esta empresa.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
