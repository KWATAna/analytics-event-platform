FROM node:24-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx nx build reporting-service


CMD ["node", "dist/apps/reporting-service/main.js"]
