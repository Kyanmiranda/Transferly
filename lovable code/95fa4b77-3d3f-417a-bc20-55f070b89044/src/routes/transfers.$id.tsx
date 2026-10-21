import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Circle, IdCard, FileText, ArrowLeft, Download, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { TRANSFERS, DEMO_CLIENT, DEMO_ACCOUNT, ADVISOR_DEFAULTS, type ClientInfo } from "@/lib/demo-data";
import { useTransfers } from "@/lib/store";
import { StatusBadge, SourceTag, AutomationBar } from "@/components/transferly/ui";
import { TransferFormPreview, FormLegend } from "@/components/transferly/TransferFormPreview";
import { ActivityTimeline } from "@/components/transferly/ActivityTimeline";

export const Route = createFileRoute("/transfers/$id")({
  loader: ({ params }) => {
    const t = TRANSFERS.find((x) => x.id === params.id);
    if (!t) throw notFound();
    return { id: t.id, client: t.client, account: t.account };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Transfer not found — Transferly" }, { name: "robots", content: "noindex" }] };
    const title = `${loaderData.client} — ${loaderData.account} · Transferly`;
    const d = `Transfer ${loaderData.id}: workflow, documents, prepared form and audit trail.`;
    return { meta: [{ title }, { name: "description", content: d }, { property: "og:title", content: title }, { property: "og:description", content: d }] };
  },
  component: Detail,
});

const WORKFLOW = ["Documents", "Information Extracted", "Form Prepared", "Validated", "Ready for Submission", "Submitted", "Processing", "Completed"];
const STATUS_STAGE: Record<string, number> = { "Documents Needed": 0, Preparing: 2, "Review Required": 3, Rejected: 5, Ready: 5, Submitted: 6, Completed: 8 };
const TABS = ["Overview", "Documents", "Transfer Form", "Activity"] as const;

