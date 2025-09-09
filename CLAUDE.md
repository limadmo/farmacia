# Regras do Projeto Farmácia

## Estrutura do Projeto
```
farmacia/
├── backend/     # API Express.js + TypeScript
├── frontend/    # React + TypeScript  
├── scripts/     # Scripts de automação
└── CLAUDE.md   # Este arquivo (regras para todo projeto)
```

## Idioma de Comunicação (REGRA ABSOLUTA)

**SEMPRE comunicar em PT-BR (Português Brasileiro)**
- Todas as respostas devem ser em português brasileiro
- Manter consistência no idioma independente do modelo usado
- Comentários em código SEMPRE em português brasileiro
- Documentação do projeto em português brasileiro
- Mensagens de commit em português brasileiro

## Padrão de Comentários em Código (OBRIGATÓRIO)

**SEMPRE comentar o código criado ou modificado**
- Todos os comentários em PT-BR
- Comentar funções explicando seu propósito
- Comentar lógica complexa ou não óbvia
- Comentar parâmetros e retornos quando necessário
- Usar comentários JSDoc/TSDoc para documentação de funções

### Exemplo de padrão:
```typescript
/**
 * Registra uma nova movimentação no estoque
 * @param data - Dados da movimentação incluindo produto, tipo e quantidade
 * @returns Promise com a movimentação criada
 */
async function registrarMovimentacao(data: MovimentacaoData) {
  // Valida se o produto existe antes de registrar
  const produto = await validarProduto(data.produtoId);
  
  // Calcula o novo saldo baseado no tipo de movimentação
  const novoSaldo = calcularNovoSaldo(produto.estoque, data);
  
  // Cria o registro no banco de dados
  return await prisma.movimentacao.create({...});
}
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
- `restart developer` - **COMANDO ABSOLUTO**: Mata todos containers/processos, deixa só PostgreSQL no Docker, sobe backend+frontend local com hotreload, reset completo de migrations+seed
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

### Comandos de Desenvolvimento (REGRA ABSOLUTA)

**ÚNICO PROCESSO DOCKER NO DESENVOLVIMENTO LOCAL DEVE SER O POSTGRES**

#### Comandos de Limpeza Individual:

- `clean docker` - Para todos containers Docker e remove
- `clean processes` - Mata processos Node.js e libera portas
- `clean system` - Limpa sistema Docker (volumes, imagens órfãs)

#### Comandos de Setup Individual:

- `start postgres` - Sobe apenas PostgreSQL no Docker
- `setup database` - Aplica migrations e executa seed
- `start backend` - Inicia backend com nodemon e hotreload
- `start frontend` - Inicia frontend com React dev server

#### Comando Completo:

- `restart developer` - Executa sequência completa: clean + setup + start

## Git Commit Policy

**NÃO incluir Claude como co-autor nos commits**
- Commits devem ter apenas o autor humano
- Remover linhas "Co-Authored-By: Claude"
- Manter apenas mensagens de commit claras e concisas

## Configuração da API Frontend (CRÍTICO PARA DEPLOY)

### ⚠️ NUNCA ALTERE O api.ts SEM CONSIDERAR PRODUÇÃO!

O arquivo `frontend/src/services/api.ts` DEVE sempre usar:
```typescript
baseURL: process.env.REACT_APP_API_URL || '/api'
```

### Por quê?
- **Desenvolvimento Local**: Usa `/api` com proxy do React (definido em package.json)
- **Produção (Docker)**: Usa `REACT_APP_API_URL` definida no build do Docker

### Como Funciona:

#### Desenvolvimento Local (localhost:3000)
1. Frontend usa `/api` como baseURL (fallback)
2. Proxy no `package.json` redireciona `/api/*` → `http://localhost:3001`
3. Backend roda na porta 3001 exposta localmente

#### Produção (Docker/Dokploy)
1. Dockerfile define `REACT_APP_API_URL=https://api-dev.diegolima.dev/api`
2. Frontend usa a URL completa da API
3. Não há proxy - requisições vão direto para o domínio da API

### ❌ ERROS COMUNS A EVITAR:
- **NUNCA** hardcode apenas `/api` no `api.ts` - quebra produção!
- **NUNCA** remova `process.env.REACT_APP_API_URL` - quebra produção!
- **NUNCA** use apenas a URL completa - quebra desenvolvimento local!

### ✅ SEMPRE:
- Mantenha `process.env.REACT_APP_API_URL || '/api'`
- Teste localmente com `npm start` antes de fazer push
- Verifique se o proxy está configurado em `package.json`

### Configurações Relacionadas:

**frontend/package.json:**
```json
"proxy": "http://localhost:3001"
```

**docker-compose.dev.yml:**
```yaml
backend:
  ports:
    - "3001:3001"  # Porta exposta para desenvolvimento
  environment:
    CORS_ORIGIN: http://localhost:3000,https://farmacia-dev.diegolima.dev
```

**frontend/Dockerfile (build args):**
```dockerfile
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL
```

## Padrão de Paginação Inteligente (OBRIGATÓRIO)

**SEMPRE usar o componente `Pagination.tsx` em todos os grids do sistema**

### Regras de Uso:
- **NUNCA** criar outros componentes de paginação
- **SEMPRE** usar `Pagination` para listas/tabelas com muitos itens
- **MANTER** consistência visual em todas as páginas

### Interface Padrão:
```typescript
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}
```

### Exemplo de Uso:
```tsx
import Pagination from '../components/Pagination';

// No componente
<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  totalItems={totalItems}
  onPageChange={handlePageChange}
  loading={loading}
/>
```

### Características do Componente:
- **Padrão inteligente**: "1, 2, 3, [INPUT], n-2, n-1, n" para muitas páginas
- **Input de navegação**: permite ir direto para página específica
- **Mobile responsivo**: versão simplificada para dispositivos móveis  
- **Design consistente**: alinhado com todo o sistema
- **6 páginas ou menos**: mostra todas as páginas
- **Mais de 6 páginas**: usa padrão inteligente com input

### ❌ NUNCA fazer:
- Criar componentes customizados de paginação
- Usar soluções diferentes em páginas diferentes
- Modificar o design sem considerar todo o sistema

### ✅ SEMPRE fazer:
- Usar `Pagination.tsx` em qualquer grid
- Manter interface padrão
- Testar responsividade mobile/desktop
- Documentar mudanças se necessário no componente principal

## Deploy & Infraestrutura (DOKPLOY) 🚀

### Ambientes de Deploy

**Desenvolvimento (Auto-Deploy)**
- **Frontend**: https://farmacia-dev.diegolima.dev
- **Backend API**: https://api-dev.diegolima.dev
- **Branch**: `develop` (deploy automático ao fazer push)
- **Plataforma**: Dokploy com Docker Compose

### Variáveis de Ambiente (.env)

**⚠️ ATENÇÃO**: Nunca commitar valores reais! Use sempre valores fake na documentação.

```env
# Ambiente
NODE_ENV=development

# Database
DB_PASSWORD=fake-db-password-123
DB_NAME=farmacia_dev

# Segurança
JWT_SECRET=fake-jwt-secret-key-super-seguro

# Domínios
FRONTEND_DOMAIN=farmacia-dev.diegolima.dev
API_DOMAIN=api-dev.diegolima.dev
```

### Configuração Docker Compose

**Arquivos principais:**
- `docker-compose.dev.yml` - Ambiente de desenvolvimento/Dokploy
- `backend/Dockerfile` - Build do backend
- `frontend/Dockerfile` - Build do frontend

**Arquitetura de Serviços:**
```yaml
services:
  postgres:    # Database PostgreSQL 15
  backend:     # API Node.js/Express (porta 3001)
  frontend:    # React/Nginx (SEM porta exposta - acesso via Traefik)
```

### Processo de Deploy

1. **Commit e Push**
   ```bash
   git add .
   git commit -m "feat: nova funcionalidade"
   git push origin develop
   ```

2. **Deploy Automático (Dokploy)**
   - Detecta push na branch `develop`
   - Clona repositório
   - Build com Docker Compose
   - Deploy via Traefik

3. **Verificação**
   - Acesse https://farmacia-dev.diegolima.dev
   - Faça login como ADMINISTRADOR para ver todos recursos

### Troubleshooting de Deploy 🔧

#### Problema: "port already allocated"
**Causa**: Porta já está sendo usada no servidor
**Solução**: 
```yaml
# Remover exposição de porta do frontend
frontend:
  # ports:            # REMOVER ESTA LINHA
  #   - "3000:80"     # REMOVER ESTA LINHA
```

#### Problema: Funcionalidade não aparece após deploy
**Possíveis causas e soluções:**

1. **Arquivos não commitados**
   ```bash
   git status              # Verificar arquivos pendentes
   git add .               # Adicionar todos
   git commit -m "fix: adicionar arquivos faltantes"
   git push origin develop
   ```

2. **Branch incorreta**
   ```bash
   git branch              # Verificar branch atual
   git checkout develop    # Mudar para develop
   git merge feature/xyz   # Merge da feature
   git push origin develop
   ```

3. **Permissões de usuário**
   - Relatórios: Apenas ADMINISTRADOR
   - Promoções: ADMINISTRADOR e GERENTE
   - Verificar em `backend/src/constants/permissions.ts`

4. **Cache do browser**
   - Force refresh: `Ctrl+F5` ou `Cmd+Shift+R`
   - Limpar localStorage se necessário

5. **Build cache no Docker**
   - Aguardar rebuild completo (pode levar 2-3 minutos)
   - Verificar logs do Dokploy

#### Problema: API não conecta
**Verificar:**
- `CORS_ORIGIN` no backend inclui domínio do frontend
- `REACT_APP_API_URL` está correto no build
- Certificados SSL do Traefik

#### Problema: Migrations não rodaram
**Solução:**
```bash
# No container do backend
docker exec -it farmacia_backend_dev sh
npx prisma migrate deploy
npx prisma db seed
```

### Logs e Monitoramento 📊

**Acessar logs:**
```bash
# Logs do backend
docker logs farmacia_backend_dev -f

# Logs do frontend
docker logs farmacia_frontend_dev -f

# Logs do PostgreSQL
docker logs farmacia_postgres_dev -f
```

**Health checks:**
- Backend: https://api-dev.diegolima.dev/health
- Frontend: Status via Traefik dashboard

### Rollback de Emergência 🚨

Se algo der muito errado:

1. **Reverter último commit**
   ```bash
   git revert HEAD
   git push origin develop
   ```

2. **Deploy de versão anterior**
   ```bash
   git checkout <commit-hash-anterior>
   git push --force origin develop
   ```

3. **Rebuild completo**
   - No Dokploy: Stop → Remove → Deploy

### Checklist Pré-Deploy ✅

Antes de fazer push para `develop`:

- [ ] Testes passando: `npm test`
- [ ] Lint sem erros: `npm run lint`
- [ ] Build local funcionando: `npm run build`
- [ ] Variáveis de ambiente configuradas
- [ ] Permissões de usuário corretas
- [ ] Documentação atualizada

### Contatos de Emergência 📞

- **Dokploy Admin**: [URL do painel admin]
- **Logs centralizados**: [Se houver]
- **Monitoramento**: [Se houver]