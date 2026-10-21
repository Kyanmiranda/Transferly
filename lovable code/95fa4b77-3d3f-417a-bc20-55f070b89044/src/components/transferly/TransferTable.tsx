import { Link } from "@tanstack/react-router";
import type { TransferRow } from "@/lib/demo-data";
import { StatusBadge, AutomationBar } from "./ui";

export function AttentionTable({ rows }: { rows: TransferRow[] }) {
  const action = (s: string) => (s === "Documents Needed" ? "Upload" : s === "Rejected" ? "Resolve" : "Review");
  return (
    <div className="overflow-x-auto">
      <table className="tbl">
        <thead><tr><th>Client</th><th>Account</th><th>Institution</th><th>Status</th><th>Issue</th><th>Last Updated</th><th className="text-right">Action</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-muted/40">
              <td className="font-medium">{r.client}</td>
              <td className="tabular-nums">{r.account}</td>
              <td className="text-muted-foreground">{r.institution}</td>
              <td><StatusBadge status={r.status === "Review Required" ? "Needs Review" : r.status === "Documents Needed" ? "Missing Document" : r.status} /></td>
              <td>{r.issue}</td>
              <td className="text-muted-foreground">{r.updated}</td>
              <td className="text-right">
                {r.id === "TR-2026-1048"
                  ? <Link to="/transfers/new" search={{ demo: true }} className="btn-outline btn-sm">{action(r.status)}</Link>
                  : <Link to="/transfers/$id" params={{ id: r.id }} className="btn-outline btn-sm">{action(r.status)}</Link>}
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No transfers need attention.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function TransferTable({ rows }: { rows: TransferRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="tbl">
        <thead><tr><th>Client</th><th>Account</th><th>Delivering Institution</th><th>Automation</th><th>Status</th><th>Created</th><th>Owner</th><th className="text-right">Action</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-muted/40">
              <td className="font-medium">{r.client}</td>
              <td className="tabular-nums">{r.account}</td>
              <td className="text-muted-foreground">{r.institution}</td>
              <td><AutomationBar filled={r.filled} total={r.total} /></td>
              <td><StatusBadge status={r.status} /></td>
              <td className="text-muted-foreground">{r.created}</td>
              <td className="text-muted-foreground">{r.owner}</td>
              <td className="text-right"><Link to="/transfers/$id" params={{ id: r.id }} className="btn-outline btn-sm">Open</Link></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-muted-foreground">No transfers with this status.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
