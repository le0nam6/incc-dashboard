export interface DailyData {
  date: string;       // e.g. "Seg 30/3"
  mba_abord: number;
  base_abord: number;
  inv_abord: number;
  mba_vendas: number;
  base_vendas: number;
  inv_vendas: number;
  mba_fat: number;
  base_fat: number;
  inv_fat: number;
  mqls: number;
}

export interface Goals {
  // Faturamento
  mba_fat: number;
  base_fat: number;
  inv_fat: number;
  // Vendas
  mba_vendas: number;
  base_vendas: number;
  inv_vendas: number;
  // MQLs / Abordagens semana
  mba_mqls: number;
  base_mqls: number;
  inv_mqls: number;
  // Abordagens por dia
  mba_abord_dia: number;
  base_abord_dia: number;
  inv_abord_dia: number;
  // Vendas por dia
  mba_vendas_dia: number;
  base_vendas_dia: number;
  inv_vendas_dia: number;
}

export interface DashboardData {
  semana: string;       // "16/03/2026"
  lancamento: number;
  daily: DailyData[];
  goals: Goals;
  totalMqls: number;    // MQLs totais — IA Henrique (seção separada na planilha)
  status: "Em andamento" | "Finalizada" | "Não iniciada";
  lastUpdated: string;
}
