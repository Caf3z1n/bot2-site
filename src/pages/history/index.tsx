import Head from "next/head";
import { useEffect, useMemo, useState } from "react";

type Status = "PROFIT" | "LOSS" | "MANUAL" | "-";
type MetricTone = "positive" | "negative" | "neutral";
type OverviewTone = "emerald" | "cyan" | "rose" | "slate";

type TradeSide = "LONG" | "SHORT" | "-";

type Trade = {
  id: number;
  crossTime: string;
  entryTime: string;
  exitTime: string;
  symbol: string;
  side: TradeSide;
  price: string | null;
  tpPrice: string | null;
  slPrice: string | null;
  exitPrice: string | null;
  pnl: string | null;
  slippage: number | null;
  fees: string | null;
  notional: string | number | null;
  riskReward: number | null;
  closed: boolean;
  result: Status;
};

type ApiPosition = {
  id: number;
  candleCrossTimeBr?: string | null;
  createdAtBr?: string | null;
  exitTimeBr?: string | null;
  side?: string | null;
  symbol?: string | null;
  price?: string | null;
  tpPrice?: string | null;
  slPrice?: string | null;
  exitPrice?: string | null;
  pnl?: string | null;
  slippage?: number | string | null;
  fees?: string | number | null;
  status?: string | null;
  result?: string | null;
  notional?: string | number | null;
  riskReward?: string | number | null;
};

const normalizeResult = (value: string | null | undefined): Status => {
  if (!value) return "-";
  const normalized = value.toUpperCase();
  return normalized === "PROFIT" || normalized === "LOSS" || normalized === "MANUAL" ? (normalized as Status) : "-";
};

const normalizeSide = (value: string | null | undefined): TradeSide => {
  if (!value) return "-";
  const normalized = value.toUpperCase();
  return normalized === "LONG" || normalized === "SHORT" ? (normalized as TradeSide) : "-";
};

const toNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isNaN(numeric) ? null : numeric;
};

const decimalFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const smallDecimalFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const formatValue = (value: unknown, formatter: Intl.NumberFormat) => {
  if (value === null || value === undefined || value === "") return "-";
  const numericValue = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numericValue)) return String(value);
  return formatter.format(numericValue);
};

const formatNumber = (value: unknown) => formatValue(value, decimalFormatter);
const formatCurrency = (value: unknown) => {
  const formatted = formatValue(value, currencyFormatter);
  return formatted.replace("US$", "$");
};
const formatPercent = (value: number) => percentFormatter.format(value);
const formatExitParts = (value: string | null | undefined) => {
  if (!value || value === "-") {
    return { date: value ?? "-", time: "" };
  }
  const [rawDate = "", rawTime = ""] = value.split(",");
  const date = rawDate.trim() || "-";
  let time = rawTime.trim();
  if (time) {
    const [hours = "", minutes = ""] = time.split(":");
    if (hours && minutes) {
      time = `${hours}:${minutes}`;
    } else {
      time = time;
    }
  }
  return { date, time };
};
const formatPrice = (value: unknown) => {
  const numeric = toNumberOrNull(value);
  if (numeric === null) return formatNumber(value);
  if (Math.abs(numeric) < 10) return smallDecimalFormatter.format(numeric);
  return formatNumber(numeric);
};

const statusClass = (s: Status) =>
  s === "PROFIT"
    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
    : s === "LOSS"
    ? "border border-rose-500/30 bg-rose-500/10 text-rose-300"
    : s === "MANUAL"
    ? "border border-amber-500/30 bg-amber-500/10 text-amber-300"
    : "border border-white/10 bg-white/[0.04] text-slate-300";

const METRIC_TONE_STYLES: Record<MetricTone, string> = {
  positive: "border-emerald-500/40 bg-emerald-500/10 shadow-[0_18px_45px_rgba(16,185,129,0.18)]",
  negative: "border-rose-500/40 bg-rose-500/10 shadow-[0_18px_45px_rgba(244,63,94,0.18)]",
  neutral: "border-white/10 bg-white/[0.03] shadow-[0_18px_45px_rgba(15,23,42,0.45)]",
};

