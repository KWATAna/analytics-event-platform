FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx nx build gateway-service

CMD ["node", "dist/apps/gateway-service/main.js"]
