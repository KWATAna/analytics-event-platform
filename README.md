# Analytics Event Platform

High-throughput event ingestion and reporting platform built on Nx + NestJS, Fastify, NATS, and Postgres.

## Services

- Gateway service (HTTP ingress + NATS publish): http://localhost:3000/api
- Ingestion service (NATS consumer + Postgres persist): http://localhost:3001/api
- Reporting service (query + analytics endpoints): http://localhost:3002/api
- NATS monitoring: http://localhost:8222

## Start with Docker

This uses docker-compose.yml and builds all app images.

```sh
docker compose build
docker compose up
```

Stop everything:

```sh
docker compose down
```

## Health checks

- Gateway: GET http://localhost:3000/api/health
- Ingestion: GET http://localhost:3001/api/health
- Reporting: GET http://localhost:3002/api/health

## API endpoints

Gateway:

- POST http://localhost:3000/api/webhook

Reporting:

- GET http://localhost:3002/api/reports/summary
- GET http://localhost:3002/api/reports/top-campaigns
- GET http://localhost:3002/api/reports/geography

## Postgres schema

Core table: `events` (see `libs/persistence/prisma/schema.prisma`)

- `event_id` (PK)
- `timestamp`
- `source`
- `funnel_stage`
- `event_type`
- `purchase_amount`
- `data` (JSON)
- Indexes: `timestamp`, `event_type`, (`source`, `funnel_stage`)

Materialized view: `daily_campaign_stats` (see migrations under `libs/persistence/prisma/migrations`)

- `day`
- `source`
- `campaign_id`
- `funnel_stage`
- `total_events`
- `total_revenue`
- Indexes: `day/source`, `campaign_id`, `funnel_stage` + unique on (`day`, `source`, `campaign_id`, `funnel_stage`)

## Environment

Common variables:

- DATABASE_URL (Postgres connection string)
- NATS_URL (NATS connection string)
- LOG_LEVEL (debug, info, warn, error)

Example dev env: .env.development.

## Postman collection

Import postman/analytics-event-platform.postman_collection.json to explore health checks and report endpoints.
