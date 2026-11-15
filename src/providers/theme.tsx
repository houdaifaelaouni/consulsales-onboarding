"use client";

import { ThemeProvider } from "next-themes";

/** Dark by default to match the ConsulSales design. Light mode can be switched on later with a toggle. */
export function Theme({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} value={{ light: "light-mode", dark: "dark-mode" }}>
      {children}
    </ThemeProvider>
  );
}
