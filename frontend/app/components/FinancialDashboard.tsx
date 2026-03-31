"use client";

import React, { useState, useMemo } from "react";
import {
  Loader2,
  CheckCircle2,
  Clock,
  Search,
  ReceiptText,
  Landmark,
  ArrowDownToLine,
  HandCoins,
  BarChart3,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ErpServiceOrder } from "../types/dashboard";
import { ApiService } from "../services/api";
import { formatCurrency } from "../utils/formatters";

// Sub-componente extraído para gerir os cartões financeiros (DRY)
interface KpiCardProps {
  title: string;
  value: string | React.ReactNode;
  subtitle: React.ReactNode;
  icon: React.ElementType;
  isHighlight?: boolean;
  valueColor?: string;
  subtitleColor?: string;
}

const KpiCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  isHighlight = false,
  valueColor = "text-slate-700",
  subtitleColor = "text-slate-400",
}: KpiCardProps) => (
  <div
    className={`${isHighlight ? "bg-blue-600 border-blue-500 shadow-md" : "bg-white border-slate-100 shadow-sm"} p-6 rounded-2xl border relative overflow-hidden group`}
  >
    <div
      className={`absolute top-0 right-0 p-4 ${isHighlight ? "opacity-10" : "opacity-5"} group-hover:scale-110 transition-transform`}
    >
      <Icon
        size={80}
        className={isHighlight ? "text-white" : "text-slate-800"}
      />
    </div>
    <p
      className={`text-xs font-bold uppercase tracking-wider mb-2 ${isHighlight ? "text-blue-200" : "text-slate-500"}`}
    >
      {title}
    </p>
    <p
      className={`${isHighlight ? "text-3xl text-white" : `text-2xl ${valueColor}`} font-black`}
    >
      {value}
    </p>
    <p
      className={`text-xs mt-2 font-medium flex items-center gap-1 ${isHighlight ? "text-blue-100" : subtitleColor}`}
    >
      {subtitle}
    </p>
  </div>
);

