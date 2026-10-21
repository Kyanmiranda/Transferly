export type Source = "id" | "statement" | "settings" | "advisor" | "other";

export const SOURCE_LABEL: Record<Source, string> = {
  other: "From Supporting Document",
  id: "From Driver's Licence",
  statement: "From Account Statement",
  settings: "From Advisor Settings",
  advisor: "Updated by Advisor",
};

export const SOURCE_SHORT: Record<Source, string> = {
  id: "Driver's Licence",
  statement: "Account Statement",
  other: "Supporting Document",
  settings: "Advisor Settings",
  advisor: "Advisor",
};

export interface ClientInfo {
  firstName: string; lastName: string; dob: string; address: string; city: string;
  province: string; postal: string; idType: string; idNumber: string; idExpiry: string;
}
export interface AccountInfo {
  holder: string; institution: string; accountType: string; accountNumber: string;
  statementDate: string; value: string;
}
export interface TransferInfo {
  transferType: "Full Transfer" | "Partial Transfer";
  assetHandling: "In Kind" | "In Cash" | "Mixed";
  receivingInstitution: string; receivingAccount: string; advisor: string;
}

export const DEMO_CLIENT: ClientInfo = {
  firstName: "Sarah", lastName: "Thompson", dob: "May 18, 1982",
  address: "128 Wellington Street West", city: "Toronto", province: "Ontario",
  postal: "M5J 2N1", idType: "Ontario Driver's Licence", idNumber: "••••••4827",
  idExpiry: "May 18, 2029",
};
export const STATEMENT_ADDRESS = "128 Wellington St. W";

export const DEMO_ACCOUNT: AccountInfo = {
  holder: "Sarah Thompson", institution: "RBC Dominion Securities", accountType: "RRSP",
  accountNumber: "••••4821", statementDate: "September 18, 2026", value: "$428,500",
};

export const ADVISOR_DEFAULTS: TransferInfo = {
  transferType: "Full Transfer", assetHandling: "In Kind",
  receivingInstitution: "Designed Wealth Management", receivingAccount: "DW-918204",
  advisor: "Brady Schnare",
};

export type Status =
  | "Documents Needed" | "Preparing" | "Review Required" | "Ready"
  | "Submitted" | "Rejected" | "Completed";

export interface TransferRow {
  id: string; client: string; account: string; institution: string; status: Status;
  issue?: string | undefined; updated: string; created: string; owner: string;
  filled: number; total: number; docs: string;
}

export const TRANSFERS: TransferRow[] = [
  { id: "TR-2026-1048", client: "Sarah Thompson", account: "RRSP ••••4821", institution: "RBC Dominion Securities", status: "Review Required", issue: "Address mismatch", updated: "Today", created: "Oct 2, 2026", owner: "Brady Schnare", filled: 23, total: 25, docs: "ID, Statement" },
  { id: "TR-2026-1047", client: "Michael Chen", account: "TFSA ••••1934", institution: "TD Direct Investing", status: "Documents Needed", issue: "Identification required", updated: "Yesterday", created: "Oct 1, 2026", owner: "Brady Schnare", filled: 11, total: 21, docs: "Statement" },
  { id: "TR-2026-1046", client: "Jennifer Patel", account: "Non-Registered ••••7338", institution: "BMO Nesbitt Burns", status: "Rejected", issue: "Signature missing", updated: "2 days ago", created: "Sep 28, 2026", owner: "Brady Schnare", filled: 24, total: 25, docs: "ID, Statement" },
  { id: "TR-2026-1045", client: "David Morrison", account: "RRIF ••••2210", institution: "Scotia Wealth Management", status: "Ready", updated: "Sep 30", created: "Sep 30, 2026", owner: "Brady Schnare", filled: 22, total: 24, docs: "ID, Statement" },
  { id: "TR-2026-1044", client: "Amélie Tremblay", account: "TFSA ••••5502", institution: "National Bank Financial", status: "Ready", updated: "Sep 29", created: "Sep 29, 2026", owner: "Lauren Kim", filled: 19, total: 21, docs: "ID, Statement, Other" },
  { id: "TR-2026-1043", client: "Robert Singh", account: "RESP ••••8817", institution: "CIBC Wood Gundy", status: "Submitted", updated: "Sep 27", created: "Sep 26, 2026", owner: "Brady Schnare", filled: 25, total: 25, docs: "ID, Statement" },
  { id: "TR-2026-1042", client: "Grace O'Neill", account: "LIRA ••••4409", institution: "RBC Dominion Securities", status: "Preparing", updated: "Sep 26", created: "Sep 26, 2026", owner: "Lauren Kim", filled: 18, total: 25, docs: "ID, Statement" },
  { id: "TR-2026-1041", client: "Thomas Leblanc", account: "RRSP ••••3076", institution: "Questrade", status: "Completed", updated: "Sep 22", created: "Sep 15, 2026", owner: "Brady Schnare", filled: 24, total: 25, docs: "ID, Statement" },
  { id: "TR-2026-1040", client: "Priya Raman", account: "Spousal RRSP ••••6620", institution: "TD Wealth", status: "Completed", updated: "Sep 19", created: "Sep 12, 2026", owner: "Lauren Kim", filled: 25, total: 25, docs: "ID, Statement" },
];

export const ACTIVITY = [
  { time: "Oct 2 — 9:41 AM", text: "Driver's licence uploaded", kind: "doc" },
  { time: "Oct 2 — 9:41 AM", text: "9 client fields extracted", kind: "extract" },
  { time: "Oct 2 — 9:42 AM", text: "Account statement uploaded", kind: "doc" },
  { time: "Oct 2 — 9:42 AM", text: "6 account fields extracted", kind: "extract" },
  { time: "Oct 2 — 9:42 AM", text: "Transfer form automatically prepared", kind: "form" },
  { time: "Oct 2 — 9:43 AM", text: "Address discrepancy detected", kind: "warn" },
  { time: "Oct 2 — 9:44 AM", text: "Address confirmed by Brady Schnare", kind: "user" },
  { time: "Oct 2 — 9:44 AM", text: "Transfer marked ready for submission", kind: "done" },
] as const;
