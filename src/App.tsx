import { useCallback, useRef, useState } from "react";
import { Joystick } from "@/components/Joystick";
import { BlinkButton } from "@/components/BlinkButton";
import { CommandLog, type LogEntry } from "@/components/CommandLog";
import { ConnectionBar } from "@/components/ConnectionBar";
import { EyeSimulation } from "@/components/EyeSimulation";
import { useConnection } from "@/hooks/useConnection";
import {
  COORD_LIMITS,
  formatBlink,
  formatCoords,
  joystickToServo,
} from "@/lib/format";
import type { ConnectionKind } from "@/lib/connection";

const SEND_INTERVAL_MS = 80;

export default function App() {
  const {
    status,
    kind,
    error,
    serialSupported,
    bluetoothSupported,
    connect,
    disconnect,
    send,
  } = useConnection();
  const [baudRate, setBaudRate] = useState(9600);
  const [log, setLog] = useState<LogEntry[]>([]);
  const logId = useRef(0);
  const lastSent = useRef<string | null>(null);
  const sendTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [liveCoords, setLiveCoords] = useState({
    x: COORD_LIMITS.X_CENTER,
    y: COORD_LIMITS.Y_CENTER,
  });
  const [simCoords, setSimCoords] = useState({
    x: COORD_LIMITS.X_CENTER,
    y: COORD_LIMITS.Y_CENTER,
  });
  const [blinkTrigger, setBlinkTrigger] = useState(0);

  const connected = status === "connected";
  const isSim = kind === "simulation";

  const addLog = useCallback((direction: "tx" | "rx", text: string) => {
    const id = logId.current++;
    const time = new Date().toLocaleTimeString(undefined, {
      hour12: false,
      minute: "2-digit",
      second: "2-digit",
    });
    setLog((prev) => [...prev.slice(-99), { id, time, direction, text }]);
  }, []);

  const startStreaming = useCallback(() => {
    if (sendTimer.current) return;
    sendTimer.current = setInterval(() => {
      const payload = lastSent.current;
      if (!payload) return;
      send(payload).then(() => addLog("tx", payload.trim()));
    }, SEND_INTERVAL_MS);
  }, [send, addLog]);

  const stopStreaming = useCallback(() => {
    if (sendTimer.current) {
      clearInterval(sendTimer.current);
      sendTimer.current = null;
    }
    lastSent.current = null;
  }, []);

  const handleJoystickChange = useCallback(
    (nx: number, ny: number) => {
      const coords = joystickToServo(nx, ny);
      setLiveCoords(coords);
      const payload = formatCoords(coords);
      lastSent.current = payload;
      if (connected && !sendTimer.current) startStreaming();
    },
    [connected, startStreaming],
  );

  const handleRelease = useCallback(() => {
    stopStreaming();
    const center = { x: COORD_LIMITS.X_CENTER, y: COORD_LIMITS.Y_CENTER };
    setLiveCoords(center);
    if (connected) {
      const payload = formatCoords(center);
      send(payload).then(() => addLog("tx", payload.trim()));
    }
  }, [stopStreaming, connected, send, addLog]);

  const handleBlink = useCallback(() => {
    if (!connected) return;
    const payload = formatBlink();
    send(payload).then(() => addLog("tx", payload.trim()));
  }, [connected, send, addLog]);

  const handleConnect = useCallback(
    (k: ConnectionKind) => {
      if (k === "simulation") {
        connect("simulation", baudRate, {
          onCoords: (c) => setSimCoords(c),
          onBlink: () => setBlinkTrigger((n) => n + 1),
        });
      } else {
        connect(k, baudRate);
      }
    },
    [connect, baudRate],
  );

  const handleDisconnect = useCallback(async () => {
    stopStreaming();
    await disconnect();
  }, [stopStreaming, disconnect]);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 overflow-hidden">
      {/* ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-amber-500/5 blur-3xl" />
      </div>

      <div className="relative mx-auto flex h-screen max-w-6xl flex-col px-4 py-3 gap-3">
        {/* top bar: header + connection */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg shadow-cyan-500/30">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <ellipse cx="10" cy="10" rx="9" ry="6" stroke="white" strokeWidth="1.5" />
                <circle cx="10" cy="10" r="3" fill="white" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">Eye Control</h1>
              <p className="text-[11px] text-slate-500 leading-tight">Robotic Eye Pan & Blink</p>
            </div>
          </div>
          <div className="flex-1 max-w-md">
            <ConnectionBar
              status={status}
              kind={kind}
              error={error}
              baudRate={baudRate}
              serialSupported={serialSupported}
              bluetoothSupported={bluetoothSupported}
              onBaudChange={setBaudRate}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
          </div>
        </div>

        {/* main horizontal area */}
        <div className="flex flex-1 min-h-0 gap-3">
          {/* left: eye simulation */}
          <Panel className="flex-[1.3] min-w-0">
            <PanelTitle>Eye Simulation</PanelTitle>
            <div className="flex flex-1 items-center justify-center min-h-0">
              <EyeSimulation
                targetX={isSim ? simCoords.x : liveCoords.x}
                targetY={isSim ? simCoords.y : liveCoords.y}
                blinkTrigger={blinkTrigger}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <CoordCard label="Servo X" value={`${(isSim ? simCoords.x : liveCoords.x)}°`} accent="cyan" />
              <CoordCard label="Servo Y" value={`${(isSim ? simCoords.y : liveCoords.y)}°`} accent="cyan" />
            </div>
          </Panel>

          {/* center: joystick */}
          <Panel className="flex-[1] min-w-0">
            <PanelTitle>Joystick</PanelTitle>
            <div className="flex flex-1 items-center justify-center min-h-0">
              <Joystick
                onChange={handleJoystickChange}
                onRelease={handleRelease}
                disabled={!connected}
              />
            </div>
          </Panel>

          {/* right: blink + log */}
          <div className="flex flex-col gap-3 w-72 shrink-0">
            <Panel>
              <PanelTitle>Blink</PanelTitle>
              <BlinkButton onBlink={handleBlink} disabled={!connected} />
            </Panel>
            <Panel className="flex-1 min-h-0 flex flex-col">
              <CommandLog entries={log} />
            </Panel>
          </div>
        </div>

        {/* footer: format hint */}
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-800/60 bg-slate-900/30 px-4 py-2">
          <p className="font-mono text-xs text-slate-400">
            <span className="text-cyan-400">X:90,Y:90</span> (pan) ·{" "}
            <span className="text-amber-400">BLINK</span> (blink)
          </p>
          <p className="text-[11px] text-slate-600">
            {isSim
              ? "Simulation mode — no hardware needed"
              : connected
                ? "Live mode — sending to device"
                : "Connect to begin (try Simulation to test)"}
          </p>
        </div>
      </div>
    </div>
  );
}

function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col rounded-2xl border border-slate-800 bg-slate-900/40 p-3 ${className}`}>
      {children}
    </div>
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 px-1">{children}</p>
  );
}

function CoordCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "cyan" | "amber";
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
      <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
      <p className={`mt-0.5 font-mono text-xl font-bold tabular-nums ${accent === "cyan" ? "text-cyan-300" : "text-amber-300"}`}>
        {value}
      </p>
    </div>
  );
}
