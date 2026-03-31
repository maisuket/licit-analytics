import React, { useMemo } from "react";
import { ErpExpense, ErpServiceOrder } from "../types/dashboard";
import { formatCurrency, formatPercent } from "../utils/formatters";
import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  PieChart,
  TrendingUp,
  Activity,
  BarChart3,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ============================================================================
// 1. LÓGICA DE NEGÓCIO (Custom Hook isolado da Interface)
// ============================================================================
function useBIMetrics(empenhos: ErpExpense[], ordens: ErpServiceOrder[]) {
  return useMemo(() => {
    const ordensRealizadas = ordens.filter(
      (os) => os.status === "FATURADO" || os.status === "PAGO",
    );

    // Métricas Principais
    const faturamentoTotal = ordensRealizadas.reduce(
      (acc, os) => acc + os.valorFinal,
      0,
    );
    const custoTotal = ordensRealizadas.reduce(
      (acc, os) => acc + os.custoTotal,
      0,
    );
    const lucroBruto = faturamentoTotal - custoTotal;
    const margemMedia =
      faturamentoTotal > 0 ? (lucroBruto / faturamentoTotal) * 100 : 0;

    // Consumo de Empenhos (Alerta de Tetos)
    const consumoEmpenhos = empenhos
      .map((emp) => ({
        ...emp,
        percent:
          emp.valorOriginal > 0
            ? (emp.valorFaturado / emp.valorOriginal) * 100
            : 0,
      }))
      .sort((a, b) => b.percent - a.percent);

    // Rentabilidade por Órgão (Para as barras de proporção)
    const rentabilidadeMap = new Map();
    ordensRealizadas.forEach((os) => {
      const orgao = os.contrato || os.expense?.orgao || "OUTROS";
      if (!rentabilidadeMap.has(orgao))
        rentabilidadeMap.set(orgao, { orgao, faturamento: 0, custo: 0 });
      const item = rentabilidadeMap.get(orgao);
      item.faturamento += os.valorFinal;
      item.custo += os.custoTotal;
    });

    const rentabilidadeArray = Array.from(rentabilidadeMap.values()).map(
      (r) => ({
        ...r,
        lucro: r.faturamento - r.custo,
        margem:
          r.faturamento > 0
            ? ((r.faturamento - r.custo) / r.faturamento) * 100
            : 0,
      }),
    );

    // NOVO: Tendência de Faturamento ao longo do tempo (Para o Gráfico Recharts)
    const trendMap = new Map();
    ordensRealizadas.forEach((os) => {
      const data = new Date(os.dataExecucao);
      const mesAno = `${data.toLocaleString("pt-BR", { month: "short" }).toUpperCase()}/${data.getFullYear().toString().slice(2)}`;

      if (!trendMap.has(mesAno)) {
        trendMap.set(mesAno, {
          mes: mesAno,
          faturamento: 0,
          custo: 0,
          lucro: 0,
          timestamp: data.getTime(),
        });
      }
      const item = trendMap.get(mesAno);
      item.faturamento += os.valorFinal;
      item.custo += os.custoTotal;
      item.lucro += os.valorFinal - os.custoTotal;
    });

    const trendData = Array.from(trendMap.values()).sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    return {
      faturamentoTotal,
      custoTotal,
      lucroBruto,
      margemMedia,
      consumoEmpenhos,
      rentabilidadeArray,
      trendData,
    };
  }, [empenhos, ordens]);
}

// ============================================================================
// 2. SUB-COMPONENTES DE UI (Pequenos, reutilizáveis e fáceis de manter)
// ============================================================================

const TopMetricCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  colorClass,
  bgClass,
  isHighlight = false,
}: any) => (
  <div
    className={`${isHighlight ? "bg-blue-600 text-white" : "bg-white text-slate-800"} p-6 rounded-2xl shadow-sm border ${isHighlight ? "border-blue-500" : "border-slate-100"} relative overflow-hidden group`}
  >
    <div
      className={`absolute top-0 right-0 p-4 ${isHighlight ? "opacity-10" : "opacity-5"} group-hover:scale-110 transition-transform`}
    >
      <Icon
        size={64}
        className={isHighlight ? "text-white" : "text-slate-400"}
      />
    </div>
    <p
      className={`text-xs font-bold uppercase tracking-wider mb-2 ${isHighlight ? "text-blue-200" : "text-slate-500"}`}
    >
      {title}
    </p>
    <p className={`text-2xl font-black ${colorClass}`}>{value}</p>
    <p
      className={`text-xs mt-2 font-medium flex items-center gap-1 ${isHighlight ? "text-blue-100" : "text-slate-400"}`}
    >
      {subtitle}
    </p>
  </div>
);

