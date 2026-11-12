"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

const subscribe = () => () => {};
const names: Record<string, string> = { light: "Light", dark: "Dark", system: "Match this device" };

/** The chosen appearance in words. The choice lives in the browser, so the server paints a neutral line. */
export function AppearanceSummary() {
  const { theme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return <>{mounted ? names[theme ?? "system"] ?? "Match this device" : "Light, dark or this device"}</>;
}
