import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "copper" | "info" | "warning" | "success" | "muted";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border-transparent bg-primary text-primary-foreground",
    secondary: "border-transparent bg-secondary text-secondary-foreground",
    destructive: "border-transparent bg-danger text-white",
    outline: "text-foreground border-border",
    copper: "border-copper/30 bg-copper-soft text-copper font-semibold",
    info: "border-info/30 bg-info-soft text-info font-semibold",
    warning: "border-warning/30 bg-warning-soft text-amber-700 font-semibold",
    success: "border-success/30 bg-success-soft text-success font-semibold",
    muted: "border-transparent bg-muted text-muted-foreground font-medium",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
