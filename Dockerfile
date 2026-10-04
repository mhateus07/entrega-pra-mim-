# Imagem de produção do Entrega Pra Mim (usada pelo docker-compose.yml)
FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# A chave pública do Maps é embutida no bundle do navegador durante o build
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=""
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
# Valores fictícios só para o build; os reais vêm do .env em tempo de execução
RUN npx prisma generate \
  && DATABASE_URL="mysql://build:build@localhost:3306/build" \
     NEXTAUTH_SECRET="build-only-placeholder-not-used-at-runtime" \
     NEXTAUTH_URL="http://localhost:3000" \
     npm run build

FROM base AS runtime
ENV NODE_ENV=production PORT=3000 NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app /app
RUN mkdir -p /app/storage/comprovantes && chown -R node:node /app/storage
USER node
EXPOSE 3000
# Aplica migrações pendentes antes de subir (idempotente)
CMD ["sh", "-c", "npx prisma migrate deploy && npx next start -H 0.0.0.0 -p 3000"]
