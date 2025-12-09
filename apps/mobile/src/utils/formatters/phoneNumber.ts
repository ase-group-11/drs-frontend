export function normalizePhoneNumber(rawPhoneNumber: string): string {
  // remove everything except digits (except keep + if it's at start)
  const cleaned = rawPhoneNumber.replace(/(?!^\+)\D/g, '');
  if (/^\+91\d{10}$/.test(cleaned)) {
    return cleaned;
  }

  if (/^\d{10}$/.test(cleaned)) {
    return `+91${cleaned}`;
  }

  return "INVALID_FORMAT";
}