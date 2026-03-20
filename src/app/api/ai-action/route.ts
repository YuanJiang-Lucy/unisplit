import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { parseAIAction } from "@/lib/aiActions";
import { CURRENCIES } from "@/lib/types";
import type { Participant, Expense } from "@/lib/types";
import {
  shouldUseRetrieval,
  retrieveRelevantExpenses,
  type RetrievedExpense,
} from "@/lib/retrieveExpenses";

const client = new Anthropic();

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(
  participants: Participant[],
  expenses: Expense[],
  /** Pre-scored relevant expenses from the retrieval layer. Empty when retrieval was skipped. */
  retrieved: RetrievedExpense[] = []
): string {
  const today = new Date().toISOString().slice(0, 10);

  const participantList =
    participants.length > 0
      ? participants.map((p) => `  • "${p.name}" → id: ${p.id}`).join("\n")
      : "  (no participants yet)";

  const recentExpenses =
    expenses.length > 0
      ? [...expenses]
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 5)
          .map((e) => `  • "${e.description}" ${e.currency} ${e.amount}`)
          .join("\n")
      : "  (no expenses yet)";

  // Only added to the prompt when retrieval was triggered.
  // Each line is the pre-rendered summary string from RetrievedExpense.
  const retrievalSection =
    retrieved.length > 0
      ? `
## Retrieved Similar Expenses (contextual hints only)
The following expenses were retrieved because the user's input appears to reference past activity.
Use them as hints to interpret vague phrases like "same as last time" or "the usual group".

${retrieved.map((r, i) => `${i + 1}. ${r.summary}`).join("\n")}

Important:
- These are hints only. The user's current input always takes priority.
- Do NOT copy a retrieved expense blindly — apply any changes the user mentions (new amount, new description, different payer, etc.).
- If the retrieved context still leaves the request ambiguous or a required field is missing, return {"type":"unknown","message":"..."}.
`
      : "";

  return `\
You are a data-entry assistant for UniSplit, an expense-splitting app.

## Current State
Participants:
${participantList}

Recent expenses (last 5):
${recentExpenses}

Valid currencies: ${CURRENCIES.join(", ")}
Today's date: ${today}
${retrievalSection}
## Task
Interpret the user's natural-language input and return EXACTLY ONE JSON object.
Output ONLY the raw JSON — no markdown, no code fences, no explanation.

## Output Schemas

### 1. Add a participant
{"type":"add_participant","name":"<string>"}

### 2. Add an expense
{"type":"add_expense","description":"<string>","amount":<number>,"currency":"<currency>","paidBy":"<participant_id>","splitAmong":["<participant_id>",...],"date":"<YYYY-MM-DD>"}

Rules for add_expense:
- Resolve participant names to their IDs from the list above.
- "split equally" / "split between everyone" → include ALL participant ids in splitAmong.
- If no date is mentioned, use today: ${today}.
- paidBy and splitAmong must contain participant IDs, not names.

### 3. Switch to a tab
{"type":"switch_tab","tab":"participants"|"expenses"|"settlement"}

### 4. Settle up (navigate to settlement view)
{"type":"settle_up"}

### 5. Cannot understand or missing required info
{"type":"unknown","message":"<brief explanation of what is missing or unclear>"}

## Hard Rules
- Output ONLY the JSON object. Nothing else whatsoever.
- Supported actions: add_participant, add_expense, switch_tab, settle_up.
- If a participant name does not match any entry in the list above, return unknown.
- If the amount is missing or ambiguous, return unknown.
- Never invent participant IDs. Only use IDs from the Current State above.
- Do not remove or edit participants or expenses — those actions are not supported yet.`;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      prompt?: unknown;
      participants?: unknown;
      expenses?: unknown;
    };

    const { prompt, participants = [], expenses = [] } = body;

    if (typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    const typedParticipants = participants as Participant[];
    const typedExpenses = expenses as Expense[];

    // ── Retrieval layer ──────────────────────────────────────────────────────
    // Check whether the prompt contains referential language ("same as last time",
    // "the usual group", etc.) before calling Claude. If yes, retrieve the top
    // matching expenses and inject them into the system prompt as contextual hints.
    // This runs entirely in-process — no external service, no added latency beyond
    // the array scan itself.
    const useRetrieval = shouldUseRetrieval(prompt.trim());
    const retrieved = useRetrieval
      ? retrieveRelevantExpenses(prompt.trim(), typedExpenses, 3, typedParticipants)
      : [];

    if (useRetrieval) {
      console.log(
        `[ai-action] retrieval triggered — ${retrieved.length} result(s):`,
        retrieved.map((r) => `"${r.expense.description}" (score ${r.score.toFixed(2)})`)
      );
    }

    // ── Claude call ──────────────────────────────────────────────────────────
    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 512,
      system: buildSystemPrompt(typedParticipants, typedExpenses, retrieved),
      messages: [{ role: "user", content: prompt.trim() }],
    });

    // Extract text, stripping accidental whitespace
    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    // Parse and validate the JSON response
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      console.error("[ai-action] Non-JSON response:", text);
      return NextResponse.json({
        action: { type: "unknown", message: "AI returned a non-JSON response." },
        retrievalUsed: useRetrieval,
        retrievedCount: retrieved.length,
      });
    }

    const action = parseAIAction(raw);

    // ── Response ─────────────────────────────────────────────────────────────
    // retrievalUsed / retrievedCount are optional debug fields.
    // The frontend only reads `action`, so these extra fields are safe to include.
    return NextResponse.json({
      action,
      retrievalUsed: useRetrieval,
      retrievedCount: retrieved.length,
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "Rate limited. Please try again shortly." },
        { status: 429 }
      );
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `Claude API error: ${err.message}` },
        { status: 502 }
      );
    }
    console.error("[ai-action] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