const EmpenhoHealthList = ({ empenhos }: { empenhos: any[] }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full">
    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
      <AlertTriangle size={18} className="text-amber-500" /> Saúde dos Empenhos
      (Tetos)
    </h3>
    <div className="space-y-5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
      {empenhos.length === 0 && (
        <p className="text-sm text-slate-400">Sem empenhos registados.</p>
      )}
      {empenhos.map((emp) => {
        const isDanger = emp.percent > 90;
        const isWarning = emp.percent > 75 && emp.percent <= 90;
        const barColor = isDanger
          ? "bg-red-500"
          : isWarning
            ? "bg-amber-400"
            : "bg-emerald-500";
        const bgColor = isDanger
          ? "bg-red-50"
          : isWarning
            ? "bg-amber-50"
            : "bg-emerald-50";

        return (
          <div key={emp.id} className="space-y-2">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-sm font-bold text-slate-700">
                  {emp.numeroDocumento}
                </p>
                <p className="text-xs text-slate-500">
                  {emp.orgao} • Saldo: {formatCurrency(emp.saldo)}
                </p>
              </div>
              <span
                className={`text-xs font-bold px-2 py-1 rounded ${isDanger ? "text-red-700 bg-red-100" : "text-slate-600"}`}
              >
                {formatPercent(emp.percent)} Consumido
              </span>
            </div>
            <div
              className={`w-full h-2.5 rounded-full ${bgColor} overflow-hidden`}
            >
              <div
                className={`h-full ${barColor} transition-all duration-1000 ease-out rounded-full`}
                style={{ width: `${Math.min(emp.percent, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const RevenueTrendChart = ({ data }: { data: any[] }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
      <BarChart3 size={18} className="text-blue-500" /> Crescimento e Evolução
      de Faturamento
    </h3>
    {data.length === 0 ? (
      <div className="h-[250px] flex items-center justify-center text-slate-400 text-sm">
        Sem dados suficientes para gerar o gráfico histórico.
      </div>
    ) : (
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              tickFormatter={(val) => `R$ ${val / 1000}k`}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                borderRadius: "12px",
                border: "none",
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
              }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            <Area
              type="monotone"
              name="Faturamento (Vf)"
              dataKey="faturamento"
              stroke="#3b82f6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorFaturamento)"
            />
            <Area
              type="monotone"
              name="Lucro Bruto"
              dataKey="lucro"
              stroke="#10b981"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorLucro)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);

const ProfitabilityList = ({
  rentabilidadeArray,
}: {
  rentabilidadeArray: any[];
}) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full">
    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
      <PieChart size={18} className="text-indigo-500" /> Rentabilidade por
      Contrato/Órgão
    </h3>
    <div className="space-y-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
      {rentabilidadeArray.length === 0 && (
        <p className="text-sm text-slate-400">
          Sem dados faturados para análise.
        </p>
      )}
      {rentabilidadeArray.map((rent) => {
        const maxVal = rent.faturamento;
        const custoWidth = maxVal > 0 ? (rent.custo / maxVal) * 100 : 0;
        const lucroWidth = maxVal > 0 ? (rent.lucro / maxVal) * 100 : 0;

        return (
          <div
            key={rent.orgao}
            className="border-b border-slate-50 pb-4 last:border-0"
          >
            <div className="flex justify-between mb-2">
              <span className="font-bold text-slate-700 uppercase text-sm">
                {rent.orgao}
              </span>
              <span className="text-sm font-black text-emerald-600">
                {formatPercent(rent.margem)} Margem
              </span>
            </div>
            <div className="w-full h-5 rounded-md bg-slate-100 overflow-hidden flex relative group">
              <div
                className="h-full bg-red-400 transition-all duration-1000 flex items-center px-2"
                style={{ width: `${custoWidth}%` }}
              >
                {custoWidth > 15 && (
                  <span className="text-[9px] text-white font-bold truncate">
                    CUSTO
                  </span>
                )}
              </div>
              <div
                className="h-full bg-emerald-500 transition-all duration-1000 flex items-center px-2"
                style={{ width: `${lucroWidth}%` }}
              >
                {lucroWidth > 15 && (
                  <span className="text-[9px] text-white font-bold truncate">
                    LUCRO
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-between mt-1 px-1">
              <span className="text-[10px] text-slate-400 font-bold">
                {formatCurrency(rent.custo)}
              </span>
              <span className="text-[10px] text-emerald-600 font-bold">
                +{formatCurrency(rent.lucro)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ============================================================================
// 3. COMPONENTE PRINCIPAL (Orquestrador)
// ============================================================================
export function BIDashboard({
  empenhos,
  ordens,
}: {
  empenhos: ErpExpense[];
  ordens: ErpServiceOrder[];
}) {
  // 1. Invoca o nosso hook de matemática
  const metrics = useBIMetrics(empenhos, ordens);

  // 2. Renderiza a Interface limpa e modularizada
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* LINHA 1: Cards de KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <TopMetricCard
          title="Faturamento Realizado"
          value={formatCurrency(metrics.faturamentoTotal)}
          subtitle={
            <>
              <CheckCircle2 size={12} /> O.S. Faturadas/Pagas
            </>
          }
          icon={TrendingUp}
          colorClass="text-slate-800"
        />
        <TopMetricCard
          title="Custo Operacional"
          value={formatCurrency(metrics.custoTotal)}
          subtitle="Equipas, materiais e impostos"
          icon={Activity}
          colorClass="text-red-600"
        />
        <TopMetricCard
          title="Lucro Bruto"
          value={formatCurrency(metrics.lucroBruto)}
          subtitle="Valor limpo da operação"
          icon={DollarSign}
          colorClass="text-white"
          isHighlight={true}
        />
        <TopMetricCard
          title="Margem Média"
          value={formatPercent(metrics.margemMedia)}
          subtitle="Rentabilidade global do negócio"
          icon={PieChart}
          colorClass="text-emerald-500"
        />
      </div>

      {/* LINHA 2: Gráfico de Evolução (Novo!) */}
      <div className="grid grid-cols-1 gap-6">
        <RevenueTrendChart data={metrics.trendData} />
      </div>

      {/* LINHA 3: Gestão de Contratos e Empenhos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EmpenhoHealthList empenhos={metrics.consumoEmpenhos} />
        <ProfitabilityList rentabilidadeArray={metrics.rentabilidadeArray} />
      </div>
    </div>
  );
}
