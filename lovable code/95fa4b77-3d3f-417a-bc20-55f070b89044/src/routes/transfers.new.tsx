import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  IdCard,
  FileText,
  Files,
  Upload,
  CheckCircle2,
  Loader2,
  Sparkle,
  ArrowRight,
  AlertTriangle,
  Download,
  Check,
  Info,
  ScanLine,
} from "lucide-react";
import { z } from "zod";
import { cn } from "@/lib/utils";
import {
  DEMO_CLIENT,
  DEMO_ACCOUNT,
  ADVISOR_DEFAULTS,
  STATEMENT_ADDRESS,
  type ClientInfo,
  type AccountInfo,
  type TransferInfo,
  type Source,
} from "@/lib/demo-data";
import { scanDocument, validateDocument } from "@/lib/document-scanner";
import {
  EMPTY_CLIENT,
  EMPTY_ACCOUNT,
  EMPTY_BANK,
  validateTransfer,
  type Extraction,
} from "@/lib/document-extraction";
import { downloadTransferPacket, createTransferPacket } from "@/lib/transfer-pdf";
import { setTransferStatus } from "@/lib/store";
import { ExtractedField, ValidationCheck, PageHeader } from "@/components/transferly/ui";
import { TransferFormPreview, FormLegend } from "@/components/transferly/TransferFormPreview";
import { IdentificationCropper } from "@/components/transferly/IdentificationCropper";

export const Route = createFileRoute("/transfers/new")({
  validateSearch: z.object({ demo: z.boolean().optional() }),
  head: () => ({
    meta: [
      { title: "Create Transfer — Transferly" },
      {
        name: "description",
        content: "Upload client documents and Transferly prepares the transfer paperwork.",
      },
      { property: "og:title", content: "Create Transfer — Transferly" },
      {
        property: "og:description",
        content: "Upload client documents and Transferly prepares the transfer paperwork.",
      },
    ],
  }),
  component: CreateTransfer,
});

type Step = "upload" | "scanning" | "extracted" | "preparing" | "prepared" | "review" | "ready";
type DocKey = "id" | "statement" | "other";

const STEPS = [
  { k: "upload", l: "Documents" },
  { k: "extracted", l: "Extracted Data" },
  { k: "prepared", l: "Form & Checks" },
  { k: "review", l: "Review" },
] as const;
const STEP_IDX: Record<Step, number> = {
  upload: 0,
  scanning: 0,
  extracted: 1,
  preparing: 1,
  prepared: 2,
  review: 3,
  ready: 4,
};

function Stepper({ step }: { step: Step }) {
  const cur = STEP_IDX[step];
  return (
    <ol className="mb-7 flex items-center gap-2 text-xs">
      {STEPS.map((s, i) => (
        <li key={s.k} className="flex items-center gap-2">
          <span
            className={cn(
              "grid h-5 w-5 place-items-center rounded-full border text-[10px] font-semibold",
              i < cur
                ? "border-primary bg-primary text-primary-foreground"
                : i === cur
                  ? "border-primary text-primary"
                  : "text-muted-foreground",
            )}
          >
            {i < cur ? <Check className="h-3 w-3" /> : i + 1}
          </span>
          <span className={cn(i <= cur ? "font-medium text-foreground" : "text-muted-foreground")}>
            {s.l}
          </span>
          {i < STEPS.length - 1 && <span className="mx-2 h-px w-8 bg-border" />}
        </li>
      ))}
    </ol>
  );
}

