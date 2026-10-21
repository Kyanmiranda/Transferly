import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, MetricCard } from "@/components/transferly/ui";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Transfer Automation Report — Transferly" },
      { name: "description", content: "Fields auto-filled, time saved and common validation issues across transfers." },
      { property: "og:title", content: "Transfer Automation Report — Transferly" },
      { property: "og:description", content: "Fields auto-filled, time saved and common validation issues across transfers." },
    ],
  }),
  component: Reports,
});

const ISSUES = [["Address mismatch", 12], ["Missing account number", 8], ["Expired identification", 6], ["Account owner mismatch", 4]] as const;
const WEEKS = [62, 71, 68, 79, 84, 88, 91, 93];

function Reports() {
  const max = 12;
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Transfer Automation" subtitle="Last 30 days · Designed Wealth Management" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard label="Transfers Prepared" value="42" />
        <MetricCard label="Fields Auto-Filled" value="914" />
        <MetricCard label="Average Fields Automated" value="91%" />
        <MetricCard label="Estimated Time Saved" value="31 hrs" />
        <MetricCard label="Manual Corrections" value="38" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="panel">
          <div className="panel-head"><h2 className="text-sm font-semibold">Most Common Validation Issues</h2></div>
          <div className="space-y-4 p-5">
            {ISSUES.map(([l, n]) => (
              <div key={l}>
                <div className="mb-1.5 flex justify-between text-sm"><span>{l}</span><span className="tabular-nums font-medium">{n}</span></div>
                <div className="h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-warning" style={{ width: `${(n / max) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><h2 className="text-sm font-semibold">Fields Automated by Week</h2><span className="text-xs text-muted-foreground">% of form fields</span></div>
          <div className="flex h-56 items-end gap-3 p-5">
            {WEEKS.map((w, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[11px] tabular-nums text-muted-foreground">{w}%</span>
                <div className="w-full rounded-t bg-primary/85" style={{ height: `${w * 1.5}px` }} />
                <span className="text-[11px] text-muted-foreground">W{i + 1}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
