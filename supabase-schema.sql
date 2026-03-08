-- DIN (Doelen-Inspanningennetwerk) Database Schema
-- Gebaseerd op "Werken aan Programma's" (Prevaas & Van Loon)

-- Import uit KiB
CREATE TABLE programme_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rank INTEGER NOT NULL DEFAULT 0,
  source_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE programme_vision (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uitgebreid TEXT NOT NULL,
  beknopt TEXT NOT NULL,
  source_session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE programme_scope (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  in_scope TEXT[] DEFAULT '{}',
  out_scope TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sectorplannen
CREATE TABLE sector_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_name TEXT NOT NULL,
  raw_text TEXT,
  parsed_content JSONB,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product-marktcombinaties
CREATE TABLE pmc_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product TEXT NOT NULL,
  market_segment TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('hoog', 'midden', 'laag')) DEFAULT 'midden',
  current_performance TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DIN Keten: Baten (per sector per doel)
CREATE TABLE din_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES programme_goals(id) ON DELETE CASCADE,
  sector_id UUID REFERENCES sector_plans(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  indicator TEXT,
  indicator_owner TEXT,
  current_value TEXT,
  target_value TEXT,
  measurement_moment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DIN Keten: Vermogens (per sector)
CREATE TABLE din_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id UUID REFERENCES sector_plans(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  related_sectors TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DIN Keten: Inspanningen (per sector)
CREATE TABLE din_efforts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id UUID REFERENCES sector_plans(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  domain TEXT CHECK (domain IN ('mens', 'processen', 'data_systemen', 'cultuur')) NOT NULL,
  quarter TEXT,
  responsible_sector TEXT,
  status TEXT CHECK (status IN ('gepland', 'in_uitvoering', 'afgerond', 'on_hold')) DEFAULT 'gepland',
  dependencies UUID[] DEFAULT '{}',
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Koppelingen (volgen de DIN-keten)
CREATE TABLE goal_benefit_map (
  goal_id UUID REFERENCES programme_goals(id) ON DELETE CASCADE,
  benefit_id UUID REFERENCES din_benefits(id) ON DELETE CASCADE,
  PRIMARY KEY (goal_id, benefit_id)
);

CREATE TABLE benefit_capability_map (
  benefit_id UUID REFERENCES din_benefits(id) ON DELETE CASCADE,
  capability_id UUID REFERENCES din_capabilities(id) ON DELETE CASCADE,
  PRIMARY KEY (benefit_id, capability_id)
);

CREATE TABLE capability_effort_map (
  capability_id UUID REFERENCES din_capabilities(id) ON DELETE CASCADE,
  effort_id UUID REFERENCES din_efforts(id) ON DELETE CASCADE,
  PRIMARY KEY (capability_id, effort_id)
);

CREATE TABLE effort_pmc_map (
  effort_id UUID REFERENCES din_efforts(id) ON DELETE CASCADE,
  pmc_id UUID REFERENCES pmc_entries(id) ON DELETE CASCADE,
  PRIMARY KEY (effort_id, pmc_id)
);

CREATE TABLE effort_sector_map (
  effort_id UUID REFERENCES din_efforts(id) ON DELETE CASCADE,
  sector_plan_id UUID REFERENCES sector_plans(id) ON DELETE CASCADE,
  PRIMARY KEY (effort_id, sector_plan_id)
);

-- Indexes voor performance
CREATE INDEX idx_din_benefits_goal ON din_benefits(goal_id);
CREATE INDEX idx_din_benefits_sector ON din_benefits(sector_id);
CREATE INDEX idx_din_capabilities_sector ON din_capabilities(sector_id);
CREATE INDEX idx_din_efforts_domain ON din_efforts(domain);
CREATE INDEX idx_din_efforts_sector ON din_efforts(sector_id);
CREATE INDEX idx_din_efforts_status ON din_efforts(status);
