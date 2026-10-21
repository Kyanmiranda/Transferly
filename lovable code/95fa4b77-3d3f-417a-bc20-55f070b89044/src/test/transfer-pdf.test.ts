// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PDFDocument } from "pdf-lib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fillTemplate, createTransferPacket } from "@/lib/transfer-pdf";
import { DEMO_CLIENT, DEMO_ACCOUNT, ADVISOR_DEFAULTS } from "@/lib/demo-data";

afterEach(() => vi.unstubAllGlobals());
const load = (name: string) => PDFDocument.load(readFileSync(resolve("public/forms", name)));

describe("supplied PDF templates", () => {
  it("exports a normalized licence DOB without shifting it across timezones", async () => {
    const previous = process.env["TZ"];
    process.env["TZ"] = "America/Toronto";
    try {
      const pdf = await load("Transferly_TFSA_Application.pdf");
      fillTemplate(pdf, { ...DEMO_CLIENT, dob: "1994-08-16" }, DEMO_ACCOUNT, ADVISOR_DEFAULTS);
      expect(pdf.getForm().getTextField("01-DOB").getText()).toBe("08/16/1994");
    } finally {
      if (previous === undefined) delete process.env["TZ"];
      else process.env["TZ"] = previous;
    }
  });
  it("fills authorization fields and the correct transfer instruction", async () => {
    const pdf = await load("Transferly_Transfer_Authorization.pdf");
    fillTemplate(pdf, DEMO_CLIENT, DEMO_ACCOUNT, ADVISOR_DEFAULTS);
    expect(pdf.getForm().getTextField("05-ClientName").getText()).toBe("Sarah Thompson");
    expect(pdf.getForm().getTextField("04-DIAN 1").getText()).toBe(DEMO_ACCOUNT.accountNumber);
    expect(pdf.getForm().getTextField("04-RIAN 1").getText()).toBe(
      ADVISOR_DEFAULTS.receivingAccount,
    );
    expect(pdf.getForm().getRadioGroup("04-Transfer 1").getSelected()).toBe("Choice1");
  });
  it("fills TFSA and FHSA applications, leaving signatures blank", async () => {
    for (const type of ["TFSA", "FHSA"]) {
      const pdf = await load(`Transferly_${type}_Application.pdf`);
      fillTemplate(pdf, DEMO_CLIENT, DEMO_ACCOUNT, ADVISOR_DEFAULTS);
      expect(pdf.getForm().getTextField("01-FName").getText()).toBe("Sarah");
      expect(pdf.getForm().getTextField("01-LA 1").getText()).toBe("128");
      expect(pdf.getForm().getTextField("01-LA 2").getText()).toBe("Wellington");
      expect(pdf.getForm().getTextField("01-LA 7").getText()).toBe("Toronto");
      expect(pdf.getForm().getTextField("Clientsig1").getText()).toBeFalsy();
    }
  });
  it("uses bank account details for EFT rather than the investment account", async () => {
    const pdf = await load("Transferly_Electronic_Funds_Transfer_Form.pdf");
    fillTemplate(pdf, DEMO_CLIENT, DEMO_ACCOUNT, ADVISOR_DEFAULTS, {
      institution: "Example Bank",
      transit: "12345",
      institutionNumber: "001",
      accountNumber: "1234567",
    });
    expect(pdf.getForm().getTextField("Account Number").getText()).toBe("1234567");
    expect(pdf.getForm().getTextField("Transit Number").getText()).toBe("12345");
  });
  it("creates a downloadable packet containing the supplied templates", async () => {
    vi.stubGlobal(
      "fetch",
      async (url: string) => new Response(readFileSync(resolve("public", url.replace(/^\//, "")))),
    );
    const bytes = await createTransferPacket(
      DEMO_CLIENT,
      { ...DEMO_ACCOUNT, accountType: "TFSA" },
      ADVISOR_DEFAULTS,
    );
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(4); // summary + 2-page authorization + TFSA
    expect(bytes.byteLength).toBeGreaterThan(10000);
  });
});
