"use client";

import { useState, useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import type { DashboardData } from "@/types";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("pt-BR");
}

function fmtBRL(n: number) {
  return "R$ " + n.toLocaleString("pt-BR");
}

function pct(val: number, meta: number) {
  if (meta === 0) return 0;
  return Math.min(100, Math.round((val / meta) * 1000) / 10);
}

function pctStr(val: number, meta: number) {
  const p = pct(val, meta);
  return p % 1 === 0 ? `${p}%` : `${p.toFixed(1).replace(".", ",")}%`;
}

// ─── sub-components ───────────────────────────────────────────────────────────

function Badge({ children, variant }: { children: React.ReactNode; variant: "blue" | "amber" | "green" | "red" | "purple" }) {
  const cls = {
    blue:   "bg-blue-50 text-blue-900",
    amber:  "bg-amber-50 text-amber-900",
    green:  "bg-green-50 text-green-900",
    red:    "bg-red-50 text-red-900",
    purple: "bg-purple-50 text-purple-900",
  }[variant];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md font-medium ${cls}`}>
      {children}
    </span>
  );
}

function MetricCard({
  label,
  value,
  meta,
  metaLabel,
  color,
}: {
  label: string;
  value: string | number;
  meta: string;
  metaLabel: string;
  color: "blue" | "green" | "amber" | "purple";
}) {
  const barColor = { blue: "#378ADD", green: "#1D9E75", amber: "#BA7517", purple: "#7F77DD" }[color];
  const textColor = { blue: "text-blue-800", green: "text-green-800", amber: "text-amber-600", purple: "text-purple-900" }[color];
  const rawVal = typeof value === "string" ? parseFloat(value.replace(/[^\d.]/g, "")) : value;
  const rawMeta = parseFloat(meta.replace(/[^\d.]/g, ""));
  const p = pct(rawVal, rawMeta);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-sm">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-xl font-semibold text-gray-900 leading-tight">{typeof value === "number" ? fmt(value) : value}</div>
      <div className="text-xs text-gray-400 mt-0.5">Meta: {meta}</div>
      <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden border border-gray-200">
        <div className="progress-bar h-full rounded-full" style={{ width: `${p}%`, background: barColor }} />
      </div>
      <div className={`text-xs font-medium mt-1 ${textColor}`}>{pctStr(rawVal, rawMeta)} atingido</div>
    </div>
  );
}

interface MiniRowProps {
  label: string;
  val: number;
  meta: number;
  color: string;
  badgeVariant: "blue" | "green" | "amber" | "purple";
}

function MiniRow({ label, val, meta, color, badgeVariant }: MiniRowProps) {
  const p = pct(val, meta);
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-100 last:border-0 text-sm">
      <span className="text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full progress-bar" style={{ width: `${p}%`, background: color }} />
        </div>
        <span className="font-medium text-gray-900 text-xs min-w-[60px]">
          {fmt(val)} <span className="font-normal text-gray-400">/ {fmt(meta)}</span>
        </span>
        <Badge variant={badgeVariant}>{pctStr(val, meta)}</Badge>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function Dashboard({ data }: { data: DashboardData }) {
  const { daily, goals, semana, lancamento, status, lastUpdated, totalMqls } = data;

  // Totals
  const totalAbord = daily.reduce((s, d) => s + d.mba_abord + d.base_abord + d.inv_abord, 0);
  const mbaAbord   = daily.reduce((s, d) => s + d.mba_abord, 0);
  const baseAbord  = daily.reduce((s, d) => s + d.base_abord, 0);
  const invAbord   = daily.reduce((s, d) => s + d.inv_abord, 0);

  const totalVendas = daily.reduce((s, d) => s + d.mba_vendas + d.base_vendas + d.inv_vendas, 0);
  const mbaVendas  = daily.reduce((s, d) => s + d.mba_vendas, 0);
  const baseVendas = daily.reduce((s, d) => s + d.base_vendas, 0);
  const invVendas  = daily.reduce((s, d) => s + d.inv_vendas, 0);

  const totalFat = daily.reduce((s, d) => s + d.mba_fat + d.base_fat + d.inv_fat, 0);

  const metaTotalAbord = goals.mba_mqls + goals.base_mqls + goals.inv_mqls;
  const metaTotalVendas = goals.mba_vendas + goals.base_vendas + goals.inv_vendas;
  const metaTotalFat = goals.mba_fat + goals.base_fat + goals.inv_fat;

  // Chart state
  const [chartType, setChartType] = useState<"abordagens" | "vendas">("abordagens");
  const labels = daily.map((d) => d.date);

  const chartData = {
    labels,
    datasets:
      chartType === "abordagens"
        ? [
            { label: "MBA",        data: daily.map((d) => d.mba_abord),  backgroundColor: "#378ADD", borderRadius: 4 },
            { label: "Base",       data: daily.map((d) => d.base_abord), backgroundColor: "#1D9E75", borderRadius: 4 },
            { label: "Inventário", data: daily.map((d) => d.inv_abord),  backgroundColor: "#BA7517", borderRadius: 4 },
          ]
        : [
            { label: "MBA",        data: daily.map((d) => d.mba_vendas),  backgroundColor: "#378ADD", borderRadius: 4 },
            { label: "Base",       data: daily.map((d) => d.base_vendas), backgroundColor: "#1D9E75", borderRadius: 4 },
            { label: "Inventário", data: daily.map((d) => d.inv_vendas),  backgroundColor: "#BA7517", borderRadius: 4 },
          ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: "index" as const, intersect: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 12 } } },
      y: { grid: { color: "rgba(0,0,0,0.05)" }, ticks: { font: { size: 12 } } },
    },
  };

  const statusVariant: Record<string, "blue" | "amber" | "green" | "red"> = {
    "Em andamento": "amber",
    Finalizada: "green",
    "Não iniciada": "red",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="pb-3 border-b border-gray-200">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-lg font-medium text-gray-900">INCC — Painel de Acompanhamento</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Semana de referência: {semana} &nbsp;·&nbsp; Lançamento nº {lancamento}
            </p>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <Badge variant="blue">Semana atual</Badge>
            <Badge variant={statusVariant[status] ?? "amber"}>{status}</Badge>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">Atualizado: {lastUpdated} &nbsp;·&nbsp; <span className="text-blue-600">dados da planilha</span></p>
      </div>

      {/* Summary metrics */}
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Resumo da semana</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <MetricCard label="Faturamento total"    value={fmtBRL(totalFat)}   meta={fmtBRL(metaTotalFat)}   metaLabel="meta fat"    color="blue"   />
          <MetricCard label="Total de vendas"      value={totalVendas}         meta={fmt(metaTotalVendas)}    metaLabel="meta vendas" color="blue"   />
          <MetricCard label="Abordagens vendedora" value={totalAbord}          meta={fmt(metaTotalAbord)}     metaLabel="meta abord"  color="green"  />
          <MetricCard label="MQLs — Henrique"      value={totalMqls}           meta={fmt(metaTotalAbord)}     metaLabel="meta mqls"   color="amber"  />
        </div>
      </div>

      {/* Abordagens + Vendas por produto */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Abordagens por produto</h3>
          <MiniRow label="MBA"        val={mbaAbord}  meta={goals.mba_mqls}  color="#378ADD" badgeVariant="blue"   />
          <MiniRow label="Base"       val={baseAbord} meta={goals.base_mqls} color="#1D9E75" badgeVariant="green"  />
          <MiniRow label="Inventário" val={invAbord}  meta={goals.inv_mqls}  color="#BA7517" badgeVariant="amber"  />
          <div className="flex justify-between items-center pt-2 text-sm">
            <span className="font-medium text-gray-900">Total</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full progress-bar" style={{ width: `${pct(totalAbord, metaTotalAbord)}%`, background: "#7F77DD" }} />
              </div>
              <span className="font-medium text-xs text-gray-900">
                {fmt(totalAbord)} <span className="font-normal text-gray-400">/ {fmt(metaTotalAbord)}</span>
              </span>
              <Badge variant="purple">{pctStr(totalAbord, metaTotalAbord)}</Badge>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Vendas por produto</h3>
          <MiniRow label="MBA"        val={mbaVendas}  meta={goals.mba_vendas}  color="#378ADD" badgeVariant="blue"   />
          <MiniRow label="Base"       val={baseVendas} meta={goals.base_vendas} color="#1D9E75" badgeVariant="green"  />
          <MiniRow label="Inventário" val={invVendas}  meta={goals.inv_vendas}  color="#BA7517" badgeVariant="amber"  />
          <div className="flex justify-between items-center pt-2 text-sm">
            <span className="font-medium text-gray-900">Total</span>
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full progress-bar" style={{ width: `${pct(totalVendas, metaTotalVendas)}%`, background: "#7F77DD" }} />
              </div>
              <span className="font-medium text-xs text-gray-900">
                {fmt(totalVendas)} <span className="font-normal text-gray-400">/ {fmt(metaTotalVendas)}</span>
              </span>
              <Badge variant="purple">{pctStr(totalVendas, metaTotalVendas)}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Goals table */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Metas da semana por produto</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 px-2 font-medium text-gray-400">Indicador</th>
                <th className="text-center py-2 px-2 font-medium text-blue-800">MBA</th>
                <th className="text-center py-2 px-2 font-medium text-green-800">Base</th>
                <th className="text-center py-2 px-2 font-medium text-amber-600">Inventário</th>
                <th className="text-center py-2 px-2 font-medium text-purple-900">Total</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: "Meta fat. semana (R$)",
                  mba: fmtBRL(goals.mba_fat),
                  base: fmtBRL(goals.base_fat),
                  inv: fmtBRL(goals.inv_fat),
                  total: fmtBRL(metaTotalFat),
                },
                {
                  label: "Meta vendas semana",
                  mba: fmt(goals.mba_vendas),
                  base: fmt(goals.base_vendas),
                  inv: fmt(goals.inv_vendas),
                  total: fmt(metaTotalVendas),
                },
                {
                  label: "Meta MQLs semana",
                  mba: fmt(goals.mba_mqls),
                  base: fmt(goals.base_mqls),
                  inv: fmt(goals.inv_mqls),
                  total: fmt(metaTotalAbord),
                },
                {
                  label: "Meta abordagens/dia",
                  mba: fmt(goals.mba_abord_dia),
                  base: fmt(goals.base_abord_dia),
                  inv: fmt(goals.inv_abord_dia),
                  total: fmt(goals.mba_abord_dia + goals.base_abord_dia + goals.inv_abord_dia),
                },
                {
                  label: "Meta vendas/dia",
                  mba: String(goals.mba_vendas_dia).replace(".", ","),
                  base: String(goals.base_vendas_dia).replace(".", ","),
                  inv: String(goals.inv_vendas_dia).replace(".", ","),
                  total: String((goals.mba_vendas_dia + goals.base_vendas_dia + goals.inv_vendas_dia).toFixed(1)).replace(".", ","),
                },
              ].map((row, i, arr) => (
                <tr key={row.label} className={i < arr.length - 1 ? "border-b border-gray-100" : ""}>
                  <td className="py-2 px-2 text-gray-500">{row.label}</td>
                  <td className="py-2 px-2 text-center font-medium text-gray-900">{row.mba}</td>
                  <td className="py-2 px-2 text-center font-medium text-gray-900">{row.base}</td>
                  <td className="py-2 px-2 text-center font-medium text-gray-900">{row.inv}</td>
                  <td className="py-2 px-2 text-center font-medium text-purple-900">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily chart */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Abordagens e vendas diárias</h3>
        <div className="flex gap-1.5 mb-3">
          {(["abordagens", "vendas"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setChartType(t)}
              className={`text-xs px-3 py-1 rounded-md border transition-colors cursor-pointer capitalize ${
                chartType === t
                  ? "bg-blue-50 text-blue-900 border-transparent"
                  : "bg-transparent text-gray-500 border-gray-200 hover:border-gray-300"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="h-52">
          <Bar data={chartData} options={chartOptions} />
        </div>
        <div className="flex gap-4 mt-3 flex-wrap">
          {[
            { label: "MBA",        color: "#378ADD" },
            { label: "Base",       color: "#1D9E75" },
            { label: "Inventário", color: "#BA7517" },
          ].map((l) => (
            <span key={l.label} className="flex items-center gap-1 text-xs text-gray-500">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: l.color }} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Daily breakdown table */}
      {daily.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Detalhamento diário</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-2 font-medium text-gray-400">Dia</th>
                  <th className="text-center py-2 px-1 font-medium text-blue-800">MBA Ab.</th>
                  <th className="text-center py-2 px-1 font-medium text-green-800">Base Ab.</th>
                  <th className="text-center py-2 px-1 font-medium text-amber-600">Inv Ab.</th>
                  <th className="text-center py-2 px-1 font-medium text-blue-800">MBA Vd.</th>
                  <th className="text-center py-2 px-1 font-medium text-green-800">Base Vd.</th>
                  <th className="text-center py-2 px-1 font-medium text-amber-600">Inv Vd.</th>
                  <th className="text-center py-2 px-1 font-medium text-gray-400">MQLs</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((d, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 px-2 text-gray-600 font-medium">{d.date}</td>
                    <td className="py-2 px-1 text-center text-gray-900">{d.mba_abord}</td>
                    <td className="py-2 px-1 text-center text-gray-900">{d.base_abord}</td>
                    <td className="py-2 px-1 text-center text-gray-900">{d.inv_abord}</td>
                    <td className="py-2 px-1 text-center text-gray-900">{d.mba_vendas}</td>
                    <td className="py-2 px-1 text-center text-gray-900">{d.base_vendas}</td>
                    <td className="py-2 px-1 text-center text-gray-900">{d.inv_vendas}</td>
                    <td className="py-2 px-1 text-center text-gray-900">{d.mqls}</td>
                  </tr>
                ))}
                <tr className="border-t border-gray-200 font-medium">
                  <td className="py-2 px-2 text-gray-900">Total</td>
                  <td className="py-2 px-1 text-center text-blue-800">{mbaAbord}</td>
                  <td className="py-2 px-1 text-center text-green-800">{baseAbord}</td>
                  <td className="py-2 px-1 text-center text-amber-600">{invAbord}</td>
                  <td className="py-2 px-1 text-center text-blue-800">{mbaVendas}</td>
                  <td className="py-2 px-1 text-center text-green-800">{baseVendas}</td>
                  <td className="py-2 px-1 text-center text-amber-600">{invVendas}</td>
                  <td className="py-2 px-1 text-center text-gray-900">{totalMqls}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
