"use client";

import { useState, useEffect, useCallback } from "react";

const BEAR_CURRENCIES = ["USD", "CNY", "AUD", "SGD", "EUR", "JPY"] as const;
type BearCurrency = (typeof BEAR_CURRENCIES)[number];

interface Rates {
  [key: string]: number;
}

export default function UniBear() {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState<BearCurrency>("USD");
  const [to, setTo] = useState<BearCurrency>("CNY");
  const [rates, setRates] = useState<Rates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setRates(data.rates);
      setLastUpdated(data.time_last_update_utc ?? null);
    } catch {
      setError("Could not load rates. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && !rates && !loading) {
      fetchRates();
    }
  }, [open, rates, loading, fetchRates]);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  // Convert: amount (from) → (to)
  // rates[X] = units of X per 1 USD
  let result: string | null = null;
  let rateDisplay: string | null = null;
  if (rates && amount !== "") {
    const num = parseFloat(amount);
    if (!isNaN(num) && num >= 0) {
      const converted = (num / rates[from]) * rates[to];
      result = converted.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
      const r = rates[to] / rates[from];
      rateDisplay = r < 0.01 ? r.toFixed(6) : r.toFixed(4);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-white font-semibold text-sm px-4 py-2.5 rounded-full shadow-lg transition-colors"
        aria-label="Open Uni-Bear currency helper"
      >
        <span aria-hidden="true">🐻</span>
        <span>Uni-Bear</span>
      </button>

      {/* Modal */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Uni-Bear currency helper"
            className="fixed bottom-20 right-6 z-50 w-76 bg-white rounded-2xl shadow-2xl overflow-hidden"
            style={{ width: "19rem" }}
          >
            {/* Header */}
            <div className="bg-amber-400 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl leading-none" aria-hidden="true">🐻</span>
                <div>
                  <p className="text-white font-bold text-sm leading-none">Uni-Bear</p>
                  <p className="text-amber-100 text-xs mt-0.5">Currency Helper</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close Uni-Bear"
                className="text-white/70 hover:text-white text-xl leading-none transition-colors"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              {/* Amount */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Amount</label>
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 transition"
                  placeholder="Enter amount"
                  autoFocus
                />
              </div>

              {/* From / Swap / To */}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">From</label>
                  <select
                    value={from}
                    onChange={(e) => setFrom(e.target.value as BearCurrency)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 transition"
                  >
                    {BEAR_CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={swap}
                  aria-label="Swap currencies"
                  className="flex-shrink-0 mb-0.5 w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 hover:bg-amber-50 hover:border-amber-300 text-gray-500 hover:text-amber-600 transition-colors text-base"
                >
                  ⇄
                </button>

                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">To</label>
                  <select
                    value={to}
                    onChange={(e) => setTo(e.target.value as BearCurrency)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 transition"
                  >
                    {BEAR_CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Result box */}
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 min-h-[68px] flex flex-col items-center justify-center">
                {loading ? (
                  <p className="text-sm text-amber-500">Loading rates…</p>
                ) : error ? (
                  <div className="text-center">
                    <p className="text-sm text-red-400">{error}</p>
                    <button
                      onClick={fetchRates}
                      className="text-xs text-amber-600 underline mt-1 hover:text-amber-800"
                    >
                      Retry
                    </button>
                  </div>
                ) : result !== null ? (
                  <>
                    <p className="text-xl font-bold text-amber-700">
                      {result}{" "}
                      <span className="text-base font-semibold text-amber-600">{to}</span>
                    </p>
                    <p className="text-xs text-amber-500 mt-0.5">
                      1 {from} = {rateDisplay} {to}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">Enter an amount above</p>
                )}
              </div>

              {/* Footer */}
              <div className="space-y-0.5 pt-0.5">
                {lastUpdated && (
                  <p className="text-xs text-gray-400 text-center">
                    Rates as of {new Date(lastUpdated).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </p>
                )}
                <p className="text-xs text-gray-400 text-center">
                  For reference only &middot; Not financial advice
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
