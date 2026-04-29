# Borging — veilig opnieuw invullen Cultuur + Data & Systemen

**Doel:** voorkomen dat de Q&A van cultuur/data_systemen weer verdwijnt zoals op 2026-04-29 gebeurde.

---

## STAP A — Vóór je begint: verifieer dat fix `2dd0146` live staat

### Welke URL gebruik je?

- Lokaal: `http://localhost:3000` → `npm run dev` opnieuw starten met laatste main, dan ben je sowieso goed.
- Productie: één van je Vercel-URL's. Verifieer:
  1. Open https://vercel.com/dashboard → project **din** → tab **Deployments**
  2. Top-deployment moet commit `2dd0146` of nieuwer hebben (zichtbaar in commit hash kolom)
  3. Status moet **Ready** zijn (groen)
  4. Als de top-deployment ouder is dan `2dd0146`: trigger nieuwe deploy via `git push` of "Redeploy" knop

### In je tab: hard refresh

Zelfs als de deploy klopt, kan je tab nog op de oude bundel hangen. Dwing nieuwe bundel:
- **Ctrl+Shift+R** (Windows) — hard refresh, omzeilt cache
- Bevestig in DevTools → **Network** → top-document → response header **`x-vercel-id`** of build-hash om te zien dat je de verse bundel hebt

---

## STAP B — Tijdens het werk: backup-ritme

### Console-snippet — directe localStorage export

Plak deze functie ÉÉN keer in DevTools → Console. Daarna kun je elk moment `dinBackup()` typen om je sessie te downloaden:

```js
window.dinBackup = function(label) {
  const id = 'd8b97442-ce8f-4134-b2c7-67dc8e3a3f93';
  const raw = localStorage.getItem('din_session_' + id);
  if (!raw) { console.error('sessie niet gevonden'); return; }
  const ts = new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
  const name = label ? `din-${label}-${ts}.json` : `din-${ts}.json`;
  const blob = new Blob([raw], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  console.log(`[dinBackup] ${(raw.length/1024).toFixed(0)} kB → ${name}`);
};
console.log('dinBackup() ready — call: dinBackup("cultuur-ingevuld") of dinBackup()');
```

### Maak een backup op elk van deze momenten

| Moment | Naam |
|---|---|
| **Voor je begint** | `dinBackup("00-start")` |
| **Na cultuur Q&A genereren (knop "Bedenk vragen") en VÓÓR antwoorden** | `dinBackup("01-cultuur-vragen")` |
| **Na cultuur antwoorden invullen + Opslaan** | `dinBackup("02-cultuur-ingevuld")` |
| **Na data_systemen Q&A genereren** | `dinBackup("03-data-vragen")` |
| **Na data_systemen antwoorden invullen + Opslaan** | `dinBackup("04-data-ingevuld")` |
| **Direct VÓÓR "Genereer begrotingsadvies"** | `dinBackup("05-pre-begroting")` |
| **Direct NÁ "Genereer begrotingsadvies"** | `dinBackup("06-post-begroting")` |

Tussen "05" en "06" zit het kritieke moment waar de bug eerder toesloeg. Met deze twee snapshots kun je achteraf altijd vergelijken of er Q&A is verdwenen.

### Network tab open houden

DevTools → **Network** → vink aan: **Preserve log** + **Disable cache** voor de duur van de sessie. Als er ondanks alles iets misgaat, hebben we de request body van `/api/begroting-advies` bewaard.

---

## STAP C — Werkwijze in de wizard

### Volgorde

1. Open stap 6 (cross-analyse → "Optimaliseer inspanningen") in de wizard
2. Voor **CULTUUR** cluster:
   - Klik "Bedenk vragen" → wacht tot 8 vragen geladen zijn
   - **Backup**: `dinBackup("01-cultuur-vragen")`
   - Vul antwoorden in op basis van [RECONSTRUCTIE-cultuur-data_systemen-2026-04-29.md](./RECONSTRUCTIE-cultuur-data_systemen-2026-04-29.md)
   - Klik "Genereer raming" of "Opslaan" — **NIET** "Genereer begrotingsadvies"
   - **Backup**: `dinBackup("02-cultuur-ingevuld")`
