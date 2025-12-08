"use client";

import { useTheme } from "next-themes";
import { Toaster, type ToasterProps } from "sonner";

export function ToasterProvider() {
  const { theme } = useTheme();
  return <Toaster theme={theme as ToasterProps["theme"]} />;
}
