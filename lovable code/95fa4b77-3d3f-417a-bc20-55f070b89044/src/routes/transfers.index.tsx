import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useTransfers } from "@/lib/store";
import { PageHeader } from "@/components/transferly/ui";
import { TransferTable } from "@/components/transferly/TransferTable";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/transfers/")({
  head: () => ({
    meta: [
      { title: "Transfers — Transferly" },
      { name: "description", content: "Track every client transfer from document collection to completion." },
      { property: "og:title", content: "Transfers — Transferly" },
      { property: "og:description", content: "Track every client transfer from document collection to completion." },
    ],
  }),
  component: Transfers,
});

const FILTERS = ["All", "Documents Needed", "Preparing", "Review Required", "Ready", "Submitted", "Rejected", "Completed"] as const;

function Transfers() {
  const rows = useTransfers();
  const [f, setF] = useState<(typeof FILTERS)[number]>("All");
  const shown = f === "All" ? rows : rows.filter((r) => r.status === f);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Transfers" subtitle="Track every client transfer from document collection to completion."
        actions={<Link to="/transfers/new" className="btn-primary"><Plus className="h-4 w-4" />New Transfer</Link>} />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {FILTERS.map((x) => {
          const n = x === "All" ? rows.length : rows.filter((r) => r.status === x).length;
          return (
            <button key={x} onClick={() => setF(x)}
              className={cn("rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                f === x ? "border-primary bg-secondary text-brand-dark" : "bg-card text-muted-foreground hover:text-foreground")}>
              {x === "Ready" ? "Ready" : x} <span className="ml-1 tabular-nums opacity-60">{n}</span>
            </button>
          );
        })}
      </div>
      <div className="panel"><TransferTable rows={shown} /></div>
    </div>
  );
}
