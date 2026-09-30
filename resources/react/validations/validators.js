// Client-side validation mirrors backend rules for instant feedback.
// The backend re-validates everything — never trust client-only checks.

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const TAN_REGEX = /^[A-Z]{4}[0-9]{5}[A-Z]{1}$/;
export const PINCODE_REGEX = /^[1-9][0-9]{5}$/;
export const PHONE_REGEX = /^[6-9][0-9]{9}$/;
export const ASSESSMENT_YEAR_REGEX = /^[0-9]{4}-[0-9]{2}$/;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

export function validatePAN(pan) {
  if (!pan) return "PAN is required.";
  if (!PAN_REGEX.test(pan.toUpperCase())) return "PAN must be in the format ABCDE1234F.";
  return null;
}

export function validateTAN(tan) {
  if (!tan) return null; // optional field
  if (!TAN_REGEX.test(tan.toUpperCase())) return "TAN must be in the format ABCD12345E.";
  return null;
}

export function validatePassword(password) {
  if (!password) return "Password is required.";
  if (!PASSWORD_REGEX.test(password)) {
    return "Password needs 8+ characters, including uppercase, lowercase, a number, and a special character.";
  }
  return null;
}

export function validatePhone(phone) {
  if (!phone) return "Phone number is required.";
  if (!PHONE_REGEX.test(phone)) return "Enter a valid 10-digit Indian mobile number.";
  return null;
}

export function validatePincode(pincode) {
  if (!pincode) return null;
  if (!PINCODE_REGEX.test(pincode)) return "Enter a valid 6-digit PIN code.";
  return null;
}

export function validateAssessmentYear(year) {
  if (!year) return "Assessment year is required.";
  if (!ASSESSMENT_YEAR_REGEX.test(year)) return "Format must be YYYY-YY, e.g. 2026-27.";
  return null;
}

export function validateFile(file, maxSizeMB = 5, allowedTypes = ["application/pdf", "image/jpeg", "image/png"]) {
  if (!file) return "Please choose a file.";
  if (!allowedTypes.includes(file.type)) return "Only PDF, JPG, or PNG files are allowed.";
  if (file.size > maxSizeMB * 1024 * 1024) return `File must be smaller than ${maxSizeMB}MB.`;
  return null;
}

export function validateGrossSalary(value) {
  if (value === "" || value === null || value === undefined) return "Gross salary is required.";
  const n = Number(value);
  if (isNaN(n) || n < 0) return "Enter a valid non-negative amount.";
  if (n > 999999999) return "Value looks too large — please check.";
  return null;
}

export function validateDeduction80C(value) {
  const n = Number(value || 0);
  if (n < 0) return "Cannot be negative.";
  if (n > 150000) return "Section 80C deduction cannot exceed ₹1,50,000.";
  return null;
}
