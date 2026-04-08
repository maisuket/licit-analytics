import {
  ShieldCheck,
  ClipboardList,
  LayoutDashboard,
  PieChart,
  Landmark,
  GitBranch,
} from "lucide-react";

type ActiveMenu = "gov" | "operations" | "bi" | "financial" | "timeline";

export default function Sidebar({
  activeMenu,
  setActiveMenu,
}: {
  activeMenu: ActiveMenu;
  setActiveMenu: (m: ActiveMenu) => void;
}) {
  return (
    <aside className="w-64 bg-slate-900 text-slate-300 min-h-screen flex flex-col transition-all duration-300 shadow-2xl z-10">
      <div className="h-20 flex items-center px-6 border-b border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-3 text-white">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-900/50">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-wide leading-tight">
              LicitAnalytics
            </h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
              ERP & Inteligência
            </p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-4 py-8 space-y-2">
        <p className="px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4">
          Módulos
        </p>

        <button
          onClick={() => setActiveMenu("bi")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeMenu === "bi" ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" : "hover:bg-slate-800 hover:text-white"}`}
        >
          <PieChart size={18} />
          <span className="font-medium text-sm">Dashboard BI</span>
        </button>

        <button
          onClick={() => setActiveMenu("operations")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeMenu === "operations" ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" : "hover:bg-slate-800 hover:text-white"}`}
        >
          <ClipboardList size={18} />
          <span className="font-medium text-sm">Operação Interna</span>
        </button>

        <button
          onClick={() => setActiveMenu("gov")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeMenu === "gov" ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" : "hover:bg-slate-800 hover:text-white"}`}
        >
          <LayoutDashboard size={18} />
          <span className="font-medium text-sm">Inteligência Gov</span>
        </button>

        <button
          onClick={() => setActiveMenu("financial")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeMenu === "financial" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/50" : "hover:bg-slate-800 hover:text-white"}`}
        >
          <Landmark size={18} />
          <span className="font-medium text-sm">Contas a Receber</span>
        </button>

        <button
          onClick={() => setActiveMenu("timeline")}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeMenu === "timeline" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50" : "hover:bg-slate-800 hover:text-white"}`}
        >
          <GitBranch size={18} />
          <span className="font-medium text-sm">Timeline de Contratos</span>
        </button>
      </nav>
    </aside>
  );
}
