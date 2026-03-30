/**
 * Converts raw API/database error responses into short, user-readable messages.
 *
 * Backend can return long SQLAlchemy / Pydantic stack traces in `detail`.
 * This helper maps known patterns to clean messages and falls back to a
 * caller-supplied default for anything else.
 *
 * Usage:
 *   message.error(friendlyApiError(err, 'Failed to create unit'));
 */

// ─── Unique-constraint field → readable label ─────────────────────────────────
const UNIQUE_FIELD_LABELS: Record<string, string> = {
  vehicle_license_plate: 'license plate',
  unit_code:             'unit code',
  unit_name:             'unit name',
  email:                 'email address',
  phone_number:          'phone number',
  employee_id:           'employee ID',
};

export const friendlyApiError = (err: any, fallback: string): string => {
  const status: number | undefined = err?.response?.status;
  const detail: unknown             = err?.response?.data?.detail;

  // ── Pydantic array of validation errors ──────────────────────────────────────
  if (Array.isArray(detail)) {
    // Take the first message; strip internal field path noise
    const first = (detail[0] as any)?.msg ?? (detail[0] as any)?.message ?? '';
    return first ? `Validation error: ${first}` : 'Please check your inputs and try again.';
  }

  if (typeof detail === 'string') {
    const d = detail.toLowerCase();

    // ── PostgreSQL unique-constraint violation ──────────────────────────────────
    if (d.includes('unique') || d.includes('uniqueviolation') || d.includes('duplicate key')) {
      for (const [key, label] of Object.entries(UNIQUE_FIELD_LABELS)) {
        if (d.includes(key)) {
          return `A record with this ${label} already exists. Please use a different value.`;
        }
      }
      return 'A duplicate record already exists. Please check your inputs.';
    }

    // ── FK / relation errors ────────────────────────────────────────────────────
    if (d.includes('foreign key') || d.includes('violates foreign key constraint')) {
      return 'One or more selected members are no longer available. Please refresh and try again.';
    }

    // ── Not found ───────────────────────────────────────────────────────────────
    if (status === 404) return 'The requested record was not found.';

    // ── Conflict ────────────────────────────────────────────────────────────────
    if (status === 409) return 'A conflict occurred. The record may already exist.';

    // ── Short, clean messages (≤120 chars, no stack trace) — show as-is ─────────
    if (detail.length <= 120 && !d.includes('traceback') && !d.includes('sqlalchemy')) {
      return detail;
    }
  }

  // ── HTTP status fallbacks ─────────────────────────────────────────────────────
  if (status === 422) return 'Please check your inputs and try again.';
  if (status === 401) return 'Your session has expired. Please log in again.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status && status >= 500) return 'A server error occurred. Please try again shortly.';

  return fallback;
};