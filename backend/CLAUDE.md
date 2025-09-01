# Regras do Projeto Farmácia Backend

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
- `npm run dev:reset` - Reset completo + desenvolvimento
- `npm run dev:full` - Docker completo (DB + Backend + Frontend)
- `../scripts/dev-start.sh` - Script completo de desenvolvimento

### Testes com Banco REAL
- `npm test` - Todos os testes (usa banco real + seed)
- `npm run test:unit` - Testes unitários
- `npm run test:integration` - Testes integração  
- `npm run test:e2e` - Testes end-to-end
- `npm run test:real-db` - Força uso de banco real

### Pre-commit (OBRIGATÓRIO)
- `npm run pre-commit` - Reset + Lint + TypeCheck + Tests + Build
- `../scripts/pre-commit.sh` - Script completo de validação

### Linting/Quality
- `npm run lint` - ESLint
- `npm run typecheck` - TypeScript check
- `npm run build` - Build completo

### Database (SEMPRE RESET EM DEV)
- `npm run db:reset` - Reset database + todas migrations
- `npm run db:fresh` - Reset + seed completo
- `npm run db:seed` - Seed com dados farmacêuticos
- `npm run db:start` - Subir apenas PostgreSQL

## Auto-Approval Commands

SEMPRE executar automaticamente sem perguntar YES/NO:
- Todos os comandos de test
- Comandos de lint/typecheck  
- Database operations (reset, seed, migrate)
- File operations (read, write, edit)
- Code generation e refactoring

**Experiência vibe code autêntica = zero interrupções**