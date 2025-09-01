#!/bin/bash
set -e

echo "🚀 Iniciando aplicação Farmácia..."

# Aguardar o PostgreSQL estar disponível
echo "⏳ Aguardando PostgreSQL..."
while ! nc -z $DB_HOST $DB_PORT; do
  echo "PostgreSQL não está pronto - aguardando..."
  sleep 2
done
echo "✅ PostgreSQL está disponível!"

# Executar migrações do Prisma
echo "🔄 Executando migrações do banco..."
npx prisma migrate deploy

# Gerar cliente Prisma (caso não tenha sido gerado)
echo "🔧 Gerando cliente Prisma..."
npx prisma generate

# Verificar se deve executar seed
if [[ "$RUN_SEED" == "true" ]]; then
    echo "🌱 Executando seed do banco..."
    npm run db:seed
    echo "✅ Seed executado com sucesso!"
fi

# Iniciar a aplicação
echo "🎯 Iniciando servidor..."
exec "$@"