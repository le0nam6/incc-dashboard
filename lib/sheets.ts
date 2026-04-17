import Papa from "papaparse";
import type { DashboardData, DailyData, Goals } from "@/types";

const SHEET_ID = process.env.SHEET_ID ?? "1dgdEX42o_9g2kMrRckshPVcyGUpHLdSj";
const SHEET_GID = process.env.SHEET_GID ?? "1365902017";

// Default goals — override via env vars or a "Metas" row in the sheet
const DEFAULT_GOALS: Goals = {
  mba_fat: 177000,
  base_fat: 70000,
  inv_fat: 50000,
  mba_vendas: 20,
  base_vendas: 24,
  inv_vendas: 32,
  mba_mqls: 286,
  base_mqls: 343,
  inv_mqls: 458,
  mba_abord_dia: 41,
  base_abord_dia: 49,
  inv_abord_dia: 66,
  mba_vendas_dia: 2.9,
  base_vendas_dia: 3.4,
  inv_vendas_dia: 4.6,
};

function num(v: unknown): number {
  const n = parseFloat(String(v ?? "0").replace(/[^\d.,-]/g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

/**
 * Fetches and parses the Google Sheet CSV.
 *
 * Expected sheet columns (Row 1 = header):
 * A: Data        — "30/03" or "Seg 30/3"
 * B: Dia         — "Segunda" / "Terça" etc.
 * C: MBA_Abord
 * D: Base_Abord
 * E: Inv_Abord
 * F: MBA_Vendas
 * G: Base_Vendas
 * H: Inv_Vendas
 * I: MBA_Fat
 * J: Base_Fat
 * K: Inv_Fat
 * L: MQLs
 *
 * Optional row at the very bottom where A = "META":
 * Same columns but containing the weekly goals (overrides defaults).
 *
 * Optional row where A = "CONFIG":
 * B: semana label (e.g. "16 mar 2026")
 * C: número do lançamento (e.g. "1")
 * D: status ("Em andamento" | "Finalizada" | "Não iniciada")
 */
export async function fetchDashboardData(): Promise<DashboardData> {
  const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;

  let raw: string;
  try {
    const res = await fetch(csvUrl, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    raw = await res.text();
  } catch (err) {
    console.error("[sheets] fetch failed:", err);
    return getFallbackData();
  }

  const { data: rows } = Papa.parse<string[]>(raw, { skipEmptyLines: true });

  // Skip header row (index 0)
  const dataRows = rows.slice(1);

  let semana = "—";
  let lancamento = 1;
  let status: DashboardData["status"] = "Em andamento";
  const goals: Goals = { ...DEFAULT_GOALS };
  const daily: DailyData[] = [];

  for (const row of dataRows) {
    const marker = String(row[0] ?? "").trim().toUpperCase();

    if (marker === "CONFIG") {
      semana = String(row[1] ?? semana).trim();
      lancamento = num(row[2]) || lancamento;
      const s = String(row[3] ?? "").trim();
      if (s === "Finalizada" || s === "Não iniciada") {
        status = s as DashboardData["status"];
      } else if (s === "Em andamento") {
        status = "Em andamento";
      }
      continue;
    }

    if (marker === "META") {
      goals.mba_fat = num(row[8]) || goals.mba_fat;
      goals.base_fat = num(row[9]) || goals.base_fat;
      goals.inv_fat = num(row[10]) || goals.inv_fat;
      goals.mba_vendas = num(row[5]) || goals.mba_vendas;
      goals.base_vendas = num(row[6]) || goals.base_vendas;
      goals.inv_vendas = num(row[7]) || goals.inv_vendas;
      goals.mba_mqls = num(row[2]) || goals.mba_mqls;
      goals.base_mqls = num(row[3]) || goals.base_mqls;
      goals.inv_mqls = num(row[4]) || goals.inv_mqls;
      continue;
    }

    // Normal data row
    const rawDate = String(row[0] ?? "").trim();
    const dia = String(row[1] ?? "").trim();
    if (!rawDate) continue;

    // Build friendly label: "Seg 30/3"
    const diaAbbr: Record<string, string> = {
      segunda: "Seg",
      terça: "Ter",
      terca: "Ter",
      quarta: "Qua",
      quinta: "Qui",
      sexta: "Sex",
      sábado: "Sáb",
      sabado: "Sáb",
      domingo: "Dom",
    };
    const abbr = diaAbbr[dia.toLowerCase()] ?? dia.slice(0, 3);
    const label = `${abbr} ${rawDate}`;

    daily.push({
      date: label,
      mba_abord: num(row[2]),
      base_abord: num(row[3]),
      inv_abord: num(row[4]),
      mba_vendas: num(row[5]),
      base_vendas: num(row[6]),
      inv_vendas: num(row[7]),
      mba_fat: num(row[8]),
      base_fat: num(row[9]),
      inv_fat: num(row[10]),
      mqls: num(row[11]),
    });
  }

  // Derive goals per day from weekly totals (7 working days)
  const workingDays = 7;
  goals.mba_abord_dia = parseFloat(((goals.mba_mqls) / workingDays).toFixed(1));
  goals.base_abord_dia = parseFloat(((goals.base_mqls) / workingDays).toFixed(1));
  goals.inv_abord_dia = parseFloat(((goals.inv_mqls) / workingDays).toFixed(1));
  goals.mba_vendas_dia = parseFloat((goals.mba_vendas / workingDays).toFixed(1));
  goals.base_vendas_dia = parseFloat((goals.base_vendas / workingDays).toFixed(1));
  goals.inv_vendas_dia = parseFloat((goals.inv_vendas / workingDays).toFixed(1));

  const lastUpdated = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  return { semana, lancamento, daily, goals, status, lastUpdated };
}

// Fallback with sample data (shown when the sheet is unreachable)
function getFallbackData(): DashboardData {
  return {
    semana: "Sem conexão",
    lancamento: 1,
    status: "Em andamento",
    lastUpdated: new Date().toLocaleString("pt-BR"),
    goals: DEFAULT_GOALS,
    daily: [
      { date: "Seg 30/3", mba_abord: 19, base_abord: 11, inv_abord: 8, mba_vendas: 1, base_vendas: 0, inv_vendas: 0, mba_fat: 0, base_fat: 0, inv_fat: 0, mqls: 0 },
      { date: "Ter 31/3", mba_abord: 33, base_abord: 20, inv_abord: 12, mba_vendas: 0, base_vendas: 0, inv_vendas: 0, mba_fat: 0, base_fat: 0, inv_fat: 0, mqls: 0 },
      { date: "Qua 1/4",  mba_abord: 15, base_abord: 5,  inv_abord: 10, mba_vendas: 0, base_vendas: 0, inv_vendas: 0, mba_fat: 0, base_fat: 0, inv_fat: 0, mqls: 0 },
      { date: "Qui 2/4",  mba_abord: 28, base_abord: 16, inv_abord: 11, mba_vendas: 0, base_vendas: 1, inv_vendas: 0, mba_fat: 0, base_fat: 0, inv_fat: 0, mqls: 0 },
    ],
  };
}
