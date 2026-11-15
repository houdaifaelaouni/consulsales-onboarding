export const PIN_LENGTH = 6;

export const isPinFormat = (v: string): boolean => /^\d{6}$/.test(v);

/**
 * Six digits are only a million combinations, so the obvious ones are refused up front:
 * the same digit repeated, straight runs up or down, and a few famous ones.
 */
export function isWeakPin(pin: string): boolean {
  if (!isPinFormat(pin)) return true;
  if (/^(\d)\1{5}$/.test(pin)) return true;
  const d = [...pin].map(Number);
  const up = d.every((n, i) => i === 0 || n === (d[i - 1] + 1) % 10);
  const down = d.every((n, i) => i === 0 || n === (d[i - 1] + 9) % 10);
  if (up || down) return true;
  return ["121212", "112233", "123123", "696969", "112211", "100000", "200000", "123321", "654321"].includes(pin);
}

export type PinProblem = "pin.err.format" | "pin.err.weak" | null;
export function pinProblem(pin: string): PinProblem {
  if (!isPinFormat(pin)) return "pin.err.format";
  return isWeakPin(pin) ? "pin.err.weak" : null;
}

/** Appends a digit, ignoring anything that is not 0-9 and anything past six. */
export function pushDigit(pin: string, key: string): string {
  return /^\d$/.test(key) && pin.length < PIN_LENGTH ? pin + key : pin;
}
