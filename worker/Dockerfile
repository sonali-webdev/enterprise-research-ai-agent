# worker/Dockerfile
FROM node:22-slim

RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Skip onnxruntime's optional GPU (CUDA) download; we embed on CPU.
ENV ONNXRUNTIME_NODE_INSTALL_CUDA=skip

COPY package.json package-lock.json ./
# See apps/web/Dockerfile for why this is npm install, not npm ci.
RUN npm install

COPY . .

ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN npx prisma generate

# Download the embedding model now so it is baked into the image.
RUN node_modules/.bin/tsx src/prefetch.ts

ENV NODE_ENV=production
CMD exec node_modules/.bin/tsx src/index.ts