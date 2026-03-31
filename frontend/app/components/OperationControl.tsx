import React, { useState, useRef, useMemo } from "react";
import {
  ClipboardList,
  Wallet,
  CheckCircle2,
  Clock,
  FileText,
  Search,
  Plus,
  X,
  Loader2,
  Save,
  UploadCloud,
  Download,
  Printer,
  Building,
  ReceiptText,
  Activity,
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

import {
  formatCurrency,
  formatDateStr,
  formatPercent,
} from "../utils/formatters";
import { ErpContract, ErpExpense, ErpServiceOrder } from "../types/dashboard";
import { ApiService } from "../services/api";
import { generateOsPdfTemplate } from "../utils/pdfTemplates";
import { useProductionSummary } from "../hooks/useProductionSummary";

interface OperationControlProps {
  cnpjContext: string;
  empenhos: ErpExpense[];
  ordens: ErpServiceOrder[];
  contratos: ErpContract[];
  loading: boolean;
  loadErpData: () => Promise<void>;
}

export default function OperationControl({
  cnpjContext,
  empenhos,
  ordens,
  contratos,
  loading,
  loadErpData,
}: OperationControlProps) {
  // Estado das Abas e Filtros
  const [activeErpTab, setActiveErpTab] = useState<"os" | "producao">("os");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedExpenseId, setSelectedExpenseId] = useState<string>("ALL");

  // Estado dos Modais
  const [selectedOs, setSelectedOs] = useState<ErpServiceOrder | null>(null);
  const [isNewOsModalOpen, setIsNewOsModalOpen] = useState(false);

  // Estado de Processamento
  const [isUploading, setIsUploading] = useState<"empenho" | "os" | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingStatus, setIsProcessingStatus] = useState<string | null>(
    null,
  );

  // Referências para Upload de Ficheiros
  const fileInputEmpenho = useRef<HTMLInputElement>(null);
  const fileInputOs = useRef<HTMLInputElement>(null);

  // Formulário da Nova O.S.
  const [formOs, setFormOs] = useState({
    expenseId: "",
    numeroOS: "",
    unidade: "",
    executante: "",
    custoTotal: "",
    valorFinal: "",
    quantidade: "",
    contrato: "",
    municipio: "",
    processo: "",
    competencia: "",
  });

  // ==========================================================================
  // CÁLCULOS E MEMOIZAÇÃO
  // ==========================================================================

  // Filtra as OS com base na pesquisa e no empenho selecionado
  const filteredOS = useMemo(() => {
    return ordens.filter((os) => {
      const matchesSearch =
        os.unidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
        os.numeroOS.includes(searchTerm);
      const matchesEmpenho =
        selectedExpenseId === "ALL" || os.expenseId === selectedExpenseId;
      return matchesSearch && matchesEmpenho;
    });
  }, [ordens, searchTerm, selectedExpenseId]);

  // Hook de Produção (PS)
  const producaoData = useProductionSummary(
    selectedExpenseId === "ALL" ? ordens : filteredOS,
  );

  // Calcula o Empenho Ativo para os cartões superiores
  const activeEmpenho = useMemo(() => {
    if (selectedExpenseId === "ALL") {
      return {
        numeroDocumento: "Visão Global",
        orgao: "Todos os Órgãos",
        valorOriginal: empenhos.reduce(
          (a, b) => a + Number(b.valorOriginal),
          0,
        ),
        valorFaturado: empenhos.reduce(
          (a, b) => a + Number(b.valorFaturado),
          0,
        ),
        saldo: empenhos.reduce((a, b) => a + Number(b.saldo), 0),
      };
    }
    return empenhos.find((e) => e.id === selectedExpenseId);
  }, [empenhos, selectedExpenseId]);

  // ==========================================================================
  // HANDLERS (AÇÕES)
  // ==========================================================================

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAGO":
        return (
          <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 w-fit border border-emerald-200">
            <CheckCircle2 size={12} /> PAGO
          </span>
        );
      case "FATURADO":
        return (
          <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 w-fit border border-blue-200">
            <FileText size={12} /> FATURADO
          </span>
        );
      default:
        return (
          <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 w-fit border border-amber-200">
            <Clock size={12} /> AGUARDANDO
          </span>
        );
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "empenho" | "os",
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(type);
    const toastId = toast.loading(
      `A importar ficheiro de ${type.toUpperCase()}...`,
    );

    try {
      const res = await ApiService.importCsv(cnpjContext, type, file);
      toast.success(`Sucesso! ${res.imported} registos integrados.`, {
        id: toastId,
      });
      await loadErpData();
    } catch (error: any) {
      toast.error(`Erro na importação: ${error.message}`, { id: toastId });
    } finally {
      setIsUploading(null);
      if (e.target) e.target.value = "";
    }
  };

  const handleSaveOS = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const toastId = toast.loading("A guardar Ordem de Serviço...");

    try {
      const custo = Number(formOs.custoTotal);
      const valorFinal = Number(formOs.valorFinal);
      const margem = valorFinal > 0 ? (valorFinal - custo) / valorFinal : 0;

      await ApiService.createServiceOrder({
        ...formOs,
        quantidade: Number(formOs.quantidade),
        custoTotal: custo,
        valorFinal: valorFinal,
        margem,
        dataExecucao: new Date().toISOString(), // Pode ser ajustado para usar um datepicker real
      });

      toast.success("O.S. criada com sucesso!", { id: toastId });
      setIsNewOsModalOpen(false);
      setFormOs({
        expenseId: "",
        numeroOS: "",
        unidade: "",
        executante: "",
        custoTotal: "",
        valorFinal: "",
        quantidade: "",
        contrato: "",
        municipio: "",
        processo: "",
        competencia: "",
      });
      await loadErpData();
    } catch (err: any) {
      toast.error(err.message || "Falha ao gravar O.S.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setIsProcessingStatus(id);
    const toastId = toast.loading("A atualizar estado da O.S...");
    try {
      const mockNF =
        newStatus === "FATURADO"
          ? Math.floor(Math.random() * 90000 + 10000).toString()
          : undefined;
      await ApiService.updateOsStatus(id, newStatus, mockNF);
      toast.success(`O.S. movida para ${newStatus}!`, { id: toastId });
      await loadErpData();
      setSelectedOs(null);
    } catch (error: any) {
      toast.error("Erro ao atualizar o estado.", { id: toastId });
    } finally {
      setIsProcessingStatus(null);
    }
  };

  const handleGeneratePDF = (os: ErpServiceOrder) => {
    const htmlTemplate = generateOsPdfTemplate(os);
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error(
        "Por favor, permita pop-ups no seu navegador para gerar o PDF.",
      );
      return;
    }
    printWindow.document.open();
    printWindow.document.write(htmlTemplate);
    printWindow.document.close();
  };

  const handleExportPS = () => {
    let csv =
      "CONTRATO / ORGAO;LOCAL / COMPETENCIA;STATUS;QTD TOTAL;VALOR TOTAL (R$);MEDIA (R$)\n";
    producaoData.forEach((item) => {
      const valTotalStr = item.valorTotal.toFixed(2).replace(".", ",");
      const valMediaStr = item.media.toFixed(2).replace(".", ",");
      csv += `${item.orgao};${item.local};${item.status};${item.qtdTotal};"${valTotalStr}";"${valMediaStr}"\n`;
    });

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Relatorio_Producao_PS_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório transferido com sucesso!");
  };

  if (loading && ordens.length === 0) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border border-slate-100 shadow-sm min-h-[400px]">
        <Loader2 size={40} className="animate-spin mb-4 text-blue-500" />
        <p className="font-medium">A carregar dados da operação...</p>
      </div>
    );
  }

  return (
    <div className="relative animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6">
        {/* HEADER: Gestão e Filtros */}
        <div className="mb-8 p-6 bg-gradient-to-br from-slate-50 to-slate-100/60 rounded-2xl border border-slate-200">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Wallet className="text-blue-600" /> Painel de Execução (ERP)
              </h2>
              <div className="flex items-center gap-3 mt-3">
                <span className="text-sm text-slate-500 font-medium whitespace-nowrap">
                  Filtrar por Empenho:
                </span>
                <select
                  className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-auto min-w-[250px] shadow-sm"
                  value={selectedExpenseId}
                  onChange={(e) => setSelectedExpenseId(e.target.value)}
                >
                  <option value="ALL">Visão Global (Todos os Empenhos)</option>
                  {empenhos.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.numeroDocumento} - {emp.orgao}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <input
                type="file"
                accept=".csv"
                className="hidden"
                ref={fileInputEmpenho}
                onChange={(e) => handleFileUpload(e, "empenho")}
              />
              <input
                type="file"
                accept=".csv"
                className="hidden"
                ref={fileInputOs}
                onChange={(e) => handleFileUpload(e, "os")}
              />

              <button
                onClick={() => fileInputEmpenho.current?.click()}
                disabled={!!isUploading}
                className="flex-1 md:flex-none justify-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
              >
                {isUploading === "empenho" ? (
                  <Loader2 size={16} className="animate-spin text-slate-400" />
                ) : (
                  <UploadCloud size={16} className="text-blue-600" />
                )}{" "}
                CSV NE
              </button>
              <button
                onClick={() => fileInputOs.current?.click()}
                disabled={!!isUploading}
                className="flex-1 md:flex-none justify-center bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm transition-colors"
              >
                {isUploading === "os" ? (
                  <Loader2 size={16} className="animate-spin text-slate-400" />
                ) : (
                  <UploadCloud size={16} className="text-emerald-600" />
                )}{" "}
                CSV O.S.
              </button>
              <button
                onClick={() => setIsNewOsModalOpen(true)}
                className="flex-1 md:flex-none justify-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-md transition-colors lg:ml-2"
              >
                <Plus size={18} /> Lançar Nova O.S.
              </button>
            </div>
          </div>

          {/* Cartões de Resumo do Empenho Selecionado */}
          {activeEmpenho && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 animate-in zoom-in-95 duration-300">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 text-slate-50 opacity-50">
                  <Wallet size={100} />
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 relative z-10">
                  Teto Total (Orçamento)
                </p>
                <p className="text-2xl font-black text-slate-800 relative z-10">
                  {formatCurrency(Number(activeEmpenho.valorOriginal))}
                </p>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 text-blue-50 opacity-50">
                  <Activity size={100} />
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 relative z-10">
                  Total Faturado
                </p>
                <p className="text-2xl font-black text-blue-600 relative z-10">
                  {formatCurrency(Number(activeEmpenho.valorFaturado))}
                </p>
              </div>
              <div className="bg-emerald-50 p-5 rounded-xl shadow-sm border border-emerald-100 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 text-emerald-100 opacity-50">
                  <CheckCircle2 size={100} />
                </div>
                <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-1 relative z-10">
                  Saldo a Executar
                </p>
                <p className="text-2xl font-black text-emerald-700 relative z-10">
                  {formatCurrency(Number(activeEmpenho.saldo))}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* NAVEGAÇÃO DE ABAS INTERNAS */}
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveErpTab("os")}
            className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap ${activeErpTab === "os" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
          >
            <div className="flex items-center gap-2">
              <ClipboardList size={16} /> Histórico de O.S.
            </div>
          </button>
          <button
            onClick={() => setActiveErpTab("producao")}
            className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 whitespace-nowrap ${activeErpTab === "producao" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}
          >
            <div className="flex items-center gap-2">
              <Activity size={16} /> Resumo de Produção (PS)
            </div>
          </button>
        </div>

        {/* ========================================== */}
        {/* CONTEÚDO DA ABA 1: HISTÓRICO DE O.S.       */}
        {/* ========================================== */}
        {activeErpTab === "os" && (
          <div className="animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
              <h3 className="text-slate-700 text-sm font-medium">
                Lista de operações executadas pela sua equipa técnica.
              </h3>
              <div className="relative w-full sm:w-auto">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Pesquisar unidade ou nº da O.S..."
                  className="pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 w-full sm:w-72 outline-none transition-shadow"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-200">
                    <th className="px-5 py-4 font-semibold">O.S. / NE</th>
                    <th className="px-5 py-4 font-semibold">
                      Unidade Executada
                    </th>
                    <th className="px-5 py-4 font-semibold text-center">Qtd</th>
                    <th className="px-5 py-4 font-semibold text-right">
                      Valor Limpo (Vf)
                    </th>
                    <th className="px-5 py-4 font-semibold text-center">
                      Nota Fiscal
                    </th>
                    <th className="px-5 py-4 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredOS.map((os) => (
                    <tr
                      key={os.id}
                      onClick={() => setSelectedOs(os)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">
                          {os.numeroOS}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 w-fit">
                          {os.expense?.numeroDocumento || "S/N"}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div
                          className="text-sm text-slate-700 font-semibold line-clamp-1"
                          title={os.unidade}
                        >
                          {os.unidade}
                        </div>
                        <div className="text-[11px] text-slate-400 uppercase tracking-wide mt-1">
                          {formatDateStr(os.dataExecucao)} •{" "}
                          {os.executante || "S/N"}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="bg-slate-100 text-slate-700 font-mono text-sm px-2 py-1 rounded-md font-bold">
                          {os.quantidade}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="text-sm font-black text-slate-800">
                          {formatCurrency(Number(os.valorFinal))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`font-mono text-xs px-2 py-1 rounded-md border ${os.numeroNF ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}
                        >
                          {os.numeroNF || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4">{getStatusBadge(os.status)}</td>
                    </tr>
                  ))}
                  {filteredOS.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-slate-400 bg-slate-50/50"
                      >
                        Nenhuma Ordem de Serviço encontrada para os filtros
                        atuais.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* CONTEÚDO DA ABA 2: PRODUÇÃO (PS)           */}
        {/* ========================================== */}
        {activeErpTab === "producao" && (
          <div className="animate-in fade-in duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
              <h3 className="text-slate-700 text-sm font-medium">
                Resumo financeiro agrupado automaticamente por Local.
              </h3>
              <button
                onClick={handleExportPS}
                className="text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-4 py-2 rounded-xl transition-colors text-sm font-bold flex items-center gap-2 w-full sm:w-auto justify-center shadow-sm"
              >
                <Download size={16} /> Exportar Relatório Excel
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-800 text-slate-200 text-[10px] uppercase tracking-wider">
                    <th className="px-5 py-4 font-semibold border-r border-slate-700">
                      Contrato / Órgão
                    </th>
                    <th className="px-5 py-4 font-semibold border-r border-slate-700">
                      Local / Competência
                    </th>
                    <th className="px-5 py-4 font-semibold border-r border-slate-700 text-center">
                      Status
                    </th>
                    <th className="px-5 py-4 font-semibold text-center border-r border-slate-700">
                      Qtd Total
                    </th>
                    <th className="px-5 py-4 font-semibold text-right border-r border-slate-700">
                      Valor Acumulado (R$)
                    </th>
                    <th className="px-5 py-4 font-semibold text-right">
                      Média p/ Unid.
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {producaoData.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-5 py-4 border-r border-slate-100">
                        <span className="font-bold text-slate-700 uppercase text-xs">
                          {item.orgao}
                        </span>
                      </td>
                      <td className="px-5 py-4 border-r border-slate-100">
                        <span className="text-sm text-slate-600 font-medium">
                          {item.local}
                        </span>
                      </td>
                      <td className="px-5 py-4 border-r border-slate-100 text-center flex justify-center mt-2 border-0">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-5 py-4 text-center border-r border-slate-100">
                        <span className="bg-slate-100 text-slate-800 font-mono text-sm px-2 py-1 rounded font-bold border border-slate-200">
                          {item.qtdTotal > 0 ? item.qtdTotal : "X"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right border-r border-slate-100">
                        <div className="text-sm font-black text-blue-600">
                          {formatCurrency(item.valorTotal)}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="text-sm font-bold text-slate-400">
                          {formatCurrency(item.media)}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {producaoData.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-slate-400 bg-slate-50/50"
                      >
                        Sem dados de produção disponíveis.
                      </td>
                    </tr>
                  )}

                  {/* Linha de Totais */}
                  {producaoData.length > 0 && (
                    <tr className="bg-slate-100 border-t-2 border-slate-300">
                      <td
                        colSpan={3}
                        className="px-5 py-4 text-right font-bold text-slate-600 uppercase text-xs"
                      >
                        Total Consolidado da Produção
                      </td>
                      <td className="px-5 py-4 text-center font-black text-slate-900 font-mono text-base">
                        {producaoData.reduce(
                          (acc, curr) => acc + curr.qtdTotal,
                          0,
                        )}
                      </td>
                      <td className="px-5 py-4 text-right font-black text-blue-700 text-base">
                        {formatCurrency(
                          producaoData.reduce(
                            (acc, curr) => acc + curr.valorTotal,
                            0,
                          ),
                        )}
                      </td>
                      <td className="px-5 py-4 text-right text-slate-400">-</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: LANÇAR NOVA O.S. (Formulário Completo com Trava Governamental) */}
      {/* ========================================================================= */}
      {isNewOsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10 shrink-0">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                  <Plus size={20} />
                </div>
                Lançamento Seguro de O.S.
              </h3>
              <button
                onClick={() => setIsNewOsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSaveOS}
              className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1"
            >
              <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-xl">
                <p className="text-xs text-indigo-800 font-bold uppercase flex items-center gap-1.5 mb-4">
                  <ShieldCheck size={16} /> Vínculo Governamental Obrigatório
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      Contrato Oficial (Portal Transparência)
                    </label>
                    <select
                      required
                      value={formOs.contrato}
                      onChange={(e) =>
                        setFormOs({ ...formOs, contrato: e.target.value })
                      }
                      className="w-full p-2.5 bg-white border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                    >
                      <option value="" disabled>
                        Selecione o contrato...
                      </option>
                      {contratos.map((c: any) => {
                        const isActive =
                          c.situacao.toLowerCase().includes("ativo") ||
                          c.situacao.toLowerCase().includes("publicado");
                        return (
                          <option
                            key={c.id}
                            value={c.numero}
                            disabled={!isActive}
                          >
                            {c.numero} {isActive ? "" : "(Expirado)"} -{" "}
                            {c.unidadeGestora}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      Nota de Empenho (NE / Teto)
                    </label>
                    <select
                      required
                      value={formOs.expenseId}
                      onChange={(e) =>
                        setFormOs({ ...formOs, expenseId: e.target.value })
                      }
                      className="w-full p-2.5 bg-white border border-indigo-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                    >
                      <option value="" disabled>
                        Selecione a NE vinculada...
                      </option>
                      {empenhos.map((e: any) => (
                        <option key={e.id} value={e.id}>
                          {e.numeroDocumento} - {e.orgao}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Nº da O.S. Interna
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: 025/2026"
                    value={formOs.numeroOS}
                    onChange={(e) =>
                      setFormOs({ ...formOs, numeroOS: e.target.value })
                    }
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Unidade Executada
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: EE ADELAIDE"
                    value={formOs.unidade}
                    onChange={(e) =>
                      setFormOs({ ...formOs, unidade: e.target.value })
                    }
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Município / CDE
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: CDE 03"
                    value={formOs.municipio}
                    onChange={(e) =>
                      setFormOs({ ...formOs, municipio: e.target.value })
                    }
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Descrição do Serviço / Categoria
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Manutenção Preventiva - CAPITAL"
                    value={formOs.descricao}
                    onChange={(e) =>
                      setFormOs({ ...formOs, descricao: e.target.value })
                    }
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-5 bg-slate-50 p-5 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Quantidade
                  </label>
                  <input
                    required
                    type="number"
                    placeholder="44"
                    value={formOs.quantidade}
                    onChange={(e) =>
                      setFormOs({ ...formOs, quantidade: e.target.value })
                    }
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Custo Base (R$)
                  </label>
                  <input
                    required
                    type="number"
                    placeholder="4400"
                    value={formOs.custoTotal}
                    onChange={(e) =>
                      setFormOs({ ...formOs, custoTotal: e.target.value })
                    }
                    className="w-full p-2.5 bg-white border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none font-mono text-red-600 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Valor Faturar (R$)
                  </label>
                  <input
                    required
                    type="number"
                    placeholder="45700"
                    value={formOs.valorFinal}
                    onChange={(e) =>
                      setFormOs({ ...formOs, valorFinal: e.target.value })
                    }
                    className="w-full p-2.5 bg-white border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono text-blue-600 shadow-sm font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewOsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancelar Lançamento
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}{" "}
                  Gravar Ordem de Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: DETALHES DA O.S. (E Geração de PDF)                                */}
      {/* ========================================================================= */}
      {selectedOs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl animate-in zoom-in-95 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header do Modal */}
            <div className="flex flex-wrap gap-4 items-center justify-between p-6 border-b border-slate-100 bg-white shrink-0 z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl hidden sm:block">
                  <ClipboardList size={28} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">
                    Detalhes da O.S. {selectedOs.numeroOS}
                  </h3>
                  <p className="text-sm text-slate-500 font-medium flex items-center gap-1">
                    <Clock size={14} /> Executada em{" "}
                    {formatDateStr(selectedOs.dataExecucao)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGeneratePDF(selectedOs)}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-md"
                >
                  <Printer size={16} />{" "}
                  <span className="hidden sm:inline">Gerar Boletim PDF</span>
                  <span className="sm:hidden">PDF</span>
                </button>
                <button
                  onClick={() => setSelectedOs(null)}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Corpo do Modal Scrollável */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {/* Secção de Informações Básicas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="space-y-6">
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Building size={14} /> Unidade de Execução
                    </p>
                    <p className="text-lg font-black text-slate-800 leading-tight mb-1">
                      {selectedOs.unidade}
                    </p>
                    <p className="text-sm text-slate-600 font-medium">
                      {selectedOs.descricao || "Sem descrição específica"} •
                      Município: {selectedOs.municipio || "Não informado"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-slate-100 p-4 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <ReceiptText size={12} /> Vínculo Público
                      </p>
                      <p
                        className="text-sm font-bold text-slate-700 font-mono mt-2"
                        title="Nota de Empenho"
                      >
                        NE:{" "}
                        {selectedOs.expense?.numeroDocumento || "Indisponível"}
                      </p>
                      <p
                        className="text-xs text-slate-500 mt-1 line-clamp-1"
                        title={selectedOs.expense?.orgao}
                      >
                        {selectedOs.expense?.orgao}
                      </p>
                    </div>
                    <div className="border border-slate-100 p-4 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <ShieldCheck size={12} /> Contrato Governamental
                      </p>
                      <p className="text-sm font-bold text-indigo-700 font-mono mt-2">
                        {selectedOs.contrato || "S/N"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Competência: {selectedOs.competencia || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-full flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Estado da Operação
                      </p>
                      {getStatusBadge(selectedOs.status)}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Quantidade Produzida
                      </p>
                      <span className="text-xl font-black text-slate-800">
                        {selectedOs.quantidade} un.
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                      <span className="text-sm font-bold text-slate-500">
                        Nota Fiscal (NF):
                      </span>
                      <span className="text-sm font-black text-slate-800 font-mono bg-white px-3 py-1 rounded border border-slate-200">
                        {selectedOs.numeroNF || "Por Emitir"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-sm font-bold text-slate-500">
                        Equipa Executante:
                      </span>
                      <span className="text-sm font-bold text-slate-800 bg-white px-3 py-1 rounded border border-slate-200">
                        {selectedOs.executante || "S/N"}
                      </span>
                    </div>
                  </div>

                  {/* Ações de Estado */}
                  <div className="pt-2">
                    {selectedOs.status === "AGUARDANDO" && (
                      <button
                        onClick={() =>
                          handleStatusUpdate(selectedOs.id, "FATURADO")
                        }
                        disabled={isProcessingStatus === selectedOs.id}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-md disabled:opacity-70"
                      >
                        {isProcessingStatus === selectedOs.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <FileText size={18} />
                        )}
                        Emitir Nota Fiscal (Avançar para Faturado)
                      </button>
                    )}
                    {selectedOs.status === "FATURADO" && (
                      <div className="text-center p-3 bg-white border border-blue-100 rounded-xl">
                        <p className="text-sm font-medium text-slate-500">
                          Esta O.S. já foi faturada.
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Para liquidar o pagamento, dirija-se ao módulo de
                          "Contas a Receber".
                        </p>
                      </div>
                    )}
                    {selectedOs.status === "PAGO" && (
                      <div className="text-center p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center gap-2 text-emerald-700">
                        <CheckCircle2 size={18} />{" "}
                        <span className="text-sm font-bold">
                          Ciclo Financeiro Encerrado
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Secção de Análise Financeira (Com Gráfico Nativo Recharts) */}
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-5 flex items-center gap-2">
                <Activity size={18} className="text-blue-500" /> Análise
                Financeira e Margens
              </h4>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="lg:col-span-5 space-y-4 flex flex-col justify-center">
                  <div className="bg-white border border-slate-200 p-4 rounded-xl flex justify-between items-center shadow-sm">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Custo Operacional Base
                      </p>
                      <p className="text-xl font-black text-red-600 leading-none mt-1">
                        {formatCurrency(Number(selectedOs.custoTotal))}
                      </p>
                    </div>
                  </div>
                  <div className="bg-white border border-blue-200 p-4 rounded-xl flex justify-between items-center shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 top-0 h-full w-2 bg-blue-500"></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Valor Limpo a Faturar (Vf)
                      </p>
                      <p className="text-2xl font-black text-blue-700 leading-none mt-1">
                        {formatCurrency(Number(selectedOs.valorFinal))}
                      </p>
                    </div>
                  </div>
                  <div className="bg-emerald-600 p-4 rounded-xl flex justify-between items-center shadow-md relative overflow-hidden text-white">
                    <div className="absolute right-4 opacity-20">
                      <PieChart size={40} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider">
                        Margem de Lucro Bruto
                      </p>
                      <p className="text-2xl font-black leading-none mt-1">
                        {formatPercent(Number(selectedOs.margem))}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Gráfico Recharts - Composição do Faturamento */}
                <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 h-[240px] shadow-sm">
                  <p className="text-[10px] text-center font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Estrutura de Faturamento (R$)
                  </p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: "Composição",
                          Custo: Number(selectedOs.custoTotal),
                          Lucro:
                            Number(selectedOs.valorFinal) -
                            Number(selectedOs.custoTotal),
                        },
                      ]}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        horizontal={false}
                        stroke="#f1f5f9"
                      />
                      <XAxis
                        type="number"
                        tickFormatter={(val) => `R$ ${val / 1000}k`}
                        stroke="#94a3b8"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis dataKey="name" type="category" hide />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                        }}
                        cursor={{ fill: "transparent" }}
                      />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        iconType="circle"
                        wrapperStyle={{
                          fontSize: "12px",
                          fontWeight: "bold",
                          color: "#64748b",
                        }}
                      />
                      <Bar
                        dataKey="Custo"
                        stackId="a"
                        fill="#ef4444"
                        radius={[6, 0, 0, 6]}
                        barSize={48}
                      />
                      <Bar
                        dataKey="Lucro"
                        stackId="a"
                        fill="#10b981"
                        radius={[0, 6, 6, 0]}
                        barSize={48}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
