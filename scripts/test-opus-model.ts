import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.substring(0, eq).trim();
    const val = trimmed.substring(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvFile(join(process.cwd(), ".env.local"));

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY });

async function test(model: string) {
  console.log(`\n--- Testing model: ${model} ---`);
  try {
    const t0 = Date.now();
    const res = await client.messages.create({
      model,
      max_tokens: 256,
      system: "Antwoord kort, max 10 woorden.",
      messages: [{ role: "user", content: "Zeg hallo in het Nederlands." }],
    });
    const dt = Date.now() - t0;
    const text = (res.content.find(b => b.type === "text") as { text?: string } | undefined)?.text ?? "(no text)";
    console.log(`✓ OK in ${dt}ms:`, text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`✗ FAIL:`, msg);
  }
}

async function main() {
  await test("claude-sonnet-4-6");
  await test("claude-opus-4-6");
  await test("claude-opus-4-7");
  await test("claude-opus-4-5");
  await test("claude-haiku-4-5");
}
main();
