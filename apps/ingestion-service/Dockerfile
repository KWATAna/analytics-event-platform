FROM node:24-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx nx build ingestion-service

RUN npx nx run persistence:prisma-generate


CMD npx nx run persistence:db-migrate \
    && node dist/apps/ingestion-service/main.js
