export const INDIAN_PHONE_PATTERN =
  "^(\\+91[\\s.-]?|91[\\s.-]?|0)?[6-9][0-9]{4}[\\s.-]?[0-9]{5}$";

export const INDIAN_PHONE_TITLE =
  "Enter a valid 10-digit Indian mobile number (e.g. +91 98765 43210 or 9876543210)";

export function validateIndianPhone(
  raw?: string | null,
  options: { required?: boolean; requiredMessage?: string } = {},
): string | null {
  const {
    required = true,
    requiredMessage = "Enter a 10-digit Indian mobile number.",
  } = options;
  const trimmed = (raw ?? "").trim();
  if (!trimmed) {
    return required ? requiredMessage : null;
  }
  const digits = trimmed.replace(/\D/g, "");
  const localDigits =
    digits.length === 12 && digits.startsWith("91")
      ? digits.slice(2)
      : digits.length === 11 && digits.startsWith("0")
        ? digits.slice(1)
        : digits;
  if (!/^[6-9]\d{9}$/.test(localDigits)) {
    return "Enter a valid 10-digit Indian mobile number (e.g. +91 98765 43210 or 9876543210).";
  }
  return null;
}
