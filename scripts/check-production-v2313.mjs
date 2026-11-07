import fs from "node:fs";
import path from "node:path";
import { runProductionHealth } from "./production-health-v2313.mjs";
import pkg from "../package.json" with { type: "json" };

function readFlag(name, defaultValue) {
  const i = process.argv.indexOf(name);
  if (i === -1) return defaultValue;
  const value = process.argv[i + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} expects a value`);
  return value;
}

try {
  const baseUrl = readFlag("--base-url", "https://fc-edinet.vercel.app");
  const expectedVersion = readFlag("--expect-version", pkg.version);
  const reportFile = readFlag("--report", "production-health-report.json");
  const report = await runProductionHealth({ baseUrl, expectedVersion });
  console.log(`\nFC EDINET · Production Health · ${report.checkedAt}`);
  console.log(`Site: ${report.site} · Expected: v${report.expectedVersion}`);
  for (const result of report.results) {
    console.log(`${result.ok ? "PASS" : "FAIL"} ${result.path.padEnd(20)} HTTP ${String(result.httpStatus ?? "—").padEnd(3)} ${String(result.headerLatencyMs).padStart(5)} ms${result.error ? ` · ${result.error}` : ""}`);
  }
  console.log(`\n${report.passed}/${report.total} HTTP checks passed.`);
  console.log("IMPORTANT: These are NOT measured Core Web Vitals or proof that all site features work.");
  fs.writeFileSync(path.resolve(reportFile), JSON.stringify(report, null, 2) + "\n");
  console.log(`Report: ${path.resolve(reportFile)}`);
  if (report.passed !== report.total) process.exitCode = 1;
} catch (error) {
  console.error("Health check error:", error instanceof Error ? error.message : "unknown error");
  process.exitCode = 1;
}
