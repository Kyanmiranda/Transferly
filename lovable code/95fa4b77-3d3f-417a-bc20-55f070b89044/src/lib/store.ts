import { useEffect, useState } from "react";
import { TRANSFERS, type Status, type TransferRow } from "./demo-data";

const KEY = "transferly:overrides";
type Overrides = Record<string, { status: Status; issue?: string | undefined; updated?: string }>;

function read(): Overrides {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}

export function setTransferStatus(id: string, status: Status, issue?: string) {
  const o = read();
  o[id] = { status, issue, updated: "Just now" };
  localStorage.setItem(KEY, JSON.stringify(o));
  window.dispatchEvent(new Event("transferly:update"));
}

export function resetDemo() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("transferly:update"));
}

export function useTransfers(): TransferRow[] {
  const [o, setO] = useState<Overrides>({});
  useEffect(() => {
    const sync = () => setO(read());
    sync();
    window.addEventListener("transferly:update", sync);
    return () => window.removeEventListener("transferly:update", sync);
  }, []);
  return TRANSFERS.map((t) => { const x = o[t.id]; return x ? { ...t, status: x.status, issue: x.issue, updated: x.updated ?? t.updated } : t; });
}
