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
  // IDSLatestVersion = 6,
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
 * USPTO fee entity status. Determines the fee tier applied to generated
 * documents (e.g. the PCT Transmittal / PTO-1390 fee calculation).
 */
export enum EntityType {
  Large = 'large',
  Small = 'small',
  Micro = 'micro',
}

/**
 * Entity type options for UI display
 */
export const ENTITY_TYPE_OPTIONS = [
  { value: EntityType.Large, label: 'Large Entity' },
  { value: EntityType.Small, label: 'Small Entity' },
  { value: EntityType.Micro, label: 'Micro Entity' },
] as const;

/**
 * Explanatory copy shown in the info tooltip beside the entity-type selector.
 * Split into paragraphs so the tooltip can render readable line breaks.
 */
export const MICRO_ENTITY_INFO = {
  intro:
    'To qualify for Micro Entity status based on gross income, all of the following requirements must be met:',
  requirements: [
    {
      label: 'Small Entity Status:',
      text: 'The applicant, inventors, and anyone with an ownership interest must qualify as a Small Entity (e.g., an eligible small business, nonprofit organization, or individual).',
    },
    {
      label: 'Filing Limit:',
      text: 'The inventor(s) must not have been named as an inventor on more than four previously filed patent applications, subject to certain exceptions.',
    },
    {
      label: 'Income Limit:',
      text: 'The applicant and each inventor must have had a gross income below the applicable USPTO maximum qualifying gross income limit in the previous calendar year.',
    },
    {
      label: 'Ownership Interest:',
      text: 'The applicant/inventor must not have assigned, licensed, or otherwise granted an ownership interest in the invention to an entity whose gross income exceeds the applicable limit.',
    },
  ],
  notes: [
    'Important: The income and ownership requirements can apply to parties who have an ownership interest even if they are not listed as an applicant or assignee in the USPTO records.',
    'A valid Micro Entity Certification (e.g., USPTO Form SB/15A) must also be properly completed, identify the relevant application or patent, and contain the required authorized signature(s).',
    'Eligibility should be confirmed each time a fee is paid, as Micro Entity status may change.',
  ],
  linkText: 'For more Information visit USPTO Micro Entity Status',
  linkUrl:
    'https://www.uspto.gov/patents/laws/micro-entity-status#Gross%20Income%20Basis',
} as const;

/**
 * Document type options for UI display
 */
export const DOC_TYPE_OPTIONS = [
  { value: DocType.ADS, label: 'Application Data Sheet (ADS)' },
  { value: DocType.Inventor, label: 'Inventor Declaration (OATH)' },
  { value: DocType.PowerOfAttorney, label: 'Power of Attorney' },
  { value: DocType.MicroEntity, label: 'Micro Entity (Gross Income Basis)' },
  { value: DocType.CombinedDeclarationAndAssignment, label: 'Combined Declaration and Assignment' },
  { value: DocType.PctTransmittal, label: 'PCT Transmittal (PTO-1390)' },
  { value: DocType.IdsTransmittal, label: 'IDS Transmittal' },
  { value: DocType.USClaims, label: 'US Compliant Claims' },
  { value: DocType.IDS, label: 'Information Disclosure Statement (IDS)' },
  { value: DocType.All, label: 'All Documents' },
] as const;
