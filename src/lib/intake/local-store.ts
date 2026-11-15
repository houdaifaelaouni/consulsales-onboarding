import type { IntakeStore } from "@/components/intake/intake-form";
import type { Answers } from "./logic";

/** Demo store: keeps answers in this browser only. The real store will write to the database. */
export function localIntakeStore(key = "demo-intake"): IntakeStore {
  return {
    async load() {
      try { return JSON.parse(localStorage.getItem(key) ?? "{}") as Answers; } catch { return {}; }
    },
    async save(answers) {
      localStorage.setItem(key, JSON.stringify(answers));
    },
  };
}
