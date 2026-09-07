import { chromium } from "playwright";

const url = process.argv[2] ?? "http://localhost:3000";
const sample = process.argv[3] ?? "compliant.png";

const screenshot = process.argv[4];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
const problems = [];

page.on("console", (message) => {
  if (message.type() === "error") problems.push(`console: ${message.text()}`);
});
page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));

await page.goto(url, { waitUntil: "networkidle" });

// Going through the picker rather than the file input means the sample image
// and its application data are loaded the same way a reviewer loads them.
const available = await page.evaluate(() =>
  Array.from(document.querySelectorAll("[data-sample]")).map((button) =>
    button.getAttribute("data-sample"),
  ),
);

if (!available.includes(sample)) {
  console.error(`Unknown sample "${sample}". Available: ${available.join(", ")}`);
  await browser.close();
  process.exit(1);
}

await page.click(`[data-sample="${sample}"]`);

const started = Date.now();
await page.getByRole("button", { name: "Check this label" }).click();

const outcome = page.getByText(
  /Label matches the application|Needs your review|Discrepancies found|Could not read the label/,
);
await outcome.first().waitFor({ timeout: 180_000 });

const results = await page.evaluate(() =>
  Array.from(document.querySelectorAll("li")).map((item) => {
    const heading = item.querySelector("h3")?.textContent?.trim();
    const status = item.querySelector("span")?.textContent?.trim();
    return `${heading}: ${status}`;
  }),
);

const verdict = await outcome.first().textContent();

console.log(`sample:  ${sample}`);
console.log(`elapsed: ${((Date.now() - started) / 1000).toFixed(1)}s`);
console.log(`verdict: ${verdict}`);
for (const result of results) console.log(`  ${result}`);
console.log(problems.length ? `\nERRORS:\n${problems.join("\n")}` : "\nno console errors");

if (screenshot) {
  await page.screenshot({ path: screenshot, fullPage: true });
  console.log(`screenshot: ${screenshot}`);
}

await browser.close();
