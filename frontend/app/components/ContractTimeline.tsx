"use client";

import React, { useState } from "react";
import {
  Search,
  Loader2,
  GitBranch,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Banknote,
  AlertCircle,
  Building2,
  FileCheck,
  CheckCircle2,
  Clock,
  Info,
} from "lucide-react";
import { useContractTimeline } from "../hooks/useContractTimeline";
import {
  ContractTimelineItem,
  ExpenseTimelineItem,
} from "../types/dashboard";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("pt-BR");
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressBar({
  value,
  color,
  label,
}: {
  value: number;
  color: string;
  label: string;
}) {
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-28 shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold text-slate-700 w-12 text-right">
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function ExpenseRow({
  item,
  tipo,
}: {
  item: ExpenseTimelineItem;
  tipo: "empenho" | "liquidacao" | "pagamento";
}) {
  const colorMap = {
    empenho: "border-l-blue-400 bg-blue-50/40",
    liquidacao: "border-l-amber-400 bg-amber-50/40",
    pagamento: "border-l-emerald-400 bg-emerald-50/40",
  };

  return (
    <div
      className={`border border-slate-100 border-l-4 rounded-xl p-3 text-xs ${colorMap[tipo]}`}
    >
      <div className="flex justify-between items-start gap-2 mb-1">
        <span className="font-bold font-mono text-slate-700 truncate">
          {item.numeroDocumento}
        </span>
        <span className="font-black text-slate-800 whitespace-nowrap shrink-0">
          {formatCurrency(item.valorOriginal)}
        </span>
      </div>
      <div className="flex items-center justify-between text-slate-500 gap-2">
        <span className="truncate">{item.orgao}</span>
        <span className="whitespace-nowrap">{formatDate(item.data)}</span>
      </div>
      {item.descricao && item.descricao !== "SEM DESCRIÇÃO" && (
        <p className="text-slate-500 mt-1 line-clamp-1" title={item.descricao}>
          {item.descricao}
        </p>
      )}
    </div>
  );
}

function PhaseSection({
  title,
  icon,
  items,
  tipo,
  emptyMsg,
}: {
  title: string;
  icon: React.ReactNode;
  items: ExpenseTimelineItem[];
  tipo: "empenho" | "liquidacao" | "pagamento";
  emptyMsg: string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors mb-2 w-full text-left"
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {icon}
        {title}
        <span className="ml-auto bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      </button>
      {open && (
        <div className="space-y-2 pl-4 border-l-2 border-slate-100">
          {items.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">{emptyMsg}</p>
          ) : (
            items.map((item) => (
              <ExpenseRow key={item.id} item={item} tipo={tipo} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ContractCard({ contract }: { contract: ContractTimelineItem }) {
  const [expanded, setExpanded] = useState(false);
  const { resumoFinanceiro: rf } = contract;

  const situacaoColor =
    contract.situacao.toLowerCase().includes("ativo") ||
    contract.situacao.toLowerCase().includes("vigente") ||
    contract.situacao.toLowerCase().includes("publicado")
      ? "bg-emerald-100 text-emerald-700"
      : "bg-slate-100 text-slate-600";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-5"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold font-mono text-slate-800 text-sm">
                Contrato {contract.numero}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${situacaoColor}`}
              >
                {contract.situacao}
              </span>
            </div>
            <p
              className="text-xs text-slate-600 line-clamp-2"
              title={contract.objeto}
            >
              {contract.objeto}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-lg font-black text-slate-800">
              {formatCurrency(contract.valorFinal)}
            </p>
            <p className="text-[10px] text-slate-400">Valor Final</p>
          </div>
        </div>

        {/* Info row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mb-3">
          <span>
            <Building2 size={11} className="inline mr-1" />
            {contract.unidadeGestora}
          </span>
          {contract.dataInicioVigencia && (
            <span>
              <Clock size={11} className="inline mr-1" />
              {formatDate(contract.dataInicioVigencia)} →{" "}
              {formatDate(contract.dataFimVigencia)}
            </span>
          )}
        </div>

        {/* Financial progress */}
        <div className="space-y-1.5">
          <ProgressBar
            value={rf.percentualLiquidado}
            color="bg-amber-400"
            label="Liquidado"
          />
          <ProgressBar
            value={rf.percentualPago}
            color="bg-emerald-500"
            label="Pago"
          />
        </div>

        {/* Summary chips */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="flex items-center gap-1 bg-blue-50 text-blue-700 text-[11px] font-bold px-2.5 py-1 rounded-full">
            <TrendingUp size={11} />
            Emp: {formatCurrency(rf.totalEmpenhado)}
          </span>
          <span className="flex items-center gap-1 bg-amber-50 text-amber-700 text-[11px] font-bold px-2.5 py-1 rounded-full">
            <CreditCard size={11} />
            Liq: {formatCurrency(rf.totalLiquidado)}
          </span>
          <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-full">
            <Banknote size={11} />
            Pago: {formatCurrency(rf.totalPago)}
          </span>
          {rf.saldoAReceber > 0 && (
            <span className="flex items-center gap-1 bg-slate-100 text-slate-600 text-[11px] font-bold px-2.5 py-1 rounded-full">
              <Info size={11} />
              Saldo: {formatCurrency(rf.saldoAReceber)}
            </span>
          )}
        </div>

        {/* Expand toggle */}
        <div className="flex items-center justify-center mt-4 pt-3 border-t border-slate-100">
          <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
            {expanded ? (
              <>
                <ChevronDown size={14} /> Recolher detalhes
              </>
            ) : (
              <>
                <ChevronRight size={14} /> Ver empenhos, liquidações e pagamentos
              </>
            )}
          </span>
        </div>
      </button>

      {/* Expanded expense phases */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 pb-5">
          <PhaseSection
            title="Empenhos"
            icon={<TrendingUp size={14} className="text-blue-500" />}
            items={contract.empenhos}
            tipo="empenho"
            emptyMsg="Nenhum empenho correlacionado a este contrato."
          />
          <PhaseSection
            title="Liquidações"
            icon={<FileCheck size={14} className="text-amber-500" />}
            items={contract.liquidacoes}
            tipo="liquidacao"
            emptyMsg="Nenhuma liquidação correlacionada."
          />
          <PhaseSection
            title="Pagamentos"
            icon={<CheckCircle2 size={14} className="text-emerald-500" />}
            items={contract.pagamentos}
            tipo="pagamento"
            emptyMsg="Nenhum pagamento correlacionado."
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function ContractTimeline() {
  const { cnpj, data, loading, error, handleCnpjChange, fetchTimeline, reset } =
    useContractTimeline();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchTimeline();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Search panel */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <GitBranch size={120} />
        </div>
        <div className="relative z-10 max-w-2xl">
          <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
            <GitBranch className="text-indigo-600" size={20} />
            Timeline de Contratos
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            Consulte todos os contratos públicos de um CNPJ e visualize o
            ciclo completo: empenhos → liquidações → pagamentos, com resumo
            financeiro por contrato.
          </p>

          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Digite o CNPJ (Ex: 23.008.295/0001-48)"
                className="pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 w-full outline-none font-mono"
                value={cnpj}
                onChange={(e) => handleCnpjChange(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading || cnpj.replace(/\D/g, "").length < 14}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl text-sm font-medium flex items-center gap-2 transition-all shadow-md"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Search size={18} />
              )}
              Consultar
            </button>
            {data && (
              <button
                type="button"
                onClick={reset}
                className="border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-3 rounded-xl text-sm font-medium transition-all"
              >
                Limpar
              </button>
            )}
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2 border border-red-100">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse"
            >
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-2/3 mb-4" />
              <div className="h-2 bg-slate-100 rounded w-full mb-2" />
              <div className="h-2 bg-slate-100 rounded w-4/5" />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
          {/* Summary bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
              <p className="text-2xl font-black text-indigo-600">
                {data.totalContratos}
              </p>
              <p className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wide">
                Contratos
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
              <p className="text-2xl font-black text-blue-600">
                {data.totalEmpenhos}
              </p>
              <p className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wide">
                Empenhos
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
              <p className="text-2xl font-black text-amber-600">
                {data.empenhosSemContrato}
              </p>
              <p className="text-xs text-slate-500 font-semibold mt-1 uppercase tracking-wide">
                Sem Contrato
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
              <p className="text-sm font-bold text-slate-700 truncate">
                {data.empresa}
              </p>
              <p className="text-xs text-slate-500 font-mono mt-1">
                {data.cnpj}
              </p>
            </div>
          </div>

          {/* Contract cards */}
          {data.contratos.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
              <GitBranch size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500 font-medium">
                Nenhum contrato encontrado para este CNPJ.
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Verifique se os dados foram importados pelo módulo Gov.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.contratos.map((contract) => (
                <ContractCard key={contract.id} contract={contract} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
