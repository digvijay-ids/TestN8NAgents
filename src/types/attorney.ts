/**
 * Attorney record returned by the attorney search API and persisted locally.
 */
export interface Attorney {
  /** Registration number */
  regNumber: string;
  /** Full name (derived, for display) */
  name: string;
  /** Structured name parts (sent to the generate API) */
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  /** Single pre-formatted address string */
  address?: string;
}
