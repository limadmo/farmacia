# Dockerfile único para deploy no Coolify
# Este arquivo constrói apenas o backend API

FROM node:22-slim

# Instalar dependências do sistema (OpenSSL para Prisma)
RUN apt-get update && apt-get install -y \
    openssl \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Diretório de trabalho
WORKDIR /app

# Copiar todos os arquivos do backend
COPY backend/package*.json ./

# Debug - verificar se package.json foi copiado
RUN ls -la /app/

# Instalar dependências
RUN npm install

# Copiar código fonte do backend
COPY backend/. ./

# Debug - verificar estrutura após copiar tudo
RUN ls -la /app/

# Gerar Prisma client
RUN npx prisma generate

# Porta da API
EXPOSE 3001

# Comando para produção
CMD ["npm", "run", "dev"]