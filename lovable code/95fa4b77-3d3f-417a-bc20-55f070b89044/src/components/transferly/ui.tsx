import { CheckCircle2, AlertTriangle, Circle, FileText, IdCard } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SOURCE_LABEL, type Source, type Status } from "@/lib/demo-data";

const STATUS_STYLE: Record<Status | "Needs Review" | "Missing Document", string> = {
  "Documents Needed": "bg-warning-soft text-foreground border-warning/40",
  "Missing Document": "bg-warning-soft text-foreground border-warning/40",
  Preparing: "bg-info-soft text-info border-info/25",
  "Review Required": "bg-warning-soft text-foreground border-warning/40",
  "Needs Review": "bg-warning-soft text-foreground border-warning/40",
  Ready: "bg-secondary text-brand-dark border-primary/25",
  Submitted: "bg-info-soft text-info border-info/25",
  Rejected: "bg-destructive-soft text-destructive border-destructive/25",
  Completed: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ status }: { status: keyof typeof STATUS_STYLE }) {
  const dot = status === "Rejected" ? "bg-destructive" : status.includes("Review") || status.includes("Doc") ? "bg-warning" : status === "Ready" ? "bg-primary" : status === "Completed" ? "bg-muted-foreground" : "bg-info";
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium", STATUS_STYLE[status])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {status === "Ready" ? "Ready for Submission" : status}
    </span>
  );
}

export function SourceTag({ source }: { source: Source }) {
  const Icon = source === "id" ? IdCard : FileText;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
      source === "advisor" ? "bg-info-soft text-info" : "bg-secondary text-brand-dark")}>
      <Icon className="h-3 w-3" /> {SOURCE_LABEL[source]}
    </span>
  );
}

export function ExtractedField({ label, value, onChange, source, className }: {
  label: string; value: string; onChange: (v: string) => void; source?: Source | undefined; className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {source && <SourceTag source={source} />}
      </div>
      <div className="relative">
        <input className="field-input pr-9" value={value} onChange={(e) => onChange(e.target.value)} />
        {source && source !== "advisor" && <CheckCircle2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />}
      </div>
    </label>
  );
}

export function ValidationCheck({ ok, warn, children }: { ok?: boolean; warn?: boolean; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5 text-sm">
      {warn ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        : ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />}
      <span className={warn ? "font-medium" : ""}>{children}</span>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function AutomationBar({ filled, total }: { filled: number; total: number }) {
  const pct = Math.round((filled / total) * 100);
  return (
    <div className="min-w-[120px]">
      <div className="flex justify-between text-xs"><span>{filled} / {total} fields</span><span className="text-muted-foreground">{pct}%</span></div>
      <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="panel px-5 py-4">
      <div className="eyebrow">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
