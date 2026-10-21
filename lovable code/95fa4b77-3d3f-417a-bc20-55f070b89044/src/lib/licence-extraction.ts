import type { ClientInfo } from "./demo-data";

// Ontario cards use numbered bilingual labels; OCR often drops their punctuation.
export function extractOntarioLicence(text: string): Partial<ClientInfo> {
  if (!/(?:driver.{0,4}licen[cs]e|permis de conduire)/i.test(text) || !/Ontario|\bON\b/i.test(text))
    return {};
  const result: Partial<ClientInfo> = { idType: "Ontario Driver's Licence", province: "Ontario" };
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim());
  const datePattern = /\b((?:19|20)\d{2})\s*[/.-]?\s*(\d{2})\s*[/.-]?\s*(\d{2})\b/g;
  const dates = (line: string) =>
    Array.from(line.matchAll(datePattern)).flatMap((m) => {
      const year = Number(m[1]),
        month = Number(m[2]),
        day = Number(m[3]);
      const d = new Date(Date.UTC(year, month - 1, day));
      return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day
        ? [`${m[1]}-${m[2]}-${m[3]}`]
        : [];
    });
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    // AGE/ANS is printed immediately after DOB; never choose an arbitrary date.
    const dob =
      line.match(
        /(?:\bDOB\b|DOB\s*[/|]\s*DDN|D[O0]B[O0]?N|date (?:of birth|de naissance))\s*[:.]?\s*(.*)/i,
      )?.[1] ?? (/(?:\bAGE\b|\bANS\b)/i.test(line) ? line.split(/\bAGE\b|\bANS\b/i)[0] : undefined);
    if (dob !== undefined && !result.dob) {
      const found = dates((dob || lines[i + 1] || "").split(/\bAGE\b|\bANS\b/i)[0] || "");
      if (found.length === 1) result.dob = found[0]!;
    }
    const expiry = line.match(
      /(?:4\s*[bB]\s*)?(?:EXPIRATION|EXPIRES|EXP(?:IRY)?(?:\s*[/|)]\s*EXP\.?)?)\s*[:.]?\s*(.*)/i,
    )?.[1];
    if (expiry !== undefined) {
      const found = dates(expiry).length
        ? dates(expiry)
        : /^\s*(?:19|20)\d{2}/.test(lines[i + 1] || "")
          ? dates(lines[i + 1]!)
          : [];
      if (found.length === 1) result.idExpiry = found[0]!;
    }
    const number = line.match(/\b([A-Z$]\d{4})\s*[-– ]\s*(\d{5})\s*[-– ]\s*(\d{5})\b/i);
    if (number)
      result.idNumber = `${number[1]}-${number[2]}-${number[3]}`.toUpperCase().replace(/^\$/, "S");
    const locality = line.match(
      /\b([A-Z][A-Z .'-]+?),\s*ON\s*,?\s*([A-Z]\d[A-Z])\s*(\d[A-Z]\d)\b/i,
    );
    if (locality) {
      result.city = locality[1]!.trim();
      result.postal = `${locality[2]} ${locality[3]}`.toUpperCase();
      const street = lines[i - 1]?.match(/\b\d{1,6}\s+[A-Z][A-Z0-9 .'-]+\b/i)?.[0];
      if (street) result.address = street.trim().replace(/^8\s+(?=\d)/, "");
    }
    if (/\bNAME\s*[/|]?\s*NOM\b/i.test(line)) {
      const clean = (s: string) =>
        s
          .replace(/^[^A-ZÀ-Ÿ]+/i, "")
          .replace(/[,;.]+$/, "")
          .trim();
      const surname = clean(lines[i + 1] || "");
      const given = clean(lines[i + 2] || "");
      if (/^[A-ZÀ-Ÿ][A-ZÀ-Ÿ '-]+$/i.test(surname) && /^[A-ZÀ-Ÿ][A-ZÀ-Ÿ '-]+$/i.test(given)) {
        result.lastName = surname;
        result.firstName = given;
      }
    }
  }
  return result;
}
