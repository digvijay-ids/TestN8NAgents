/**
 * Shapes returned by GET /applications/{applicationNumber}/continuity
 */

export interface ContinuityLink {
  parentApplicationNumberText: string;
  parentApplicationFilingDate?: string;
  parentApplicationStatusCode?: number;
  parentApplicationStatusDescriptionText?: string;
  parentPatentNumber?: string;
  claimParentageTypeCode?: string;
  claimParentageTypeCodeDescriptionText?: string;
  firstInventorToFileIndicator?: boolean;
  childApplicationNumberText: string;
  // Present on childContinuityBag edges (describe the child endpoint).
  childApplicationFilingDate?: string;
  childApplicationStatusCode?: number;
  childApplicationStatusDescriptionText?: string;
  childPatentNumber?: string;
}

export interface PatentFileWrapper {
  applicationNumberText: string;
  parentContinuityBag?: ContinuityLink[];
  childContinuityBag?: ContinuityLink[];
}

export interface ContinuityResponse {
  count: number;
  patentFileWrapperDataBag: PatentFileWrapper[];
  requestIdentifier?: string;
}
