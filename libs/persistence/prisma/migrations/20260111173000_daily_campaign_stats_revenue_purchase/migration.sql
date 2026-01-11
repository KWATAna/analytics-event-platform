DROP MATERIALIZED VIEW IF EXISTS daily_campaign_stats;

CREATE MATERIALIZED VIEW daily_campaign_stats AS
SELECT
  date_trunc('day', "timestamp")::date AS day,
  source,
  COALESCE(
    data->'data'->'engagement'->>'campaignId',
    data->'data'->'engagement'->>'campaign_id',
    data->'engagement'->>'campaignId',
    data->'engagement'->>'campaign_id'
  ) AS campaign_id,
  funnel_stage,
  COUNT(*) AS total_events,
  SUM(
    CASE
      WHEN event_type IN ('checkout.complete', 'purchase') THEN COALESCE(
        purchase_amount,
        NULLIF(data->'data'->'engagement'->>'purchaseAmount', '')::numeric,
        NULLIF(data->'engagement'->>'purchaseAmount', '')::numeric,
        0
      )
      ELSE 0
    END
  ) AS total_revenue
FROM events
GROUP BY day, source, campaign_id, funnel_stage;

CREATE INDEX IF NOT EXISTS daily_campaign_stats_day_source_idx
  ON daily_campaign_stats (day, source);

CREATE INDEX IF NOT EXISTS daily_campaign_stats_campaign_idx
  ON daily_campaign_stats (campaign_id);

CREATE INDEX IF NOT EXISTS daily_campaign_stats_funnel_idx
  ON daily_campaign_stats (funnel_stage);

CREATE UNIQUE INDEX IF NOT EXISTS daily_campaign_stats_unique_idx
  ON daily_campaign_stats (day, source, campaign_id, funnel_stage);
