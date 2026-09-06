export type FieldId =
  | "brandName"
  | "classType"
  | "alcoholContent"
  | "netContents"
  | "governmentWarning";

/**
 * `review` exists because a strict pass/fail split would either auto-approve
 * near-misses or bury agents in false rejections. It marks differences a human
 * should judge rather than ones the tool is confident about.
 */
export type CheckStatus = "match" | "review" | "mismatch" | "missing";

export interface FieldCheck {
  fieldId: FieldId;
  label: string;
  status: CheckStatus;
  /** Value recorded in the COLA application. */
  expected: string | null;
  /** Value read off the label artwork. */
  found: string | null;
  /** Agent-facing explanation of why this status was assigned. */
  detail: string;
  /** Regulatory basis, where the check enforces a specific rule. */
  citation?: string;
}

export interface ApplicationData {
  brandName: string;
  classType: string;
  alcoholContent: string;
  netContents: string;
}

/**
 * Fields read from the label. Every field is nullable: extraction may fail on
 * any individual field without invalidating the rest of the label.
 */
export interface LabelExtraction {
  brandName: string | null;
  classType: string | null;
  alcoholContent: string | null;
  netContents: string | null;
  governmentWarning: string | null;
}

export type Verdict = "pass" | "review" | "fail";

export interface VerificationReport {
  verdict: Verdict;
  checks: FieldCheck[];
}
