/**
 * Document Type Enum
 * Matches the backend DocTypeEnum
 */
export enum DocType {
  /** Application Data Sheet */
  ADS = 0,
  /** Power of Attorney document */
  PowerOfAttorney = 1,
  /** Inventor document */
  Inventor = 2,
  /** Micro Entity document */
  MicroEntity = 3,
  /** Information Disclosure Statement */
  IDS = 4,
  /** All document types */
  All = 5,
}

/**
 * Document type options for UI display
 */
export const DOC_TYPE_OPTIONS = [
  { value: DocType.ADS, label: 'Application Data Sheet (ADS)' },
  { value: DocType.PowerOfAttorney, label: 'Power of Attorney' },
  { value: DocType.Inventor, label: 'Inventor' },
  { value: DocType.MicroEntity, label: 'Micro Entity' },
  { value: DocType.IDS, label: 'Information Disclosure Statement (IDS)' },
  { value: DocType.All, label: 'All Documents' },
] as const;
