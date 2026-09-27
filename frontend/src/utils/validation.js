export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
export const phonePattern = /^\+?[0-9\s()-]{7,20}$/;
export const namePattern = /^[\p{L}][\p{L}\s.'-]{1,79}$/u;

export function clean(value) { return String(value ?? '').trim(); }
export function required(value, label) {
  if (!clean(value)) return `${label} is required.`;
  return '';
}
export function validateEmail(value) {
  if (!clean(value)) return 'Email is required.';
  if (!emailPattern.test(clean(value))) return 'Enter a valid email address.';
  return '';
}
export function validatePhone(value, { required: must = false } = {}) {
  if (!clean(value)) return must ? 'Phone number is required.' : '';
  if (!phonePattern.test(clean(value))) return 'Enter a valid phone number.';
  return '';
}
export function validateName(value, label = 'Name') {
  const v = clean(value);
  if (!v) return `${label} is required.`;
  if (v.length < 2 || v.length > 80) return `${label} must be 2–80 characters.`;
  if (!namePattern.test(v)) return `${label} contains invalid characters.`;
  return '';
}
export function validatePassword(value) {
  if (!value) return 'Password is required.';
  if (value.length < 8) return 'Password must be at least 8 characters.';
  if (value.length > 72) return 'Password must be 72 characters or fewer.';
  if (/\s/.test(value)) return 'Password must not contain spaces.';
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) return 'Password must contain at least one letter and one number.';
  return '';
}
export function validateNumber(value, label, { min = 0, max = Number.POSITIVE_INFINITY, required: must = true } = {}) {
  if (value === '' || value === null || value === undefined) return must ? `${label} is required.` : '';
  const n = Number(value);
  if (!Number.isFinite(n)) return `${label} must be a valid number.`;
  if (n < min || n > max) return `${label} must be between ${min} and ${max}.`;
  return '';
}
export function firstError(...errors) { return errors.find(Boolean) || ''; }
