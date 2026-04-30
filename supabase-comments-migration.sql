-- Migration: Programmaplan-comments — Word-style aanmerkingen op de leesversie
-- Lezers (stuurgroep, baten-eigenaren) plaatsen comments op hoofdstuk- of paragraaf-niveau.
-- Comments kunnen via AI worden vertaald naar tekstvoorstellen.

CREATE TABLE programmaplan_comments (
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

CREATE INDEX idx_comments_session ON programmaplan_comments(session_id);
CREATE INDEX idx_comments_status ON programmaplan_comments(session_id, status);
CREATE INDEX idx_comments_scope ON programmaplan_comments(session_id, scope_id);
