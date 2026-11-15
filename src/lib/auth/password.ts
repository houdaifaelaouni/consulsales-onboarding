export const MIN_PASSWORD = 8;

export type PasswordProblem = "login.pw.short" | "login.pw.same" | "login.pw.common" | null;

const COMMON = new Set(["password", "password1", "12345678", "123456789", "qwertyui", "qwerty123", "11111111", "iloveyou", "letmein1", "welcome1", "consulsales"]);

/** A quick local check before the server's own rules. Returns a message key, or null when fine. */
export function passwordProblem(pw: string, email = ""): PasswordProblem {
  if (pw.length < MIN_PASSWORD) return "login.pw.short";
  const local = email.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && pw.toLowerCase().includes(local)) return "login.pw.same";
  if (COMMON.has(pw.toLowerCase())) return "login.pw.common";
  return null;
}
