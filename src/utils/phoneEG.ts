/** Egypt phone normalization utilities — single source of truth */

export function stripNonDigits(val: string): string {
  return val.replace(/\D/g, "");
}

/**
 * Normalize raw input to 10-digit form (after the leading 0).
 * Handles paste of 01XXXXXXXXX, plain 10-digit, or longer strings.
 */
export function normalizeEgTo10(raw: string): string {
  const digits = stripNonDigits(raw);
  if (digits.length >= 11 && digits.startsWith("0")) return digits.slice(-10);
  if (digits.length >= 10) return digits.slice(-10);
  return digits; // partial typing
}

/** Exactly 10 digits? */
export function isValidEg10(input10: string): boolean {
  return /^\d{10}$/.test(input10);
}

/** 10-digit -> local 11-digit (with leading 0) */
export function toEgLocal11(input10: string): string {
  return "0" + input10;
}

/** 10-digit -> E.164 digits only (NO '+') e.g. "201010069203" */
export function toEgE164Digits(input10: string): string {
  return "20" + input10;
}

/** 10-digit -> E.164 with plus sign for display e.g. "+201010069203" */
export function toEgE164Plus(input10: string): string {
  return "+20" + input10;
}

/**
 * Convert stored local-11 or e164 back to the 10-digit input form.
 * Handles: "01010069203" -> "1010069203", "201010069203" -> "1010069203"
 */
export function storedToInput10(stored: string | null | undefined): string {
  if (!stored) return "";
  const digits = stripNonDigits(stored);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length === 12 && digits.startsWith("20")) return digits.slice(2);
  if (digits.length === 10) return digits;
  return digits;
}
