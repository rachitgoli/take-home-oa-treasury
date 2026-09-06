export type FieldId =
  | "brandName"
  | "classType"
  | "alcoholContent"
  | "netContents"
  | "governmentWarning";

/** `review` marks a difference a human should judge, not one the tool decides. */
export type CheckStatus = "match" | "review" | "mismatch" | "missing";

export interface FieldCheck {
  fieldId: FieldId;
  label: string;
  status: CheckStatus;
  expected: string | null;
  found: string | null;
  detail: string;
  citation?: string;
}

export interface ApplicationData {
  brandName: string;
  classType: string;
  alcoholContent: string;
  netContents: string;
}

/** Nullable throughout: any single field can be unreadable without failing the rest. */
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
