# Stage 1: Builder
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY . .

# Build arguments para variáveis de ambiente
ARG REACT_APP_API_URL
ARG REACT_APP_ENV=production

# Definir variáveis de ambiente para o build
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_ENV=$REACT_APP_ENV

# Build da aplicação
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Copiar configuração do nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar arquivos buildados do stage anterior
COPY --from=builder /app/build /usr/share/nginx/html

# Expor porta 80
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost || exit 1

# Iniciar nginx
CMD ["nginx", "-g", "daemon off;"]