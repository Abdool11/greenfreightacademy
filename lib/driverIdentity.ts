export type IdentityValidation =
  | { ok: true; normalised: string; type: "sa_id" | "passport" }
  | { ok: false; error: string };

function passesLuhn(value: string): boolean {
  let sum = 0;
  let alternate = false;

  for (let index = value.length - 1; index >= 0; index -= 1) {
    let digit = Number(value[index]);
    if (alternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

/**
 * GFA requires a driver identity value for controlled training and evidence
 * records. A 13-digit South African ID must satisfy its checksum. A passport
 * may use 6–20 letters or digits; this intentionally supports non-SA drivers
 * without misclassifying invalid numeric IDs as passports.
 */
export function validateDriverIdentity(raw: string): IdentityValidation {
  const normalised = raw.trim().replace(/\s+/g, "").toUpperCase();
  if (!normalised) return { ok: false, error: "ID number or passport number is required" };

  if (/^\d+$/.test(normalised)) {
    if (normalised.length !== 13) return { ok: false, error: "South African ID numbers must be 13 digits" };
    if (!passesLuhn(normalised)) return { ok: false, error: "South African ID number checksum is invalid" };
    return { ok: true, normalised, type: "sa_id" };
  }

  if (!/^[A-Z0-9]{6,20}$/.test(normalised)) {
    return { ok: false, error: "Passport numbers must contain 6–20 letters or digits" };
  }

  return { ok: true, normalised, type: "passport" };
}
