import { useEffect, useState } from "react";

interface BlinkButtonProps {
  onBlink: () => void;
  disabled?: boolean;
}

export function BlinkButton({ onBlink, disabled }: BlinkButtonProps) {
  const [blinking, setBlinking] = useState(false);

  const trigger = () => {
    if (disabled || blinking) return;
    onBlink();
    setBlinking(true);
  };

  useEffect(() => {
    if (!blinking) return;
    const t = setTimeout(() => setBlinking(false), 350);
    return () => clearTimeout(t);
  }, [blinking]);

  return (
    <button
      onClick={trigger}
      disabled={disabled || blinking}
      className={`relative flex h-20 w-full items-center justify-center gap-3 rounded-2xl
        border-2 font-semibold uppercase tracking-widest transition-all duration-150
        ${disabled
          ? "border-slate-700/40 bg-slate-900/40 text-slate-600"
          : blinking
            ? "border-amber-300 bg-amber-400/20 text-amber-200 scale-95"
            : "border-amber-500/60 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 active:scale-95"}
      `}
    >
      <EyeIcon open={!blinking} />
      <span>{blinking ? "Blinking" : "Blink"}</span>
    </button>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg width="28" height="22" viewBox="0 0 28 22" fill="none" className="shrink-0">
      <path
        d="M1 11C4 5 9 2 14 2C19 2 24 5 27 11C24 17 19 20 14 20C9 20 4 17 1 11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {open ? (
        <circle cx="14" cy="11" r="4" fill="currentColor" />
      ) : (
        <path d="M6 11C9 14 19 14 22 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      )}
    </svg>
  );
}
