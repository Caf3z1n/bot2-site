"use client";

import Head from "next/head";
import { useEffect, useState } from "react";

type Asset = {
  symbol: string;
  status: string | null;
  side: string | null;
  emaTrendStatus: string | null;
  emaDiffPercent: number | null;
  currentPrice: number | null;
  triggerPrice: number | null;
  tpPrice: number | null;
  slPrice: number | null;
  unrealizedPnl: number | null;
  updatedAtBr: string | null;
  candleCrossTimeBr: string | null;
};

const priceFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const smallPriceFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

const percentFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const statusMap: Record<
  string,
  {
    label: string;
    tone: string;
  }
> = {
  awaiting_cross: {
    label: "Aguardando cruzamento",
    tone: "text-amber-300 border-amber-500/30 bg-amber-500/10",
  },
  in_position: {
    label: "Em posicao",
    tone: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
  },
  awaiting_pullback: {
    label: "Aguardando pullback",
    tone: "text-sky-300 border-sky-500/30 bg-sky-500/10",
  },
  monitoring: {
    label: "Monitorando",
    tone: "text-cyan-300 border-cyan-500/30 bg-cyan-500/10",
  },
  closed: {
    label: "Encerrado",
    tone: "text-slate-300 border-slate-500/30 bg-slate-500/10",
  },
};

const sideMap: Record<string, string> = {
  long: "Long",
  short: "Short",
};

const sideTone = (side: string | null) => {
  if (!side) return "border-white/10 bg-white/10 text-white/70";
  const normalized = side.toLowerCase();
  if (normalized === "long") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (normalized === "short") return "border-rose-500/30 bg-rose-500/10 text-rose-300";
  return "border-white/10 bg-white/10 text-white/70";
};

const toPrice = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return "-";
  if (Math.abs(value) >= 1) {
    return priceFormatter.format(value);
  }
  return smallPriceFormatter.format(value);
};

const toPercent = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return "-";
  const formatted = percentFormatter.format(Math.abs(value));
  return `${formatted}%`;
};

const toCurrency = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return "-";
  return currencyFormatter.format(value).replace("US$", "$");
};

const toStatusLabel = (status: string | null) => {
  if (!status) return "Sem status";
  const normalized = status.toLowerCase();
  if (normalized in statusMap) return statusMap[normalized].label;
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const statusTone = (status: string | null) => {
  if (!status) return "text-slate-300 border-white/15 bg-white/[0.04]";
  const normalized = status.toLowerCase();
  return statusMap[normalized]?.tone ?? "text-slate-300 border-white/15 bg-white/[0.04]";
};

const trendTone = (trend: string | null) => {
  if (!trend) return "text-slate-300 border-white/15 bg-white/[0.04]";
  const normalized = trend.toLowerCase();
  if (normalized.includes("continuacao da alta") || normalized.includes("cruzando long")) {
    return "text-emerald-300 border-emerald-500/30 bg-emerald-500/10";
  }
  if (normalized.includes("continuacao da baixa") || normalized.includes("cruzando short")) {
    return "text-rose-300 border-rose-500/30 bg-rose-500/10";
  }
  if (normalized.includes("alta")) return "text-emerald-300 border-emerald-500/30 bg-emerald-500/10";
  if (normalized.includes("baixa")) return "text-rose-300 border-rose-500/30 bg-rose-500/10";
  if (normalized.includes("cruz")) return "text-amber-300 border-amber-500/30 bg-amber-500/10";
  return "text-slate-300 border-white/15 bg-white/[0.04]";
};

const diffTone = (value: number | null) => {
  if (value === null || !Number.isFinite(value) || value === 0) {
    return "text-slate-300 border-white/15 bg-white/[0.04]";
  }
  return value > 0 ? "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" : "text-rose-300 border-rose-500/30 bg-rose-500/10";
};

const parseNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const parseString = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim() !== "") return value;
  return null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getAssetList = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload;
  if (isRecord(payload) && Array.isArray(payload.assets)) return payload.assets as unknown[];
  return [];
};

