# Backend API Dockerfile - Sistema Farmácia
FROM node:22-slim

# Instalar dependências do sistema (OpenSSL para Prisma)
RUN apt-get update && apt-get install -y \
    openssl \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Diretório de trabalho
WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY . .

# Gerar Prisma client
RUN npx prisma generate

# Porta da API
EXPOSE 3001

# Comando para desenvolvimento
CMD ["npm", "run", "dev"]