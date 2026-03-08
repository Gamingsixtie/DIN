---
name: klant-in-beeld
description: |
  Beheer en onderhoud van het Klant in Beeld project (Supabase + Vercel + Next.js). Gebruik deze skill bij alles rondom de Klant in Beeld applicatie: sessie-inspectie, deploy naar productie, en het fixen van duplicate IDs. Trigger bij: "check sessie", "wat staat er in Supabase", "toon clusters", "toon votes", "deploy", "naar productie", "live zetten", "fix ids", "duplicate ids", "dubbele cluster ids", "id conflict", "klant in beeld", "KiB". Altijd gebruiken wanneer het Klant in Beeld project wordt genoemd, ook bij debuggen of statusvragen.
---

# Klant in Beeld

Operationele skill voor het Klant in Beeld project: sessie-inspectie, deploys en ID-fixes.

---

## 1. Check Session

Query Supabase en toon een volledig overzicht van de huidige sessie.

### Queries

**Actieve sessie ophalen:**
```sql
SELECT * FROM sessions ORDER BY created_at DESC LIMIT 1;
```

**Clusters tonen:**
```sql
SELECT id, label, category, vote_count, created_at
FROM clusters
WHERE session_id = '<session_id>'
ORDER BY vote_count DESC;
```

**Votes tonen:**
```sql
SELECT v.id, v.cluster_id, c.label, v.user_id, v.created_at
FROM votes v
JOIN clusters c ON v.cluster_id = c.id
WHERE c.session_id = '<session_id>'
ORDER BY v.created_at DESC;
```

**Duplicaten detecteren:**
```sql
SELECT id, COUNT(*) as aantal
FROM clusters
WHERE session_id = '<session_id>'
GROUP BY id
HAVING COUNT(*) > 1;
```

**Version history:**
```sql
SELECT * FROM cluster_versions
WHERE session_id = '<session_id>'
ORDER BY version DESC;
```

### Rapporteer na elke check
- Aantal clusters (totaal / per categorie)
- Totaal aantal votes
- Eventuele duplicaten (met IDs)
- Laatste versienummer

---

## 2. Deploy

Voert een volledige productie-deploy uit: build → commit → deploy → verificatie.

### Stappen

```bash
# 1. Build check (stop als dit faalt)
npm run build

# 2. Git status controleren
git status
git log --oneline -3

# 3. Deploy naar productie
vercel --prod
```

### Na deploy
- Open de productie-URL in de browser
- Controleer of de sessie intact is
- Check console op errors

### Bij problemen
- Build faalt → fix error eerst, dan opnieuw
- Vercel error → check `vercel logs`
- Sessie kwijt → voer Check Session uit

---

## 3. Fix IDs

Scan en fix duplicate cluster IDs in Supabase en localStorage.

### Stap 1: Detecteer duplicaten in Supabase
```sql
SELECT id, label, COUNT(*) as duplicaten
FROM clusters
WHERE session_id = '<session_id>'
GROUP BY id, label
HAVING COUNT(*) > 1
ORDER BY duplicaten DESC;
```

### Stap 2: Detecteer duplicaten in localStorage
```javascript
const clusters = JSON.parse(localStorage.getItem('clusters') || '[]');
const ids = clusters.map(c => c.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
console.log('Duplicate IDs:', dupes);
```

### Stap 3: Fix in localStorage
```javascript
const clusters = JSON.parse(localStorage.getItem('clusters') || '[]');
const seen = new Set();
const fixed = clusters.map(c => {
  if (seen.has(c.id)) {
    c.id = c.id + '_' + Date.now();
  }
  seen.add(c.id);
  return c;
});
localStorage.setItem('clusters', JSON.stringify(fixed));
console.log('localStorage gefixed');
```

### Stap 4: Fix in Supabase
```sql
DELETE FROM clusters
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY id ORDER BY created_at ASC) as rn
    FROM clusters WHERE session_id = '<session_id>'
  ) t WHERE rn > 1
);
```

### Stap 5: Verificeer
Voer Check Session (sectie 1) uit om te bevestigen dat er geen duplicaten meer zijn.
