/**
 * Parser para a planilha INCC_Metas_v5
 *
 * Layout da aba "Acompanhamento" (GID 1365902017):
 *
 * R1-R2   Título / descrição
 * R5      Config: "Semana de referência:" | B=data | D="Nº do lançamento:" | E=número
 * R8      Header metas:  "" | "MBA" | "Base" | "Inventário"
 * R9-R13  Metas: fat, vendas, MQLs, abord/dia, vendas/dia  (cols B, C, D)
 * R16     Header SDR: "Indicador" | datas...
 * R17     "MQLs abordados" — total em col J (índice 9)
 * R25     Header vendedora: "Indicador / Produto" | datas em cols B-E (variável)
 * R26     ▸ Abordagens (seção)
 * R27-29  MBA / Base / Inventário abordagens (cols = datas)
 * R31     ▸ Vendas (seção)
 * R32-34  MBA / Base / Inventário vendas
 * R36     ▸ Faturamento (R$) (seção)
 * R37-39  MBA / Base / Inventário faturamento
 */

import Papa from "papaparse";
import type { DashboardData, DailyData, Goals } from "@/types";

const SHEET_ID = process.env.SHEET_ID ?? "1dgdEX42o_9g2kMrRckshPVcyGUpHLdSj";
const SHEET_GID = process.env.SHEET_GID ?? "1365902017";

// ─── Número brasileiro ────────────────────────────────────────────────────────
// R$ 177.000 → 177000 | "2,9" → 2.9 | "1.087" → 1087 | "-" → 0
function num(v: unknown): number {
  const s = String(v ?? "")
    .trim()
    .replace(/^R\$\s*/, "")
    .replace(/\s/g, "");
  if (!s || s === "-") return 0;

  if (s.includes(",")) {
    // "177.000,50" → 177000.50   |   "2,9" → 2.9
    return parseFloat(s.replace(/\./g, "").replace(",", ".")) || 0;
  }
  // "177.000" or "1.087" (thousands separator, no decimal)
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    return parseFloat(s.replace(/\./g, "")) || 0;
  }
  return parseFloat(s) || 0;
}

// "30/03/30" or "31/03/26" → "30/03" / "31/03"
function fmtDate(raw: string): string {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})/);
  return m
    ? `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}`
    : raw.trim().slice(0, 5);
}

