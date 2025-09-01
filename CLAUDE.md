# Regras do Projeto Farmácia

## Estrutura do Projeto
```
farmacia/
├── backend/     # API Express.js + TypeScript
├── frontend/    # React + TypeScript  
├── scripts/     # Scripts de automação
└── CLAUDE.md   # Este arquivo (regras para todo projeto)
```

## Testing Strategy (REGRA ABSOLUTA)

**SEMPRE USE DADOS REAIS DO SEED - NUNCA MOCKS**

- Todos os testes devem usar dados concretos do seed database
- Testes de integração com database real (não mockado) 
- Dados farmacêuticos realistas e em compliance
- Setup de banco de teste com seed automático

### Por quê?
- Testes mais autênticos e confiáveis
- Validação real das regras de negócio farmacêuticas
- Detecta problemas de schema e relacionamentos
- Compliance real com regulamentações ANVISA/CFF

### Estrutura de Testes
```
- Unit tests: Com dados reais do seed
- Integration tests: Com database real seedado
- E2E tests: Com ambiente completo
```

### Setup Padrão
```typescript
beforeAll(async () => {
  prisma = await setupTestDatabase();
  await seedTestData(); // Dados farmacêuticos reais
});
```

## Build & Test Commands

### Desenvolvimento (SEMPRE COM RESET)
- `cd backend && npm run dev:reset` - Reset completo + desenvolvimento
- `cd backend && npm run dev:full` - Docker completo (DB + Backend + Frontend)
- `./scripts/dev-start.sh` - Script completo de desenvolvimento

### Testes com Banco REAL
- `cd backend && npm test` - Todos os testes (usa banco real + seed)
- `cd backend && npm run test:unit` - Testes unitários
- `cd backend && npm run test:integration` - Testes integração  
- `cd backend && npm run test:e2e` - Testes end-to-end
- `cd backend && npm run test:real-db` - Força uso de banco real

### Pre-commit (OBRIGATÓRIO)
- `cd backend && npm run pre-commit` - Reset + Lint + TypeCheck + Tests + Build
- `./scripts/pre-commit.sh` - Script completo de validação

### Linting/Quality
- `cd backend && npm run lint` - ESLint
- `cd backend && npm run typecheck` - TypeScript check
- `cd backend && npm run build` - Build completo

### Database (SEMPRE RESET EM DEV)
- `cd backend && npm run db:reset` - Reset database + todas migrations
- `cd backend && npm run db:fresh` - Reset + seed completo
- `cd backend && npm run db:seed` - Seed com dados farmacêuticos
- `cd backend && npm run db:start` - Subir apenas PostgreSQL

## Auto-Approval Commands

SEMPRE executar automaticamente sem perguntar YES/NO:
- Todos os comandos de test
- Comandos de lint/typecheck  
- Database operations (reset, seed, migrate)
- File operations (read, write, edit)
- Code generation e refactoring

**Experiência vibe code autêntica = zero interrupções**

## Git Commit Policy

**NÃO incluir Claude como co-autor nos commits**
- Commits devem ter apenas o autor humano
- Remover linhas "Co-Authored-By: Claude"
- Manter apenas mensagens de commit claras e concisas