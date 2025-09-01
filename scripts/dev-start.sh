#!/bin/bash

# Script para iniciar desenvolvimento com reset completo
# Conforme regra: sempre resetar em desenvolvimento

set -e

echo "🚀 Iniciando ambiente de desenvolvimento..."
echo "========================================="

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Subir banco de dados
echo -e "${YELLOW}📊 1. Subindo banco PostgreSQL...${NC}"
docker-compose -f docker-compose.dev.yml up -d db-dev

# Aguardar banco estar pronto
echo -e "${YELLOW}⏳ Aguardando banco estar pronto...${NC}"
sleep 5

# 2. Reset completo + seed
echo -e "${YELLOW}🗄️  2. Reset completo do banco + seed...${NC}"
cd backend
npm run db:reset
cd ..

# 3. Subir backend
echo -e "${YELLOW}🖥️  3. Subindo backend...${NC}"
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# 4. Subir frontend
echo -e "${YELLOW}🌐 4. Subindo frontend...${NC}"
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================="
echo -e "${GREEN}🎉 Ambiente iniciado com sucesso!${NC}"
echo ""
echo "🔗 URLs disponíveis:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo "   API:      http://localhost:3001/api"
echo ""
echo "👥 Usuários para teste:"
echo "   admin/admin123 (Administrador)"
echo "   gerente/gerente123 (Gerente)"
echo "   farmaceutico/farmaceutico123 (Farmacêutico)"
echo "   vendedor/vendedor123 (Vendedor)" 
echo "   pdv/pdv123 (PDV/Caixa)"
echo ""
echo "⚡ Para parar: Ctrl+C"
echo "========================================="

# Aguardar sinal para parar
wait