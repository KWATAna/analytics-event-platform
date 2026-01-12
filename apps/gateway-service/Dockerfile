FROM node:24-alpine

RUN apk add --no-cache curl


WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx nx build gateway-service

CMD ["node", "dist/apps/gateway-service/main.js"]
