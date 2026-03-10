"use client";

import { useMemo, useState } from "react";
import { Expense, Participant } from "@/lib/types";
import {
  calculateSettlements,
  getParticipantById,
  getTotalByParticipant,
} from "@/lib/settlement";

interface Props {
  participants: Participant[];
  expenses: Expense[];
  paidSettlements: string[];
  onTogglePaid: (key: string) => void;
}

interface CurrencyBalanceBlock {
  currency: string;
  rows: { participant: Participant; paid: number; owed: number; net: number }[];
}

interface CurrencySettlementBlock {
  currency: string;
  pending: ReturnType<typeof calculateSettlements>;
  paid: ReturnType<typeof calculateSettlements>;
}

function settlementKey(s: { from: string; to: string; amount: number; currency: string }) {
  return `${s.from}|${s.to}|${s.amount.toFixed(2)}|${s.currency}`;
}

export default function SettlementPanel({ participants, expenses, paidSettlements, onTogglePaid }: Props) {
  const settlements = useMemo(
    () => calculateSettlements(participants, expenses),
    [participants, expenses]
  );

  if (participants.length < 2) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        Add participants and expenses to see settlements.
      </p>
    );
  }

  if (expenses.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        No expenses recorded yet.
      </p>
    );
  }

  const currencies = [...new Set(expenses.map((e) => e.currency))];
  const isMultiCurrency = currencies.length > 1;

  // Build per-currency balance blocks — only include participants involved in each currency
  const balanceBlocks: CurrencyBalanceBlock[] = currencies.map((currency) => {
    const subset = expenses.filter((e) => e.currency === currency);
    const rows = participants
      .map((p) => {
        const { paid, owed } = getTotalByParticipant(p.id, subset);
        return { participant: p, paid, owed, net: paid - owed };
      })
      .filter((r) => r.paid > 0.005 || r.owed > 0.005);
    return { currency, rows };
  });

  // Group settlement transactions by currency, split into pending/paid
  const settlementBlocks: CurrencySettlementBlock[] = currencies.map((currency) => {
    const all = settlements.filter((s) => s.currency === currency);
    return {
      currency,
      pending: all.filter((s) => !paidSettlements.includes(settlementKey(s))),
      paid: all.filter((s) => paidSettlements.includes(settlementKey(s))),
    };
  });

  const totalPending = settlementBlocks.reduce((n, b) => n + b.pending.length, 0);
  const totalPaid = settlementBlocks.reduce((n, b) => n + b.paid.length, 0);

  return (
    <div className="space-y-6">
      {/* ── Balance Summary ── */}
      <section>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Balance Summary
        </h3>

        {isMultiCurrency ? (
          <div className="space-y-4">
            {balanceBlocks.map(({ currency, rows }) => (
              <div key={currency} className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-200">
                  <span className="text-xs font-bold text-gray-600 tracking-widest">
                    {currency}
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {rows.map(({ participant: p, paid, owed, net }) => (
                    <BalanceRow
                      key={p.id}
                      participant={p}
                      paid={paid}
                      owed={owed}
                      net={net}
                      currency={currency}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {balanceBlocks[0]?.rows.map(({ participant: p, paid, owed, net }) => (
              <BalanceRow
                key={p.id}
                participant={p}
                paid={paid}
                owed={owed}
                net={net}
                currency={currencies[0]}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Suggested Settlements ── */}
      <section>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Suggested Settlements
        </h3>

        {totalPending === 0 && totalPaid === 0 ? (
          <div className="text-center py-4 bg-emerald-50 rounded-xl">
            <p className="text-emerald-600 font-medium text-sm">All settled up!</p>
          </div>
        ) : totalPending === 0 ? (
          <div className="text-center py-4 bg-emerald-50 rounded-xl">
            <p className="text-emerald-600 font-medium text-sm">All payments marked as paid!</p>
          </div>
        ) : isMultiCurrency ? (
          <div className="space-y-4">
            {settlementBlocks
              .filter((b) => b.pending.length > 0)
              .map(({ currency, pending }) => (
                <div key={currency} className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-200">
                    <span className="text-xs font-bold text-gray-600 tracking-widest">
                      {currency}
                    </span>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {pending.map((s) => (
                      <SettlementRow
                        key={settlementKey(s)}
                        s={s}
                        participants={participants}
                        onMarkPaid={() => onTogglePaid(settlementKey(s))}
                      />
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        ) : (
          <ul className="space-y-2">
            {settlementBlocks[0]?.pending.map((s) => (
              <SettlementRow
                key={settlementKey(s)}
                s={s}
                participants={participants}
                asCard
                onMarkPaid={() => onTogglePaid(settlementKey(s))}
              />
            ))}
          </ul>
        )}

        {/* ── Completed section ── */}
        {totalPaid > 0 && (
          <CompletedSection
            settlementBlocks={settlementBlocks}
            isMultiCurrency={isMultiCurrency}
            participants={participants}
            onUnmark={(key) => onTogglePaid(key)}
          />
        )}
      </section>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function BalanceRow({
  participant,
  paid,
  owed,
  net,
  currency,
}: {
  participant: Participant;
  paid: number;
  owed: number;
  net: number;
  currency: string;
}) {
  return (
    <div className="flex items-center justify-between bg-gray-50 px-3 py-2">
      <div className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: participant.color }}
        />
        <span className="text-sm font-medium text-gray-700">{participant.name}</span>
      </div>
      <div className="text-right">
        <span
          className={`text-sm font-bold ${
            net > 0.005
              ? "text-emerald-600"
              : net < -0.005
              ? "text-red-500"
              : "text-gray-400"
          }`}
        >
          {net > 0.005 ? "+" : ""}
          {net.toFixed(2)} {currency}
        </span>
        <p className="text-xs text-gray-400">
          paid {paid.toFixed(2)} &middot; owed {owed.toFixed(2)}
        </p>
      </div>
    </div>
  );
}

function SettlementRow({
  s,
  participants,
  asCard = false,
  onMarkPaid,
}: {
  s: { from: string; to: string; amount: number; currency: string };
  participants: Participant[];
  asCard?: boolean;
  onMarkPaid: () => void;
}) {
  const from = getParticipantById(participants, s.from);
  const to = getParticipantById(participants, s.to);

  const inner = (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: from?.color ?? "#999" }}
        />
        <span className="text-sm font-semibold text-gray-800 truncate">{from?.name ?? "?"}</span>
      </div>
      <div className="flex-1 flex items-center">
        <div className="flex-1 h-px bg-gray-200 relative">
          <span className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
            &#8594;
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: to?.color ?? "#999" }}
        />
        <span className="text-sm font-semibold text-gray-800 truncate">{to?.name ?? "?"}</span>
      </div>
      <span className="ml-2 text-sm font-bold text-indigo-600 whitespace-nowrap">
        {s.currency} {s.amount.toFixed(2)}
      </span>
      <button
        onClick={onMarkPaid}
        aria-label="Mark as paid"
        className="ml-2 flex-shrink-0 text-xs font-medium text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg px-2.5 py-1 transition-colors"
      >
        Mark paid
      </button>
    </div>
  );

  if (asCard) {
    return <li className="bg-white border border-gray-200 rounded-xl">{inner}</li>;
  }
  return <li className="bg-white">{inner}</li>;
}

function CompletedSection({
  settlementBlocks,
  isMultiCurrency,
  participants,
  onUnmark,
}: {
  settlementBlocks: { currency: string; paid: ReturnType<typeof calculateSettlements> }[];
  isMultiCurrency: boolean;
  participants: Participant[];
  onUnmark: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
      >
        <span>{open ? "▾" : "▸"}</span>
        <span>Completed</span>
        <span className="bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5">
          {settlementBlocks.reduce((n, b) => n + b.paid.length, 0)}
        </span>
      </button>

      {open && (
        <div className="mt-2">
          {isMultiCurrency ? (
            <div className="space-y-3">
              {settlementBlocks
                .filter((b) => b.paid.length > 0)
                .map(({ currency, paid }) => (
                  <div key={currency} className="rounded-xl border border-gray-200 overflow-hidden opacity-60">
                    <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-200">
                      <span className="text-xs font-bold text-gray-600 tracking-widest">{currency}</span>
                    </div>
                    <ul className="divide-y divide-gray-100">
                      {paid.map((s) => (
                        <PaidRow
                          key={settlementKey(s)}
                          s={s}
                          participants={participants}
                          onUnmark={() => onUnmark(settlementKey(s))}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {settlementBlocks[0]?.paid.map((s) => (
                <PaidRow
                  key={settlementKey(s)}
                  s={s}
                  participants={participants}
                  asCard
                  onUnmark={() => onUnmark(settlementKey(s))}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function PaidRow({
  s,
  participants,
  asCard = false,
  onUnmark,
}: {
  s: { from: string; to: string; amount: number; currency: string };
  participants: Participant[];
  asCard?: boolean;
  onUnmark: () => void;
}) {
  const from = getParticipantById(participants, s.from);
  const to = getParticipantById(participants, s.to);

  const inner = (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: from?.color ?? "#999" }}
        />
        <span className="text-sm font-semibold text-gray-400 line-through truncate">{from?.name ?? "?"}</span>
      </div>
      <div className="flex-1 flex items-center">
        <div className="flex-1 h-px bg-gray-200 relative">
          <span className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-300 text-xs">
            &#8594;
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: to?.color ?? "#999" }}
        />
        <span className="text-sm font-semibold text-gray-400 line-through truncate">{to?.name ?? "?"}</span>
      </div>
      <span className="ml-2 text-sm font-bold text-gray-400 line-through whitespace-nowrap">
        {s.currency} {s.amount.toFixed(2)}
      </span>
      <button
        onClick={onUnmark}
        aria-label="Mark as unpaid"
        className="ml-2 flex-shrink-0 text-xs font-medium text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1 transition-colors"
      >
        Undo
      </button>
    </div>
  );

  if (asCard) {
    return <li className="bg-white border border-gray-200 rounded-xl">{inner}</li>;
  }
  return <li className="bg-white">{inner}</li>;
}