const normalizeAsset = (raw: Record<string, unknown>): Asset | null => {
  const symbol = parseString(raw.symbol);
  if (!symbol) return null;

  return {
    symbol,
    status: parseString(raw.status),
    side: parseString(raw.side),
    emaTrendStatus: parseString(raw.emaTrendStatus),
    emaDiffPercent: parseNumber(raw.emaDiffPercent),
    currentPrice: parseNumber(raw.currentPrice),
    triggerPrice: parseNumber(raw.triggerPrice),
    tpPrice: parseNumber(raw.tpPrice ?? raw.takeProfitPrice ?? raw["take_profit_price"] ?? raw.tp ?? raw["tp_price"]),
    slPrice: parseNumber(raw.slPrice ?? raw.stopLossPrice ?? raw["stop_loss_price"] ?? raw.sl ?? raw["sl_price"]),
    unrealizedPnl: parseNumber(
      raw.unrealizedPnl ?? raw.unrealizedPnlUsd ?? raw.markPnl ?? raw.mpnl ?? raw["unrealized_pnl"] ?? raw["mpnl"],
    ),
    updatedAtBr: parseString(raw.updatedAtBr),
    candleCrossTimeBr: parseString(raw.candleCrossTimeBr),
  };
};

const LoadingState = () => (
  <div className="grid w-full gap-5 sm:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: 6 }).map((_, index) => (
      <div
        key={index}
        className="h-52 w-full animate-pulse rounded-3xl border border-white/5 bg-slate-900/70 shadow-[0_18px_40px_rgba(15,23,42,0.35)]"
      />
    ))}
  </div>
);

