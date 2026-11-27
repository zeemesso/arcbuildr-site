-- Magnet engine tables (MAGNET-PLAN.md). Applied to the D1 database bound as DB.

-- One row per person per magnet.
CREATE TABLE magnet_leads (
  id TEXT PRIMARY KEY,
  -- The secret in the result link. Never shown to anyone but the lead.
  token TEXT NOT NULL UNIQUE,
  magnet TEXT NOT NULL,
  created_at TEXT NOT NULL,
  name TEXT NOT NULL,
  -- Lower-case.
  email TEXT NOT NULL,
  instagram TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  -- JSON object: question id to the text the lead typed.
  answers TEXT NOT NULL,
  page TEXT NOT NULL DEFAULT '',
  utm TEXT NOT NULL DEFAULT '',
  -- ReplyRail link code, when the lead came from an Instagram message.
  rr TEXT NOT NULL DEFAULT '',
  tz TEXT NOT NULL DEFAULT '',
  -- queued, running, done, rejected (junk answers), held (waiting for us), failed.
  status TEXT NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  started_at TEXT,
  finished_at TEXT,
  -- From the screen step: 1 (cold) to 5 (hot), and one line for the setter.
  score INTEGER,
  setter_note TEXT,
  screen_reason TEXT,
  -- The deliverable, as Markdown.
  deliverable_md TEXT,
  model TEXT,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  -- Millionths of a US dollar.
  cost_microusd INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  -- Where the setter is with this lead: new, contacted, booked, closed, dropped.
  stage TEXT NOT NULL DEFAULT 'new',
  UNIQUE (magnet, email)
);

CREATE INDEX magnet_leads_status ON magnet_leads (status, created_at);

-- What the model calls cost per UTC day. The daily cap reads this.
CREATE TABLE magnet_spend (
  day TEXT PRIMARY KEY,
  microusd INTEGER NOT NULL DEFAULT 0
);

-- The private half of each magnet: outline, method notes, hot-lead rule. Never in the repo.
CREATE TABLE magnet_briefs (
  slug TEXT PRIMARY KEY,
  brief_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
