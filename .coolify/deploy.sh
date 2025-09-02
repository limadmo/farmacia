#!/bin/bash
# Script de deploy customizado para Coolify

set -e

echo "🚀 Iniciando deploy no Coolify..."

# Verificar se o arquivo docker-compose.coolify.yml existe
if [ ! -f "docker-compose.coolify.yml" ]; then
    echo "❌ Erro: docker-compose.coolify.yml não encontrado"
    exit 1
fi

# Usar docker compose v2 com o arquivo correto
echo "📦 Construindo imagens Docker..."
docker compose -f docker-compose.coolify.yml build --no-cache

echo "🔄 Executando migrações do Prisma..."
docker compose -f docker-compose.coolify.yml run --rm backend npx prisma migrate deploy

echo "🌱 Aplicando seed no banco de dados..."
docker compose -f docker-compose.coolify.yml run --rm backend npx prisma db seed

echo "🚀 Iniciando serviços..."
docker compose -f docker-compose.coolify.yml up -d

echo "✅ Deploy concluído com sucesso!"
echo "📌 URLs configuradas:"
echo "   - Backend API: https://api.diegolima.dev"
echo "   - Frontend: https://farmacia.diegolima.dev"