function DocumentUploader({
  icon: Icon,
  title,
  desc,
  optional,
  file,
  onFile,
  onFiles,
}: {
  icon: typeof IdCard;
  title: string;
  desc: string;
  optional?: boolean;
  file?: string | undefined;
  onFile: (n: File) => void;
  onFiles?: (files: File[]) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div
      className={cn(
        "panel flex flex-col p-5 transition-colors",
        file && "border-primary/40 bg-secondary/40",
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "grid h-10 w-10 place-items-center rounded-md",
            file ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {file ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </div>
        {optional && <span className="text-[11px] text-muted-foreground">Optional</span>}
      </div>
      <div className="mt-4 text-sm font-semibold">{title}</div>
      <div className="mt-1 flex-1 text-xs text-muted-foreground">{desc}</div>
      {file ? (
        <button
          className="mt-4 truncate rounded border bg-card px-2.5 py-1.5 text-xs"
          onClick={() => ref.current?.click()}
          title="Replace document"
        >
          <FileText className="mr-1.5 inline h-3.5 w-3.5 text-primary" />
          {file} ? Replace
        </button>
      ) : (
        <button className="btn-outline mt-4 w-full" onClick={() => ref.current?.click()}>
          <Upload className="h-4 w-4" />
          Upload Document
        </button>
      )}
      <input
        ref={ref}
        aria-label={title}
        type="file"
        multiple={!!onFiles}
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (onFiles && files.length) onFiles(files);
          else if (files[0]) onFile(files[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

const SCAN_LINES = [
  "Identification detected",
  "Account statement detected",
  "Client information extracted",
  "Account information extracted",
  "Transfer details prepared",
];

function ScanningProgress({
  lines,
  title,
  onDone,
}: {
  lines: string[];
  title: string;
  onDone: () => void;
}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (n >= lines.length) {
      const t = setTimeout(onDone, 550);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setN(n + 1), 650);
    return () => clearTimeout(t);
  }, [n, lines.length, onDone]);
  return (
    <div className="panel mx-auto max-w-lg px-8 py-10">
      <div className="flex items-center gap-3">
        <ScanLine className="h-5 w-5 text-primary" />
        <div className="text-base font-semibold">{title}</div>
      </div>
      <div className="mt-5 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${(n / lines.length) * 100}%` }}
        />
      </div>
      <ul className="mt-6 space-y-2.5">
        {lines.map((l, i) => (
          <li
            key={l}
            className={cn(
              "flex items-center gap-2.5 text-sm transition-opacity",
              i > n && "opacity-35",
            )}
          >
            {i < n ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : i === n ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <span className="h-4 w-4 rounded-full border" />
            )}
            {l}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Radio<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      <div className="flex gap-2">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={cn(
              "flex h-9 items-center gap-2 rounded-md border px-3 text-sm",
              value === o ? "border-primary bg-secondary text-brand-dark" : "bg-card",
            )}
          >
            <span
              className={cn(
                "h-3.5 w-3.5 rounded-full border-2",
                value === o
                  ? "border-primary bg-primary shadow-[inset_0_0_0_2px_var(--card)]"
                  : "border-input",
              )}
            />
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function CreateTransfer() {
  const { demo } = Route.useSearch();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("upload");
  const [docs, setDocs] = useState<Partial<Record<DocKey, string>>>({});
  const [client, setClient] = useState<ClientInfo>(EMPTY_CLIENT);
  const [account, setAccount] = useState<AccountInfo>(EMPTY_ACCOUNT);
  const [transfer, setTransfer] = useState<TransferInfo>(ADVISOR_DEFAULTS);
  const [edited, setEdited] = useState<Set<string>>(new Set());
  const [addr, setAddr] = useState<"open" | "id" | "statement" | "manual" | "editing">("open");
  const [manualAddr, setManualAddr] = useState(DEMO_CLIENT.address);

  const [uploads, setUploads] = useState<Partial<Record<DocKey, File>>>({});
  const [bank, setBank] = useState(EMPTY_BANK);
  const [includeEft, setIncludeEft] = useState(false);
  const [supporting, setSupporting] = useState<File[]>([]);
  const [results, setResults] = useState<Partial<Record<DocKey, Extraction>>>({});
  const [isDemo, setIsDemo] = useState(false);
  const [scanMessage, setScanMessage] = useState("Starting scanner...");
  const [scanError, setScanError] = useState("");
  const [preview, setPreview] = useState("");
  useEffect(() => {
    setPreview("");
  }, [client, account, transfer, bank, includeEft]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const [downloading, setDownloading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const selectFile = (key: DocKey, file: File) => {
    try {
      validateDocument(file);
      setScanError("");
      setIsDemo(false);
      setDocs((prev) => ({ ...prev, [key]: file.name }));
      setUploads((prev) => ({ ...prev, [key]: file }));
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Invalid document");
    }
  };
  const scan = async () => {
    setStep("scanning");
    setScanError("");
    setIsDemo(false);
    setConfirmed(false);
    setEdited(new Set());
    try {
      const found: Partial<Record<DocKey, Extraction>> = {};
      for (const file of supporting) {
        const result = await scanDocument(file, (m) => {
          if (alive.current) setScanMessage(m);
        });
        found.other = {
          bank: { ...found.other?.bank, ...result.bank },
          client: { ...found.other?.client, ...result.client },
          account: { ...found.other?.account, ...result.account },
          text: (found.other?.text || "") + "\n--- " + file.name + " ---\n" + result.text,
          filename: supporting.map((f) => f.name).join(", "),
        };
      }
      for (const key of ["id", "statement"] as const) {
        const file = uploads[key];
        if (file)
          found[key] = await scanDocument(file, (m) => {
            if (alive.current) setScanMessage(m);
          });
      }
      if (!alive.current) return;
      setResults(found);
      setBank({ ...EMPTY_BANK, ...found.other?.bank });
      setClient({
        ...EMPTY_CLIENT,
        ...found.other?.client,
        ...found.statement?.client,
        ...found.id?.client,
      });
      setAccount({ ...EMPTY_ACCOUNT, ...found.other?.account, ...found.statement?.account });
      setAddr(
        found.id?.client.address &&
          found.statement?.client.address &&
          found.id.client.address !== found.statement.client.address
          ? "open"
          : "id",
      );
      setStep("extracted");
    } catch (e) {
      if (alive.current) {
        setScanError(e instanceof Error ? e.message : "Scanning failed. Try again.");
        setStep("upload");
      }
    }
  };
  const download = async () => {
    setDownloading(true);
    try {
      await downloadTransferPacket(client, account, transfer, includeEft ? bank : undefined);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create PDF.");
    } finally {
      setDownloading(false);
    }
  };
  const previewForms = async () => {
    setDownloading(true);
    try {
      const bytes = await createTransferPacket(
        client,
        account,
        transfer,
        includeEft ? bank : undefined,
      );
      setPreview(
        URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" })),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not preview forms.");
    } finally {
      setDownloading(false);
    }
  };
  useEffect(() => {
    if (demo) {
      setIsDemo(true);
      setIncludeEft(false);
      setBank(EMPTY_BANK);
      setClient(DEMO_CLIENT);
      setAccount(DEMO_ACCOUNT);
      setDocs({ id: "ON-drivers-licence-demo.jpg", statement: "RBC-DS-statement-Sep2026.pdf" });
      setStep("prepared");
    }
  }, [demo]);

  const useDemo = () => {
    setIsDemo(true);
    setClient(DEMO_CLIENT);
    setAccount(DEMO_ACCOUNT);
    setUploads({});
    setSupporting([]);
    setResults({});
    setEdited(new Set());
    setAddr("open");
    setConfirmed(false);
    setDocs({ id: "ON-drivers-licence-demo.jpg", statement: "RBC-DS-statement-Sep2026.pdf" });
    setStep("scanning");
  };
  const editC = (k: keyof ClientInfo, v: string) => {
    setClient({ ...client, [k]: v });
    setEdited(new Set(edited).add(k));
  };
  const editA = (k: keyof AccountInfo, v: string) => {
    setAccount({ ...account, [k]: v });
    setEdited(new Set(edited).add(k));
  };
  const src = (k: string, fallback: Source): Source | undefined => {
    if (edited.has(k)) return "advisor";
    if (isDemo) return fallback;
    for (const key of (k in EMPTY_CLIENT
      ? ["id", "statement", "other"]
      : ["statement", "other"]) as DocKey[]) {
      const r = results[key];
      if (
        r &&
        ((r.client as Record<string, string>)[k] || (r.account as Record<string, string>)[k])
      )
        return key;
    }
    return undefined;
  };
  const checks = validateTransfer(client, account, transfer);
  if (includeEft)
    checks.push({
      label: "Bank details complete and correctly formatted",
      ok:
        !!bank.institution.trim() &&
        /^\d{5}$/.test(bank.transit) &&
        /^\d{3}$/.test(bank.institutionNumber) &&
        /^\d{5,12}$/.test(bank.accountNumber),
    });
  const valid = checks.every((c) => c.ok);
  const idAddress = isDemo ? DEMO_CLIENT.address : results.id?.client.address || client.address;
  const statementAddress = isDemo ? STATEMENT_ADDRESS : results.statement?.client.address || "";
  const clientCount = isDemo
    ? 10
    : Object.keys({ ...results.other?.client, ...results.statement?.client, ...results.id?.client })
        .length;
  const accountCount = isDemo
    ? 6
    : Object.keys({ ...results.other?.account, ...results.statement?.account }).length;
  const resolved = addr !== "open" && addr !== "editing";

  if (step === "scanning" && !isDemo)
    return (
      <Shell step={step}>
        <div className="panel mx-auto max-w-lg p-8" role="status" aria-live="polite">
          <Loader2 className="mb-4 h-6 w-6 animate-spin text-primary" />
          <h2 className="font-semibold">Scanning documents</h2>
          <p className="mt-3 text-sm text-muted-foreground">{scanMessage}</p>
          <p className="mt-4 text-xs text-muted-foreground">
            Keep this page open. Documents are processed in your browser.
          </p>
        </div>
      </Shell>
    );
  if (step === "scanning")
    return (
      <Shell step={step}>
        <ScanningProgress
          title="Scanning documents..."
          lines={SCAN_LINES}
          onDone={() => setStep("extracted")}
        />
      </Shell>
    );
  if (step === "preparing")
    return (
      <Shell step={step}>
        <ScanningProgress
          title="Preparing transfer paperwork..."
          lines={[
            "Mapping client information",
            "Mapping account information",
            "Applying transfer instructions",
            "Validating form fields",
          ]}
          onDone={() => setStep("prepared")}
        />
      </Shell>
    );

  if (step === "upload")
    return (
      <Shell step={step}>
        <PageHeader
          title="Create Transfer"
          subtitle="Upload your client's documents and Transferly will prepare the transfer paperwork."
        />
        <div className="panel border-dashed px-8 py-10">
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-lg font-semibold">Start with your client documents</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Upload the documents you already have. Transferly will extract the information
              required to prepare the transfer.
            </p>
          </div>
          <div className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-3">
            <DocumentUploader
              icon={IdCard}
              title="Client Identification"
              desc="Driver's licence or government-issued ID"
              file={docs.id}
              onFile={(f) => selectFile("id", f)}
            />
            <DocumentUploader
              icon={FileText}
              title="Account Statement"
              desc="Most recent statement from the delivering institution"
              file={docs.statement}
              onFile={(f) => selectFile("statement", f)}
            />
            <DocumentUploader
              icon={Files}
              title="Additional Documents"
              desc="Tax returns, bank details and other paperwork; select multiple files"
              optional
              file={docs.other}
              onFile={(f) => selectFile("other", f)}
              onFiles={(files) => {
                try {
                  if (files.length > 10) throw new Error("Select up to 10 supporting documents.");
                  files.forEach(validateDocument);
                  setSupporting(files);
                  setDocs((prev) => ({ ...prev, other: files.map((f) => f.name).join(", ") }));
                  setScanError("");
                } catch (e) {
                  setScanError(e instanceof Error ? e.message : "Invalid documents");
                }
              }}
            />
          </div>
          {uploads.id?.type.startsWith("image/") && (
            <IdentificationCropper file={uploads.id} onApply={(file) => selectFile("id", file)} />
          )}
          {scanError && (
            <p role="alert" className="mt-5 text-center text-sm text-destructive">
              {scanError}
            </p>
          )}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              className="btn-primary"
              disabled={!uploads.id || !uploads.statement}
              onClick={scan}
            >
              <ScanLine className="h-4 w-4" />
              Scan Documents
            </button>
            <button className="btn-outline" onClick={useDemo}>
              <Sparkle className="h-4 w-4" />
              Use Demo Documents
            </button>
          </div>
          <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5" />
            PDF, JPG, PNG or WebP | Up to 10 MB each. Files and extracted data stay in memory. OCR
            language files download on first use.
          </p>
        </div>
      </Shell>
    );

  if (step === "extracted")
    return (
      <Shell step={step}>
        <PageHeader
          title="Review Extracted Information"
          subtitle="Review every extracted value against its source. Unrecognized fields stay blank and require manual entry."
          actions={
            <button className="btn-primary" onClick={() => setStep("preparing")}>
              Prepare Transfer Form
              <ArrowRight className="h-4 w-4" />
            </button>
          }
        />
        <div className="space-y-6">
          <div className="panel p-4 text-sm">
            <strong>{isDemo ? "Synthetic demonstration" : "Document scan complete"}</strong>
            <p className="mt-1 text-muted-foreground">
              Review OCR text and correct any missing or misread fields before continuing.
            </p>
            {Object.entries(results).map(([key, r]) => (
              <details key={key} className="mt-3">
                <summary className="cursor-pointer font-medium">
                  {r.filename} - View extracted text
                </summary>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-muted p-3 text-xs">
                  {r.text}
                </pre>
              </details>
            ))}
          </div>
          <section className="panel">
            <div className="panel-head">
              <h2 className="text-sm font-semibold">Client Information</h2>
              <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <CheckCircle2 className="h-4 w-4" />
                {clientCount} fields automatically completed
              </span>
            </div>
            <div className="grid gap-x-5 gap-y-4 p-5 md:grid-cols-3">
              <ExtractedField
                label="First Name"
                value={client.firstName}
                onChange={(v) => editC("firstName", v)}
                source={src("firstName", "id")}
              />
              <ExtractedField
                label="Last Name"
                value={client.lastName}
                onChange={(v) => editC("lastName", v)}
                source={src("lastName", "id")}
              />
              <ExtractedField
                label="Date of Birth"
                value={client.dob}
                onChange={(v) => editC("dob", v)}
                source={src("dob", "id")}
              />
              <ExtractedField
                label="Address"
                value={client.address}
                onChange={(v) => editC("address", v)}
                source={src("address", "id")}
              />
              <ExtractedField
                label="City"
                value={client.city}
                onChange={(v) => editC("city", v)}
                source={src("city", "id")}
              />
              <div className="grid grid-cols-2 gap-3">
                <ExtractedField
                  label="Province"
                  value={client.province}
                  onChange={(v) => editC("province", v)}
                />
                <ExtractedField
                  label="Postal Code"
                  value={client.postal}
                  onChange={(v) => editC("postal", v)}
                />
              </div>
              <ExtractedField
                label="Identification Type"
                value={client.idType}
                onChange={(v) => editC("idType", v)}
                source={src("idType", "id")}
              />
              <ExtractedField
                label="Identification Number"
                value={client.idNumber}
                onChange={(v) => editC("idNumber", v)}
                source={src("idNumber", "id")}
              />
              <ExtractedField
                label="Expiry Date"
                value={client.idExpiry}
                onChange={(v) => editC("idExpiry", v)}
                source={src("idExpiry", "id")}
              />
            </div>
          </section>
          <section className="panel">
            <div className="panel-head">
              <h2 className="text-sm font-semibold">Account Information</h2>
              <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <CheckCircle2 className="h-4 w-4" />
                {accountCount} fields automatically completed
              </span>
            </div>
            <div className="grid gap-x-5 gap-y-4 p-5 md:grid-cols-3">
              <ExtractedField
                label="Account Holder"
                value={account.holder}
                onChange={(v) => editA("holder", v)}
                source={src("holder", "statement")}
              />
              <ExtractedField
                label="Delivering Institution"
                value={account.institution}
                onChange={(v) => editA("institution", v)}
                source={src("institution", "statement")}
              />
              <ExtractedField
                label="Account Type"
                value={account.accountType}
                onChange={(v) => editA("accountType", v)}
                source={src("accountType", "statement")}
              />
              <ExtractedField
                label="Account Number"
                value={account.accountNumber}
                onChange={(v) => editA("accountNumber", v)}
                source={src("accountNumber", "statement")}
              />
              <ExtractedField
                label="Statement Date"
                value={account.statementDate}
                onChange={(v) => editA("statementDate", v)}
                source={src("statementDate", "statement")}
              />
              <ExtractedField
                label="Estimated Account Value"
                value={account.value}
                onChange={(v) => editA("value", v)}
                source={src("value", "statement")}
              />
            </div>
          </section>
          <section className="panel p-5">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={includeEft}
                onChange={(e) => setIncludeEft(e.target.checked)}
              />
              Include electronic funds transfer form
            </label>
            <p className="mt-2 text-xs text-muted-foreground">
              Bank details can be extracted from supporting documents. Review before including the
              EFT form.
            </p>
            {includeEft && (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {(
                  [
                    ["institution", "Bank name"],
                    ["transit", "Transit number (5 digits)"],
                    ["institutionNumber", "Institution number (3 digits)"],
                    ["accountNumber", "Bank account number"],
                  ] as const
                ).map(([key, label]) => (
                  <ExtractedField
                    key={key}
                    label={label}
                    value={bank[key]}
                    onChange={(v) => setBank({ ...bank, [key]: v })}
                  />
                ))}
              </div>
            )}
          </section>
          <section className="panel">
            <div className="panel-head">
              <h2 className="text-sm font-semibold">Transfer Instructions</h2>
            </div>
            <div className="mx-5 mt-4 flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-xs text-brand-dark">
              <Info className="h-4 w-4" />
              Transfer preferences were populated from your saved advisor settings.
            </div>
            <div className="grid gap-x-5 gap-y-4 p-5 md:grid-cols-2">
              <Radio
                label="Transfer Type"
                options={["Full Transfer", "Partial Transfer"]}
                value={transfer.transferType}
                onChange={(v) => setTransfer({ ...transfer, transferType: v })}
              />
              <Radio
                label="Asset Handling"
                options={["In Kind", "In Cash", "Mixed"]}
                value={transfer.assetHandling}
                onChange={(v) => setTransfer({ ...transfer, assetHandling: v })}
              />
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Receiving Institution
                </span>
                <input
                  className="field-input"
                  value={transfer.receivingInstitution}
                  onChange={(e) =>
                    setTransfer({ ...transfer, receivingInstitution: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Receiving Account Number
                </span>
                <input
                  className="field-input"
                  value={transfer.receivingAccount}
                  onChange={(e) => setTransfer({ ...transfer, receivingAccount: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Advisor
                </span>
                <select
                  className="field-input"
                  value={transfer.advisor}
                  onChange={(e) => setTransfer({ ...transfer, advisor: e.target.value })}
                >
                  <option>Brady Schnare</option>
                  <option>Lauren Kim</option>
                </select>
              </label>
            </div>
          </section>
          <div className="flex justify-end">
            <button className="btn-primary" onClick={() => setStep("preparing")}>
              Prepare Transfer Form
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Shell>
    );

  if (step === "prepared")
    return (
      <Shell step={step}>
        <PageHeader
          title="Transfer Form Prepared"
          subtitle="Review the prepared draft and resolve all flagged checks. Downloads use the supplied Transferly PDF templates."
          actions={
            <button
              className="btn-primary"
              disabled={!resolved || !valid}
              onClick={() => setStep("review")}
            >
              Continue to Review
              <ArrowRight className="h-4 w-4" />
            </button>
          }
        />
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="rounded-lg border bg-muted/60 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <FormLegend />
              <button className="btn-outline" disabled={downloading} onClick={previewForms}>
                Preview completed PDFs
              </button>
            </div>
            {preview && (
              <iframe
                title="Completed Transferly PDF forms"
                className="mb-5 h-[800px] w-full rounded border bg-white"
                src={preview}
              />
            )}
            <TransferFormPreview
              sourceFor={src}
              client={client}
              account={account}
              transfer={transfer}
              addressFlagged={!resolved}
            />
          </div>
          <div className="space-y-5">
            <div className="panel p-5">
              <h2 className="eyebrow">Automation Summary</h2>
              <p className="mt-3 text-sm">
                {Object.keys(docs).length} documents - {clientCount + accountCount} fields extracted
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Signatures and additional application fields require advisor completion. Downloads
                include unsigned drafts.
              </p>
              <button className="btn-outline mt-3" onClick={() => setStep("extracted")}>
                Edit information
              </button>
              <button className="btn-outline mt-2" disabled={downloading} onClick={download}>
                {downloading ? "Creating PDFs..." : "Download draft forms"}
              </button>
            </div>
            <div className="panel">
              <div className="panel-head">
                <span className="eyebrow">Pre-Submission Checks</span>
                <span className="text-xs text-muted-foreground">
                  {checks.filter((c) => c.ok).length + (resolved ? 1 : 0)} / {checks.length + 1}
                </span>
              </div>
              <div className="px-5 py-3">
                {checks.map((c) => (
                  <ValidationCheck key={c.label} ok={c.ok} warn={!c.ok}>
                    {c.label}
                  </ValidationCheck>
                ))}
                {resolved ? (
                  <ValidationCheck ok>Address confirmed</ValidationCheck>
                ) : (
                  <ValidationCheck warn>Address mismatch</ValidationCheck>
                )}
              </div>
              {!resolved ? (
                <div className="m-4 mt-0 rounded-md border border-warning/50 bg-warning-soft p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Review required
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    We found different address formats across the uploaded documents.
                  </p>
                  <dl className="mt-3 space-y-1.5 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Driver's Licence</dt>
                      <dd className="font-medium">{idAddress}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Account Statement</dt>
                      <dd className="font-medium">{statementAddress}</dd>
                    </div>
                  </dl>
                  {addr === "editing" ? (
                    <div className="mt-3 flex gap-2">
                      <input
                        className="field-input h-8 text-xs"
                        value={manualAddr}
                        onChange={(e) => setManualAddr(e.target.value)}
                      />
                      <button
                        className="btn-primary btn-sm h-8"
                        onClick={() => {
                          if (manualAddr.trim()) {
                            editC("address", manualAddr);
                            setAddr("manual");
                          }
                        }}
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => {
                          setClient({ ...client, address: idAddress });
                          setAddr("id");
                        }}
                      >
                        Use ID Address
                      </button>
                      <button
                        className="btn-outline btn-sm"
                        onClick={() => {
                          editC("address", statementAddress);
                          setAddr("statement");
                        }}
                      >
                        Use Statement Address
                      </button>
                      <button
                        className="btn-ghost btn-sm"
                        onClick={() => {
                          setManualAddr(client.address);
                          setAddr("editing");
                        }}
                      >
                        Edit Manually
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="m-4 mt-0 flex items-center gap-2 rounded-md bg-secondary px-3 py-2.5 text-sm font-medium text-brand-dark">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  {valid
                    ? "All required checks passed."
                    : "Complete or correct the flagged fields."}
                </div>
              )}
            </div>
          </div>
        </div>
      </Shell>
    );

  if (step === "review")
    return (
      <Shell step={step}>
        <PageHeader
          title="Review Transfer"
          subtitle="Review the draft before downloading. Signatures and application-specific information still require completion."
        />
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="rounded-lg border bg-muted/60 p-6">
            <TransferFormPreview
              sourceFor={src}
              client={client}
              account={account}
              transfer={transfer}
            />
          </div>
          <div className="space-y-5">
            <div className="panel">
              <div className="panel-head">
                <span className="eyebrow">Transfer Summary</span>
              </div>
              <dl className="divide-y px-5 text-sm">
                {[
                  ["Client", `${client.firstName} ${client.lastName}`],
                  ["Account", `${account.accountType} ${account.accountNumber}`],
                  ["From", account.institution],
                  ["To", transfer.receivingInstitution],
                  [
                    "Transfer",
                    `${transfer.transferType.replace(" Transfer", "")} — ${transfer.assetHandling}`,
                  ],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2.5">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
                <div className="py-2.5">
                  <dt className="text-muted-foreground">Documents Used</dt>
                  <dd className="mt-1 space-y-0.5 font-medium">
                    {Object.values(docs).map((name) => (
                      <div key={name}>{name}</div>
                    ))}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="panel">
              <div className="panel-head">
                <span className="eyebrow">Pre-Submission Checks</span>
              </div>
              <div className="px-5 py-3">
                {checks.map((c) => (
                  <ValidationCheck key={c.label} ok={c.ok} warn={!c.ok}>
                    {c.label}
                  </ValidationCheck>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button className="btn-outline" onClick={() => setStep("extracted")}>
                Edit information
              </button>
              <label className="panel flex gap-2 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                I reviewed extracted values against the source documents. Forms still require
                signatures.
              </label>
              <button
                className="btn-primary h-10"
                disabled={!valid || !resolved || !confirmed}
                onClick={() => {
                  if (isDemo) setTransferStatus("TR-2026-1048", "Ready");
                  setStep("ready");
                }}
              >
                Mark Ready for Submission
              </button>
              <button className="btn-outline" onClick={download} disabled={downloading}>
                Download Draft
              </button>
            </div>
          </div>
        </div>
      </Shell>
    );

  return (
    <Shell step={step}>
      <div className="panel mx-auto max-w-lg px-8 py-12 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-secondary">
          <CheckCircle2 className="h-6 w-6 text-primary" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">Transfer Ready</h1>
        <div className="mt-1 text-sm tabular-nums text-muted-foreground">
          Preparation:{" "}
          <span className="font-medium text-foreground">
            {isDemo ? "TR-2026-1048 (demo)" : "Current session"}
          </span>
        </div>
        <p className="mt-4 text-sm">
          The transfer draft has been reviewed. Download the paperwork to complete signatures and
          any remaining application fields.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <button className="btn-primary" onClick={() => setStep("review")}>
            View Transfer
          </button>
          <button className="btn-outline" onClick={download} disabled={downloading}>
            <Download className="h-4 w-4" />
            Download Form
          </button>
          <button
            className="btn-ghost"
            onClick={() => {
              navigate({ to: "/transfers/new", search: {} });
              setStep("upload");
              setDocs({});
              setUploads({});
              setResults({});
              setIsDemo(false);
              setBank(EMPTY_BANK);
              setIncludeEft(false);
              setConfirmed(false);
              setAddr("open");
              setEdited(new Set());
              setClient(EMPTY_CLIENT);
              setAccount(EMPTY_ACCOUNT);
            }}
          >
            Create Another Transfer
          </button>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ step, children }: { step: Step; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl">
      {step !== "ready" && <Stepper step={step} />}
      {children}
    </div>
  );
}
