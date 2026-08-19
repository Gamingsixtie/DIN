-- Migration: Programmaplan-comments — Word-style aanmerkingen op de leesversie
-- Lezers (stuurgroep, baten-eigenaren) plaatsen comments op hoofdstuk- of paragraaf-niveau.
-- Comments kunnen via AI worden vertaald naar tekstvoorstellen.
--
-- Deze migration is IDEMPOTENT: je kunt het meermaals draaien zonder fout.
-- Als de tabel al bestaat (bv. eerdere run) wordt alleen het nieuwe deel
-- (RLS + policies) toegevoegd / vernieuwd.

CREATE TABLE IF NOT EXISTS programmaplan_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('chapter', 'paragraph')),
  scope_id TEXT NOT NULL,                  -- bv. 'hoofdstuk-4' of '4-1-raming-out-of-pocket-kosten'
  scope_label TEXT,                        -- leesbare locatie: "4.1 Out-of-pocket kosten"
  body TEXT NOT NULL,                      -- de opmerking zelf
  author_name TEXT,                        -- naam van de lezer (vrijwillig)
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'applied', 'dismissed')),
  ai_suggestion TEXT,                      -- door Claude gegenereerd tekstvoorstel
  ai_applied_text TEXT,                    -- de uiteindelijk toegepaste vervangingstekst
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_comments_session ON programmaplan_comments(session_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON programmaplan_comments(session_id, status);
CREATE INDEX IF NOT EXISTS idx_comments_scope ON programmaplan_comments(session_id, scope_id);

-- RLS-toegang: anon-clients (alle lezers van /programmaplan/[id]) mogen
-- alle comments lezen, plaatsen, bijwerken en verwijderen op deze gedeelde
-- leesversie. Daarmee kunnen meerdere stuurgroep-leden onafhankelijk
-- aanmerkingen toevoegen op dezelfde sessie, en zien zij elkaars
-- aanmerkingen na een polling-refresh of pagina-herlaad.

ALTER TABLE programmaplan_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_read_all"   ON programmaplan_comments;
DROP POLICY IF EXISTS "comments_insert_all" ON programmaplan_comments;
DROP POLICY IF EXISTS "comments_update_all" ON programmaplan_comments;
DROP POLICY IF EXISTS "comments_delete_all" ON programmaplan_comments;

CREATE POLICY "comments_read_all"   ON programmaplan_comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "comments_insert_all" ON programmaplan_comments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "comments_update_all" ON programmaplan_comments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "comments_delete_all" ON programmaplan_comments FOR DELETE TO anon, authenticated USING (true);
