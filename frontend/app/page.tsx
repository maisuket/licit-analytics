"use client";

import { useCallback, useEffect, useState } from "react";
import { ErpContract, ErpExpense, ErpServiceOrder } from "./types/dashboard";
import { ApiService } from "./services/api";
import Sidebar from "./components/Sidebar";
import { Loader2, LogOut } from "lucide-react";
import { BIDashboard } from "./components/BIDashboard";
import OperationControl from "./components/OperationControl";
import { GovDashboard } from "./components/GovDashboard";
import { FinancialDashboard } from "./components/FinancialDashboard";
import { ContractTimeline } from "./components/ContractTimeline";
import { ErrorBoundary } from "./components/ErrorBoundary";
import LoginPage from "./components/LoginPage";

interface AuthUser {
  name: string;
  email: string;
  role: string;
}

export default function App() {
  const [activeMenu, setActiveMenu] = useState<
    "operations" | "bi" | "gov" | "financial" | "timeline"
  >("operations");
  const [cnpj] = useState("23008295000148");

  // Autenticação
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [empenhos, setEmpenhos] = useState<ErpExpense[]>([]);
  const [ordens, setOrdens] = useState<ErpServiceOrder[]>([]);
  const [contratos, setContratos] = useState<ErpContract[]>([]);
  const [loadingErp, setLoadingErp] = useState(false);

  // Verifica se já existe um token válido no localStorage ao montar
  useEffect(() => {
    if (ApiService.isAuthenticated()) {
      // Marca como "provavelmente autenticado"; o primeiro getErpData confirma
      setAuthUser({ name: "Usuário", email: "", role: "OPERATOR" });
    }
    setAuthChecked(true);
  }, []);

  const handleLogin = (user: AuthUser) => {
    setAuthUser(user);
  };

  const handleLogout = () => {
    ApiService.clearToken();
    setAuthUser(null);
    setEmpenhos([]);
    setOrdens([]);
    setContratos([]);
  };

  // useCallback garante referência estável — useEffect não re-executa desnecessariamente
  const loadErpData = useCallback(async () => {
    setLoadingErp(true);
    try {
      const data = await ApiService.getErpData(cnpj);
      setEmpenhos(data.empenhos);
      setOrdens(data.ordens);
      setContratos(data.contratos);
    } catch (err) {
      // Token expirado em sessão ativa: desloga automaticamente
      if (err instanceof Error && err.message === "UNAUTHENTICATED") {
        handleLogout();
      }
    } finally {
      setLoadingErp(false);
    }
  }, [cnpj]);

  // Dependência explícita — resolve o warning do eslint-plugin-react-hooks
  useEffect(() => {
    if (authUser) {
      void loadErpData();
    }
  }, [authUser, loadErpData]);

  // Aguarda verificação do token para evitar flash da tela de login
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (!authUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans w-full">
      <Sidebar activeMenu={activeMenu} setActiveMenu={setActiveMenu} />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Barra superior com info do usuário e logout */}
        <header className="bg-white border-b border-slate-200 px-6 py-2.5 flex items-center justify-end gap-3 shrink-0">
          <span className="text-sm text-slate-500 font-medium">
            {authUser.name || authUser.email}
          </span>
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200 uppercase font-bold">
            {authUser.role}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-500 transition-colors ml-2"
            title="Sair"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </header>

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
