import type Anthropic from "@anthropic-ai/sdk";
import { findOrder, gulfToday, STORE } from "./data";

// Refunds above this need a person to approve them: the "follows your approval rules" part of the demo.
export const REFUND_APPROVAL_LIMIT_AED = 2000;
const RETURN_WINDOW_DAYS = 14;

export const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "lookup_order",
    description:
      "Look up a customer's order in the store's order system (ERP) and the carrier's live shipment status. Use it whenever the customer asks about an order, delivery, shipment, payment or items. Search by order number (e.g. RH-10482 or 10482) or by the phone number on the order. Never guess order details: if nothing is found, ask the customer to check the number.",
    input_schema: {
      type: "object",
      properties: {
        order_id: { type: "string", description: "Order number, e.g. RH-10482. Omit if unknown." },
        phone: { type: "string", description: "Phone number on the order, any format. Omit if unknown." },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "create_return_request",
    description: `Open a return request for a delivered order. The system checks the ${RETURN_WINDOW_DAYS}-day return window and the refund approval rule itself and tells you the outcome; report that outcome to the customer exactly. Call lookup_order first so you have the right order number, and confirm with the customer what they want to return and why before calling this.`,
    input_schema: {
      type: "object",
      properties: {
        order_id: { type: "string", description: "Order number, e.g. RH-10233." },
        reason: { type: "string", description: "The customer's reason, in a few words (English)." },
      },
      required: ["order_id", "reason"],
      additionalProperties: false,
    },
  },
  {
    name: "handoff_to_human",
    description:
      "Hand the conversation to a human customer-service agent. Use it when the customer asks for a person, is upset or complaining strongly, reports damage or a safety issue, wants something outside policy (a discount, compensation, an exception), or when a refund needs approval. Write the summary so the human does not have to ask the customer to repeat anything.",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Why a person is needed, in a few words (English)." },
        summary: { type: "string", description: "Short summary for the human agent (English): who, which order, what was tried, what the customer wants." },
        order_id: { type: "string", description: "Order number, if known." },
      },
      required: ["reason", "summary"],
      additionalProperties: false,
    },
  },
];

/** One line in the "what the agent did" strip under a reply. */
export interface TraceStep {
  label: string;
  detail?: string;
}

export interface ToolOutcome {
  result: string; // JSON text sent back to the model
  isError?: boolean;
  trace: TraceStep[];
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);

export function runTool(name: string, input: unknown): ToolOutcome {
  const args = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;

  switch (name) {
    case "lookup_order": {
      const orderId = str(args.order_id);
      const phone = str(args.phone);
      if (!orderId && !phone) {
        return { result: JSON.stringify({ error: "Give an order number or a phone number." }), isError: true, trace: [] };
      }
      const order = findOrder({ orderId, phone });
      if (!order) {
        return {
          result: JSON.stringify({ found: false, searched: { order_id: orderId, phone } }),
          trace: [{ label: "Looked up order in ERP", detail: "no match" }],
        };
      }
      return {
        result: JSON.stringify({ found: true, today: gulfToday().toISOString().slice(0, 10), order }),
        trace: [
          { label: "Looked up order in ERP", detail: order.id },
          { label: "Checked carrier status", detail: `${order.shipment.carrier}: ${order.shipment.status.replace(/_/g, " ")}` },
        ],
      };
    }

    case "create_return_request": {
      const orderId = str(args.order_id);
      const reason = str(args.reason) ?? "not given";
      const order = orderId ? findOrder({ orderId }) : undefined;
      if (!order) {
        return { result: JSON.stringify({ error: "Order not found. Look it up first." }), isError: true, trace: [] };
      }
      if (order.shipment.status !== "delivered") {
        return {
          result: JSON.stringify({ created: false, why: "Order not delivered yet, so it cannot be returned. The customer can refuse delivery or ask a person to cancel." }),
          trace: [{ label: "Checked return policy", detail: "not delivered yet" }],
        };
      }
      const deliveredOn = new Date(order.shipment.eta.slice(0, 10) + "T00:00:00Z");
      const daysSince = Math.round((gulfToday().getTime() - deliveredOn.getTime()) / 86400_000);
      if (daysSince > RETURN_WINDOW_DAYS) {
        return {
          result: JSON.stringify({ created: false, why: `Delivered ${daysSince} days ago; the return window is ${RETURN_WINDOW_DAYS} days. Offer to hand over to a person if the customer wants an exception.` }),
          trace: [{ label: "Checked return policy", detail: `${daysSince} days, outside window` }],
        };
      }
      const refund = order.items.reduce((sum, i) => sum + i.qty * i.priceAed, 0);
      const ticket = `RT-${order.id.slice(3)}-${Math.floor(100 + Math.random() * 900)}`;
      const needsApproval = refund > REFUND_APPROVAL_LIMIT_AED;
      return {
        result: JSON.stringify({
          created: true,
          ticket,
          reason,
          refund_amount: refund,
          currency: order.country === "KSA" ? "SAR" : "AED",
          status: needsApproval ? "pending_manager_approval" : "approved",
          next_steps: needsApproval
            ? `Refund is above ${REFUND_APPROVAL_LIMIT_AED}, so a manager must approve it within one working day. Hand over to a person as well.`
            : `Courier will collect the item within 2 working days. ${STORE.policies.returns}`,
        }),
        trace: [
          { label: "Checked return policy", detail: `${daysSince} days since delivery, within ${RETURN_WINDOW_DAYS}` },
          { label: needsApproval ? "Sent refund for manager approval" : "Created return request", detail: ticket },
        ],
      };
    }

    case "handoff_to_human": {
      const ref = `HO-${Math.floor(1000 + Math.random() * 9000)}`;
      return {
        result: JSON.stringify({
          handed_over: true,
          reference: ref,
          expected_reply: "A member of the team will reply in this chat within 15 minutes during working hours (Sun-Thu 9:00-18:00 Gulf time), otherwise first thing next working day.",
        }),
        trace: [{ label: "Handed over to a person", detail: `${ref}: ${str(args.reason) ?? "requested"}` }],
      };
    }

    default:
      return { result: JSON.stringify({ error: `Unknown tool ${name}` }), isError: true, trace: [] };
  }
}
