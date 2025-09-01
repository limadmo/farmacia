#!/bin/bash

# Script de pre-commit para Farmácia Backend
# Executa reset completo + testes + lint antes de commits

set -e

echo "🚀 Iniciando validação pre-commit..."
echo "======================================"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cd backend

# 1. Reset completo do banco (regra: sempre testar com dados frescos)
echo -e "${YELLOW}📊 1. Executando reset completo do banco...${NC}"
npm run db:reset
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro no reset do banco!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Reset do banco concluído${NC}"

# 2. Lint check
echo -e "${YELLOW}🔍 2. Executando lint...${NC}"
npm run lint
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro no lint! Corrija os problemas antes do commit.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Lint passou${NC}"

# 3. TypeScript check
echo -e "${YELLOW}🔧 3. Executando typecheck...${NC}"
npm run typecheck
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro no typecheck! Corrija os tipos antes do commit.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ TypeCheck passou${NC}"

# 4. Testes unitários
echo -e "${YELLOW}🧪 4. Executando testes unitários...${NC}"
npm run test:unit
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Testes unitários falharam!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Testes unitários passaram${NC}"

# 5. Testes de integração
echo -e "${YELLOW}🔗 5. Executando testes de integração...${NC}"
npm run test:integration
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Testes de integração falharam!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Testes de integração passaram${NC}"

# 6. Build check
echo -e "${YELLOW}🏗️  6. Verificando build...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro no build!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build passou${NC}"

echo ""
echo "======================================"
echo -e "${GREEN}🎉 Todas as validações passaram!${NC}"
echo -e "${GREEN}✅ Código pronto para commit${NC}"
echo "======================================"