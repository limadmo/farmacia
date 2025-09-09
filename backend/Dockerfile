# Stage 1: Builder
FROM node:22 AS builder

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
FROM node:22 AS deps

# Instalar OpenSSL para Prisma
RUN apt-get update && apt-get install -y \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# Instalar todas as dependências (necessário para seed)
RUN npm ci

# Gerar Prisma Client para produção
RUN npx prisma generate

# Stage 3: Runner
FROM node:22 AS runner

# Fix para variáveis de ambiente do Dokploy (Issue #1244)
ARG NODE_ENV=production
ARG JWT_SECRET
ARG DATABASE_URL
ARG FRONTEND_URL
ARG CORS_ORIGIN

ENV NODE_ENV=$NODE_ENV
ENV JWT_SECRET=$JWT_SECRET
ENV DATABASE_URL=$DATABASE_URL
ENV FRONTEND_URL=$FRONTEND_URL
ENV CORS_ORIGIN=$CORS_ORIGIN

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
# Copiar arquivos fonte para seed (necessário para tsx)
COPY --from=builder --chown=nodejs:nodejs /app/src ./src
COPY --from=builder --chown=nodejs:nodejs /app/tsconfig.json ./

# Copiar script de inicialização com seed automático
COPY --chown=nodejs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Criar diretórios necessários com permissões corretas
RUN mkdir -p uploads logs && \
    chown -R nodejs:nodejs uploads logs && \
    chmod -R 755 uploads logs

# Mudar para usuário não-root
USER nodejs

# Expor porta
EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Script de inicialização com migrations e seed automático
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]