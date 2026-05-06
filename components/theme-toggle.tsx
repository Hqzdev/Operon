"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent"
      aria-label="Toggle theme"
    >
      <Sun className="size-[18px] rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-[18px] rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
    </button>
  );
}
