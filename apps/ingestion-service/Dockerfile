FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx nx build ingestion-service

RUN npx nx run persistence:prisma-generate


CMD npx nx run persistence:prisma-migrate \
    && node dist/apps/ingestion-service/main.js
