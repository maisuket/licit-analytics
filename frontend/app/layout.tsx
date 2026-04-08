import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "./components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Monitor de Empenhos | Portal da Transparência",
  description:
    "Sistema de análise e inteligência financeira com dados públicos governamentais. Acompanhe empenhos, liquidações e pagamentos por CNPJ.",
  keywords: [
    "empenhos",
    "transparência",
    "gastos públicos",
    "cnpj",
    "análise financeira",
  ],
  authors: [{ name: "Especialista Sênior em Backend/Frontend" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-blue-200 selection:text-blue-900">
        <ErrorBoundary>
          <main className="flex-grow">{children}</main>
        </ErrorBoundary>
      </body>
    </html>
  );
}
