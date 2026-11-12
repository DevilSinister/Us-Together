"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const choices: Array<{ value: "light" | "dark" | "system"; label: string; icon: LucideIcon }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Match this device", icon: Monitor },
];

const subscribe = () => () => {};

/**
 * Light, dark or the device's own setting. Lives in Profile rather than the
 * top bar: it is set once, not toggled in passing. The stored choice is only
 * known in the browser, so nothing is marked chosen until after hydration.
 */
export function AppearanceSetting() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const current = mounted ? theme ?? "system" : null;

  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">Appearance</legend>
      <div className="grid grid-cols-3 gap-2">
        {choices.map(({ value, label, icon: Icon }) => (
          <label
            key={value}
            className={cn(
              "flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-control border px-2 text-center text-sm font-semibold transition-colors duration-200 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring motion-reduce:transition-none",
              current === value ? "border-primary bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary/60",
            )}
          >
            <input type="radio" name="appearance" value={value} checked={current === value} onChange={() => setTheme(value)} className="sr-only" />
            <Icon className={cn("size-5", current === value ? "text-primary" : null)} aria-hidden="true" />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
