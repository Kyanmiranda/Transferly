import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useTransfers } from "@/lib/store";
import { PageHeader, MetricCard, StatusBadge } from "@/components/transferly/ui";
import { AttentionTable } from "@/components/transferly/TransferTable";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Transferly" },
      { name: "description", content: "Manage and prepare client account transfers with document-based automation." },
      { property: "og:title", content: "Dashboard — Transferly" },
      { property: "og:description", content: "Manage and prepare client account transfers with document-based automation." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const rows = useTransfers();
  const attention = rows.filter((r) => ["Review Required", "Documents Needed", "Rejected"].includes(r.status));
  const recent = rows.filter((r) => ["Ready", "Submitted", "Completed"].includes(r.status)).slice(0, 4);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Good morning, Brady" subtitle="Manage and prepare client transfers."
        actions={<Link to="/transfers/new" className="btn-primary"><Plus className="h-4 w-4" />New Transfer</Link>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Active Transfers" value="24" />
        <MetricCard label="Needs Attention" value={String(attention.length + 2)} />
        <MetricCard label="Ready for Submission" value={String(5 + rows.filter((r) => r.status === "Ready").length)} />
        <MetricCard label="Advisor Time Saved" value="14.6 hrs" hint="This month" />
      </div>

      <section className="panel mt-6">
        <div className="panel-head"><h2 className="text-sm font-semibold">Transfers Requiring Attention</h2><Link to="/transfers" className="text-xs font-medium text-primary hover:underline">View all</Link></div>
        <AttentionTable rows={attention} />
      </section>

      <section className="panel mt-6">
        <div className="panel-head"><h2 className="text-sm font-semibold">Recently Prepared</h2></div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Client</th><th>Account</th><th>Documents</th><th>Automation</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="hover:bg-muted/40">
                  <td className="font-medium"><Link to="/transfers/$id" params={{ id: r.id }} className="hover:text-primary">{r.client}</Link></td>
                  <td className="tabular-nums">{r.account}</td>
                  <td className="text-muted-foreground">{r.docs}</td>
                  <td><span className="text-sm">{r.filled} / {r.total} fields auto-filled</span></td>
                  <td><StatusBadge status={r.status} /></td>
                  <td className="text-muted-foreground">{r.created}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
