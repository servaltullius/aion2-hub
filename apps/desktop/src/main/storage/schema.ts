export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS notice_item (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK(source IN ('NOTICE','UPDATE')),
  external_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_notice_item_source_published_at
  ON notice_item (source, published_at);

CREATE TABLE IF NOT EXISTS notice_snapshot (
  id TEXT PRIMARY KEY,
  notice_item_id TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  UNIQUE(notice_item_id, content_hash),
  FOREIGN KEY (notice_item_id) REFERENCES notice_item(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_notice_snapshot_item_fetched
  ON notice_snapshot (notice_item_id, fetched_at);

CREATE TABLE IF NOT EXISTS notice_diff (
  id TEXT PRIMARY KEY,
  notice_item_id TEXT NOT NULL,
  from_snapshot_id TEXT NOT NULL,
  to_snapshot_id TEXT NOT NULL,
  diff_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(from_snapshot_id, to_snapshot_id),
  FOREIGN KEY (notice_item_id) REFERENCES notice_item(id) ON DELETE CASCADE,
  FOREIGN KEY (from_snapshot_id) REFERENCES notice_snapshot(id) ON DELETE CASCADE,
  FOREIGN KEY (to_snapshot_id) REFERENCES notice_snapshot(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_setting (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_character (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  server TEXT,
  class TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_character_name
  ON app_character (name);

CREATE TABLE IF NOT EXISTS build_score (
  character_id TEXT PRIMARY KEY,
  data_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (character_id) REFERENCES app_character(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS build_score_preset (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  stats_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (character_id) REFERENCES app_character(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_build_score_preset_character_updated
  ON build_score_preset (character_id, updated_at);

CREATE TABLE IF NOT EXISTS planner_settings (
  id TEXT PRIMARY KEY,
  daily_reset_hhmm TEXT NOT NULL,
  weekly_reset_day INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS planner_template (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('DAILY','WEEKLY','CHARGE')),
  estimate_minutes INTEGER NOT NULL DEFAULT 0,
  recharge_hours INTEGER,
  max_stacks INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_planner_template_type
  ON planner_template (type);

CREATE TABLE IF NOT EXISTS planner_assignment (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1)),
  target_count INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(character_id, template_id),
  FOREIGN KEY (character_id) REFERENCES app_character(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES planner_template(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_planner_assignment_character
  ON planner_assignment (character_id);

CREATE TABLE IF NOT EXISTS planner_completion (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  period_key TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  UNIQUE(character_id, template_id, period_key),
  FOREIGN KEY (character_id) REFERENCES app_character(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES planner_template(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_planner_completion_lookup
  ON planner_completion (character_id, period_key);

CREATE TABLE IF NOT EXISTS planner_charge_use (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  used_at TEXT NOT NULL,
  FOREIGN KEY (character_id) REFERENCES app_character(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES planner_template(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_planner_charge_use_lookup
  ON planner_charge_use (character_id, template_id, used_at);

CREATE TABLE IF NOT EXISTS planner_duration (
  id TEXT PRIMARY KEY,
  character_id TEXT NOT NULL,
  template_id TEXT,
  started_at TEXT NOT NULL,
  ended_at TEXT NOT NULL,
  seconds INTEGER NOT NULL,
  FOREIGN KEY (character_id) REFERENCES app_character(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES planner_template(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_planner_duration_character_started
  ON planner_duration (character_id, started_at);

CREATE TABLE IF NOT EXISTS collectible_item (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('TRACE','CUBE','MATERIAL')),
  map TEXT NOT NULL,
  faction TEXT,
  region TEXT,
  name TEXT NOT NULL,
  note TEXT,
  x REAL,
  y REAL,
  source TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_collectible_item_kind_map
  ON collectible_item (kind, map);

CREATE INDEX IF NOT EXISTS idx_collectible_item_kind_region
  ON collectible_item (kind, region);

CREATE TABLE IF NOT EXISTS collectible_progress (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL CHECK(scope IN ('ACCOUNT','CHARACTER')),
  character_id TEXT,
  item_id TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 1 CHECK(done IN (0,1)),
  done_at TEXT,
  updated_at TEXT NOT NULL,
  CHECK((scope = 'ACCOUNT' AND character_id IS NULL) OR (scope = 'CHARACTER' AND character_id IS NOT NULL)),
  FOREIGN KEY (character_id) REFERENCES app_character(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES collectible_item(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_collectible_progress_unique
  ON collectible_progress (scope, item_id, IFNULL(character_id, ''));

CREATE INDEX IF NOT EXISTS idx_collectible_progress_scope_character
  ON collectible_progress (scope, character_id);
`;
