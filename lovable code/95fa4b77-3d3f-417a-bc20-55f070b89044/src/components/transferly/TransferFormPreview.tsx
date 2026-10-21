import { useState } from "react";
import { cn } from "@/lib/utils";
import { SOURCE_SHORT, type ClientInfo, type AccountInfo, type TransferInfo, type Source } from "@/lib/demo-data";

type Kind = "auto" | "manual" | "advisor";

function Cell({ label, value, source, kind = "auto", flagged, editable, onEdit, wide }: {
  label: string; value: string; source?: Source | undefined; kind?: Kind; flagged?: boolean | undefined;
  editable?: boolean | undefined; onEdit?: ((v: string) => void) | undefined; wide?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div className={cn("relative border-r border-b border-foreground/30 px-2 pt-1 pb-1.5", wide && "col-span-2")}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="font-sans text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 min-h-[22px] rounded-sm px-1 text-[13px]",
        kind === "auto" && source && source !== "advisor" && value && "bg-secondary",
        (kind === "advisor" || source === "advisor") && "bg-info-soft",
        kind === "manual" && !value && "border border-dashed border-warning bg-warning-soft",
        flagged && "ring-1 ring-warning")}>
        {editable && onEdit ? (
          <input className="w-full bg-transparent outline-none" value={value} placeholder="Manual entry required" onChange={(e) => onEdit(e.target.value)} />
        ) : value || <span className="font-sans text-[11px] italic text-warning">Manual entry required</span>}
      </div>
      {source && (hover || flagged) && (
        <div className="absolute -top-2 right-1 z-10 rounded bg-brand-dark px-1.5 py-0.5 font-sans text-[10px] text-primary-foreground shadow">
          Source: {SOURCE_SHORT[source]}
        </div>
      )}
    </div>
  );
}

function Section({ n, title, children, cols = 4 }: { n: string; title: string; children: React.ReactNode; cols?: number }) {
  return (
    <div className="mt-4">
      <div className="bg-foreground px-2 py-1 font-sans text-[10px] font-bold uppercase tracking-widest text-background">Section {n} — {title}</div>
      <div className={cn("grid border-l border-foreground/30", cols === 4 ? "grid-cols-4" : "grid-cols-3")}>{children}</div>
    </div>
  );
}

const Box = ({ on, label }: { on: boolean; label: string }) => (
  <span className="mr-4 inline-flex items-center gap-1.5 text-[12px]">
    <span className={cn("grid h-3.5 w-3.5 place-items-center border border-foreground text-[10px] leading-none", on && "bg-secondary")}>{on ? "✕" : ""}</span>{label}
  </span>
);

