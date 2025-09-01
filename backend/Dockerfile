# Backend Production Dockerfile - Cache Busting sem Build por Stack Overflow
FROM node:22-bullseye-slim

# Build arg para cache busting
ARG CACHE_BUST=1
ENV CACHE_BUST=${CACHE_BUST}

# Instalar dependências do sistema para Debian (não Alpine)
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Criar usuário não-root para segurança
RUN groupadd -g 1001 nodejs && \
    useradd -r -u 1001 -g nodejs nodejs

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json primeiro para cache layer
COPY package*.json ./

# Instalar apenas dependências de produção
RUN npm ci --only=production && npm cache clean --force

# Copiar arquivos do projeto (src será executado com ts-node)
COPY . .

# CACHE BUSTING: Limpar caches do Prisma explicitamente
RUN echo "Production cache bust: ${CACHE_BUST}" && \
    rm -rf node_modules/.prisma/ || true && \
    rm -rf node_modules/@prisma/client/runtime/ || true && \
    rm -rf node_modules/@prisma/client/index.d.ts || true

# Instalar ts-node e tsconfig-paths para produção (sem build)
RUN npm install -g ts-node typescript tsconfig-paths

# Regenerar cliente Prisma sempre
RUN npx prisma generate

# Alterar proprietário dos arquivos
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expor a porta
EXPOSE 3001

# Definir variáveis de ambiente de produção
ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Rodar diretamente com ts-node para evitar problemas de build
CMD ["npx", "ts-node", "-r", "tsconfig-paths/register", "src/server.ts"]