export default function HomePage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchAssets = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch("https://api.bot2.eticasistemas.com.br/assets", { signal: controller.signal });
        if (!res.ok) throw new Error("Erro ao carregar assets");
        const data: unknown = await res.json();
        const list = getAssetList(data);
        const normalized = list
          .map((item) => (isRecord(item) ? normalizeAsset(item) : null))
          .filter((item): item is Asset => item !== null);
        setAssets(normalized);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error(err);
        setError("Nao foi possivel carregar os assets agora. Tente novamente em instantes.");
        setAssets([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchAssets();

    return () => controller.abort();
  }, []);

  const hasAssets = assets.length > 0;

  return (
    <>
      <Head>
        <title>BOT 2 | Dashboard</title>
      </Head>
      <main className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
          <section className="space-y-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Visao geral dos assets</h1>
              <p className="max-w-2xl text-sm text-slate-400">
                Acompanhe o status do robo em tempo real. Cada card resume tendencia, preco atual e parametros operacionais coletados
                da API em /assets.
              </p>
            </div>

            {loading ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <span className="inline-flex h-2 w-2 animate-ping rounded-full bg-cyan-400" />
                  <span>Carregando assets mais recentes...</span>
                </div>
                <LoadingState />
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : hasAssets ? (
              <div className="grid w-full gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {assets.map((asset) => {
                  const side = asset.side ? sideMap[asset.side.toLowerCase()] ?? asset.side : null;
                  const sideLabel = side ? side.toUpperCase() : null;
                  const normalizedStatus = asset.status ? asset.status.toLowerCase() : null;
                  const isAwaitingPullback = normalizedStatus === "awaiting_pullback";
                  const isInPosition = normalizedStatus === "in_position";
                  const awaitingPullbackTone =
                    statusMap["awaiting_pullback"]?.tone ?? "text-slate-300 border-white/15 bg-white/[0.04]";
                  const triggerDiffPercent =
                    asset.triggerPrice !== null && asset.currentPrice !== null && asset.currentPrice !== 0
                      ? ((asset.triggerPrice - asset.currentPrice) / asset.currentPrice) * 100
                      : null;
                  const binanceUrl = `https://www.binance.com/pt/futures/${encodeURIComponent(asset.symbol)}`;

                  return (
                    <article
                      key={asset.symbol}
                      className="group relative flex w-full flex-col rounded-3xl border border-white/5 bg-slate-900/70 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.45)] transition-transform duration-200 hover:-translate-y-1 hover:bg-slate-900"
                    >
                      <div className="text-xs text-slate-500">
                        <span>{asset.candleCrossTimeBr ? `Cruzamento ${asset.candleCrossTimeBr}` : "Sem agendamento"}</span>
                      </div>

                      <div className="mt-4 flex items-start justify-between gap-3">
                        <div className="flex flex-col gap-2">
                          <a
                            href={binanceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-base font-semibold uppercase tracking-widest text-white/70 transition hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-cyan-200"
                            title={`Abrir ${asset.symbol} na Binance`}
                          >
                            {asset.symbol}
                          </a>
                        </div>
                        <span className="text-3xl font-bold tracking-tight">{toPrice(asset.currentPrice)}</span>
                      </div>

                      <div className="mt-6 space-y-3 text-sm">
                        {isAwaitingPullback ? (
                          <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Trigger Price</p>
                            <span
                              className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-sm font-semibold ${awaitingPullbackTone}`}
                            >
                              {toPrice(asset.triggerPrice)}
                            </span>
                          </div>
                        ) : isInPosition ? (
                          <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">TP / SL Price</p>
                            <div className="flex flex-wrap gap-2">
                              <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-300">
                                TP {toPrice(asset.tpPrice)}
                              </span>
                              <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-sm font-semibold text-rose-300">
                                SL {toPrice(asset.slPrice)}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
                            <span
                              className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-sm font-semibold ${statusTone(
                                asset.status,
                              )}`}
                            >
                              {toStatusLabel(asset.status)}
                            </span>
                          </div>
                        )}

                        {isAwaitingPullback || isInPosition ? (
                          <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Side</p>
                            <span
                              className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-sm font-semibold ${sideTone(
                                asset.side,
                              )}`}
                            >
                              {sideLabel ?? "SEM SIDE"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tendencia EMA</p>
                            <span
                              className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-sm font-semibold ${trendTone(
                                asset.emaTrendStatus,
                              )}`}
                            >
                              {asset.emaTrendStatus ?? "Sem tendencia"}
                            </span>
                          </div>
                        )}

                        {isAwaitingPullback ? (
                          <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Trigger Diff (%)</p>
                              <span className="text-[0.65rem] uppercase text-slate-500">Preco atual vs trigger</span>
                            </div>
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${awaitingPullbackTone}`}
                            >
                              {toPercent(triggerDiffPercent)}
                            </span>
                          </div>
                        ) : isInPosition ? (
                          <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Unrealized PnL</p>
                              <span className="text-[0.65rem] uppercase text-slate-500">Lucro nao realizado</span>
                            </div>
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${diffTone(
                                asset.unrealizedPnl,
                              )}`}
                            >
                              {toCurrency(asset.unrealizedPnl)}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Diferenca EMA</p>
                              <span className="text-[0.65rem] uppercase text-slate-500">Comparacao entre medias</span>
                            </div>
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${diffTone(
                                asset.emaDiffPercent,
                              )}`}
                            >
                              {toPercent(asset.emaDiffPercent)}
                            </span>
                          </div>
                        )}
                      </div>

                      <footer className="mt-6 border-t border-white/5 pt-4 text-xs text-slate-500">
                        <p>{asset.updatedAtBr ? `Atualizado ${asset.updatedAtBr}` : "Sem horario atualizado"}</p>
                      </footer>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-12 text-center text-sm text-slate-300">
                Nenhum asset disponivel no momento.
            </div>
          )}
        </section>
      </div>
    </main>
  </>
  );
}
