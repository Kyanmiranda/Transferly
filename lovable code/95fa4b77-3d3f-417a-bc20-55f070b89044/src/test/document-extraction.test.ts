import { describe, it, expect } from "vitest";
import {
  extractFields,
  EMPTY_CLIENT,
  EMPTY_ACCOUNT,
  validateTransfer,
} from "@/lib/document-extraction";
import { DEMO_CLIENT, DEMO_ACCOUNT, ADVISOR_DEFAULTS } from "@/lib/demo-data";
import { validateDocument } from "@/lib/document-scanner";

describe("document extraction", () => {
  it("extracts labelled values from actual document text", () => {
    const result = extractFields(
      "Client name: Alex Morgan\nDate of birth: 1990-02-04\nAddress: 15 King Street\nCity: Ottawa\nProvince: ON\nK1A 0B1\nAccount number: 12345678\nAccount type: TFSA\nInstitution: Questrade\nTotal market value: $12,300.40",
    );
    expect(result.client).toMatchObject({
      firstName: "Alex",
      lastName: "Morgan",
      dob: "1990-02-04",
      address: "15 King Street",
      postal: "K1A 0B1",
    });
    expect(result.account).toMatchObject({
      holder: "Alex Morgan",
      accountType: "TFSA",
      accountNumber: "12345678",
      institution: "Questrade",
      value: "$12,300.40",
    });
  });
  it("does not substitute demo values for missing information", () => {
    expect(extractFields("unrecognised document").client).toEqual({});
    expect(extractFields("unrecognised document").account).toEqual({});
  });
  it("reads values from the next line after a label", () => {
    expect(
      extractFields("First name\nAlex\nLast name\nMorgan\nAccount number\n123456").account
        .accountNumber,
    ).toBe("123456");
  });
  it("blocks incomplete, expired, and mismatched transfers", () => {
    expect(validateTransfer(EMPTY_CLIENT, EMPTY_ACCOUNT, ADVISOR_DEFAULTS).some((c) => !c.ok)).toBe(
      true,
    );
    const checks = validateTransfer(
      { ...DEMO_CLIENT, idExpiry: "2000-01-01" },
      { ...DEMO_ACCOUNT, holder: "Another Person" },
      ADVISOR_DEFAULTS,
    );
    expect(checks.find((c) => c.label === "Identification is not expired")?.ok).toBe(false);
    expect(checks.find((c) => c.label === "Client name matches account holder")?.ok).toBe(false);
  });
  it("rejects unsupported, empty and oversized uploads", () => {
    expect(() =>
      validateDocument(new File(["x"], "x.exe", { type: "application/octet-stream" })),
    ).toThrow("Choose a PDF");
    expect(() => validateDocument(new File([], "x.pdf", { type: "application/pdf" }))).toThrow(
      "non-empty",
    );
    expect(() =>
      validateDocument(
        new File([new Uint8Array(10 * 1024 * 1024 + 1)], "x.pdf", { type: "application/pdf" }),
      ),
    ).toThrow("10 MB");
  });
});
