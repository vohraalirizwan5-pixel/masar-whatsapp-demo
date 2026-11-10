import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { STORE } from "../../../lib/data";
import { REFUND_APPROVAL_LIMIT_AED, runTool, TOOLS, type TraceStep } from "../../../lib/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-opus-5-5";
const MAX_USER_TURNS = 20; // per conversation: keeps one demo from running up the bill
const MAX_MESSAGE_CHARS = 1000;
const MAX_TOOL_ROUNDS = 6;

// Frozen system prompt: no dates or per-request values here, so it caches.
// "Today" reaches the model through lookup_order's result instead.
const SYSTEM = `You are the WhatsApp customer-service assistant for ${STORE.name} (${STORE.nameAr}), ${STORE.description}

Language and tone
- Reply in the customer's language and dialect. If they write Gulf Arabic (Khaleeji, Emirati, Saudi), reply in natural Gulf Arabic, not formal MSA. If they write English, reply in English. If they mix, follow their lead.
- Return greetings properly (e.g. وعليكم السلام).
- This is WhatsApp: short messages, 1-4 sentences, no headings, no markdown tables, at most a short list. Use the customer's first name once you know it.

What you can do
- Look up orders and live shipment status with lookup_order. Always look up before answering about an order; never invent order details, dates, prices or tracking numbers.
- Open returns with create_return_request, after confirming what and why. Report the outcome the system gives you.
- Hand over to a person with handoff_to_human when the customer asks for one, is upset, reports damage, wants an exception or compensation, or a refund needs approval (refunds above ${REFUND_APPROVAL_LIMIT_AED} AED/SAR always need a manager). Tell the customer a person will continue in this chat.
- Answer store-policy questions from the policies below only.

Store policies
- Returns: ${STORE.policies.returns}
- Delivery: ${STORE.policies.delivery}
- Assembly: ${STORE.policies.assembly}
- Hours: ${STORE.policies.hours}

Privacy
- Only share order details after the customer has given the order number or the phone number on it. Do not list other customers' orders.
- Give times in the customer's local time and say the day in words (today, tomorrow, Thursday).

If something is outside what you can do, say so plainly and offer a person.`;

const client = new Anthropic();

interface ChatRequest {
  history?: Anthropic.Beta.BetaMessageParam[];
  message?: string;
  passcode?: string;
}

function userTurns(history: Anthropic.Beta.BetaMessageParam[]): number {
  return history.filter((m) => m.role === "user" && typeof m.content === "string").length;
}

export async function POST(req: Request) {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const required = process.env.DEMO_PASSCODE;
  if (required && body.passcode !== required) {
    return NextResponse.json({ error: "passcode" }, { status: 401 });
  }

  const message = (body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "Empty message." }, { status: 400 });
  if (message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json({ error: `Messages are limited to ${MAX_MESSAGE_CHARS} characters in this demo.` }, { status: 400 });
  }

  const history = Array.isArray(body.history) ? body.history : [];
  if (userTurns(history) >= MAX_USER_TURNS) {
    return NextResponse.json({ error: "This demo conversation has reached its limit. Start a new chat." }, { status: 429 });
  }

  // Append-only: the history comes back exactly as the API returned it, thinking blocks included.
  const messages: Anthropic.Beta.BetaMessageParam[] = [...history, { role: "user", content: message }];
  const trace: TraceStep[] = [];

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        cache_control: { type: "ephemeral" },
        system: SYSTEM,
        tools: TOOLS,
        messages,
      });

      messages.push({ role: "assistant", content: response.content });

      if (response.stop_reason === "refusal") {
        return NextResponse.json({
          history: messages,
          reply: "عذراً، ما أقدر أساعد في هذا الطلب. أحوّلك لأحد من الفريق؟\nSorry, I can't help with that request. Shall I pass you to a member of the team?",
          trace,
        });
      }

      if (response.stop_reason === "pause_turn") continue;

      const toolUses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
      if (response.stop_reason !== "tool_use" || toolUses.length === 0) {
        const reply = response.content
          .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        if (trace.length > 0) trace.push({ label: "Logged to CRM" });
        return NextResponse.json({ history: messages, reply: reply || "…", trace });
      }

      const results: Anthropic.Beta.BetaToolResultBlockParam[] = toolUses.map((tu) => {
        const outcome = runTool(tu.name, tu.input);
        trace.push(...outcome.trace);
        return { type: "tool_result", tool_use_id: tu.id, content: outcome.result, is_error: outcome.isError };
      });
      messages.push({ role: "user", content: results });
    }
    return NextResponse.json({ error: "The assistant took too many steps. Try rephrasing." }, { status: 500 });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("Anthropic auth failed:", error.message);
      return NextResponse.json({ error: "The demo's AI key is not set up correctly." }, { status: 500 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "The AI service is busy. Try again in a few seconds." }, { status: 429 });
    }
    if (error instanceof Anthropic.BadRequestError) {
      console.error("Anthropic bad request:", error.message);
      return NextResponse.json({ error: "The AI service refused the request (check the key's workspace and credit balance)." }, { status: 500 });
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Anthropic API error ${error.status}:`, error.message);
      return NextResponse.json({ error: "The AI service had a problem. Try again." }, { status: 502 });
    }
    console.error(error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
