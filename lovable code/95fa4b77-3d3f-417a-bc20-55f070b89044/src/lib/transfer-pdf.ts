import { PDFDocument, StandardFonts, rgb, PDFTextField, PDFCheckBox, PDFRadioGroup } from "pdf-lib";
import type { ClientInfo, AccountInfo, TransferInfo } from "./demo-data";
import type { BankInfo } from "./document-extraction";

export const FORM_TEMPLATES = [
  "Transferly_Transfer_Authorization.pdf",
  "Transferly_TFSA_Application.pdf",
  "Transferly_FHSA_Application.pdf",
  "Transferly_Electronic_Funds_Transfer_Form.pdf",
] as const;

export function downloadBlob(bytes: Uint8Array, name: string) {
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function createTransferPacket(
  client: ClientInfo,
  account: AccountInfo,
  transfer: TransferInfo,
  bank?: BankInfo,
) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  // Standard PDF fonts cannot encode arbitrary OCR glyphs.
  const safe = (s: string) =>
    Array.from(s.normalize("NFKC"))
      .map((c) => {
        try {
          font.encodeText(c);
          return c;
        } catch {
          return "?";
        }
      })
      .join("");
  const page = pdf.addPage([612, 792]);
  page.drawText("TRANSFERLY", {
    x: 40,
    y: 746,
    font: bold,
    size: 18,
    color: rgb(0.07, 0.25, 0.21),
  });
  page.drawText("Transfer preparation summary - unsigned draft", {
    x: 40,
    y: 720,
    font: bold,
    size: 13,
  });
  const rows = [
    ["CLIENT INFORMATION", ""],
    ["Client", `${client.firstName} ${client.lastName}`],
    ["Date of birth", client.dob],
    ["Address", client.address],
    ["City / Province / Postal", `${client.city}, ${client.province} ${client.postal}`],
    ["Identification", client.idType],
    ["Identification number", client.idNumber],
    ["ID expiry", client.idExpiry],
    ["DELIVERING ACCOUNT", ""],
    ["Account holder", account.holder],
    ["Institution", account.institution],
    ["Account type", account.accountType],
    ["Account number", account.accountNumber],
    ["Statement date", account.statementDate],
    ["Account value", account.value],
    ["TRANSFER INSTRUCTIONS", ""],
    ["Receiving institution", transfer.receivingInstitution],
    ["Receiving account", transfer.receivingAccount],
    ["Transfer", `${transfer.transferType} / ${transfer.assetHandling}`],
    ["Advisor", transfer.advisor],
  ];
  let y = 686;
  for (const [label, value] of rows) {
    page.drawText(safe(label || ""), { x: 40, y, size: 9, font: value ? font : bold });
    if (value) {
      // Wrap long input rather than drawing outside the page.
      const words = safe(value).split(/\s+/);
      let line = "";
      const lines: string[] = [];
      for (const word of words) {
        if (font.widthOfTextAtSize(`${line} ${word}`, 10) > 340) {
          lines.push(line);
          line = word;
        } else line = `${line} ${word}`.trim();
      }
      lines.push(line);
      for (const l of lines.slice(0, 2)) {
        page.drawText(l, { x: 210, y, size: 10, font });
        y -= 12;
      }
      y -= 10;
    } else y -= 24;
  }
  page.drawText("Prepared for advisor review. No transfer has been submitted.", {
    x: 40,
    y: 55,
    size: 9,
    font,
  });
  page.drawText("Signatures and missing application fields must be completed before use.", {
    x: 40,
    y: 40,
    size: 9,
    font,
  });
  const selected = [
    FORM_TEMPLATES[0],
    ...(account.accountType.toUpperCase() === "TFSA"
      ? [FORM_TEMPLATES[1]]
      : account.accountType.toUpperCase() === "FHSA"
        ? [FORM_TEMPLATES[2]]
        : []),
    ...(bank ? [FORM_TEMPLATES[3]] : []),
  ];
  for (const name of selected) {
    const response = await fetch(`/forms/${name}`);
    if (!response.ok) throw new Error(`Could not load ${name}. Please try again.`);
    const template = await PDFDocument.load(await response.arrayBuffer());
    fillTemplate(
      template,
      client,
      account,
      transfer,
      name === FORM_TEMPLATES[3] ? bank : undefined,
    );
    template.getForm().updateFieldAppearances();
    // Flatten populated widgets so their contents survive copying into the packet.
    template.getForm().flatten();
    const pages = await pdf.copyPages(template, template.getPageIndices());
    for (const p of pages) pdf.addPage(p);
  }
  return pdf.save();
}