export function FinancialDashboard({
  ordens,
  loadErpData,
}: {
  ordens: ErpServiceOrder[];
  loadErpData: () => Promise<void>;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Cálculos de Fluxo de Caixa e Previsão
  const { kpis, forecastData } = useMemo(() => {
    let aReceber = 0;
    let recebido = 0;
    let potencial = 0; // O.S. executadas mas ainda sem NF (Aguardando)

    const map = new Map();

    ordens.forEach((os) => {
      // KPIs globais
      if (os.status === "FATURADO") aReceber += os.valorFinal;
      if (os.status === "PAGO") recebido += os.valorFinal;
      if (os.status === "AGUARDANDO") potencial += os.valorFinal;

      // Dados para o Gráfico (Mensal)
      if (os.status === "FATURADO" || os.status === "PAGO") {
        const date = new Date(os.dataExecucao);
        const mesAno = `${date.toLocaleString("pt-BR", { month: "short" }).toUpperCase()}/${date.getFullYear().toString().slice(2)}`;

        if (!map.has(mesAno))
          map.set(mesAno, {
            mes: mesAno,
            aReceber: 0,
            recebido: 0,
            timestamp: date.getTime(),
          });
        const item = map.get(mesAno);

        if (os.status === "FATURADO") item.aReceber += os.valorFinal;
        if (os.status === "PAGO") item.recebido += os.valorFinal;
      }
    });

    const forecastData = Array.from(map.values()).sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    return { kpis: { aReceber, recebido, potencial }, forecastData };
  }, [ordens]);

  // Filtragem da Tabela (Mostra apenas o que já tem NF ou foi pago)
  const financialRecords = useMemo(() => {
    return ordens
      .filter((os) => os.status === "FATURADO" || os.status === "PAGO")
      .filter(
        (os) =>
          os.numeroOS.includes(searchTerm) ||
          (os.numeroNF && os.numeroNF.includes(searchTerm)) ||
          os.unidade.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      .sort(
        (a, b) =>
          new Date(b.dataExecucao).getTime() -
          new Date(a.dataExecucao).getTime(),
      );
  }, [ordens, searchTerm]);

  // Aciona o Backend para dar baixa no pagamento
  const handleBaixaPagamento = (id: string) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-slate-800">
            Confirmar o recebimento deste valor na conta da empresa?
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                setIsProcessing(id);
                try {
                  await ApiService.updateOsStatus(id, "PAGO");
                  await loadErpData(); // Recarrega os saldos
                  toast.success("Baixa de pagamento realizada com sucesso!");
                } catch (error: any) {
                  toast.error(`Erro ao dar baixa: ${error.message}`);
                } finally {
                  setIsProcessing(null);
                }
              }}
              className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
            >
              Confirmar
            </button>
          </div>
        </div>
      ),
      { duration: Infinity, id: `confirm-${id}` },
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* 1. KPIs Financeiros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard
          title="Potencial de Faturamento"
          value={formatCurrency(kpis.potencial)}
          subtitle="O.S. Aguardando emissão de NF"
          icon={Clock}
        />

        <KpiCard
          title="Contas a Receber (Em Aberto)"
          value={formatCurrency(kpis.aReceber)}
          subtitle="Notas Fiscais emitidas aguardando pagamento"
          icon={Landmark}
          isHighlight={true}
        />

        <KpiCard
          title="Total Recebido (PAGO)"
          value={formatCurrency(kpis.recebido)}
          subtitle={
            <>
              <CheckCircle2 size={12} /> Dinheiro em Caixa
            </>
          }
          icon={HandCoins}
          valueColor="text-emerald-600"
          subtitleColor="text-emerald-600"
        />
      </div>

      {/* 2. Gráfico de Previsão de Entradas */}
      {forecastData.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-500" /> Previsão de
            Recebimentos por Mês
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={forecastData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="mes"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `R$ ${val / 1000}k`}
                  tick={{ fontSize: 12, fill: "#94a3b8" }}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  cursor={{ fill: "#f8fafc" }}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ paddingTop: "10px" }}
                />
                {/* A ordem das barras importa. O que está no topo do "stackId" fica por baixo na UI. */}
                <Bar
                  name="A Receber (Previsão)"
                  dataKey="aReceber"
                  stackId="a"
                  fill="#3b82f6"
                  radius={[0, 0, 4, 4]}
                />
                <Bar
                  name="Recebido (Em Caixa)"
                  dataKey="recebido"
                  stackId="a"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 3. Tabela de Gestão de Recebíveis */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
              <ReceiptText size={20} className="text-slate-400" /> Título de
              Receitas (Notas Fiscais)
            </h3>
            <p className="text-sm text-slate-500">
              Faça a gestão dos pagamentos do governo.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Pesquisar NF, O.S. ou Unidade..."
              className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 w-full outline-none shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-100">
                <th className="px-6 py-4 font-semibold">Nota Fiscal / O.S.</th>
                <th className="px-6 py-4 font-semibold">Órgão / Contrato</th>
                <th className="px-6 py-4 font-semibold text-right">
                  Valor a Receber
                </th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-center">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {financialRecords.map((os) => {
                const isPago = os.status === "PAGO";
                return (
                  <tr
                    key={os.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="font-black text-slate-700 text-sm flex items-center gap-2">
                        NF: {os.numeroNF || "S/N"}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-1 bg-slate-100 px-1.5 py-0.5 rounded w-fit border border-slate-200">
                        O.S: {os.numeroOS}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-700 text-sm">
                        {os.expense?.orgao || "Governo"}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                        {os.unidade}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div
                        className={`text-sm font-black ${isPago ? "text-slate-400 line-through" : "text-blue-600"}`}
                      >
                        {formatCurrency(os.valorFinal)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          isPago
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {isPago ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <Clock size={12} />
                        )}
                        {os.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {!isPago ? (
                        <button
                          onClick={() => handleBaixaPagamento(os.id)}
                          disabled={isProcessing === os.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 mx-auto disabled:opacity-50"
                        >
                          {isProcessing === os.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <ArrowDownToLine size={14} />
                          )}
                          Dar Baixa (Receber)
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">
                          Liquidado
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {financialRecords.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-slate-400 bg-slate-50/50"
                  >
                    Nenhuma Nota Fiscal pendente ou paga encontrada. Avance as
                    suas O.S. para FATURADO no módulo operacional.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
