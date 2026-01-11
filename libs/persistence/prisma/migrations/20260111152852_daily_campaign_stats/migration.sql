CREATE MATERIALIZED VIEW daily_campaign_stats AS
SELECT
  date_trunc('day', "timestamp")::date AS day,
  source,
  COALESCE(
    data->'engagement'->>'campaignId',
    data->'engagement'->>'campaign_id'
  ) AS campaign_id,
  funnel_stage,
  COUNT(*) AS total_events,
  SUM(
    CASE
      WHEN event_type = 'checkout.complete' THEN COALESCE(purchase_amount, 0)
      ELSE 0
    END
  ) AS total_revenue
FROM events
GROUP BY day, source, campaign_id, funnel_stage;

CREATE INDEX daily_campaign_stats_day_source_idx
  ON daily_campaign_stats (day, source);

CREATE INDEX daily_campaign_stats_campaign_idx
  ON daily_campaign_stats (campaign_id);

CREATE INDEX daily_campaign_stats_funnel_idx
  ON daily_campaign_stats (funnel_stage);
