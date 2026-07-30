import { useState } from "react";
import type { ConnectionKind } from "@/lib/connection";
import { type ConnectionStatus } from "@/hooks/useConnection";

interface ConnectionBarProps {
  status: ConnectionStatus;
  kind: ConnectionKind | null;
  error: string | null;
  baudRate: number;
  serialSupported: boolean;
  bluetoothSupported: boolean;
  onBaudChange: (v: number) => void;
  onConnect: (kind: ConnectionKind) => void;
  onDisconnect: () => void;
}

const BAUD_RATES = [9600, 19200, 38400, 57600, 115200];

export function ConnectionBar({
  status,
  kind,
  error,
  baudRate,
  serialSupported,
  bluetoothSupported,
  onBaudChange,
  onConnect,
  onDisconnect,
}: ConnectionBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const connected = status === "connected";
  const connecting = status === "connecting";

  const dotColor =
    status === "connected"
      ? "bg-emerald-400"
      : status === "connecting"
        ? "bg-amber-400 animate-pulse"
        : status === "error"
          ? "bg-rose-500"
          : "bg-slate-600";

  const kindLabel =
    kind === "serial"
      ? "Serial"
      : kind === "bluetooth"
        ? "Bluetooth"
        : "Simulation";

  const statusLabel = connected
    ? `${kindLabel} · Connected`
    : status === "connecting"
      ? "Connecting…"
      : status === "error"
        ? "Error"
        : "Disconnected";

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-2.5">
      <div className="flex items-center gap-3 min-w-0">
        <span className={`h-3 w-3 rounded-full shrink-0 ${dotColor}`} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">{statusLabel}</p>
          {error ? (
            <p className="text-xs text-rose-400 truncate">{error}</p>
          ) : !connected ? (
            <div className="flex items-center gap-1.5">
              <ApiBadge label="BT" available={bluetoothSupported} />
              <ApiBadge label="Serial" available={serialSupported} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {connected && (
          <>
            {kind === "serial" && (
              <span className="hidden sm:inline text-xs font-mono text-slate-500">
                {baudRate} baud
              </span>
            )}
            <button
              onClick={onDisconnect}
              className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition-colors"
            >
              Disconnect
            </button>
          </>
        )}

        {!connected && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              disabled={connecting}
              className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
            >
              {connecting ? "Connecting…" : "Connect"}
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 z-20 w-60 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-xl">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">
                    Select transport
                  </p>
                  <button
                    onClick={() => { setMenuOpen(false); onConnect("simulation"); }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
                  >
                    <SimIcon /> Simulation
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onConnect("bluetooth"); }}
                    disabled={!bluetoothSupported}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <BluetoothIcon />
                    Bluetooth (NUS)
                    {!bluetoothSupported && <span className="ml-auto text-[9px] text-slate-600">N/A</span>}
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); onConnect("serial"); }}
                    disabled={!serialSupported}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <UsbIcon /> Serial (USB)
                    {!serialSupported && <span className="ml-auto text-[9px] text-slate-600">N/A</span>}
                  </button>
                  <div className="mt-2 border-t border-slate-800 pt-2">
                    <label className="text-[10px] uppercase tracking-widest text-slate-500">
                      Baud rate
                    </label>
                    <select
                      value={baudRate}
                      onChange={(e) => onBaudChange(Number(e.target.value))}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-200"
                    >
                      {BAUD_RATES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ApiBadge({ label, available }: { label: string; available: boolean }) {
  return (
    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${available ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-800 text-slate-600"}`}>
      {label} {available ? "✓" : "✕"}
    </span>
  );
}

function BluetoothIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-cyan-400 shrink-0">
      <path d="M5 4L11 8L8 10.5V5.5L11 8L5 12" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function UsbIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-cyan-400 shrink-0">
      <circle cx="8" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.5V13M8 7L5.5 5.5M8 9L10.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="5.5" cy="5" r="0.8" fill="currentColor" />
      <circle cx="10.5" cy="7" r="0.8" fill="currentColor" />
    </svg>
  );
}

function SimIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-violet-400 shrink-0">
      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="6" cy="8" r="1.2" fill="currentColor" />
      <circle cx="10" cy="8" r="1.2" fill="currentColor" />
    </svg>
  );
}