export function fillTemplate(
  pdf: PDFDocument,
  client: ClientInfo,
  account: AccountInfo,
  transfer: TransferInfo,
  bank?: BankInfo,
) {
  const date = new Date(client.dob);
  const iso = client.dob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dob = iso
    ? `${iso[2]}/${iso[3]}/${iso[1]}`
    : Number.isFinite(date.getTime())
      ? `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`
      : client.dob;
  const address = client.address.match(
    /^(\d+[A-Za-z]?)\s+(.+?)(?:\s+(Street|St\.?|Road|Rd\.?|Avenue|Ave\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?))?(?:\s+(North|South|East|West|N|S|E|W))?$/i,
  );
  const values: Record<string, string> = {
    "05clientname": `${client.firstName} ${client.lastName}`,
    "01address": client.address,
    "01city": client.city,
    "01province": client.province,
    "01postalcode": client.postal,
    "04rian1": transfer.receivingAccount,
    "02instname": account.institution,
    "04dian1": account.accountNumber,
    ditransferamount1: account.value.replace(/[^\d.]/g, ""),
    "01fname": client.firstName,
    "01lname": client.lastName,
    "01dob": dob,
    "01la1": address?.[1] || "",
    "01la2": address?.[2] || client.address,
    "01la3": address?.[3] || "",
    "01la4": address?.[4] || "",
    "01la7": client.city,
    "01la8": client.province,
    "01la9": client.postal,
    account: transfer.receivingAccount,
    investorfirstname: client.firstName,
    investorlastname: client.lastName,
    investmentadvisorname: transfer.advisor,
    firstname: client.firstName,
    lastname: client.lastName,
    clientname: `${client.firstName} ${client.lastName}`,
    fullname: `${client.firstName} ${client.lastName}`,
    dateofbirth: client.dob,
    dob: client.dob,
    address: client.address,
    streetaddress: client.address,
    city: client.city,
    province: client.province,
    postalcode: client.postal,
    accountnumber: bank ? bank.accountNumber : account.accountNumber,
    accounttype: account.accountType,
    accountholder: account.holder,
    financialinstitutionname: bank?.institution || "",
    transitnumber: bank?.transit || "",
    institutionnumber: bank?.institutionNumber || "",
    deliveringinstitution: account.institution,
    receivinginstitution: transfer.receivingInstitution,
    receivingaccountnumber: transfer.receivingAccount,
    advisor: transfer.advisor,
    advisorname: transfer.advisor,
    transfertype: transfer.transferType,
    assethandling: transfer.assetHandling,
  };
  for (const field of pdf.getForm().getFields()) {
    const key = field
      .getName()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
    if (field instanceof PDFTextField && values[key]) {
      field.setText(values[key]!);
      field.setFontSize(8);
    }
    if (field instanceof PDFRadioGroup && key === "accounttype") {
      const option =
        account.accountType === "Non-Registered"
          ? "Non-Reg"
          : account.accountType === "Spousal RRSP"
            ? "SRSP"
            : account.accountType.toUpperCase();
      if (field.getOptions().includes(option)) field.select(option);
    }
    if (field instanceof PDFRadioGroup && key === "04transfer1")
      field.select(
        transfer.transferType === "Partial Transfer"
          ? "Choice4"
          : transfer.assetHandling === "In Kind"
            ? "Choice1"
            : transfer.assetHandling === "In Cash"
              ? "Choice2"
              : "Choice3",
      );
    if (
      field instanceof PDFCheckBox &&
      ((key === "fulltransfer" && transfer.transferType === "Full Transfer") ||
        (key === "inkind" && transfer.assetHandling === "In Kind"))
    )
      field.check();
  }
}

export async function downloadTransferPacket(
  client: ClientInfo,
  account: AccountInfo,
  transfer: TransferInfo,
  bank?: BankInfo,
) {
  downloadBlob(
    await createTransferPacket(client, account, transfer, bank),
    "Transferly-transfer-draft.pdf",
  );
}
