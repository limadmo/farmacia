# Dockerfile único para deploy no Coolify
# Este arquivo constrói apenas o backend API

FROM node:22-slim

# Instalar dependências do sistema (OpenSSL para Prisma + curl para health check)
RUN apt-get update && apt-get install -y \
    openssl \
    libssl-dev \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Diretório de trabalho
WORKDIR /app

# Copiar todos os arquivos do backend
COPY backend/package*.json ./

# Instalar dependências
RUN npm install

# Copiar código fonte do backend
COPY backend/. ./

# Gerar Prisma client
RUN npx prisma generate

# Porta da API
EXPOSE 3001

# Comando para produção
CMD ["sh", "-c", "sleep 10 && npx prisma migrate deploy && npm run dev"]