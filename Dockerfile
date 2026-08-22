# Build stage
FROM node:20-slim AS builder

WORKDIR /app

COPY package.json package-lock.json* bun.lock* ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:20-slim AS production

WORKDIR /app

COPY package.json package-lock.json* bun.lock* ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "dist/server.cjs"]