function Detail() {
  const { id } = Route.useLoaderData();
  const t = useTransfers().find((x) => x.id === id)!;
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [client, setClient] = useState<ClientInfo>(DEMO_CLIENT);
  const [sin, setSin] = useState("");
  const done = STATUS_STAGE[t.status] ?? 0;
  const [first = "", last = ""] = t.client.split(" ");
  const accType = t.account.split(" ••••")[0] ?? "";
  const acc = { ...DEMO_ACCOUNT, holder: t.client, institution: t.institution, accountType: accType, accountNumber: "••••" + t.account.slice(-4) };
  const cl = id === "TR-2026-1048" ? client : { ...client, firstName: first, lastName: last };

  return (
    <div className="mx-auto max-w-7xl">
      <Link to="/transfers" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />Transfers</Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">{t.client} — {accType}</h1>
          <div className="mt-1.5 flex items-center gap-3 text-sm text-muted-foreground"><span className="tabular-nums">{t.id}</span><span>·</span><StatusBadge status={t.status} /></div>
        </div>
        <button className="btn-outline" onClick={() => toast.success("Form downloaded", { description: `${t.id}_transfer-form.pdf (demo)` })}><Download className="h-4 w-4" />Download Form</button>
      </div>

      <section className="panel px-6 py-5">
        <div className="eyebrow mb-4">Transfer Workflow</div>
        <ol className="grid grid-cols-4 gap-y-4 lg:grid-cols-8">
          {WORKFLOW.map((w, i) => (
            <li key={w} className="relative flex flex-col items-center text-center">
              {i < WORKFLOW.length - 1 && <span className={cn("absolute left-1/2 top-3 hidden h-px w-full lg:block", i < done - 1 ? "bg-primary" : "bg-border")} />}
              <span className={cn("relative grid h-6 w-6 place-items-center rounded-full bg-card", i < done ? "text-primary" : "text-muted-foreground/50")}>
                {i < done ? <CheckCircle2 className="h-6 w-6" /> : <Circle className="h-6 w-6" />}
              </span>
              <span className={cn("mt-2 text-xs", i < done ? "font-medium" : "text-muted-foreground")}>{w}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-6 flex gap-1 border-b">
        {TABS.map((x) => (
          <button key={x} onClick={() => setTab(x)} className={cn("-mb-px border-b-2 px-4 py-2.5 text-sm", tab === x ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{x}</button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "Overview" && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="panel lg:col-span-2">
              <div className="panel-head"><span className="eyebrow">Transfer Details</span></div>
              <dl className="grid gap-x-8 gap-y-4 p-5 text-sm sm:grid-cols-2">
                {[["Client", t.client], ["Account", t.account], ["Delivering Institution", t.institution], ["Receiving Institution", ADVISOR_DEFAULTS.receivingInstitution],
                  ["Receiving Account", ADVISOR_DEFAULTS.receivingAccount], ["Transfer", "Full — In Kind"], ["Estimated Value", DEMO_ACCOUNT.value], ["Owner", t.owner], ["Created", t.created], ["Last Updated", t.updated]].map(([k, v]) => (
                  <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>
                ))}
              </dl>
            </div>
            <div className="panel">
              <div className="panel-head"><span className="eyebrow">Automation</span></div>
              <div className="space-y-4 p-5 text-sm">
                <AutomationBar filled={t.filled} total={t.total} />
                <div className="flex justify-between"><span className="text-muted-foreground">Documents scanned</span><span className="font-medium">2</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Estimated time saved</span><span className="font-medium">18 min</span></div>
                {t.issue && <div className="rounded-md border border-warning/40 bg-warning-soft px-3 py-2 text-xs"><span className="font-medium">Open issue:</span> {t.issue}</div>}
              </div>
            </div>
          </div>
        )}

        {tab === "Documents" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-4">
              {[{ n: "Ontario Driver's Licence", type: "Government ID", icon: IdCard }, { n: "RBC Account Statement — September 2026", type: "Account Statement", icon: FileText }].map((d) => (
                <div key={d.n} className="panel flex gap-4 p-4">
                  <div className="grid h-20 w-16 shrink-0 place-items-center rounded border bg-muted"><d.icon className="h-6 w-6 text-muted-foreground" /></div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{d.n}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{d.type} · Uploaded Oct 2, 2026</div>
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary"><CheckCircle2 className="h-3.5 w-3.5" />Scanned successfully</div>
                  </div>
                  <button className="btn-outline btn-sm self-start" onClick={() => toast("Document preview is unavailable in the demo environment.")}><Eye className="h-3.5 w-3.5" />View</button>
                </div>
              ))}
            </div>
            <div className="panel">
              <div className="panel-head"><span className="eyebrow">Extracted Data</span></div>
              <div className="divide-y text-sm">
                {[["Name", t.client, "id"], ["Date of Birth", DEMO_CLIENT.dob, "id"], ["Address", DEMO_CLIENT.address, "id"], ["ID Number", DEMO_CLIENT.idNumber, "id"], ["ID Expiry", DEMO_CLIENT.idExpiry, "id"],
                  ["Institution", t.institution, "statement"], ["Account Type", accType, "statement"], ["Account Number", acc.accountNumber, "statement"], ["Statement Date", DEMO_ACCOUNT.statementDate, "statement"], ["Value", DEMO_ACCOUNT.value, "statement"]].map(([k, v, s]) => (
                  <div key={k} className="flex items-center justify-between gap-3 px-5 py-2.5">
                    <span className="w-32 text-muted-foreground">{k}</span><span className="flex-1 font-medium">{v}</span><SourceTag source={s as "id" | "statement"} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "Transfer Form" && (
          <div className="rounded-lg border bg-muted/60 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><FormLegend /><span className="text-xs text-muted-foreground">Click a field to edit</span></div>
            <TransferFormPreview client={cl} account={acc} transfer={ADVISOR_DEFAULTS} editable sin={sin} setSin={setSin}
              onClientEdit={(k, v) => setClient({ ...client, [k]: v })} />
          </div>
        )}

        {tab === "Activity" && (
          <div className="panel max-w-2xl p-6"><ActivityTimeline /></div>
        )}
      </div>
    </div>
  );
}
