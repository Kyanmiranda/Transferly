import { describe, it, expect } from "vitest";
import { extractFields } from "@/lib/document-extraction";

describe("Ontario licence extraction", () => {
  it("reads numbered bilingual labels and normalizes the birth and expiry dates", () => {
    const { client } = extractFields(
      "Ontario Driver's Licence\nPermis de conduire ON\n1,2 NAME/NOM\nMORGAN,\nALEX ROBERT\n8 123 KING ST\nOTTAWA, ON, K1A 0B1\n4d NUMBER/NUMERO A1234 - 56789 - 01234\n4a ISS/DEL 2021/10/25 4b EXP/EXP 2029/08/20\n3 DOB/DDN 1994/08/16 AGE 19/ANS 2013/08/16",
    );
    expect(client).toMatchObject({
      firstName: "ALEX ROBERT",
      lastName: "MORGAN",
      dob: "1994-08-16",
      idExpiry: "2029-08-20",
      idNumber: "A1234-56789-01234",
      city: "OTTAWA",
      postal: "K1A 0B1",
    });
  });
  it("recovers DOB when OCR mangles the label beside the AGE/ANS text", () => {
    const { client } = extractFields(
      "Ontario Driver's Licence ON\nnoise basook 1994/08/16 AGE 19/ANS 201308118",
    );
    expect(client.dob).toBe("1994-08-16");
  });
  it("handles missing date separators and an expiry label on the preceding line", () => {
    const { client } = extractFields(
      "Ontario Driver's Licence ON\n4b EXP) EXP.\n2029/08/20\nmoo 19940816 AGE 19/ANS 2013/0816",
    );
    expect(client.dob).toBe("1994-08-16");
    expect(client.idExpiry).toBe("2029-08-20");
  });
  it("keeps birth, issue, expiry and age-milestone dates separate", () => {
    const { client } = extractFields(
      "Ontario Driver's Licence ON\n4a ISS/DEL 2021/10/25 4b EXP/EXP 2029/08/20\n3 DOB/DDN 1994/08/16 AGE 19/ANS 2013/08/16",
    );
    expect(client.dob).toBe("1994-08-16");
    expect(client.idExpiry).toBe("2029-08-20");
  });
  it("does not guess a birth date from unlabelled dates or accept impossible dates", () => {
    expect(
      extractFields("Ontario Driver's Licence ON\n2021/10/25 2029/08/20").client.dob,
    ).toBeUndefined();
    expect(
      extractFields("Ontario Driver's Licence ON\n3 DOB/DDN 1994/02/31 AGE 19/ANS 2013/02/28")
        .client.dob,
    ).toBeUndefined();
  });
});
