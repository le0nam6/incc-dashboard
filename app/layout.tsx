import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "INCC — Painel de Acompanhamento",
  description: "Dashboard de monitoramento semanal de vendas, abordagens e faturamento.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