const OVERVIEW_DOT_STYLES: Record<OverviewTone, string> = {
  emerald: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.45)]",
  cyan: "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.45)]",
  rose: "bg-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.45)]",
  slate: "bg-slate-500/60",
};

const SIDE_BADGE_STYLES: Record<TradeSide, string> = {
  LONG: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  SHORT: "border-rose-500/30 bg-rose-500/10 text-rose-200",
  "-": "border-white/10 bg-white/[0.04] text-slate-300",
};

const LoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="h-40 w-full animate-pulse rounded-3xl border border-white/5 bg-slate-900/70 shadow-[0_25px_50px_rgba(15,23,42,0.55)]" />
    <div className="space-y-4 rounded-3xl border border-white/5 bg-slate-900/70 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.45)]">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-11 animate-pulse rounded-2xl bg-white/5" />
      ))}
    </div>
  </div>
);

export default function HistoryPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "ALL">("ALL");
  const [closedFilter, setClosedFilter] = useState<"ALL" | "OPEN" | "CLOSED">("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("https://api.bot2.eticasistemas.com.br/positions");
        if (!res.ok) throw new Error("Erro ao buscar trades");
        const data = await res.json();
        const positions = Array.isArray(data?.positions) ? (data.positions as ApiPosition[]) : [];
        const normalizedTrades: Trade[] = positions.map((position) => {
          const status = position.status?.toLowerCase();
          const closed = status === "closed";
          const crossTime = position.candleCrossTimeBr ?? position.createdAtBr ?? "-";
          const entryTime = position.createdAtBr ?? "-";
          const exitTime = position.exitTimeBr ?? "-";
          const feesValue = position.fees;
          const fees =
            feesValue === null || feesValue === undefined ? null : typeof feesValue === "number" ? feesValue.toString() : feesValue;
          const slippageValue = position.slippage;
          const slippage =
            slippageValue === null || slippageValue === undefined
              ? null
              : typeof slippageValue === "number"
              ? slippageValue
              : Number(slippageValue);
          const notionalValue = position.notional;

          return {
            id: position.id,
            crossTime,
            entryTime,
            exitTime,
            side: normalizeSide(position.side),
            symbol: position.symbol ?? "-",
            price: position.price ?? null,
            tpPrice: position.tpPrice ?? null,
            slPrice: position.slPrice ?? null,
            exitPrice: position.exitPrice ?? null,
            pnl: position.pnl ?? null,
            slippage: Number.isNaN(slippage) ? null : slippage,
            fees,
            notional:
              notionalValue === null || notionalValue === undefined || notionalValue === ""
                ? null
                : notionalValue,
            riskReward: toNumberOrNull(position.riskReward),
            closed,
            result: normalizeResult(position.result),
          };
        });

        setTrades(normalizedTrades);
      } catch (err) {
        console.error(err);
        setTrades([]);
        setError("N�o foi poss�vel carregar as posi��es. Tente novamente mais tarde.");
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();
  }, []);

  useEffect(() => {
    if (!selectedTrade) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedTrade(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [selectedTrade]);

  const statusOptions: Array<{ label: string; value: Status | "ALL" }> = [
    { label: "Todos", value: "ALL" },
    { label: "Profit", value: "PROFIT" },
    { label: "Loss", value: "LOSS" },
  ];

  const closedOptions: Array<{ label: string; value: "ALL" | "OPEN" | "CLOSED" }> = [
    { label: "Todos", value: "ALL" },
    { label: "Abertos", value: "OPEN" },
    { label: "Fechados", value: "CLOSED" },
  ];

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();

    return trades.filter((trade) => {
      if (statusFilter !== "ALL" && trade.result !== statusFilter) return false;
      if (closedFilter === "OPEN" && trade.closed) return false;
      if (closedFilter === "CLOSED" && !trade.closed) return false;

      if (!q) return true;

      return [
        trade.side,
        trade.crossTime,
        trade.entryTime,
        trade.exitTime,
        trade.symbol,
        trade.price ?? "",
        trade.result,
        trade.tpPrice ?? "",
        trade.slPrice ?? "",
        trade.exitPrice ?? "",
        trade.slippage ?? "",
        trade.pnl ?? "",
        trade.fees ?? "",
        trade.notional ?? "",
        trade.riskReward ?? "",
        trade.closed ? "FECHADO" : "ABERTO",
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [closedFilter, query, statusFilter, trades]);

  const totalPnl = useMemo(
    () =>
      rows.reduce((acc, trade) => {
        const pnl = toNumberOrNull(trade.pnl);
        return acc + (pnl ?? 0);
      }, 0),
    [rows],
  );

  const aggregated = useMemo(
    () =>
      rows.reduce(
        (acc, trade) => {
          const pnl = toNumberOrNull(trade.pnl) ?? 0;
          if (pnl > 0) acc.winningTrades += 1;
          if (pnl < 0) acc.losingTrades += 1;
          if (!trade.closed) acc.openTrades += 1;
          if (pnl > acc.bestTrade.pnl) {
            acc.bestTrade = { pnl, symbol: trade.symbol, entry: trade.entryTime };
          }
          if (pnl < acc.worstTrade.pnl) {
            acc.worstTrade = { pnl, symbol: trade.symbol, entry: trade.entryTime };
          }
          return acc;
        },
        {
          winningTrades: 0,
          losingTrades: 0,
          openTrades: 0,
          bestTrade: { pnl: Number.NEGATIVE_INFINITY, symbol: "", entry: "" },
          worstTrade: { pnl: Number.POSITIVE_INFINITY, symbol: "", entry: "" },
        },
      ),
    [rows],
  );

  const totalTrades = rows.length;
  const {
    winningTrades,
    losingTrades,
    openTrades,
    bestTrade: rawBestTrade,
    worstTrade: rawWorstTrade,
  } = aggregated;
  const bestTrade = rawBestTrade.pnl === Number.NEGATIVE_INFINITY ? null : rawBestTrade;
  const worstTrade = rawWorstTrade.pnl === Number.POSITIVE_INFINITY ? null : rawWorstTrade;
  const winRate = totalTrades ? winningTrades / totalTrades : 0;
  const averagePnl = totalTrades ? totalPnl / totalTrades : 0;
  const selectedSlippage = selectedTrade ? toNumberOrNull(selectedTrade.slippage) : null;
  const slippageBadgeClass =
    selectedSlippage === null
      ? "border-white/10 bg-white/[0.04] text-slate-300"
      : selectedSlippage >= 0
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : "border-rose-500/30 bg-rose-500/10 text-rose-300";
  const slippageDisplay = selectedSlippage === null ? "-" : formatCurrency(selectedSlippage);

  const metrics: Array<{ label: string; value: string; helper: string; tone: MetricTone }> = [
    {
      label: "PnL filtrado",
      value: formatCurrency(totalPnl),
      helper: `${winningTrades} ganhos / ${losingTrades} perdas`,
      tone: totalPnl > 0 ? "positive" : totalPnl < 0 ? "negative" : "neutral",
    },
    {
      label: "Taxa de acerto",
      value: formatPercent(winRate),
      helper: totalTrades ? "Considera os trades filtrados" : "Nenhum trade filtrado",
      tone: winRate > 0.5 ? "positive" : winRate === 0 ? "neutral" : "negative",
    },
    {
      label: "Trades abertos",
      value: String(openTrades),
      helper: openTrades ? "Ainda em execu��o" : "Nenhum trade em aberto",
      tone: "neutral",
    },
    {
      label: "PnL m�dio por trade",
      value: totalTrades ? formatCurrency(averagePnl) : "-",
      helper: totalTrades ? `Baseado em ${totalTrades} trades` : "Sem dados suficientes",
      tone: averagePnl > 0 ? "positive" : averagePnl < 0 ? "negative" : "neutral",
    },
    {
      label: "Maior ganho",
      value: bestTrade ? formatCurrency(bestTrade.pnl) : "-",
      helper: bestTrade ? `${bestTrade.symbol} - ${bestTrade.entry}` : "Sem ganhos",
      tone: bestTrade && bestTrade.pnl > 0 ? "positive" : "neutral",
    },
    {
      label: "Maior perda",
      value: worstTrade ? formatCurrency(worstTrade.pnl) : "-",
      helper: worstTrade ? `${worstTrade.symbol} - ${worstTrade.entry}` : "Sem perdas",
      tone: worstTrade && worstTrade.pnl < 0 ? "negative" : "neutral",
    },
  ];

  const overview: Array<{ label: string; value: number; tone: OverviewTone }> = [
    { label: "Trades filtrados", value: totalTrades, tone: "emerald" },
    { label: "Trades abertos", value: openTrades, tone: openTrades > 0 ? "cyan" : "slate" },
    { label: "Ganhos", value: winningTrades, tone: winningTrades > 0 ? "emerald" : "slate" },
    { label: "Perdas", value: losingTrades, tone: losingTrades > 0 ? "rose" : "slate" },
  ];

  const hasRows = totalTrades > 0;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <LoadingSkeleton />
        </div>
      </main>
    );
  }

  return (
    <>
      <Head>
        <title>BOT 2 | Historico</title>
      </Head>
      <main className="min-h-screen bg-slate-950 px-4 py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-[1px] text-white shadow-[0_35px_90px_rgba(15,23,42,0.6)]">
          <div className="flex flex-col gap-8 rounded-[1.5rem] bg-gradient-to-br from-slate-950/95 via-slate-900/75 to-indigo-950/75 p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white/70">
                  Painel de desempenho
                </span>
                <div>
                  <h1 className="text-3xl font-semibold text-white sm:text-4xl">Hist�rico de Trades</h1>
                  <p className="mt-2 max-w-xl text-sm text-white/70">
                    M�tricas em tempo real a partir dos dados da API para acompanhar desempenho, taxas e oportunidades.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {overview.map((item) => (
                  <article
                    key={item.label}
                    className="flex items-center justify-between gap-6 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 rounded-full ${OVERVIEW_DOT_STYLES[item.tone]}`} />
                      <span className="text-xs uppercase tracking-wide text-slate-300">{item.label}</span>
                    </div>
                    <span className="text-base font-semibold text-white">{item.value}</span>
                  </article>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {metrics.map((metric) => (
                <article
                  key={metric.label}
                  className={`rounded-2xl border px-5 py-4 transition-all duration-200 ${METRIC_TONE_STYLES[metric.tone]} hover:-translate-y-1`}
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">{metric.label}</span>
                  <p className="mt-2 text-2xl font-semibold text-white">{metric.value}</p>
                  <p className="mt-1 text-xs text-slate-400">{metric.helper}</p>
                </article>
              ))}
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            {error}
          </div>
        )}

        <section className="rounded-3xl border border-white/5 bg-slate-900/70 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.45)]">
          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            <div className="h-full rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</span>
                <button
                  type="button"
                  onClick={() => setStatusFilter("ALL")}
                  className="text-xs font-semibold text-cyan-300 transition hover:text-cyan-200"
                >
                  Limpar
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStatusFilter(option.value)}
                    aria-pressed={statusFilter === option.value}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      statusFilter === option.value
                        ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.25)]"
                        : "border-white/10 bg-white/[0.02] text-slate-300 hover:border-cyan-500/30 hover:text-cyan-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-full rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Estado</span>
                <button
                  type="button"
                  onClick={() => setClosedFilter("ALL")}
                  className="text-xs font-semibold text-cyan-300 transition hover:text-cyan-200"
                >
                  Limpar
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {closedOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setClosedFilter(option.value)}
                    aria-pressed={closedFilter === option.value}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      closedFilter === option.value
                        ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.25)]"
                        : "border-white/10 bg-white/[0.02] text-slate-300 hover:border-cyan-500/30 hover:text-cyan-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-full rounded-2xl border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Busca</span>
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="text-xs font-semibold text-cyan-300 transition hover:text-cyan-200"
                  >
                    Limpar
                  </button>
                )}
              </div>
              <div className="mt-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar posic�o~es..."
                  className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:bg-transparent"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.02]">
            <div className="overflow-x-auto rounded-2xl">
              {hasRows ? (
                <table className="min-w-[900px] w-full border-collapse text-sm">
                  <thead className="bg-white/[0.04] text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-2 py-2 text-left text-slate-400">Side</th>
                      <th className="px-2 py-2 text-left text-slate-400">Saida</th>
                      <th className="px-2 py-2 text-left text-slate-400">Par</th>
                      <th className="px-2 py-2 text-right text-slate-400">Entry</th>
                      <th className="px-2 py-2 text-right text-slate-400">Exit</th>
                      <th className="px-2 py-2 text-right text-slate-400">Slippage</th>
                      <th className="px-2 py-2 text-right text-slate-400">PnL</th>
                    </tr>
                </thead>
                <tbody className="bg-transparent text-sm text-slate-200">
                    {rows.map((trade, index) => {
                      const { date: exitDate, time: exitTime } = formatExitParts(trade.exitTime);

                      return (
                        <tr
                          key={trade.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedTrade(trade)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedTrade(trade);
                            }
                          }}
                          className={`cursor-pointer transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 ${
                            index % 2 === 0 ? "bg-white/[0.03]" : "bg-white/[0.015]"
                          } hover:bg-white/[0.08]`}
                        >
                          <td className="px-2 py-2 align-top text-left">
                            <span
                              className={`inline-flex min-w-[4.5rem] justify-center rounded-full border px-3 py-1 text-xs font-semibold ${SIDE_BADGE_STYLES[trade.side]}`}
                            >
                              {trade.side === "-" ? "-" : trade.side === "LONG" ? "Long" : "Short"}
                            </span>
                          </td>
                          <td className="px-2 py-2 align-top text-left text-slate-400">
                            <span className="flex flex-col leading-tight">
                              <span>{exitDate}</span>
                              {exitTime && <span className="text-xs text-slate-500">{exitTime}</span>}
                            </span>
                          </td>
                          <td className="px-2 py-2 align-top font-semibold text-slate-100">{trade.symbol}</td>
                          <td className="px-2 py-2 align-top text-right text-slate-200">{formatPrice(trade.price)}</td>
                          <td className="px-2 py-2 align-top text-right text-slate-200">{formatPrice(trade.exitPrice)}</td>
                          <td className="px-2 py-2 align-top text-right text-slate-200">{formatCurrency(trade.slippage)}</td>
                          <td className="px-2 py-2 align-top text-right">
                            <span
                              className={`inline-flex items-center justify-end gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${
                                (toNumberOrNull(trade.pnl) ?? 0) >= 0
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                  : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                              }`}
                            >
                              {formatCurrency(trade.pnl)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    <tr className="bg-white/[0.05] text-sm font-semibold text-slate-100">
                      <td className="px-2 py-2">Totais</td>
                      <td className="px-2 py-2" />
                      <td className="px-2 py-2" />
                      <td className="px-2 py-2" />
                      <td className="px-2 py-2" />
                      <td className="px-2 py-2" />
                      <td className="px-2 py-2 text-right">
                        <span
                          className={`inline-flex items-center justify-end gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${
                            totalPnl >= 0
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                          }`}
                        >
                          {formatCurrency(totalPnl)}
                        </span>
                      </td></tr>
                  </tbody>
                </table>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center text-slate-300">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-2xl text-slate-300">
                    :(
                  </span>
                  <p className="text-sm font-semibold text-slate-100">Nenhum trade encontrado</p>
                  <p className="text-xs text-slate-400">
                    Ajuste os filtros ou limpe a busca para visualizar novas posi��es.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {selectedTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setSelectedTrade(null)}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="trade-detail-title"
            className="relative z-10 w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-[0_35px_90px_rgba(15,23,42,0.65)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Detalhes da posi��o</p>
                <h2 id="trade-detail-title" className="mt-2 text-2xl font-semibold text-white">
                  {selectedTrade.symbol}
                </h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex min-w-[5rem] justify-center rounded-full border px-3 py-1 text-xs font-semibold ${SIDE_BADGE_STYLES[selectedTrade.side]}`}
                  >
                    {selectedTrade.side === "-" ? "-" : selectedTrade.side === "LONG" ? "Long" : "Short"}
                  </span>
                  <span
                    className={`inline-flex min-w-[6rem] justify-center rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(
                      selectedTrade.result,
                    )}`}
                  >
                    {selectedTrade.result}
                  </span>
                  <span
                    className={`inline-flex min-w-[6rem] justify-center rounded-full border px-3 py-1 text-xs font-semibold ${
                      selectedTrade.closed
                        ? "border-white/10 bg-white/[0.04] text-slate-300"
                        : "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
                    }`}
                  >
                    {selectedTrade.closed ? "Fechado" : "Aberto"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTrade(null)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-cyan-500/40 hover:text-cyan-200"
              >
                Fechar
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: "Cross time", value: selectedTrade.crossTime },
                  { label: "Entrada", value: selectedTrade.entryTime },
                  { label: "Saida", value: selectedTrade.exitTime ?? "-" },
                ].map((item) => {
                  const { date, time } = formatExitParts(item.value);
                  return (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2"
                    >
                      <span className="text-xs uppercase tracking-wide text-slate-400">{item.label}</span>
                      <div className="mt-2 flex flex-col leading-tight">
                        <span className="text-sm font-semibold text-white">{date}</span>
                        {time && <span className="text-xs font-medium text-slate-400">{time}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <span className="text-xs uppercase tracking-wide text-slate-400">Entry</span>
                  <p className="mt-2 text-lg font-semibold text-white">{formatPrice(selectedTrade.price)}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <span className="text-xs uppercase tracking-wide text-slate-400">Exit</span>
                  <div className="mt-2 flex flex-col">
                    <p
                      className={`text-lg font-semibold ${
                        selectedTrade.result === "PROFIT"
                          ? "text-emerald-300"
                          : selectedTrade.result === "LOSS"
                          ? "text-rose-300"
                          : "text-white"
                      }`}
                    >
                      {formatPrice(selectedTrade.exitPrice)}
                    </p>
                    <span className="mt-1 text-xs font-medium text-slate-400">
                      {`${formatPrice(selectedTrade.tpPrice)} / ${formatPrice(selectedTrade.slPrice)}`}
                    </span>
                  </div>
                </div>

              </div>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <span className="text-xs uppercase tracking-wide text-slate-400">Notional</span>
                  <p className="mt-2 text-sm font-semibold text-white">{formatCurrency(selectedTrade.notional)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <span className="text-xs uppercase tracking-wide text-slate-400">Fees</span>
                  <p className="mt-2 text-sm font-semibold text-white">{formatCurrency(selectedTrade.fees)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <span className="text-xs uppercase tracking-wide text-slate-400">Risk/Reward</span>
                  <p className="mt-2 text-sm font-semibold text-white">{formatNumber(selectedTrade.riskReward)}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/80">
              <span>PnL total da posi��o</span>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${
                  (toNumberOrNull(selectedTrade.pnl) ?? 0) >= 0
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                }`}
              >
                {formatCurrency(selectedTrade.pnl)}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/80">
              <span>Slippage da posi��o</span>
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${slippageBadgeClass}`}
              >
                {slippageDisplay}
              </span>
            </div>
          </div>
        </div>
      )}
      </main>
    </>
  );
}
























