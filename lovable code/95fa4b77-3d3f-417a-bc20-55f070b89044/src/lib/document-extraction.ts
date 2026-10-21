import type { AccountInfo, ClientInfo, TransferInfo } from "./demo-data";
import { extractOntarioLicence } from "./licence-extraction";

export const EMPTY_CLIENT: ClientInfo = {
  firstName: "",
  lastName: "",
  dob: "",
  address: "",
  city: "",
  province: "",
  postal: "",
  idType: "",
  idNumber: "",
  idExpiry: "",
};
export const EMPTY_ACCOUNT: AccountInfo = {
  holder: "",
  institution: "",
  accountType: "",
  accountNumber: "",
  statementDate: "",
  value: "",
};
export interface BankInfo {
  institution: string;
  transit: string;
  institutionNumber: string;
  accountNumber: string;
}
export const EMPTY_BANK: BankInfo = {
  institution: "",
  transit: "",
  institutionNumber: "",
  accountNumber: "",
};
export interface Extraction {
  client: Partial<ClientInfo>;
  account: Partial<AccountInfo>;
  bank: Partial<BankInfo>;
  text: string;
  filename: string;
}

// Conservative label matching: unrecognised values remain blank for advisor review.
export function extractFields(text: string, filename = ""): Extraction {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const value = (...labels: string[]) => {
    for (const label of labels) {
      const re = new RegExp(`^(?:${label})\\s*(?:[:#]|\\s-)?\\s*(.*)$`, "i");
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i]!.match(re);
        if (match) return (match[1]?.trim() || lines[i + 1] || "").trim();
      }
    }
    return "";
  };
  const client: Partial<ClientInfo> = {};
  const account: Partial<AccountInfo> = {};
  const bank: Partial<BankInfo> = {};
  const put = <T extends object>(obj: T, key: keyof T, v: string) => {
    if (v) Object.assign(obj, { [key]: v });
  };
  put(client, "firstName", value("First name", "Given names?"));
  put(client, "lastName", value("Last name", "Surname"));
  const holder = value("Account holder(?: name)?", "Client name", "Full name", "Name");
  if (holder) {
    account.holder = holder;
    if (!client.firstName && !client.lastName) {
      const parts = holder.split(" ");
      client.lastName = parts.pop() || "";
      client.firstName = parts.join(" ");
    }
  }
  put(client, "dob", value("Date of birth", "Birth date", "DOB"));
  put(client, "address", value("Street address", "Mailing address", "Address"));
  put(client, "city", value("City"));
  put(client, "province", value("Province"));
  const postal = text.match(
    /\b[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z][ -]?\d[ABCEGHJ-NPRSTV-Z]\d\b/i,
  )?.[0];
  put(client, "postal", postal?.toUpperCase() || "");
  put(
    client,
    "idNumber",
    value("Licence (?:number|no\\.?)", "License (?:number|no\\.?)", "ID number"),
  );
  put(client, "idExpiry", value("Expiry date", "Expiration date", "Expires"));
  if (/driver.?s? licen[cs]e/i.test(text)) client.idType = "Driver's Licence";
  put(
    account,
    "institution",
    value("Delivering institution", "Financial institution", "Institution"),
  );
  if (!account.institution) {
    const institution = text.match(
      /\b(?:RBC Dominion Securities|TD Direct Investing|BMO Nesbitt Burns|Questrade|Wealthsimple|Designed (?:Securities|Wealth Management)|Scotia(?:bank| Wealth Management)|CIBC Wood Gundy|National Bank Financial)\b/i,
    )?.[0];
    put(account, "institution", institution || "");
  }
  const type = text.match(
    /\b(?:Spousal RRSP|RRSP|RRIF|TFSA|FHSA|RESP|LIRA|Non[- ]Registered)\b/i,
  )?.[0];
  put(
    account,
    "accountType",
    type?.toUpperCase().replace("NON-REGISTERED", "Non-Registered") || "",
  );
  const accountNumber = value("Account (?:number|no\\.?|#)");
  if (/^[A-Z0-9*•-]{4,30}$/i.test(accountNumber)) put(account, "accountNumber", accountNumber);
  put(account, "statementDate", value("Statement date", "Period ending", "As of"));
  put(
    account,
    "value",
    value("Total account value", "Account value", "Total market value", "Closing balance"),
  );
  // Wealthsimple's statement uses an account/owner/period table, not labelled values.
  const table = lines.findIndex((l) => /^Account No\.\s+Owner\s+Statement Period$/i.test(l));
  const row =
    table >= 0
      ? lines[table + 1]?.match(
          /^([A-Z0-9-]+)\s+(.+?)\s+(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})$/i,
        )
      : undefined;
  if (row) {
    account.accountNumber = row[1]!;
    account.holder = row[2]!;
    account.statementDate = row[4]!;
    const parts = account.holder.split(" ");
    client.lastName = parts.pop()!;
    client.firstName = parts.join(" ");
    const index = lines.findIndex((l, i) => i > table && l === account.holder);
    if (index >= 0 && /^\d+\s/.test(lines[index + 1] || "")) {
      client.address = lines[index + 1]!;
      const locality = lines[index + 2]?.match(
        /^(.+?)\s+([A-Z]{2})\s+([A-Z]\d[A-Z]\s?\d[A-Z]\d)$/i,
      );
      if (locality) {
        client.city = locality[1]!;
        client.province = locality[2]!;
        client.postal = locality[3]!.toUpperCase();
      }
    }
  }
  const total = value("Total Portfolio").match(/^\$[\d,]+\.\d{2}/)?.[0];
  if (total) account.value = total;
  const addressLine = lines.findIndex((l) => /^Address\s*:/i.test(l));
  const locality =
    addressLine >= 0
      ? lines[addressLine + 1]?.match(/^(.+?)\s+(ON|BC|AB|SK|MB|QC|NS|NB|PE|NL|NT|NU|YT)$/i)
      : undefined;
  if (locality) {
    client.city = locality[1]!;
    client.province = locality[2]!;
  }
  put(bank, "transit", value("Transit(?: number| no\\.?)?", "Branch (?:number|no\\.?)"));
  put(bank, "institutionNumber", value("Institution (?:number|no\\.?)"));
  if (bank.transit || bank.institutionNumber) {
    put(bank, "institution", value("Bank name", "Financial institution name", "Institution name"));
    if (!bank.institution && /CIBC Online Banking/i.test(text)) bank.institution = "CIBC";
    put(bank, "accountNumber", value("Bank account number", "Account (?:number|no\\.?|#)"));
  }
  Object.assign(client, extractOntarioLicence(text));
  return { client, account, bank, text, filename };
}

export function validateTransfer(client: ClientInfo, account: AccountInfo, transfer: TransferInfo) {
  const expiry = Date.parse(client.idExpiry);
  const dob = Date.parse(client.dob);
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  return [
    { label: "Identity information complete", ok: Object.values(client).every((v) => !!v.trim()) },
    { label: "Date of birth is valid", ok: Number.isFinite(dob) && dob < Date.now() },
    {
      label: "Client name matches account holder",
      ok:
        !!account.holder.trim() &&
        norm(`${client.firstName} ${client.lastName}`) === norm(account.holder),
    },
    { label: "Account information complete", ok: Object.values(account).every((v) => !!v.trim()) },
    {
      label: "Receiving institution and account selected",
      ok: !!transfer.receivingInstitution.trim() && !!transfer.receivingAccount.trim(),
    },
    {
      label: "Transfer instructions completed",
      ok: !!transfer.transferType && !!transfer.assetHandling && !!transfer.advisor.trim(),
    },
    {
      label: "Identification is not expired",
      ok: Number.isFinite(expiry) && expiry >= new Date().setHours(0, 0, 0, 0),
    },
  ];
}
