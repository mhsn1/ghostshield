#!/usr/bin/env bun
import { program } from "commander";
import chalk from "chalk";
import ora from "ora";
import { runScan } from "./scanner";
import type { ScanTarget } from "./types";
import * as fs from "fs";
import { generateHTML } from "./reporter.js";
import * as path from "path";
import "dotenv/config";

const SEVERITY_COLORS = {
  secure:   chalk.greenBright,
  low:      chalk.green,
  medium:   chalk.yellow,
  high:     chalk.red,
  critical: chalk.bgRed.white.bold,
};

const SEVERITY_ICONS = {
  secure:   "✅",
  low:      "🟡",
  medium:   "🟠",
  high:     "🔴",
  critical: "💀",
};

function printBanner() {
  console.log(chalk.cyan(`
  ██████  ██   ██  ██████  ███████ ████████ ███████ ██   ██ ██ ███████ ██      ██████  
 ██       ██   ██ ██    ██ ██         ██    ██      ██   ██ ██ ██      ██      ██   ██ 
 ██   ███ ███████ ██    ██ ███████    ██    ███████ ███████ ██ █████   ██      ██   ██ 
 ██    ██ ██   ██ ██    ██      ██    ██         ██ ██   ██ ██ ██      ██      ██   ██ 
  ██████  ██   ██  ██████  ███████    ██    ███████ ██   ██ ██ ███████ ███████ ██████  
`));
  console.log(chalk.gray("  AI-Powered LLM Security Scanner — Real attacks. Zero dummy data.\n"));
}

function printResult(result: any) {
  const colorFn = SEVERITY_COLORS[result.severity as keyof typeof SEVERITY_COLORS];
  const icon = SEVERITY_ICONS[result.severity as keyof typeof SEVERITY_ICONS];

  console.log("\n" + chalk.bold("━".repeat(60)));
  console.log(chalk.bold("\n  SCAN COMPLETE\n"));
  console.log(`  Model:        ${chalk.cyan(result.target)}`);
  console.log(`  Timestamp:    ${chalk.gray(result.timestamp)}`);
  console.log(`  Total Probes: ${chalk.white(result.totalProbes)}`);
  console.log(`  Vulnerable:   ${result.vulnerabilities > 0 ? chalk.red(result.vulnerabilities) : chalk.green(result.vulnerabilities)}`);
  console.log(`  Score:        ${chalk.bold(result.score + "/100")}`);
  console.log(`  Severity:     ${icon} ${colorFn(result.severity.toUpperCase())}`);
  console.log("\n" + chalk.bold("━".repeat(60)));

  // Findings
  const vulnFindings = result.findings.filter((f: any) => f.vulnerable);
  if (vulnFindings.length > 0) {
    console.log(chalk.bold.red("\n  ⚠️  VULNERABILITIES FOUND\n"));
    for (const f of vulnFindings) {
      const sColor = SEVERITY_COLORS[f.severity as keyof typeof SEVERITY_COLORS];
      console.log(`  ${sColor("●")} [${f.category.toUpperCase()}] ${chalk.bold(f.probe)}`);
      console.log(`    Severity:  ${sColor(f.severity.toUpperCase())}`);
      console.log(`    Reasoning: ${chalk.gray(f.reasoning)}`);
      console.log(`    Response:  ${chalk.gray(f.response.slice(0, 120))}...`);
      console.log();
    }
  } else {
    console.log(chalk.greenBright("\n  ✅ No vulnerabilities found!\n"));
  }

  // Recommendations
  console.log(chalk.bold("  💡 RECOMMENDATIONS\n"));
  for (const rec of result.recommendations) {
    console.log(`  → ${chalk.yellow(rec)}`);
  }
  console.log("\n" + chalk.bold("━".repeat(60)) + "\n");
}

program
  .name("ghostshield")
  .description("AI-Powered LLM Security Scanner")
  .version("1.0.0");

program
  .command("scan")
  .description("Scan a system prompt for vulnerabilities")
  .option("-p, --prompt <text>", "System prompt to test")
  .option("-f, --file <path>", "File containing system prompt")
  .option("-m, --model <model>", "Target model", "llama-3.1-8b-instant")
  .option("--provider <provider>", "Provider: groq or openrouter", "groq")
  .option("-o, --output <file>", "Save results to JSON file")
  .option("--html <file>", "Save HTML report")
  .action(async (opts) => {
    printBanner();

    // Get system prompt
    let systemPrompt = "";
    if (opts.file) {
      systemPrompt = fs.readFileSync(path.resolve(opts.file), "utf-8");
    } else if (opts.prompt) {
      systemPrompt = opts.prompt;
    } else {
      console.error(chalk.red("Error: provide --prompt or --file"));
      process.exit(1);
    }

    // Get API key
    const apiKey = opts.provider === "groq"
      ? process.env.GROQ_API_KEY!
      : process.env.OPENROUTER_API_KEY!;

    if (!apiKey) {
      console.error(chalk.red(`Error: ${opts.provider === "groq" ? "GROQ_API_KEY" : "OPENROUTER_API_KEY"} not set in .env`));
      process.exit(1);
    }

    const target: ScanTarget = {
      systemPrompt,
      model: opts.model,
      apiKey,
      provider: opts.provider,
    };

    console.log(chalk.gray(`  Scanning: ${opts.model} (${opts.provider})`));
    console.log(chalk.gray(`  Probes:   14 real attack vectors\n`));

    const spinner = ora({
      text: "Running probe 1/14...",
      color: "cyan",
    }).start();

    const result = await runScan(target, (current, total, name) => {
      spinner.text = chalk.gray(`Running probe ${current}/${total}: ${name}`);
    });

    spinner.stop();
    printResult(result);

    // Save output
    if (opts.html) {
      const html = generateHTML(result);
      fs.writeFileSync(opts.html, html);
      console.log(chalk.green(`  HTML report saved to ${opts.html}\n`));
    }
  });

program
  .command("probes")
  .description("List all available attack probes")
  .action(async () => {
    printBanner();
    const { probes } = await import("./probes/index.js");
    console.log(chalk.bold("  Available Attack Probes\n"));
    const categories = [...new Set(probes.map(p => p.category))];
    for (const cat of categories) {
      console.log(chalk.cyan(`  [${cat.toUpperCase()}]`));
      for (const p of probes.filter(x => x.category === cat)) {
        console.log(`    ${chalk.gray(p.id)}  ${p.name}`);
      }
      console.log();
    }
  });

program.parse();
