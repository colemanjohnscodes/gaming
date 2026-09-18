import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type ParlorPanelProps = {
  children: ReactNode;
  className?: string;
  variant?: "default" | "ghost";
};

export function ParlorPanel({
  children,
  className,
  variant = "default",
}: ParlorPanelProps) {
  return (
    <div
      className={cn(
        "border p-6 sm:p-8",
        variant === "ghost"
          ? "border-gold/35 bg-transparent"
          : "border-gold/80 bg-panel",
        className,
      )}
    >
      {children}
    </div>
  );
}