3. Voor **DATA & SYSTEMEN** cluster: identieke stappen → backup 03 + 04
4. Verifieer in Application → Local Storage → `din_session_d8b97442…` → zoek `subEffortAnalysis` → controleer dat **alle vier** de `businessCase.questions/answers/result` gevuld zijn (niet alleen mens/processen)
5. Pas dan: **Backup `05-pre-begroting`** → klik "Genereer begrotingsadvies" → **Backup `06-post-begroting`**
6. Vergelijk 05 en 06: open beide in een editor, zoek `subEffortAnalysis` voor cultuur en data_systemen — moet IDENTIEK zijn aan 05. Als 06 leeg is voor één van die twee: bug zit nog ergens en de fix is incomplete; STOP en herstel uit `02` of `04`.

---

## STAP D — Demo-snapshot beschermen via git

De huidige twee backups (`PRE-RECOVERY-2026-04-29-1605` en `demo-session-d8b97442-2026-04-29`) staan lokaal. Commit ze in git zodat ze nooit verloren gaan, ook niet als je een verkeerde restore doet:

```bash
git add backups/session-d8b97442-PRE-RECOVERY-2026-04-29-1605.json \
        backups/demo-session-d8b97442-2026-04-29.json \
        backups/RECONSTRUCTIE-cultuur-data_systemen-2026-04-29.md \
        backups/BORGING-veilig-opnieuw-invullen.md
git commit -m "chore(backup): immutable PRE-RECOVERY snapshot + reconstructie + borgingsdoc voor sessie d8b97442"
git push
```

Daarna staan deze drie bestanden permanent in git geschiedenis. Zelfs als je localStorage wist, kun je de demo-snapshot terughalen met:

```js
// Console-snippet om sessie te restoren uit een gedownloade JSON:
window.dinRestore = function(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  const id = data.id;
  localStorage.setItem('din_session_' + id, JSON.stringify(data));
  // Voeg ook toe aan session_list als die nog niet kent
  const listRaw = localStorage.getItem('din_session_list');
  const list = listRaw ? JSON.parse(listRaw) : [];
  if (!list.includes(id)) {
    list.unshift(id);
    localStorage.setItem('din_session_list', JSON.stringify(list));
  }
  console.log(`[dinRestore] sessie ${id.slice(0,8)} v${data.version} hersteld — refresh de pagina`);
};
// Gebruik: kopieer de JSON-inhoud uit een backup-bestand, dan:
//   dinRestore(`{...inhoud...}`)
// Daarna F5 om de app te laten herladen
```

---

## STAP E — Wat als het tóch nog misgaat

1. **Stop direct** met klikken in de wizard
2. Maak meteen `dinBackup("FAIL-state")`
3. Bekijk in DevTools → Application → Local Storage of de Q&A nog ergens in `wizardState` of een andere key staat
4. Als gone: restore via `dinRestore(...)` uit de laatste goede backup (typisch `04-data-ingevuld`)
5. Stuur me de FAIL-state plus de laatste werkende backup, dan kunnen we de bug verder analyseren

---

## Samenvatting actie-volgorde

```
[ ] Vercel deploy bevat 2dd0146 of nieuwer        ← STAP A
[ ] Tab hard refresh (Ctrl+Shift+R)               ← STAP A
[ ] Console-snippet dinBackup() geladen           ← STAP B
[ ] Network tab: Preserve log + Disable cache aan ← STAP B
[ ] dinBackup("00-start")                         ← STAP B
[ ] Wizard: cultuur Q&A genereren + antwoorden    ← STAP C
[ ] dinBackup("02-cultuur-ingevuld")              ← STAP C
[ ] Wizard: data_systemen Q&A + antwoorden        ← STAP C
[ ] dinBackup("04-data-ingevuld")                 ← STAP C
[ ] Verify alle 4 domeinen gevuld in localStorage ← STAP C
[ ] dinBackup("05-pre-begroting")                 ← STAP C
[ ] Klik "Genereer begrotingsadvies"              ← STAP C
[ ] dinBackup("06-post-begroting")                ← STAP C
[ ] Diff 05 vs 06: alle 4 Q&A nog aanwezig?       ← STAP C
[ ] Commit backups + docs in git                  ← STAP D
```
