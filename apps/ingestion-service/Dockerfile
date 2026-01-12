FROM node:20-alpine AS builder

WORKDIR /workspace

COPY package.json package-lock.json nx.json tsconfig.base.json ./
COPY apps/ingestion-service ./apps/ingestion-service
COPY libs/contracts ./libs/contracts
COPY libs/messaging ./libs/messaging
COPY libs/persistence ./libs/persistence
COPY libs/shared/logger ./libs/shared/logger
COPY generated ./generated

RUN npm ci
RUN npx nx build ingestion-service

FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /workspace/dist/apps/ingestion-service ./dist/apps/ingestion-service
COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/generated ./generated

EXPOSE 3001
CMD ["node", "dist/apps/ingestion-service/main.js"]
