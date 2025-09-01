# Backend Dockerfile - Sistema Farmácia
FROM node:22-bullseye-slim

# Instalar dependências necessárias
RUN apk add --no-cache libc6-compat

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production && npm cache clean --force

# Copiar arquivos do projeto
COPY . .

# Gerar cliente Prisma
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Alterar proprietário dos arquivos
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expor a porta
EXPOSE 3001

# Definir variáveis de ambiente de produção
ENV NODE_ENV=production
ENV PORT=3001

# Comando para iniciar a aplicação
CMD ["npm", "start"]