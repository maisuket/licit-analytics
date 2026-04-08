"use client";

import { useCallback, useEffect, useState } from "react";
import { ErpContract, ErpExpense, ErpServiceOrder } from "./types/dashboard";
import { ApiService } from "./services/api";
import Sidebar from "./components/Sidebar";
import { Loader2 } from "lucide-react";
import { BIDashboard } from "./components/BIDashboard";
import OperationControl from "./components/OperationControl";
import { GovDashboard } from "./components/GovDashboard";
import { FinancialDashboard } from "./components/FinancialDashboard";
import { ContractTimeline } from "./components/ContractTimeline";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  const [activeMenu, setActiveMenu] = useState<
    "operations" | "bi" | "gov" | "financial" | "timeline"
  >("operations");
  const [cnpj] = useState("23008295000148");

  const [empenhos, setEmpenhos] = useState<ErpExpense[]>([]);
  const [ordens, setOrdens] = useState<ErpServiceOrder[]>([]);
  const [contratos, setContratos] = useState<ErpContract[]>([]);
  const [loadingErp, setLoadingErp] = useState(false);

  // useCallback garante referência estável — useEffect não re-executa desnecessariamente
  const loadErpData = useCallback(async () => {
    setLoadingErp(true);
    try {
      const data = await ApiService.getErpData(cnpj);
      setEmpenhos(data.empenhos);
      setOrdens(data.ordens);
      setContratos(data.contratos);
    } finally {
      setLoadingErp(false);
    }
  }, [cnpj]);

  // Dependência explícita — resolve o warning do eslint-plugin-react-hooks
  useEffect(() => {
    void loadErpData();
  }, [loadErpData]);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans w-full">
      <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {activeMenu === "operations" && (
              <ErrorBoundary>
                <div>
                  <header className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">
                      Módulo Operacional (ERP)
                    </h2>
                    <p className="text-slate-500 text-sm">
                      Integração com a API Governamental e Gestão de O.S.
                    </p>
                  </header>
                  <OperationControl
                    cnpjContext={cnpj}
                    empenhos={empenhos}
                    ordens={ordens}
                    contratos={contratos}
                    loading={loadingErp}
                    loadErpData={loadErpData}
                  />
                </div>
              </ErrorBoundary>
            )}

            {activeMenu === "bi" && (
              <ErrorBoundary>
                <div>
                  <header className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">
                      Dashboard Analítico (BI)
                    </h2>
                    <p className="text-slate-500 text-sm">
                      Visão gerencial de rentabilidade, consumos de teto e
                      margens operacionais.
                    </p>
                  </header>
                  {loadingErp ? (
                    <div className="flex justify-center p-12 text-slate-400">
                      <Loader2 className="animate-spin" size={32} />
                    </div>
                  ) : (
                    <BIDashboard empenhos={empenhos} ordens={ordens} />
                  )}
                </div>
              </ErrorBoundary>
            )}

            {activeMenu === "gov" && (
              <ErrorBoundary>
                <div>
                  <header className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">
                      Módulo Inteligência Gov
                    </h2>
                    <p className="text-slate-500 text-sm">
                      Auditoria pública e radar de concorrentes via Portal da
                      Transparência.
                    </p>
                  </header>
                  <GovDashboard />
                </div>
              </ErrorBoundary>
            )}

            {activeMenu === "financial" && (
              <ErrorBoundary>
                <div>
                  <header className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">
                      Fluxo de Caixa: Contas a Receber
                    </h2>
                    <p className="text-slate-500 text-sm">
                      Gestão de Notas Fiscais emitidas, previsões mensais e
                      recebimentos.
                    </p>
                  </header>
                  <FinancialDashboard ordens={ordens} loadErpData={loadErpData} />
                </div>
              </ErrorBoundary>
            )}

            {activeMenu === "timeline" && (
              <ErrorBoundary>
                <div>
                  <header className="mb-6">
                    <h2 className="text-2xl font-bold text-slate-900">
                      Timeline de Contratos
                    </h2>
                    <p className="text-slate-500 text-sm">
                      Ciclo completo por CNPJ: contratos → empenhos → liquidações
                      → pagamentos, via Portal da Transparência.
                    </p>
                  </header>
                  <ContractTimeline />
                </div>
              </ErrorBoundary>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
