#!/bin/bash

# Script para executar seed no banco de produção
# Uso: ./scripts/seed-production.sh

echo "🌱 Executando seed no banco de produção..."

# Executa o seed dentro do container backend
docker exec farmacia_backend_dev npx prisma db seed

if [ $? -eq 0 ]; then
    echo "✅ Seed executado com sucesso!"
else
    echo "❌ Erro ao executar seed. Verifique os logs."
    exit 1
fi

echo "📊 Verificando dados inseridos..."
docker exec farmacia_postgres_dev psql -U admin -d farmacia_dev -c "
    SELECT 
        (SELECT COUNT(*) FROM usuarios) as usuarios,
        (SELECT COUNT(*) FROM produtos) as produtos,
        (SELECT COUNT(*) FROM clientes) as clientes,
        (SELECT COUNT(*) FROM categorias) as categorias;
"