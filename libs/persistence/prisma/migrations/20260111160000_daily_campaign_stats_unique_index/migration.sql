CREATE UNIQUE INDEX IF NOT EXISTS daily_campaign_stats_unique_idx
  ON daily_campaign_stats (day, source, campaign_id, funnel_stage);
