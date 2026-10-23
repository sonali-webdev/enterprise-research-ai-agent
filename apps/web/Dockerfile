# apps/web/Dockerfile
FROM node:22-slim

RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
# npm ci rejects a lockfile generated on Windows (it lacks optional
# Linux-only packages). npm install keeps the locked versions and fills
# in whatever is missing.
RUN npm install

COPY . .

# Build-time placeholders only. ARG values are not kept in the runtime
# environment; the real values are injected by docker compose.
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ARG BETTER_AUTH_SECRET=build-time-placeholder
ARG BETTER_AUTH_URL=http://localhost:3000

RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000

CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]