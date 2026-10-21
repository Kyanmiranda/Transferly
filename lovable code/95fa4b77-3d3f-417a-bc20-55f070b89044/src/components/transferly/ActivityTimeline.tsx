import { FileUp, ScanLine, FileCheck2, AlertTriangle, UserCheck, CheckCircle2 } from "lucide-react";
import { ACTIVITY } from "@/lib/demo-data";

const ICON = { doc: FileUp, extract: ScanLine, form: FileCheck2, warn: AlertTriangle, user: UserCheck, done: CheckCircle2 };

export function ActivityTimeline() {
  return (
    <ol className="relative">
      {ACTIVITY.map((a, i) => {
        const Icon = ICON[a.kind];
        return (
          <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
            {i < ACTIVITY.length - 1 && <span className="absolute left-[13px] top-7 h-full w-px bg-border" />}
            <span className={`relative grid h-7 w-7 shrink-0 place-items-center rounded-full border bg-card ${a.kind === "warn" ? "text-warning" : "text-primary"}`}><Icon className="h-3.5 w-3.5" /></span>
            <div className="pt-0.5">
              <div className="text-sm font-medium">{a.text}</div>
              <div className="text-xs tabular-nums text-muted-foreground">{a.time} · {a.kind === "user" || a.kind === "done" ? "Brady Schnare" : "Transferly"}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
