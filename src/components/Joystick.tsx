import { useCallback, useEffect, useRef, useState } from "react";

interface JoystickProps {
  onChange: (nx: number, ny: number) => void;
  onRelease: () => void;
  disabled?: boolean;
}

const SIZE = 260;
const KNOB = 84;
const MAX_RADIUS = (SIZE - KNOB) / 2;

export function Joystick({ onChange, onRelease, disabled }: JoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const pointerId = useRef<number | null>(null);

  const updateFromPoint = useCallback((clientX: number, clientY: number) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX_RADIUS) {
      dx = (dx / dist) * MAX_RADIUS;
      dy = (dy / dist) * MAX_RADIUS;
    }
    setKnob({ x: dx, y: dy });
    // normalized: x right+, y down+ (screen). For servo: up = y decrease.
    const nx = dx / MAX_RADIUS;
    const ny = dy / MAX_RADIUS;
    onChange(nx, ny);
  }, [onChange]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    pointerId.current = e.pointerId;
    setActive(true);
    updateFromPoint(e.clientX, e.clientY);
  }, [disabled, updateFromPoint]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (pointerId.current !== e.pointerId) return;
    updateFromPoint(e.clientX, e.clientY);
  }, [updateFromPoint]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (pointerId.current !== e.pointerId) return;
    pointerId.current = null;
    setActive(false);
    setKnob({ x: 0, y: 0 });
    onRelease();
  }, [onRelease]);

  useEffect(() => {
    return () => {
      pointerId.current = null;
    };
  }, []);

  const angle = Math.atan2(knob.y, knob.x) * (180 / Math.PI);
  const magnitude = Math.min(1, Math.hypot(knob.x, knob.y) / MAX_RADIUS);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={baseRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative rounded-full border-2 transition-colors touch-none select-none
          ${disabled
            ? "border-slate-700/40 bg-slate-900/40 opacity-50"
            : active
              ? "border-cyan-400/80 bg-slate-900/80 shadow-[0_0_40px_-8px_rgba(34,211,238,0.5)]"
              : "border-slate-700/60 bg-slate-900/60"}
        `}
        style={{ width: SIZE, height: SIZE }}
      >
        {/* crosshair guides */}
        <div className="absolute left-1/2 top-3 bottom-3 w-px -translate-x-1/2 bg-slate-700/40" />
        <div className="absolute top-1/2 left-3 right-3 h-px -translate-y-1/2 bg-slate-700/40" />
        <div className="absolute inset-6 rounded-full border border-slate-700/30" />
        <div className="absolute inset-[60px] rounded-full border border-slate-700/20" />

        {/* center pip */}
        <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-600/60" />

        {/* knob */}
        <div
          className={`absolute rounded-full shadow-lg transition-transform duration-75
            ${active
              ? "bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-cyan-500/40"
              : "bg-gradient-to-br from-slate-600 to-slate-800 shadow-black/40"}
          `}
          style={{
            width: KNOB,
            height: KNOB,
            left: "50%",
            top: "50%",
            transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
          }}
        >
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
        </div>
      </div>

      {/* readout */}
      <div className="flex items-center gap-6 font-mono text-sm">
        <Readout label="X" value={`${Math.round((knob.x / MAX_RADIUS) * 100)}%`} />
        <Readout label="Y" value={`${Math.round((-knob.y / MAX_RADIUS) * 100)}%`} />
        <Readout label="θ" value={`${Math.round(angle)}°`} />
        <Readout label="r" value={`${Math.round(magnitude * 100)}%`} />
      </div>
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] uppercase tracking-widest text-slate-500">{label}</span>
      <span className="text-cyan-300 tabular-nums">{value}</span>
    </div>
  );
}
