"use client";

import { useEffect, useRef, useState } from "react";

interface TraceStep {
  label: string;
  detail?: string;
}

interface Bubble {
  from: "customer" | "agent" | "system";
  text: string;
  time: string;
  trace?: TraceStep[];
}

const MASAR_URL = "https://masar-cloud-labs-site.vercel.app";

const SAMPLE_ORDERS = [
  { id: "RH-10482", who: "فيصل · Dammam", state: "At local warehouse, arrives tomorrow" },
  { id: "RH-10517", who: "مريم · Dubai", state: "Out for delivery today" },
  { id: "RH-10390", who: "عبدالله · Riyadh", state: "Delayed 3 days" },
  { id: "RH-10301", who: "خالد · Jeddah", state: "Wardrobe 6,200, delivered 3 days ago" },
  { id: "RH-10233", who: "نور · Abu Dhabi", state: "Delivered 9 days ago" },
];

const PROMPTS: { label: string; text: string }[] = [
  { label: "Track a shipment", text: "السلام عليكم، أبي أعرف وين وصلت شحنتي؟ رقم الطلب 10482" },
  { label: "Delayed order, upset", text: "وش السالفة؟ الطلب RH-10390 متأخر وأنا دافع ومنتظر من أسبوعين!" },
  { label: "Return within policy", text: "مرحبا، ابا أرجع الأباجورة، طلبي RH-10233. وحدة منهم لونها مو نفس الصورة" },
  { label: "Refund needs approval", text: "I want to return the wardrobe from order RH-10301, it doesn't fit the room. I need a full refund" },
  { label: "Find order by phone", text: "هلا، ما عندي رقم الطلب بس رقمي 050 233 8714، متى يوصل الكنب؟" },
  { label: "Policy question", text: "عندكم تركيب مجاني للسرير في جدة؟" },
];

function clock(): string {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

const GREETING: Bubble = {
  from: "system",
  text: "This is a live AI demo for a fictional store, Rimal Home. Orders and customers are sample data. Write in Gulf Arabic or English.",
  time: "",
};

export default function Page() {
  const [bubbles, setBubbles] = useState<Bubble[]>([GREETING]);
  const [history, setHistory] = useState<unknown[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [needPasscode, setNeedPasscode] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("demo-passcode");
      if (saved) setPasscode(saved);
    } catch {}
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [bubbles, busy]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setDraft("");
    setGuideOpen(false);
    setBubbles((b) => [...b, { from: "customer", text: message, time: clock() }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history, message, passcode }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setNeedPasscode(true);
        setBubbles((b) => b.slice(0, -1));
        setDraft(message);
        return;
      }
      if (!res.ok) {
        setBubbles((b) => [...b, { from: "system", text: data.error ?? "Something went wrong.", time: "" }]);
        return;
      }
      setHistory(data.history);
      setBubbles((b) => [...b, { from: "agent", text: data.reply, time: clock(), trace: data.trace }]);
    } catch {
      setBubbles((b) => [...b, { from: "system", text: "Network error. Check the connection and try again.", time: "" }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  function reset() {
    setBubbles([GREETING]);
    setHistory([]);
    setDraft("");
  }

  function savePasscode(e: React.FormEvent) {
    e.preventDefault();
    try {
      sessionStorage.setItem("demo-passcode", passcode);
    } catch {}
    setNeedPasscode(false);
  }

  return (
    <div className="shell">
      <aside className={`guide ${guideOpen ? "open" : ""}`} aria-label="Demo guide">
        <div className="brand">
          <span className="brand-mark" aria-hidden>M</span>
          <div>
            <div className="brand-name">Masar Cloud Labs</div>
            <div className="brand-sub">AI Agents &amp; Automation</div>
          </div>
        </div>

        <h1>Arabic customer-service agent</h1>
        <p className="lede">
          A live AI agent that replies in Gulf Arabic or English, checks real order and shipment records, follows the
          store&apos;s return and approval rules, and hands over to a person when it should.
        </p>

        <h2>Try one</h2>
        <div className="prompts">
          {PROMPTS.map((p) => (
            <button key={p.label} className="prompt" onClick={() => send(p.text)} disabled={busy}>
              <span className="prompt-label">{p.label}</span>
              <span className="prompt-text" dir="auto">{p.text}</span>
            </button>
          ))}
        </div>

        <h2>Sample orders</h2>
        <ul className="orders">
          {SAMPLE_ORDERS.map((o) => (
            <li key={o.id}>
              <code>{o.id}</code>
              <span dir="auto">{o.who}</span>
              <span className="muted">{o.state}</span>
            </li>
          ))}
        </ul>

        <p className="fine">
          Rule shown in the demo: refunds above 2,000 need a manager, so the agent hands over instead of approving.
          Sample data only; no real customers.
        </p>
        <a className="cta" href={MASAR_URL} target="_blank" rel="noreferrer">
          Build one for your business →
        </a>
      </aside>

      <main className="phone">
        <header className="chat-head">
          <button className="guide-toggle" onClick={() => setGuideOpen((v) => !v)} aria-expanded={guideOpen}>
            {guideOpen ? "Close" : "Guide"}
          </button>
          <span className="avatar" aria-hidden>ر</span>
          <div className="head-text">
            <div className="head-name">رمال هوم · Rimal Home</div>
            <div className="head-sub">{busy ? "typing…" : "AI assistant · online"}</div>
          </div>
          <button className="new-chat" onClick={reset} disabled={busy}>New chat</button>
        </header>

        <div className="thread" aria-live="polite">
          {bubbles.map((b, i) =>
            b.from === "system" ? (
              <div key={i} className="notice">{b.text}</div>
            ) : (
              <div key={i} className={`row ${b.from}`}>
                <div className="bubble">
                  <div className="text" dir="auto">{b.text}</div>
                  <div className="time">{b.time}</div>
                </div>
                {b.trace && b.trace.length > 0 && (
                  <div className="trace">
                    {b.trace.map((t, j) => (
                      <span key={j} className="step" title={t.detail}>
                        <span className="tick" aria-hidden>✓</span>
                        {t.label}
                        {t.detail ? <span className="detail"> · {t.detail}</span> : null}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ),
          )}
          {busy && (
            <div className="row agent">
              <div className="bubble typing" aria-label="Assistant is typing">
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
          <textarea
            ref={inputRef}
            dir="auto"
            rows={1}
            value={draft}
            maxLength={1000}
            placeholder="اكتب رسالة · Type a message"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(draft);
              }
            }}
          />
          <button type="submit" className="send" disabled={busy || !draft.trim()} aria-label="Send">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
              <path d="M3 20.5 21 12 3 3.5v6.6l12 1.9-12 1.9z" fill="currentColor" />
            </svg>
          </button>
        </form>
      </main>

      {needPasscode && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="pc-title">
          <form onSubmit={savePasscode}>
            <h2 id="pc-title">Demo passcode</h2>
            <p>Masar Cloud Labs shares this passcode with you when we run the demo.</p>
            <input type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} autoFocus />
            <button type="submit">Continue</button>
          </form>
        </div>
      )}
    </div>
  );
}
