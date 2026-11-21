FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle
# For creating pairing codes: docker compose exec umai node scripts/create-pairing-code.mjs --admin
COPY --from=builder /app/scripts/create-pairing-code.mjs ./scripts/
EXPOSE 3000
CMD ["node", "server.js"]