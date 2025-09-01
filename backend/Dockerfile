# Backend Dockerfile Unificado - Todos os Ambientes (Dev/Staging/Prod)
FROM node:22-bullseye-slim

# Build arg para cache busting
ARG CACHE_BUST=1
ENV CACHE_BUST=${CACHE_BUST}

# NODE_ENV pode ser definido no build ou runtime (default: development)
ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}

# Instalar dependências do sistema para Debian
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    openssl \
    libssl-dev \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json primeiro para melhor cache do npm
COPY package*.json ./

# Instalar dependências (todas para dev, apenas prod para production)
RUN if [ "$NODE_ENV" = "production" ]; then \
      npm ci --only=production && npm cache clean --force; \
    else \
      npm install && npm cache clean --force; \
    fi

# Instalar ts-node globalmente (necessário para todos os ambientes)
RUN npm install -g ts-node typescript tsconfig-paths

# Copiar arquivos do projeto
COPY . .

# CACHE BUSTING: Limpar apenas caches específicos do Prisma
RUN echo "Cache bust (${NODE_ENV}): ${CACHE_BUST}" && \
    rm -rf node_modules/.prisma/client/index.d.ts || true && \
    rm -rf node_modules/.prisma/client/schema.prisma || true

# Regenerar cliente Prisma sempre
RUN npx prisma generate

# DEBUG: Verificar migrations disponíveis (apenas em dev)
RUN if [ "$NODE_ENV" = "development" ]; then \
      echo "=== MIGRATIONS DISPONÍVEIS ===" && \
      ls -la prisma/migrations/ && \
      echo "=== SCHEMA PRISMA ===" && \
      head -50 prisma/schema.prisma && \
      echo "=== FIM DEBUG ==="; \
    fi

# Segurança: criar usuário não-root (apenas para prod)
RUN if [ "$NODE_ENV" = "production" ]; then \
      groupadd -g 1001 nodejs && \
      useradd -r -u 1001 -g nodejs nodejs && \
      chown -R nodejs:nodejs /app; \
    fi

# Expor porta
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Script unificado para todos os ambientes
CMD ["sh", "-c", "\
  echo 'Backend starting (${NODE_ENV}, cache bust: ${CACHE_BUST})...' && \
  sleep 10 && \
  echo 'FORCE: Resetting database to ensure all migrations...' && \
  npx prisma migrate reset --force && \
  echo 'Database reset! All migrations applied.' && \
  echo 'Regenerating Prisma client...' && \
  npx prisma generate && \
  echo 'Seeding database...' && \
  npx prisma db seed && \
  echo 'Database seeded!' && \
  echo 'Starting server...' && \
  if [ \"$NODE_ENV\" = \"production\" ]; then \
    su nodejs -c 'npx ts-node -r tsconfig-paths/register src/server.ts'; \
  else \
    npm run dev; \
  fi"]