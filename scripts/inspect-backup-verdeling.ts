import { readFileSync } from "fs";

const d = JSON.parse(
  readFileSync("backups/session-d8b97442-backup-2026-05-01.json", "utf-8"),
);
const adv = d.crossAnalyseWizard.stepResults.stap4.begrotingAdvies;
for (const sk of ["advies", "plus20", "optimaal"]) {
  const sc = adv.scenarios[sk];
  if (!sc) continue;
  console.log(`▌ ${sk}:`);
  for (const ins of sc.inspanningen ?? []) {
    console.log(`  ${ins.inspanningTitel.slice(0, 40)}`);
    for (const c of ins.verdelingPerJaar ?? []) {
      console.log(`    ${JSON.stringify(c).slice(0, 250)}`);
    }
  }
  console.log();
}
