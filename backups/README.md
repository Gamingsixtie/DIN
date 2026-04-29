# Sessie-backups — DIN

Bewaarde snapshots van Supabase sessies. Bij vermoeden van dataverlies (bug, race-conditie, per ongeluk overschreven) gebruik je deze om terug te zetten.

## Belangrijke bestanden

- `session-d8b97442-FULL-2026-04-29_20-53-23.json` — **Hoofdbackup Klant in Beeld** (versie 1319, 29 april 2026 ~20:53). Volledige sessie incl. visie, scope, doelen, baten, vermogens, inspanningen, alle 7 cross-analyse stappen, businessCase Q&A van alle 4 inspanningsclusters, begrotingAdvies (3 scenario's), interne uren-planning.
- `session-d8b97442-backup-YYYY-MM-DD.json` — dagelijkse snapshots (overschreven per dag).
- `session-d8b97442-PRE-RECOVERY-*.json` — snapshot vóór recovery-actie.

## Backup maken (handmatig)

```powershell
npx tsx scripts/backup-session.ts <sessionId>
```

Schrijft naar `backups/session-<shortId>-backup-<YYYY-MM-DD>.json` (overschrijft per dag).

Voor een tijdgestempelde extra kopie (niet overschrijfbaar):

```powershell
$ts = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
Copy-Item "backups/session-d8b97442-backup-$(Get-Date -Format 'yyyy-MM-dd').json" "backups/session-d8b97442-FULL-$ts.json"
```

## Restore — als data verloren is gegaan

1. **Stop met werken in de browser-tab** zodra je het probleem ziet (anders schrijft de tab nog eens stale data over Supabase).

2. **Maak eerst een snapshot van de huidige (corrupte) state:**
   ```powershell
   npx tsx scripts/backup-session.ts d8b97442-ce8f-4134-b2c7-67dc8e3a3f93
   $ts = Get-Date -Format "yyyy-MM-dd_HH-mm"
   Copy-Item "backups/session-d8b97442-backup-$(Get-Date -Format 'yyyy-MM-dd').json" "backups/session-d8b97442-PRE-RECOVERY-$ts.json"
   ```

3. **Restore de gewenste backup naar Supabase:**
   ```powershell
   npx tsx scripts/restore-session.ts d8b97442-ce8f-4134-b2c7-67dc8e3a3f93 backups/session-d8b97442-FULL-2026-04-29_20-53-23.json
   ```

4. **In de browser-tab op din-kappa.vercel.app:**
   - Open DevTools (F12) → Console
   - Plak en voer uit:
     ```js
     localStorage.removeItem('din_session_d8b97442-ce8f-4134-b2c7-67dc8e3a3f93');
     location.reload();
     ```
   - De tab herlaadt en pakt de gerestore versie uit Supabase.

## Inspectie zonder restore

Bekijk wat er in een backup zit:

```powershell
node -e "const d = JSON.parse(require('fs').readFileSync('backups/session-d8b97442-FULL-2026-04-29_20-53-23.json','utf-8')); console.log('v'+d.version, d.updatedAt); const arr = d.crossAnalyseWizard.stepResults.stap4.subEffortAnalysis; arr.forEach((e,i) => console.log(i, e.domein, 'q='+e.businessCase?.questions?.length, 'a='+Object.keys(e.businessCase?.answers||{}).length, 'r='+!!e.businessCase?.result));"
```

## Wat zit er in een full backup

Een sessie-backup bevat alle DIN-data:

- **Programma-niveau**: id, naam, goals (3), vision, scope, benefits (3), capabilities (3), efforts (34)
- **Mappings**: goalBenefitMaps, benefitCapabilityMaps, capabilityEffortMaps
- **Cross-analyse wizard**: currentStep, completedSteps, alle stepResults
  - **stap1** (baten-overloop): synergieën, gaps, samenvatting per sector
  - **stap2** (gedeelde vermogens): hefboomwerking, vermogenClusters, gelijkenisGroepen
  - **stap3** (inspanningen-overlap): inspanningClusters, project-matching
  - **stap4** (consolidatie + optimaliseren + interne uren):
    - `samenvatting`
    - `citobreedInzicht` (4 inzichten per domein)
    - `consolidatieAdvies` (cluster-aanbevelingen)
    - `subEffortAnalysis` (4 entries: mens, processen, data_systemen, cultuur — elk met titel, beschrijving, beargumentatie, dossier, vermogenImpact, **businessCase Q&A**)
    - `begrotingAdvies` (3 scenarios: optimaal, plus20, min20)
    - `stap7InterneUren` (rolselectie per domein, vragenAntwoorden, scenario-totalen)

Versies en updatedAt timestamps zitten op het root-niveau.
