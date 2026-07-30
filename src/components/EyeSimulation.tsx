import { useEffect, useRef, useState } from "react";
import { COORD_LIMITS } from "@/lib/format";

interface EyeSimulationProps {
  targetX: number;
  targetY: number;
  blinkTrigger: number;
}

const LERP = 0.22;

export function EyeSimulation({ targetX, targetY, blinkTrigger }: EyeSimulationProps) {
  const [pupil, setPupil] = useState({ x: 0, y: 0 });
  const [lidOpen, setLidOpen] = useState(1); // 1 open, 0 closed
  const [blinking, setBlinking] = useState(false);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const lidRef = useRef(1);

  // map servo 0..180 to pupil offset -1..1
  const tx = (targetX - COORD_LIMITS.X_CENTER) / COORD_LIMITS.X_CENTER;
  const ty = (targetY - COORD_LIMITS.Y_CENTER) / COORD_LIMITS.Y_CENTER;
  targetRef.current = { x: tx, y: ty };

  // blink trigger
  useEffect(() => {
    if (blinkTrigger === 0) return;
    setBlinking(true);
    lidRef.current = 0;
    const t = setTimeout(() => {
      setBlinking(false);
      lidRef.current = 1;
    }, 320);
    return () => clearTimeout(t);
  }, [blinkTrigger]);

  // smooth animation loop
  useEffect(() => {
    const tick = () => {
      setPupil((prev) => ({
        x: prev.x + (targetRef.current.x - prev.x) * LERP,
        y: prev.y + (targetRef.current.y - prev.y) * LERP,
      }));
      setLidOpen((prev) => prev + (lidRef.current - prev) * 0.35);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-6">
        <Eye pupil={pupil} lidOpen={lidOpen} side="left" />
        <Eye pupil={pupil} lidOpen={lidOpen} side="right" />
      </div>
      <div className="flex items-center gap-4 font-mono text-xs">
        <span className="text-slate-500">
          Pupil <span className="text-cyan-300 tabular-nums">{(pupil.x * 100).toFixed(0)}%, {(pupil.y * 100).toFixed(0)}%</span>
        </span>
        <span className="text-slate-500">
          Lid <span className="text-amber-300 tabular-nums">{(lidOpen * 100).toFixed(0)}%</span>
        </span>
      </div>
    </div>
  );
}

function Eye({
  pupil,
  lidOpen,
  side,
}: {
  pupil: { x: number; y: number };
  lidOpen: number;
  side: "left" | "right";
}) {
  const EYE_W = 120;
  const EYE_H = 90;
  const PUPIL_R = 22;
  const MAX_DX = (EYE_W / 2) - PUPIL_R - 8;
  const MAX_DY = (EYE_H / 2) - PUPIL_R - 8;
  const px = pupil.x * MAX_DX;
  const py = pupil.y * MAX_DY;
  const lidHeight = EYE_H * (1 - lidOpen);

  return (
    <div className="relative" style={{ width: EYE_W, height: EYE_H }}>
      <svg width={EYE_W} height={EYE_H} viewBox={`0 0 ${EYE_W} ${EYE_H}`} className="overflow-visible">
        {/* sclera */}
        <ellipse
          cx={EYE_W / 2}
          cy={EYE_H / 2}
          rx={EYE_W / 2 - 2}
          ry={EYE_H / 2 - 2}
          fill="url(#scleraGrad)"
          stroke="#475569"
          strokeWidth="1.5"
        />
        <defs>
          <radialGradient id="scleraGrad" cx="50%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#cbd5e1" />
          </radialGradient>
          <radialGradient id="irisGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="70%" stopColor="#0891b2" />
            <stop offset="100%" stopColor="#155e75" />
          </radialGradient>
        </defs>
        {/* iris + pupil */}
        <g style={{ transition: "none" }}>
          <circle
            cx={EYE_W / 2 + px}
            cy={EYE_H / 2 + py}
            r={PUPIL_R}
            fill="url(#irisGrad)"
          />
          <circle
            cx={EYE_W / 2 + px}
            cy={EYE_H / 2 + py}
            r={PUPIL_R * 0.45}
            fill="#0f172a"
          />
          {/* highlight */}
          <circle
            cx={EYE_W / 2 + px - PUPIL_R * 0.3}
            cy={EYE_H / 2 + py - PUPIL_R * 0.3}
            r={PUPIL_R * 0.18}
            fill="rgba(255,255,255,0.7)"
          />
        </g>
        {/* eyelid (top + bottom) */}
        <rect x="0" y="0" width={EYE_W} height={lidHeight / 2} fill="#1e293b" />
        <rect x="0" y={EYE_H - lidHeight / 2} width={EYE_W} height={lidHeight / 2} fill="#1e293b" />
        {/* eye outline on top */}
        <ellipse
          cx={EYE_W / 2}
          cy={EYE_H / 2}
          rx={EYE_W / 2 - 2}
          ry={EYE_H / 2 - 2}
          fill="none"
          stroke="#334155"
          strokeWidth="2"
        />
      </svg>
      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest text-slate-600">
        {side}
      </span>
    </div>
  );
}
