export type ConnectionKind = "serial" | "bluetooth" | "simulation";

export interface Connection {
  kind: ConnectionKind;
  write: (data: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

export function isSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

export function isBluetoothSupported(): boolean {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

// --- Serial ---------------------------------------------------------------

interface SerialPortLike {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
}

interface SerialOptions {
  baudRate: number;
  dataBits?: number;
  stopBits?: number;
  parity?: "none" | "even" | "odd";
  flowControl?: "none" | "hardware";
}

interface NavigatorSerial {
  serial?: {
    requestPort(options?: Record<string, unknown>): Promise<SerialPortLike>;
  };
}

// --- Bluetooth ------------------------------------------------------------

interface BluetoothCharacteristicLike {
  startNotifications(): Promise<BluetoothCharacteristicLike>;
  stopNotifications(): Promise<void>;
  writeValue(value: BufferSource): Promise<void>;
  addEventListener(
    type: "characteristicvaluechanged",
    listener: (event: Event) => void,
  ): void;
  removeEventListener(
    type: "characteristicvaluechanged",
    listener: (event: Event) => void,
  ): void;
  value?: DataView;
}

interface BluetoothServiceLike {
  getCharacteristic(uuid: string): Promise<BluetoothCharacteristicLike>;
}

interface BluetoothDeviceLike {
  gatt?: {
    connect(): Promise<unknown>;
    disconnect(): void;
    getPrimaryService(uuid: string): Promise<BluetoothServiceLike>;
  };
  addEventListener(type: string, listener: (event: Event) => void): void;
  removeEventListener(type: string, listener: (event: Event) => void): void;
}

interface NavigatorBluetooth {
  bluetooth?: {
    requestDevice(options: {
      filters?: Array<{ services?: string[] }>;
      optionalServices?: string[];
    }): Promise<BluetoothDeviceLike>;
  };
}

const NUS_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_RX = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const NUS_TX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

function encoder(): TextEncoder {
  return new TextEncoder();
}

// --- Serial open -----------------------------------------------------------

export async function openSerial(baudRate: number): Promise<Connection> {
  const nav = navigator as NavigatorSerial & { serial?: NavigatorSerial["serial"] };
  if (!nav.serial) {
    throw new Error("Web Serial is not supported in this browser.");
  }
  const port = await nav.serial.requestPort();
  await port.open({ baudRate });

  let closed = false;
  const writer = port.writable?.getWriter();
  if (!writer) throw new Error("Serial port has no writable stream.");

  return {
    kind: "serial",
    async write(data: string) {
      if (closed) return;
      await writer.write(encoder().encode(data));
    },
    async disconnect() {
      if (closed) return;
      closed = true;
      try {
        writer.releaseLock();
        await port.close();
      } catch {
        // ignore close errors
      }
    },
  };
}

// --- Bluetooth open --------------------------------------------------------

export async function openBluetooth(): Promise<Connection> {
  const nav = navigator as NavigatorBluetooth & {
    bluetooth?: NavigatorBluetooth["bluetooth"];
  };
  if (!nav.bluetooth) {
    throw new Error("Web Bluetooth is not supported in this browser.");
  }
  const device = await nav.bluetooth.requestDevice({
    filters: [{ services: [NUS_SERVICE] }],
    optionalServices: [NUS_SERVICE],
  });

  if (!device.gatt) throw new Error("Device has no GATT server.");

  const server = (await device.gatt.connect()) as {
    getPrimaryService(uuid: string): Promise<BluetoothServiceLike>;
  };
  const service = await server.getPrimaryService(NUS_SERVICE);
  const rx = await service.getCharacteristic(NUS_RX);

  let disconnected = false;
  const onDisconnect = () => {
    disconnected = true;
  };
  device.addEventListener("gattserverdisconnected", onDisconnect);

  return {
    kind: "bluetooth",
    async write(data: string) {
      if (disconnected) throw new Error("Bluetooth device disconnected.");
      const bytes = encoder().encode(data);
      await rx.writeValue(bytes as BufferSource);
    },
    async disconnect() {
      device.removeEventListener("gattserverdisconnected", onDisconnect);
      try {
        device.gatt?.disconnect();
      } catch {
        // ignore
      }
      disconnected = true;
    },
  };
}

// --- Simulation open -------------------------------------------------------

export interface SimulationHooks {
  onCoords: (coords: { x: number; y: number }) => void;
  onBlink: () => void;
}

export function openSimulation(hooks: SimulationHooks): Connection {
  return {
    kind: "simulation",
    async write(data: string) {
      const trimmed = data.trim();
      if (trimmed === "BLINK") {
        hooks.onBlink();
        return;
      }
      const xMatch = trimmed.match(/X:(-?\d+)/i);
      const yMatch = trimmed.match(/Y:(-?\d+)/i);
      if (xMatch && yMatch) {
        hooks.onCoords({
          x: Number(xMatch[1]),
          y: Number(yMatch[1]),
        });
      }
    },
    async disconnect() {
      // no-op
    },
  };
}
