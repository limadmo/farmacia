#!/bin/sh
set -e

echo "🚀 Iniciando aplicação em modo: ${NODE_ENV}"

# Aguardar o banco de dados estar pronto
echo "⏳ Aguardando banco de dados..."
for i in 1 2 3 4 5; do
  if echo "SELECT 1;" | npx prisma db execute --stdin > /dev/null 2>&1; then
    echo "✅ Banco de dados conectado!"
    break
  fi
  echo "Tentativa $i/5 - Aguardando banco de dados..."
  sleep 3
done

# SEMPRE reset completo em desenvolvimento
if [ "$NODE_ENV" = "development" ]; then
  echo "🔄 DESENVOLVIMENTO: Reset completo do banco com migrations e seed"
  npx prisma migrate reset --force
  echo "✅ Reset completo executado!"
else
  # Produção: apenas deploy das migrations
  echo "📦 PRODUÇÃO: Aplicando migrations..."
  npx prisma migrate deploy
fi

# Iniciar a aplicação
echo "🚀 Iniciando servidor..."
exec "$@"