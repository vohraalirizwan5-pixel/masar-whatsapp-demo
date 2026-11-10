# Masar Cloud Labs: Arabic AI customer-service agent (client demo)

A live demo of a WhatsApp-style customer-service agent for a **fictional** store, Rimal Home (رمال هوم).
It replies in Gulf Arabic or English, looks up orders and shipments, opens returns, applies a refund-approval
rule and hands over to a person. All customers and orders are sample data in `src/lib/data.ts`.

**Stack:** Next.js 15 · TypeScript · Claude API (tool use) · Vercel

## Try these in the demo

| Ask about | What the agent shows |
|---|---|
| `RH-10482` | A shipment waiting at the local warehouse, with its ETA |
| `RH-10390` | A delayed order, explained with the carrier's reason |
| `RH-10233` (delivered 9 days ago) | A return opened within the 14-day window |
| `RH-10301` (6,200 wardrobe) | A refund over 2,000 sent for manager approval instead of auto-approved |
| "I want to talk to a person" | A hand-over to a human agent |

Write in Gulf Arabic or English; the agent answers in the language you use.

## Run locally

1. Copy `.env.example` to `.env.local` and set `ANTHROPIC_API_KEY` (a workspace-scoped key).
2. `npm install`, then `npm run dev`, then open http://localhost:3000.

## How it works

- `src/app/api/chat/route.ts`: the only place the key is used. Calls `claude-opus-5-5` (effort `low`) with three tools,
  runs the tool loop, and returns the conversation history append-only. Server-side refusal fallback is on
  (`fallbacks: "default"`).
- `src/lib/tools.ts`: `lookup_order`, `create_return_request` (14-day window; refunds over 2,000 need a manager),
  `handoff_to_human`. The rules live in code, not in the prompt, so the model cannot talk its way past them.
- `src/app/page.tsx`: the chat, with a strip under each reply showing what the agent did, plus a presenter guide.

## Guards for a public link

- `DEMO_PASSCODE` (optional): visitors must enter it before chatting.
- 20 customer messages per conversation, 1,000 characters per message.
- Set a monthly spend limit on the key's workspace in the Anthropic Console.

## Deploy (Vercel)

Import the repo in Vercel, add `ANTHROPIC_API_KEY` (and `DEMO_PASSCODE` if wanted) under Environment Variables, deploy.
