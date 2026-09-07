import type { ApplicationData } from "@/lib/verification/types";

export interface SampleLabel {
  file: string;
  /** The discrepancy this label was drawn to demonstrate. */
  scenario: string;
  product: string;
  expect: string;
  /** The application record this particular label is checked against. */
  application: ApplicationData;
}

export const SAMPLE_LABELS: SampleLabel[] = [
  {
    file: "compliant.png",
    scenario: "Fully compliant",
    product: "Ironwood Reserve — bourbon",
    expect: "Verifies clean",
    application: {
      brandName: "IRONWOOD RESERVE",
      classType: "Kentucky Straight Bourbon Whiskey",
      alcoholContent: "45% Alc./Vol. (90 Proof)",
      netContents: "750 mL",
    },
  },
  {
    file: "brand-case.png",
    scenario: "Brand in mixed case",
    product: "Verdant Hollow Botanicals — gin",
    expect: "Still a match",
    application: {
      brandName: "VERDANT HOLLOW BOTANICALS",
      classType: "London Dry Gin",
      alcoholContent: "47% Alc./Vol. (94 Proof)",
      netContents: "700 mL",
    },
  },
  {
    file: "warning-title-case.png",
    scenario: "Warning not capitalized",
    product: "Northern Spire — vodka",
    expect: "Rejected",
    // Recorded in millilitres against a label that reads "1 L", which the
    // net contents check resolves by converting both.
    application: {
      brandName: "NORTHERN SPIRE",
      classType: "Vodka Distilled from Grain",
      alcoholContent: "40% Alc./Vol. (80 Proof)",
      netContents: "1000 mL",
    },
  },
  {
    file: "alcohol-mismatch.png",
    scenario: "Wrong alcohol content",
    product: "Casa Miraflores — tequila",
    expect: "Rejected",
    application: {
      brandName: "CASA MIRAFLORES",
      classType: "Tequila Reposado",
      alcoholContent: "40% Alc./Vol. (80 Proof)",
      netContents: "750 mL",
    },
  },
  {
    file: "proof-contradiction.png",
    scenario: "Proof contradicts ABV",
    product: "Salt Meadow — rum",
    expect: "Rejected",
    application: {
      brandName: "SALT MEADOW",
      classType: "Aged Caribbean Rum",
      alcoholContent: "43% Alc./Vol. (86 Proof)",
      netContents: "750 mL",
    },
  },
  {
    file: "missing-warning.png",
    scenario: "No health warning",
    product: "Pine Fork Vineyards — cabernet",
    expect: "Needs review",
    application: {
      brandName: "PINE FORK VINEYARDS",
      classType: "Napa Valley Cabernet Sauvignon",
      alcoholContent: "13.5% Alc./Vol.",
      netContents: "750 mL",
    },
  },
];

/** Used by the form's fill button before any sample has been chosen. */
export const SAMPLE_APPLICATION = SAMPLE_LABELS[0].application;
