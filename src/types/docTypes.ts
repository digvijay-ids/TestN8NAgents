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
  /** IDS Latest Version document */
  IDSLatestVersion = 6,
  /** IDS Latest Version document */
  CombinedDeclarationAndAssignment = 7,
  /** US Compliant Claims document */
  USClaims = 8,
  /** IDS Transmittal Form */
  IdsTransmittal = 9,
  /** PCT Transmittal Form (PTO-1390) */
  PctTransmittal = 10,
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
  { value: DocType.IDSLatestVersion, label: 'IDS (Seperate forms)' },
  { value: DocType.CombinedDeclarationAndAssignment, label: 'Combined Declaration and Assignment' },
  { value: DocType.USClaims, label: 'US Compliant Claims' },
  { value: DocType.IdsTransmittal, label: 'IDS Transmittal' },
  { value: DocType.PctTransmittal, label: 'PCT Transmittal' },
  { value: DocType.All, label: 'All Documents' },
] as const;
