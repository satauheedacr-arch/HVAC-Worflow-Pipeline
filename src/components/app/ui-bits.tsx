import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/types";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="no-print mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[1.75rem]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Field({
  label,
  htmlFor,
  children,
  className,
  hint,
  required,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
  hint?: ReactNode;
  required?: boolean;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-xs font-semibold text-foreground/80">
        {label}
        {required && <span className="ml-0.5 text-copper font-bold">*</span>}
      </Label>
      {children}
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

const STATUS_VARIANT: Record<ProjectStatus, "info" | "warning" | "copper" | "success" | "muted"> = {
  "New Site / PO Received": "muted",
  "Quotation In Progress": "muted",
  "Gone for Inspection": "muted",
  "Quotation Sent": "info",
  "Confirmed": "info",
  "Work Under Progress": "warning",
  "Material at Site": "warning",
  "Work Completed": "copper",
  "FSR & Handover": "copper",
  "Tax Invoiced": "success",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status] || "muted"} className="whitespace-nowrap">
      {status}
    </Badge>
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card px-6 py-12 text-center">
      {icon && <div className="mb-3 text-muted-foreground [&_svg]:size-8">{icon}</div>}
      <div className="font-semibold">{title}</div>
      {children && <div className="mt-1 max-w-md text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; sub?: string }[];
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md border px-3 py-2.5 text-left text-sm transition-colors",
            value === o.value
              ? "border-foreground bg-primary text-primary-foreground shadow-sm"
              : "border-input bg-card hover:border-foreground/40",
          )}
        >
          <div className="font-semibold">{o.label}</div>
          {o.sub && <div className={cn("text-xs mt-0.5", value === o.value ? "opacity-80" : "text-muted-foreground")}>{o.sub}</div>}
        </button>
      ))}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  tone,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: string;
  sub?: string;
}) {
  return (
    <div className="panel flex items-start justify-between gap-3 p-5">
      <div>
        <div className="eyebrow">{label}</div>
        <div className="num mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </div>
      <div className={cn("flex size-11 items-center justify-center rounded-lg [&_svg]:size-5 shrink-0", tone)}>
        {icon}
      </div>
    </div>
  );
}
