import { CURRENCIES } from "./types";

// ─── Action Schema ────────────────────────────────────────────────────────────

export type AppTab = "participants" | "expenses" | "settlement";

/**
 * Discriminated union of every action the AI layer can produce.
 * The UI is responsible for showing a confirmation step before
 * applying add_participant and add_expense to state.
 */
export type AIAction =
  | { type: "add_participant"; name: string }
  | {
      type: "add_expense";
      description: string;
      amount: number;
      currency: string;
      paidBy: string;       // participant id
      splitAmong: string[]; // participant ids
      date: string;         // ISO yyyy-mm-dd
    }
  | { type: "switch_tab"; tab: AppTab }
  | { type: "settle_up" }
  | { type: "unknown"; message: string };

// ─── Validation ───────────────────────────────────────────────────────────────

const VALID_TABS = new Set<string>(["participants", "expenses", "settlement"]);
const VALID_CURRENCIES = new Set<string>(CURRENCIES);

function unknown(message: string): AIAction {
  return { type: "unknown", message };
}

/**
 * Validates a raw parsed-JSON value and narrows it to AIAction.
 * Returns { type: "unknown" } for any invalid shape so callers never
 * have to deal with exceptions from bad API output.
 */
export function parseAIAction(raw: unknown): AIAction {
  if (typeof raw !== "object" || raw === null) {
    return unknown("Response was not a JSON object.");
  }

  const obj = raw as Record<string, unknown>;

  switch (obj.type) {
    case "add_participant": {
      if (typeof obj.name !== "string" || !obj.name.trim()) {
        return unknown("add_participant requires a non-empty name.");
      }
      return { type: "add_participant", name: obj.name.trim() };
    }

    case "add_expense": {
      const { description, amount, currency, paidBy, splitAmong, date } = obj;

      if (typeof description !== "string" || !description.trim()) {
        return unknown("add_expense requires a non-empty description.");
      }
      if (typeof amount !== "number" || amount <= 0 || !isFinite(amount)) {
        return unknown("add_expense requires a positive number for amount.");
      }
      if (typeof currency !== "string" || !VALID_CURRENCIES.has(currency)) {
        return unknown(
          `add_expense currency must be one of: ${CURRENCIES.join(", ")}.`
        );
      }
      if (typeof paidBy !== "string" || !paidBy) {
        return unknown("add_expense requires paidBy (participant id).");
      }
      if (
        !Array.isArray(splitAmong) ||
        splitAmong.length === 0 ||
        !splitAmong.every((x) => typeof x === "string")
      ) {
        return unknown(
          "add_expense requires a non-empty splitAmong array of participant ids."
        );
      }

      const resolvedDate =
        typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
          ? date
          : new Date().toISOString().slice(0, 10);

      return {
        type: "add_expense",
        description: (description as string).trim(),
        amount: Math.round((amount as number) * 100) / 100,
        currency: currency as string,
        paidBy: paidBy as string,
        splitAmong: splitAmong as string[],
        date: resolvedDate,
      };
    }

    case "switch_tab": {
      if (typeof obj.tab !== "string" || !VALID_TABS.has(obj.tab)) {
        return unknown(
          `switch_tab requires tab to be one of: participants, expenses, settlement.`
        );
      }
      return { type: "switch_tab", tab: obj.tab as AppTab };
    }

    case "settle_up": {
      return { type: "settle_up" };
    }

    case "unknown": {
      return {
        type: "unknown",
        message:
          typeof obj.message === "string" ? obj.message : "Unknown action.",
      };
    }

    default: {
      return unknown(
        `Unrecognized action type: "${String(obj.type)}".`
      );
    }
  }
}
