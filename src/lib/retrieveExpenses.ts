/**
 * Lightweight lexical retrieval for the AI agent.
 *
 * Purpose: help Claude interpret vague or referential prompts such as
 *   "same as last time", "use the usual three people", "like the previous dinner".
 *
 * Design constraints:
 *   - No vector database, no embeddings, no external service.
 *   - Pure in-memory keyword scoring + recency boost over the existing expense list.
 *   - Retrieved results are injected into the system prompt as contextual hints only.
 */

import type { Expense, Participant } from "./types";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface RetrievedExpense {
  expense: Expense;
  /** Combined score: keywordOverlap * 2 + recencyBoost (0–1). */
  score: number;
  /** One-line human-readable description injected into the prompt. */
  summary: string;
}

// ─── Retrieval trigger ────────────────────────────────────────────────────────

/**
 * Detect whether the prompt contains referential or vague language that
 * would benefit from historical context.
 *
 * We use a phrase-level check (not individual tokens) to reduce false positives.
 * Plain explicit inputs like "Alice paid 50 USD for coffee" return false and
 * skip retrieval entirely, keeping the common path fast and cheap.
 */
const REFERENTIAL_PHRASES = [
  "same as",
  "same split",
  "same group",
  "same people",
  "last time",
  "as before",
  "like before",
  "like last",
  "like our last",
  "like the last",
  "like our previous",
  "similar to",
  "similar expense",
  "previous",
  "last trip",
  "last dinner",
  "last outing",
  "as usual",
  "the usual",
  "the normal",
  "normally",
  "typically",
  "do it again",
  "same again",
];

export function shouldUseRetrieval(prompt: string): boolean {
  const lower = prompt.toLowerCase();
  return REFERENTIAL_PHRASES.some((phrase) => lower.includes(phrase));
}

// ─── Tokenization ─────────────────────────────────────────────────────────────

/**
 * Common English stop words plus the retrieval trigger words themselves.
 * The trigger words (same, last, usual…) are what fired retrieval — they won't
 * appear in expense descriptions, so excluding them from keyword matching keeps
 * scores clean.
 */
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "as", "is", "was", "are", "were", "be", "been",
  "this", "that", "it", "its", "i", "we", "our", "my", "your", "their",
  "have", "had", "has", "do", "did", "does", "will", "would", "could",
  "should", "may", "might", "can", "just", "also", "use", "add",
  // retrieval trigger words — present in prompts, absent from descriptions
  "same", "last", "time", "like", "usual", "similar", "previous",
  "again", "before", "normally", "typically",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

// ─── Searchable text builder ──────────────────────────────────────────────────

/**
 * Concatenate all meaningful fields of an expense into a single string so
 * keyword matching can work across description, participant names, currency,
 * and date parts.
 *
 * Participant IDs are resolved to names when the participants list is provided.
 */
function buildSearchableText(
  expense: Expense,
  participants: Participant[]
): string {
  const nameOf = (id: string) =>
    participants.find((p) => p.id === id)?.name ?? id;

  const parts = [
    expense.description,
    nameOf(expense.paidBy),
    ...expense.splitAmong.map(nameOf),
    expense.currency,
    expense.date,                              // "2026-03-05" → tokens: "2026", "03", "05"
    expense.date.slice(0, 7),                  // "2026-03" for month-level matching
  ];

  return parts.join(" ");
}

// ─── Summary serializer ───────────────────────────────────────────────────────

/**
 * Produce a concise one-liner for the prompt context section.
 * Example: `"Group dinner" — USD 120.00 on 2026-03-01, paid by Alice, split 4 ways (Alice, Liang, Yuki, Sofia)`
 */
function serializeExpense(
  expense: Expense,
  participants: Participant[]
): string {
  const nameOf = (id: string) =>
    participants.find((p) => p.id === id)?.name ?? id;

  const splitNames = expense.splitAmong.map(nameOf).join(", ");
  const splitLabel =
    expense.splitAmong.length === 1
      ? "1 way"
      : `${expense.splitAmong.length} ways`;

  return (
    `"${expense.description}" — ${expense.currency} ${expense.amount.toFixed(2)}` +
    ` on ${expense.date}, paid by ${nameOf(expense.paidBy)},` +
    ` split ${splitLabel} (${splitNames})`
  );
}

// ─── Recency boost ────────────────────────────────────────────────────────────

/**
 * Build a map of expense.id → recency score in [0, 1].
 * The most recent expense gets 1.0; the oldest gets 0.0.
 * All others are linearly interpolated.
 *
 * Uses ISO date strings directly (lexicographic comparison is correct for
 * yyyy-mm-dd format).
 */
function buildRecencyMap(expenses: Expense[]): Map<string, number> {
  if (expenses.length === 0) return new Map();
  if (expenses.length === 1) return new Map([[expenses[0].id, 1.0]]);

  const sorted = [...expenses].sort((a, b) => a.date.localeCompare(b.date));
  const oldest = sorted[0].date;
  const newest = sorted[sorted.length - 1].date;

  // Convert yyyy-mm-dd → numeric days since epoch for normalization
  const toDay = (d: string) => Math.floor(Date.parse(d) / 86_400_000);
  const minDay = toDay(oldest);
  const maxDay = toDay(newest);
  const range = maxDay - minDay || 1; // avoid div-by-zero when all dates are equal

  const map = new Map<string, number>();
  for (const e of expenses) {
    map.set(e.id, (toDay(e.date) - minDay) / range);
  }
  return map;
}

// ─── Main retrieval function ──────────────────────────────────────────────────

/**
 * Score all expenses against the prompt and return the top `limit` matches.
 *
 * Scoring formula:
 *   score = (keywordOverlap × 2) + recencyBoost
 *
 * - keywordOverlap: number of prompt tokens that appear in the expense's
 *   searchable text (description + participant names + currency + date).
 *   Weight × 2 makes a single description match worth more than full recency.
 *
 * - recencyBoost: normalized 0–1, newest = 1. Ensures that purely referential
 *   prompts ("same as last time", zero keyword overlap) still surface the most
 *   recent expenses rather than returning nothing useful.
 *
 * @param prompt   The raw user input.
 * @param expenses The full expense list from localStorage state.
 * @param limit    Maximum number of results to return (default 3).
 * @param participants Optional participant list for name resolution.
 */
export function retrieveRelevantExpenses(
  prompt: string,
  expenses: Expense[],
  limit = 3,
  participants: Participant[] = []
): RetrievedExpense[] {
  if (expenses.length === 0) return [];

  const promptTokens = tokenize(prompt);
  const recencyMap = buildRecencyMap(expenses);

  const scored: RetrievedExpense[] = expenses.map((expense) => {
    const searchableTokens = tokenize(
      buildSearchableText(expense, participants)
    );

    // Count how many prompt tokens appear anywhere in the expense's text
    const keywordOverlap = promptTokens.filter((t) =>
      searchableTokens.includes(t)
    ).length;

    const recencyBoost = recencyMap.get(expense.id) ?? 0;

    // Keyword matches are weighted 2× — a single description match is more
    // meaningful than the recency bonus alone.
    const score = keywordOverlap * 2 + recencyBoost;

    return {
      expense,
      score,
      summary: serializeExpense(expense, participants),
    };
  });

  // Sort by score descending; break ties by date (most recent first)
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.expense.date.localeCompare(a.expense.date);
  });

  return scored.slice(0, limit);
}
