"use client";
import { useEffect, useRef, useState } from "react";
import { Sparkles, X, ArrowUp } from "lucide-react";
import { api } from "@/lib/client";
import { cx } from "./ui";

const SUGGESTIONS = {
  admin: ["How many active employees are there?", "What was last month's payroll cost?", "Who came late most often this month?"],
  hr: ["Who is on leave today?", "What is this month's attendance rate?", "Who came late most often this month?"],
  employee: ["How many sick leaves do I have left?", "How many times was I late this month?", "When is someone marked half day?"],
};

export function AiPanel({ open, onClose, role }) {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  async function send(q) {
    const content = (q ?? text).trim();
    if (!content || busy) return;
    const next = [...msgs, { role: "user", content }];
    setMsgs(next);
    setText("");
    setBusy(true);
    try {
      const { answer, fallback, detail } = await api("/api/ai/chat", { method: "POST", body: { messages: next } });
      setMsgs([...next, fallback ? { role: "assistant", content: `${answer}${detail ? `\n${detail}` : ""}`, error: true } : { role: "assistant", content: answer }]);
    } catch (e) {
      setMsgs([...next, { role: "assistant", content: e.message, error: true }]);
    }
    setBusy(false);
  }

  return (
    <div className={cx("fixed inset-0 z-40 transition-[visibility] duration-200", open ? "visible" : "invisible")}>
      <div className={cx("absolute inset-0 bg-black/20 transition-opacity duration-200 lg:bg-transparent", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <aside className={cx(
        "absolute right-0 top-0 bottom-0 w-full sm:w-[420px] bg-surface border-l border-border flex flex-col transition-transform duration-200 ease-out",
        open ? "translate-x-0" : "translate-x-full",
      )}>
        <div className="h-14 flex items-center gap-2 px-4 border-b border-border">
          <Sparkles size={16} strokeWidth={1.5} className="text-accent" />
          <p className="text-[13px] font-medium flex-1">Assistant</p>
          <span className="text-[11px] text-muted num">⌘J</span>
          <button onClick={onClose} className="p-1.5 text-muted hover:text-fg"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
          {msgs.length === 0 && (
            <div className="rise">
              <p className="serif text-[28px] leading-tight">Ask about your<br />{role === "employee" ? "attendance, leave and pay." : "people and numbers."}</p>
              <p className="text-[12px] text-muted mt-2">Answers come from live records{role === "employee" ? " — only your own." : "."}</p>
              <div className="mt-6 space-y-1.5">
                {SUGGESTIONS[role].map((s) => (
                  <button key={s} onClick={() => send(s)} className="w-full text-left text-[13px] px-3 py-2 rounded-[6px] border border-border hover:bg-subtle transition-colors">{s}</button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={cx("rise", m.role === "user" && "flex justify-end")}>
              {m.role === "user" ? (
                <p className="max-w-[85%] text-[13px] bg-subtle rounded-[10px] px-3 py-2">{m.content}</p>
              ) : (
                <div>
                  <p className={cx("text-[13px] leading-relaxed whitespace-pre-wrap", m.error && "text-bad")}>{m.content}</p>
                  {!m.error && <p className="text-[11px] text-muted mt-1.5 flex items-center gap-1"><Sparkles size={10} /> AI-generated</p>}
                </div>
              )}
            </div>
          ))}
          {busy && (
            <div className="flex gap-1 py-2">
              {[0, 1, 2].map((i) => <span key={i} className="size-1.5 rounded-full bg-muted animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />)}
            </div>
          )}
          <div ref={end} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-3 border-t border-border">
          <div className="flex items-end gap-2 rounded-[8px] border border-border bg-bg px-3 py-2 focus-within:border-fg/30">
            <textarea
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask anything…"
              className="flex-1 resize-none bg-transparent text-[13px] outline-none placeholder:text-muted max-h-32 py-1"
            />
            <button disabled={!text.trim() || busy} className="size-7 grid place-items-center rounded-[6px] bg-fg text-bg disabled:opacity-30"><ArrowUp size={14} /></button>
          </div>
        </form>
      </aside>
    </div>
  );
}
