// Simpele word-based diff (Phase 19 substap 6.2).
// Splitst op woordgrenzen + whitespace en berekent longest-common-subsequence
// om toe te voegen (add) / te verwijderen (del) / gelijk (eq) segments te
// markeren. Gebruikt voor before/after weergave bij AI-optimalisatie in
// Stap 6. Geen externe dep — O(n*m) is prima voor korte velden (enkele 100
// woorden).

export type DiffSegment =
  | { type: "eq"; text: string }
  | { type: "add"; text: string }
  | { type: "del"; text: string };

export type FieldDiff = {
  field: string;
  label: string;
  oldText: string;
  newText: string;
  segments: DiffSegment[]; // unified stream met eq/add/del
  gewijzigd: boolean;
};

// Splits op whitespace + leestekens zodat "woord," en "woord" apart matchen
function tokenize(text: string): string[] {
  if (!text) return [];
  return text.match(/\s+|[^\s]+/g) ?? [];
}

export function diffWords(oldText: string, newText: string): DiffSegment[] {
  const a = tokenize(oldText);
  const b = tokenize(newText);

  if (oldText === newText) {
    return oldText.length > 0 ? [{ type: "eq", text: oldText }] : [];
  }

  // LCS-table
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  // Backtrack naar segments (reversed eerst)
  const reversed: DiffSegment[] = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      reversed.push({ type: "eq", text: a[i - 1] });
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      reversed.push({ type: "del", text: a[i - 1] });
      i--;
    } else {
      reversed.push({ type: "add", text: b[j - 1] });
      j--;
    }
  }
  while (i > 0) {
    reversed.push({ type: "del", text: a[i - 1] });
    i--;
  }
  while (j > 0) {
    reversed.push({ type: "add", text: b[j - 1] });
    j--;
  }

  // Merge aangrenzende segmenten van hetzelfde type en zet terug in volgorde
  const result: DiffSegment[] = [];
  for (let k = reversed.length - 1; k >= 0; k--) {
    const seg = reversed[k];
    const last = result[result.length - 1];
    if (last && last.type === seg.type) {
      last.text += seg.text;
    } else {
      result.push({ ...seg });
    }
  }
  return result;
}

export function computeFieldDiff(
  field: string,
  label: string,
  oldText: string | undefined | null,
  newText: string | undefined | null
): FieldDiff {
  const o = oldText ?? "";
  const n = newText ?? "";
  const segments = diffWords(o, n);
  return {
    field,
    label,
    oldText: o,
    newText: n,
    segments,
    gewijzigd: o.trim() !== n.trim(),
  };
}
