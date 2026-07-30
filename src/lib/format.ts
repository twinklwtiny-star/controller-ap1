export interface EyeCoords {
  x: number;
  y: number;
}

const X_MIN = 0;
const X_MAX = 180;
const Y_MIN = 0;
const Y_MAX = 180;
const X_CENTER = 90;
const Y_CENTER = 90;

export const COORD_LIMITS = { X_MIN, X_MAX, Y_MIN, Y_MAX, X_CENTER, Y_CENTER };

export function clampServo(value: number): number {
  return Math.round(Math.max(0, Math.min(180, value)));
}

export function joystickToServo(nx: number, ny: number): EyeCoords {
  // nx, ny are normalized -1..1 (ny: -1 = up, +1 = down)
  const x = clampServo(X_CENTER + nx * X_CENTER);
  const y = clampServo(Y_CENTER + ny * Y_CENTER);
  return { x, y };
}

export function formatCoords(coords: EyeCoords): string {
  return `X:${coords.x},Y:${coords.y}\n`;
}

export function formatBlink(): string {
  return "BLINK\n";
}