export function TransferFormPreview({ client, account, transfer, addressFlagged, editable, sin, setSin, signature, onClientEdit, sourceFor }: {
  client: ClientInfo; account: AccountInfo; transfer: TransferInfo; addressFlagged?: boolean;
  sourceFor?: (key: string, fallback: Source) => Source | undefined;
  editable?: boolean; sin?: string; setSin?: (v: string) => void; signature?: string;
  onClientEdit?: (k: keyof ClientInfo, v: string) => void; edited?: Set<string>;
}) {
  const source = (key: string, fallback: Source) => sourceFor ? sourceFor(key, fallback) : fallback;
  const e = (k: keyof ClientInfo) => (editable && onClientEdit ? (v: string) => onClientEdit(k, v) : undefined);
  return (
    <div className="form-paper mx-auto max-w-[760px] rounded-sm p-8">
      <div className="flex items-start justify-between border-b-2 border-foreground pb-3">
        <div>
          <div className="font-sans text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Transfer preparation</div>
          <div className="text-xl font-semibold">Request for Account Transfer</div>
          <div className="font-sans text-[11px] text-muted-foreground">Transfer Authorization — Canadian Investment Dealers</div>
        </div>
        <div className="text-right font-sans text-[10px] text-muted-foreground">
          <div>Ref. TR-2026-1048</div><div>Draft preview</div>
        </div>
      </div>

      <Section n="1" title="Annuitant / Client Information">
        <Cell label="Surname" value={client.lastName} source={source('lastName', 'id')} editable={editable} onEdit={e("lastName")} />
        <Cell label="Given name(s)" value={client.firstName} source={source('firstName', 'id')} editable={editable} onEdit={e("firstName")} />
        <Cell label="Date of birth" value={client.dob} source={source('dob', 'id')} />
        <Cell label="Social insurance no." value={sin ?? ""} kind="manual" editable={!!setSin} onEdit={setSin} />
        <Cell label="Street address" value={client.address} source={source('address', 'id')} flagged={addressFlagged} wide editable={editable} onEdit={e("address")} />
        <Cell label="City" value={client.city} source={source('city', 'id')} />
        <Cell label="Province / Postal" value={`${client.province === "Ontario" ? "ON" : client.province}  ${client.postal}`} source={source("postal", "id")} />
        <Cell label="Identification" value={client.idType} source={source('idType', 'id')} wide />
        <Cell label="ID number" value={client.idNumber} source={source('idNumber', 'id')} />
        <Cell label="ID expiry" value={client.idExpiry} source={source('idExpiry', 'id')} />
      </Section>

      <Section n="2" title="Delivering Institution (Transferor)">
        <Cell label="Institution name" value={account.institution} source={source('institution', 'statement')} wide />
        <Cell label="Account number" value={account.accountNumber} source={source('accountNumber', 'statement')} />
        <Cell label="Plan type" value={account.accountType} source={source('accountType', 'statement')} />
        <Cell label="Account holder" value={account.holder} source={source('holder', 'statement')} wide />
        <Cell label="Statement date" value={account.statementDate} source={source('statementDate', 'statement')} />
        <Cell label="Approx. value" value={account.value} source={source('value', 'statement')} />
      </Section>

      <Section n="3" title="Receiving Institution (Transferee)">
        <Cell label="Institution name" value={transfer.receivingInstitution} source="settings" wide />
        <Cell label="Account number" value={transfer.receivingAccount} source="settings" />
        <Cell label="Plan type" value={account.accountType} source={source('accountType', 'statement')} />
        <Cell label="Advisor / Representative" value={transfer.advisor} source="settings" wide />
        <Cell label="Dealer code" value="" kind="manual" />
        <Cell label="Rep code" value="" kind="manual" />
      </Section>

      <Section n="4" title="Transfer Instructions" cols={3}>
        <div className="col-span-3 border-r border-b border-foreground/30 px-2 py-2.5">
          <div className="mb-1.5 font-sans text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Type of transfer</div>
          <Box on={transfer.transferType === "Full Transfer"} label="Full" />
          <Box on={transfer.transferType === "Partial Transfer"} label="Partial" />
          <span className="mx-3 text-muted-foreground">|</span>
          <Box on={transfer.assetHandling === "In Kind"} label="In kind" />
          <Box on={transfer.assetHandling === "In Cash"} label="In cash" />
          <Box on={transfer.assetHandling === "Mixed"} label="Mixed" />
        </div>
      </Section>

      <Section n="5" title="Authorization" cols={3}>
        <Cell label="Client signature" value={signature ?? ""} kind="manual" />
        <Cell label="Date" value={new Date().toLocaleDateString("en-CA")} />
        <Cell label="Advisor signature" value="" kind="manual" />
      </Section>
      <p className="mt-4 font-sans text-[9px] leading-relaxed text-muted-foreground">
        Draft preview for advisor review. Download the supplied Transferly forms to complete remaining application fields and signatures.
      </p>
    </div>
  );
}

export function FormLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-secondary ring-1 ring-primary/30" />Automatically completed</span>
      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-dashed border-warning bg-warning-soft" />Manual entry</span>
      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-info-soft ring-1 ring-info/30" />Updated by advisor</span>
    </div>
  );
}