// ─── Main fetch ───────────────────────────────────────────────────────────────
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

  const { data: rows } = Papa.parse<string[]>(raw, { skipEmptyLines: false });

  // Helpers
  const findIdx = (kw: string, from = 0) =>
    rows.findIndex(
      (r, i) => i >= from && r[0]?.trim().toLowerCase().includes(kw.toLowerCase())
    );
  const getRow = (kw: string, from = 0) => rows[findIdx(kw, from)] ?? [];

  // ─── CONFIG ─────────────────────────────────────────────────────────────
  const configRow = getRow("Semana de referência:");
  let semana = configRow[1]?.trim() ?? "—";
  // Normalise "2026-03-16 00:00:00" → "16/03/2026"
  const dtMatch = semana.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dtMatch) semana = `${dtMatch[3]}/${dtMatch[2]}/${dtMatch[1]}`;
  const lancamento = num(configRow[4]) || 1;

  // ─── GOALS ──────────────────────────────────────────────────────────────
  const fatGRow   = getRow("Meta fat. semana");
  const vndGRow   = getRow("Meta vendas semana");
  const mqlGRow   = getRow("Meta MQLs semana");
  const abdDiaRow = getRow("Meta abordagens/dia");
  const vndDiaRow = getRow("Meta vendas/dia");

  const goals: Goals = {
    mba_fat:         num(fatGRow[1]),
    base_fat:        num(fatGRow[2]),
    inv_fat:         num(fatGRow[3]),
    mba_vendas:      num(vndGRow[1]),
    base_vendas:     num(vndGRow[2]),
    inv_vendas:      num(vndGRow[3]),
    mba_mqls:        num(mqlGRow[1]),
    base_mqls:       num(mqlGRow[2]),
    inv_mqls:        num(mqlGRow[3]),
    mba_abord_dia:   num(abdDiaRow[1]),
    base_abord_dia:  num(abdDiaRow[2]),
    inv_abord_dia:   num(abdDiaRow[3]),
    mba_vendas_dia:  num(vndDiaRow[1]),
    base_vendas_dia: num(vndDiaRow[2]),
    inv_vendas_dia:  num(vndDiaRow[3]),
  };

  // ─── MQLs Henrique — total (col J = índice 9) ───────────────────────────
  const mqlsHRow = getRow("MQLs abordados");
  const totalMqls = num(mqlsHRow[9]);

  // ─── VENDEDORA — datas do cabeçalho ─────────────────────────────────────
  const vendHdrIdx = findIdx("Indicador / Produto");
  const vendHdr    = rows[vendHdrIdx] ?? [];

  const dates: string[] = [];
  for (let c = 1; c < vendHdr.length; c++) {
    const v = vendHdr[c]?.trim();
    if (!v) break; // empty cell = end of date columns
    const lv = v.toLowerCase();
    if (lv.includes("total") || lv.includes("meta") || lv.includes("%")) break;
    dates.push(fmtDate(v));
  }

  // ─── Product rows by section ─────────────────────────────────────────────
  const abordIdx = findIdx("▸ Abordagens", vendHdrIdx);
  const vendsIdx = findIdx("▸ Vendas",     vendHdrIdx);
  const fatIdx   = findIdx("▸ Faturamento", vendHdrIdx);

  function getProductRow(secIdx: number, product: string): string[] {
    if (secIdx < 0) return [];
    const prod = product.toLowerCase().trim();
    for (let i = secIdx + 1; i < secIdx + 7 && i < rows.length; i++) {
      const label = rows[i][0]?.trim().toLowerCase();
      if (!label) continue;
      if (label.startsWith("▸") || label.startsWith("total")) continue;
      // exact match OR accent-tolerant prefix match (inv → inventário / inventario)
      if (
        label === prod ||
        (prod.length >= 3 && label.startsWith(prod.slice(0, 3)))
      ) {
        return rows[i];
      }
    }
    return [];
  }

  const mbaAbordRow  = getProductRow(abordIdx, "mba");
  const baseAbordRow = getProductRow(abordIdx, "base");
  const invAbordRow  = getProductRow(abordIdx, "inv");

  const mbaVendRow  = getProductRow(vendsIdx, "mba");
  const baseVendRow = getProductRow(vendsIdx, "base");
  const invVendRow  = getProductRow(vendsIdx, "inv");

  const mbaFatRow   = getProductRow(fatIdx, "mba");
  const baseFatRow  = getProductRow(fatIdx, "base");
  const invFatRow   = getProductRow(fatIdx, "inv");

  // ─── Build daily array ────────────────────────────────────────────────────
  const daily: DailyData[] = dates.map((date, i) => {
    const c = i + 1;
    return {
      date,
      mba_abord:   num(mbaAbordRow[c]),
      base_abord:  num(baseAbordRow[c]),
      inv_abord:   num(invAbordRow[c]),
      mba_vendas:  num(mbaVendRow[c]),
      base_vendas: num(baseVendRow[c]),
      inv_vendas:  num(invVendRow[c]),
      mba_fat:     num(mbaFatRow[c]),
      base_fat:    num(baseFatRow[c]),
      inv_fat:     num(invFatRow[c]),
      mqls: 0, // MQLs Henrique têm escopo semanal diferente — usar totalMqls
    };
  });

  const hasActivity = daily.some(
    (d) => d.mba_abord + d.base_abord + d.inv_abord > 0
  );
  const status: DashboardData["status"] = hasActivity
    ? "Em andamento"
    : "Não iniciada";

  const lastUpdated = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });

  return { semana, lancamento, daily, goals, totalMqls, status, lastUpdated };
}

// ─── Fallback (planilha inacessível) ─────────────────────────────────────────
function getFallbackData(): DashboardData {
  return {
    semana: "Sem conexão",
    lancamento: 1,
    totalMqls: 0,
    status: "Não iniciada",
    lastUpdated: new Date().toLocaleString("pt-BR"),
    goals: {
      mba_fat: 177000, base_fat: 70000, inv_fat: 50000,
      mba_vendas: 20,  base_vendas: 24, inv_vendas: 32,
      mba_mqls: 286,   base_mqls: 343,  inv_mqls: 458,
      mba_abord_dia: 41, base_abord_dia: 49, inv_abord_dia: 66,
      mba_vendas_dia: 2.9, base_vendas_dia: 3.4, inv_vendas_dia: 4.6,
    },
    daily: [
      { date: "30/03", mba_abord: 19, base_abord: 11, inv_abord: 8,  mba_vendas: 1, base_vendas: 0, inv_vendas: 0, mba_fat: 0, base_fat: 0, inv_fat: 0, mqls: 0 },
      { date: "31/03", mba_abord: 33, base_abord: 20, inv_abord: 12, mba_vendas: 0, base_vendas: 0, inv_vendas: 0, mba_fat: 0, base_fat: 0, inv_fat: 0, mqls: 0 },
      { date: "01/04", mba_abord: 15, base_abord: 5,  inv_abord: 10, mba_vendas: 0, base_vendas: 0, inv_vendas: 0, mba_fat: 0, base_fat: 0, inv_fat: 0, mqls: 0 },
      { date: "02/04", mba_abord: 28, base_abord: 16, inv_abord: 11, mba_vendas: 0, base_vendas: 1, inv_vendas: 0, mba_fat: 0, base_fat: 0, inv_fat: 0, mqls: 0 },
    ],
  };
}
