import type { ApplicationData } from "@/lib/verification/types";

/** Every sample label is drawn against this same application record. */
export const SAMPLE_APPLICATION: ApplicationData = {
  brandName: "OLD TOM DISTILLERY",
  classType: "Kentucky Straight Bourbon Whiskey",
  alcoholContent: "45% Alc./Vol. (90 Proof)",
  netContents: "750 mL",
};

export interface SampleLabel {
  file: string;
  name: string;
  expect: string;
}

export const SAMPLE_LABELS: SampleLabel[] = [
  {
    file: "compliant.png",
    name: "Compliant label",
    expect: "Everything agrees",
  },
  {
    file: "brand-case.png",
    name: "Brand in mixed case",
    expect: "Still a match",
  },
  {
    file: "warning-title-case.png",
    name: "Warning not capitalized",
    expect: "Rejected",
  },
  {
    file: "alcohol-mismatch.png",
    name: "Wrong alcohol content",
    expect: "Rejected",
  },
  {
    file: "proof-contradiction.png",
    name: "Proof contradicts ABV",
    expect: "Rejected",
  },
  {
    file: "missing-warning.png",
    name: "No health warning",
    expect: "Needs review",
  },
];
