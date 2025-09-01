# Frontend Dockerfile - Sistema Farmácia
# Multi-stage build para otimizar tamanho da imagem

# Estágio 1: Build da aplicação
FROM node:18-alpine AS builder

# Instalar dependências necessárias
RUN apk add --no-cache libc6-compat

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Copiar código fonte
COPY . .

# Build da aplicação React
RUN npm run build

# Estágio 2: Servidor de produção com NGINX
FROM nginx:alpine

# Remover configuração padrão do NGINX
RUN rm -rf /usr/share/nginx/html/*

# Copiar build da aplicação para o NGINX
COPY --from=builder /app/build /usr/share/nginx/html

# Copiar configuração customizada do NGINX
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expor a porta 80
EXPOSE 80

# Comando para iniciar o NGINX
CMD ["nginx", "-g", "daemon off;"]