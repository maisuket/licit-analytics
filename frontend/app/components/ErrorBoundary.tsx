"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Componente de fallback customizado (opcional) */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — captura erros de renderização em componentes filhos e
 * exibe uma mensagem amigável ao invés de crashar a página inteira.
 *
 * Uso:
 *   <ErrorBoundary>
 *     <ComponenteQuePodefAlhar />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Em produção, envie para um serviço de monitoramento (ex: Sentry)
    console.error("[ErrorBoundary] Erro capturado:", error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white rounded-2xl border border-red-100 shadow-sm">
          <div className="bg-red-50 p-4 rounded-full mb-4">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">
            Algo deu errado
          </h2>
          <p className="text-sm text-slate-500 max-w-sm mb-6">
            Ocorreu um erro inesperado neste módulo. Os seus dados não foram
            afetados.
          </p>
          {this.state.error && (
            <p className="text-xs font-mono text-red-400 bg-red-50 px-3 py-2 rounded-lg mb-6 max-w-sm break-all">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-md"
          >
            <RefreshCw size={16} />
            Tentar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
