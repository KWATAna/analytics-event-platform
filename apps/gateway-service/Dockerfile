FROM node:20-alpine AS builder

WORKDIR /workspace

COPY package.json package-lock.json nx.json tsconfig.base.json ./
COPY apps/gateway-service ./apps/gateway-service
COPY libs/contracts ./libs/contracts
COPY libs/messaging ./libs/messaging

RUN npm ci
RUN npx nx build gateway-service

FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /workspace/dist/apps/gateway-service ./dist/apps/gateway-service
COPY --from=builder /workspace/node_modules ./node_modules

EXPOSE 3000
CMD ["node", "dist/apps/gateway-service/main.js"]
