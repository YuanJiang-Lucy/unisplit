import { Expense, Participant, Settlement } from "./types";

/**
 * Calculates the minimum number of transactions to settle all debts.
 * All expenses are treated as same currency (user's responsibility).
 * For multi-currency groups, settlement is per-currency.
 */
export function calculateSettlements(
  participants: Participant[],
  expenses: Expense[]
): Settlement[] {
  if (participants.length === 0 || expenses.length === 0) return [];

  // Group expenses by currency
  const currencies = [...new Set(expenses.map((e) => e.currency))];
  const settlements: Settlement[] = [];

  for (const currency of currencies) {
    const currencyExpenses = expenses.filter((e) => e.currency === currency);
    const netBalance: Record<string, number> = {};

    // Initialize balances
    for (const p of participants) {
      netBalance[p.id] = 0;
    }

    for (const expense of currencyExpenses) {
      const splitCount = expense.splitAmong.length;
      if (splitCount === 0) continue;

      const sharePerPerson = expense.amount / splitCount;

      // Payer gains credit
      netBalance[expense.paidBy] = (netBalance[expense.paidBy] ?? 0) + expense.amount;

      // Each person in the split owes their share
      for (const pid of expense.splitAmong) {
        netBalance[pid] = (netBalance[pid] ?? 0) - sharePerPerson;
      }
    }

    // Greedy settlement: match largest creditor with largest debtor
    const creditors: { id: string; amount: number }[] = [];
    const debtors: { id: string; amount: number }[] = [];

    for (const [id, balance] of Object.entries(netBalance)) {
      if (balance > 0.005) creditors.push({ id, amount: balance });
      else if (balance < -0.005) debtors.push({ id, amount: -balance });
    }

    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    let ci = 0;
    let di = 0;

    while (ci < creditors.length && di < debtors.length) {
      const creditor = creditors[ci];
      const debtor = debtors[di];
      const amount = Math.min(creditor.amount, debtor.amount);

      if (amount > 0.005) {
        settlements.push({
          from: debtor.id,
          to: creditor.id,
          amount: Math.round(amount * 100) / 100,
          currency,
        });
      }

      creditor.amount -= amount;
      debtor.amount -= amount;

      if (creditor.amount < 0.005) ci++;
      if (debtor.amount < 0.005) di++;
    }
  }

  return settlements;
}

export function getParticipantById(
  participants: Participant[],
  id: string
): Participant | undefined {
  return participants.find((p) => p.id === id);
}

export function getTotalByParticipant(
  participantId: string,
  expenses: Expense[]
): { paid: number; owed: number } {
  let paid = 0;
  let owed = 0;

  for (const expense of expenses) {
    if (expense.paidBy === participantId) {
      paid += expense.amount;
    }
    if (expense.splitAmong.includes(participantId)) {
      owed += expense.amount / expense.splitAmong.length;
    }
  }

  return { paid, owed };
}
