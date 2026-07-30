import { useCallback, useRef, useState } from "react";
import {
  type Connection,
  type ConnectionKind,
  type SimulationHooks,
  isBluetoothSupported,
  isSerialSupported,
  openBluetooth,
  openSerial,
  openSimulation,
} from "@/lib/connection";

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface UseConnectionResult {
  status: ConnectionStatus;
  kind: ConnectionKind | null;
  error: string | null;
  serialSupported: boolean;
  bluetoothSupported: boolean;
  connect: (kind: ConnectionKind, baudRate: number, simHooks?: SimulationHooks) => Promise<void>;
  disconnect: () => Promise<void>;
  send: (data: string) => Promise<void>;
}

export function useConnection(): UseConnectionResult {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [kind, setKind] = useState<ConnectionKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serialSupported] = useState(isSerialSupported);
  const [bluetoothSupported] = useState(isBluetoothSupported);
  const connRef = useRef<Connection | null>(null);

  const connect = useCallback(
    async (k: ConnectionKind, baudRate: number, simHooks?: SimulationHooks) => {
      setStatus("connecting");
      setError(null);
      try {
        let conn: Connection;
        if (k === "serial") {
          conn = await openSerial(baudRate);
        } else if (k === "bluetooth") {
          conn = await openBluetooth();
        } else {
          if (!simHooks) throw new Error("Simulation hooks missing.");
          conn = openSimulation(simHooks);
        }
        connRef.current = conn;
        setKind(k);
        setStatus("connected");
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Connection failed.";
        setError(msg);
        setStatus("error");
        connRef.current = null;
      }
    },
    [],
  );

  const disconnect = useCallback(async () => {
    const conn = connRef.current;
    if (conn) {
      try {
        await conn.disconnect();
      } catch {
        // ignore
      }
    }
    connRef.current = null;
    setKind(null);
    setStatus("disconnected");
  }, []);

  const send = useCallback(async (data: string) => {
    const conn = connRef.current;
    if (!conn) return;
    try {
      await conn.write(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Send failed.";
      setError(msg);
      setStatus("error");
    }
  }, []);

  return {
    status,
    kind,
    error,
    serialSupported,
    bluetoothSupported,
    connect,
    disconnect,
    send,
  };
}
