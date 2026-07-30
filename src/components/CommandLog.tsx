import { useEffect, useRef } from "react";

export interface LogEntry {
  id: number;
  time: string;
  direction: "tx" | "rx";
  text: string;
}

interface CommandLogProps {
  entries: LogEntry[];
}

export function CommandLog({ entries }: CommandLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  return (
    <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950/60">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Command Log
        </span>
        <span className="text-[10px] text-slate-600">{entries.length} entries</span>
      </div>
      <div
        ref={scrollRef}
        className="h-40 overflow-y-auto px-4 py-2 font-mono text-xs space-y-1"
      >
        {entries.length === 0 ? (
          <p className="text-slate-600 italic">No commands sent yet.</p>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="flex gap-2">
              <span className="text-slate-600 shrink-0">{e.time}</span>
              <span className={`shrink-0 ${e.direction === "tx" ? "text-cyan-500" : "text-emerald-500"}`}>
                {e.direction === "tx" ? "→" : "←"}
              </span>
              <span className={e.direction === "tx" ? "text-cyan-200" : "text-emerald-200"}>
                {e.text}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
