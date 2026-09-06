import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const OUT_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "samples",
);

const WARNING =
  "GOVERNMENT WARNING: (1) According to the Surgeon General, women should not " +
  "drink alcoholic beverages during pregnancy because of the risk of birth " +
  "defects. (2) Consumption of alcoholic beverages impairs your ability to " +
  "drive a car or operate machinery, and may cause health problems.";

const BASE = {
  brand: "OLD TOM DISTILLERY",
  classType: "Kentucky Straight Bourbon Whiskey",
  alcohol: "45% Alc./Vol. (90 Proof)",
  netContents: "750 mL",
  warning: WARNING,
};

const LABELS = [
  {
    file: "compliant.png",
    describes: "Every field agrees with the sample application.",
    ...BASE,
  },
  {
    file: "warning-title-case.png",
    describes: "Warning heading in title case, which 16.22(a)(2) forbids.",
    ...BASE,
    warning: WARNING.replace("GOVERNMENT WARNING", "Government Warning"),
  },
  {
    file: "alcohol-mismatch.png",
    describes: "Label states 40% where the application records 45%.",
    ...BASE,
    alcohol: "40% Alc./Vol. (80 Proof)",
  },
  {
    file: "proof-contradiction.png",
    describes: "Percentage and proof on the label disagree with each other.",
    ...BASE,
    alcohol: "45% Alc./Vol. (80 Proof)",
  },
  {
    file: "missing-warning.png",
    describes: "No health warning anywhere on the label.",
    ...BASE,
    warning: null,
  },
  {
    file: "brand-case.png",
    describes: "Brand differs only in capitalization, which should still pass.",
    ...BASE,
    brand: "Old Tom Distillery",
  },
];

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function wrap(text, maxChars) {
  const words = text.split(" ");
  const lines = [];
  let line = "";

  for (const word of words) {
    if (line.length + word.length + 1 > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function buildSvg(label) {
  const width = 900;
  const height = 1200;
  const centre = width / 2;

  const warningLines = label.warning ? wrap(label.warning, 62) : [];
  const warningBlock = warningLines
    .map((line, index) => {
      const bold = index === 0 ? ' font-weight="bold"' : "";
      const text = escapeXml(line);

      if (index === 0 && label.warning.startsWith("GOVERNMENT WARNING")) {
        const [, rest] = text.split(/(?<=GOVERNMENT WARNING:)/);
        return `<text x="70" y="${900 + index * 30}" font-size="21" xml:space="preserve"><tspan font-weight="bold">GOVERNMENT WARNING:</tspan><tspan>${escapeXml(rest ?? "")}</tspan></text>`;
      }

      return `<text x="70" y="${900 + index * 30}" font-size="21"${bold}>${text}</text>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="${width}" height="${height}" fill="#fdfcf7"/>
  <rect x="40" y="40" width="${width - 80}" height="${height - 80}" fill="none" stroke="#2b2b2b" stroke-width="3"/>

  <g font-family="Helvetica, Arial, sans-serif" fill="#111111" text-anchor="middle">
    <text x="${centre}" y="300" font-size="62" font-weight="bold" letter-spacing="2">${escapeXml(label.brand)}</text>
    <text x="${centre}" y="400" font-size="32">${escapeXml(label.classType)}</text>
    <text x="${centre}" y="560" font-size="28">${escapeXml(label.alcohol)}</text>
    <text x="${centre}" y="620" font-size="28">${escapeXml(label.netContents)}</text>
    <text x="${centre}" y="700" font-size="22">Distilled and bottled in Bardstown, Kentucky</text>
  </g>

  <g font-family="Helvetica, Arial, sans-serif" fill="#111111">
    ${warningBlock}
  </g>
</svg>`;
}

await mkdir(OUT_DIR, { recursive: true });

for (const label of LABELS) {
  const png = await sharp(Buffer.from(buildSvg(label))).png().toBuffer();
  await writeFile(join(OUT_DIR, label.file), png);
  console.log(`${label.file.padEnd(28)} ${label.describes}`);
}

console.log(`\n${LABELS.length} sample labels written to public/samples/`);
