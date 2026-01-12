FROM node:20-alpine AS builder

WORKDIR /workspace

COPY package.json package-lock.json nx.json tsconfig.base.json ./
COPY apps/reporting-service ./apps/reporting-service
COPY libs/persistence ./libs/persistence
COPY libs/shared/logger ./libs/shared/logger
COPY generated ./generated

RUN npm ci
RUN npx nx build reporting-service

FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /workspace/dist/apps/reporting-service ./dist/apps/reporting-service
COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/generated ./generated

EXPOSE 3002
CMD ["node", "dist/apps/reporting-service/main.js"]
