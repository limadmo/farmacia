# Stage 1: Builder
FROM node:22-bookworm-slim AS builder

# Instalar dependências necessárias para build
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instalar todas as dependências (incluindo devDependencies para build)
RUN npm ci

# Copiar código fonte
COPY . .

# Gerar Prisma Client
RUN npx prisma generate

# Build da aplicação
RUN npm run build

# Stage 2: Production dependencies
FROM node:22-bookworm-slim AS deps

# Instalar OpenSSL para Prisma
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instalar apenas dependências de produção
RUN npm ci --only=production

# Gerar Prisma Client para produção
RUN npx prisma generate

# Stage 3: Runner
FROM node:22-bookworm-slim AS runner

# Instalar OpenSSL e outras dependências necessárias
RUN apt-get update && apt-get install -y \
    openssl \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Criar usuário não-root
RUN groupadd -g 1001 nodejs && \
    useradd -u 1001 -g nodejs -m -s /bin/bash nodejs

# Copiar node_modules de produção
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copiar arquivos buildados
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Criar diretório de uploads
RUN mkdir -p uploads && chown -R nodejs:nodejs uploads

# Mudar para usuário não-root
USER nodejs

# Expor porta
EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Script de inicialização
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]