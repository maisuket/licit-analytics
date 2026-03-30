"use client";

import { ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import DashboardView from "./components/DashboardView";
import SkeletonDashboard from "./components/SkeletonDashboard";
import { useDashboard } from "./hooks/useDashboard";

export default function HomePage() {
  const {
    cnpj,
    ano,
    data,
    loading,
    importing,
    error,
    needsImport, // Usamos o booleano explícito agora
    handleCnpjChange,
    setAno,
    handleSearch,
    handleImport,
  } = useDashboard();

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans w-full">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="text-blue-600" />
              Monitor de Empenhos
            </h1>
            <p className="text-slate-500 text-sm">
              Inteligência Financeira com Dados Públicos
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <input
                type="text"
                placeholder="CNPJ (Ex: 00.000.000/0001-00)"
                className="bg-transparent text-slate-900 placeholder-slate-400 px-4 py-2 outline-none w-full sm:w-[180px] text-sm font-mono tracking-wide"
                value={cnpj}
                onChange={(e) => handleCnpjChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                maxLength={18} // Limita fisicamente os caracteres com a máscara
              />

              <div className="w-px bg-slate-200 my-2"></div>

              <input
                type="number"
                placeholder="Ano"
                className="bg-transparent text-slate-900 placeholder-slate-400 px-4 py-2 outline-none w-24 text-sm font-mono"
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                min="2010"
                max={new Date().getFullYear()}
              />

              <button
                onClick={handleSearch}
                disabled={loading || importing || cnpj.length < 14}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ml-1"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "Consultar"
                )}
              </button>
            </div>

            {/* Lógica segura: dependemos de um booleano de estado e não de uma string de erro */}
            {needsImport && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50 shadow-sm animate-in fade-in slide-in-from-right-4"
              >
                {importing ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : data &&
                  data.empenhos.length > 0 &&
                  data.empenhos[0].numeroEmpenho !== "S/N" ? (
                  `Sincronizar ${ano}`
                ) : (
                  `Importar ${ano}`
                )}
              </button>
            )}
          </div>
        </header>

        {error && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 ${
              error.includes("segundo plano")
                ? "bg-blue-50 border border-blue-200 text-blue-700"
                : "bg-amber-50 border border-amber-200 text-amber-800"
            }`}
          >
            <AlertCircle size={20} className="shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {loading ? (
          <SkeletonDashboard />
        ) : (
          data && <DashboardView data={data} />
        )}
      </div>
    </div>
  );
}
