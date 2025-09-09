# Sistema de Controle de Farmácia

![Version](https://img.shields.io/badge/version-2.1.0-blue.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)
![Node.js](https://img.shields.io/badge/Node.js-22-green.svg)
![React](https://img.shields.io/badge/React-18.2-blue.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)
![Docker](https://img.shields.io/badge/Docker-ready-brightgreen.svg)

Sistema completo para gestão de farmácias com conformidade regulatória ANVISA, desenvolvido com **Express.js + TypeScript** no backend e **React 18** no frontend. Implementa **Clean Architecture** e **Domain Driven Design (DDD)** para garantir alta qualidade, manutenibilidade e aderência às normas brasileiras de farmácia.

## Visão Geral

O Sistema de Controle de Farmácia é uma solução moderna e abrangente para gerenciar todos os aspectos operacionais de uma farmácia, desde vendas de balcão até medicamentos controlados, respeitando integralmente as exigências regulamentares da ANVISA.

### Principais Características

- **Conformidade ANVISA**: Classificação completa de medicamentos (Listas A1-C5), validações automáticas e controle de receituário
- **Hierarquia de Usuários**: 5 níveis de acesso (Administrador, Gerente, Farmacêutico, Vendedor, PDV/Caixa)
- **Sistema de Vendas Assistidas**: Permite vendas simplificadas de medicamentos controlados com auditoria completa
- **Gestão Completa**: Clientes com sistema de crédito, produtos, estoque, fornecedores e promoções
- **Auditoria e Compliance**: Logs detalhados de todas as operações para supervisão farmacêutica
- **Segurança Avançada**: Autenticação JWT com refresh tokens, controle de acesso granular

## Como Executar o Projeto

### Pré-requisitos

- **Docker** 20.10+ e **Docker Compose** 2.0+
- **Git** para clonar o repositório

### Execução com Docker (Recomendado)

```bash
# Clonar o repositório
git clone <url-do-repositorio>
cd farmacia

# Criar arquivo de ambiente (se não existir)
cp .env.example .env

# Construir e subir os serviços
docker-compose -f docker-compose.dev.yml up -d --build

# Verificar status dos serviços
docker ps
```

### URLs de Acesso

| Serviço | URL | Descrição |
|---------|-----|-----------|
| **Frontend** | http://localhost:3000 | Interface React |
| **Backend API** | http://localhost:3001/api | API REST Express.js |
| **Health Check** | http://localhost:3001/health | Status da aplicação |

## Credenciais para Testes

### Sistema Hierárquico de Usuários

| Perfil | Login | Senha | Acesso |
|--------|-------|-------|---------|
| **Administrador** | `admin` | `admin123` | Acesso total ao sistema |
| **Gerente** | `gerente` | `gerente123` | Gestão operacional, criação de usuários |
| **Farmacêutico** | `farmaceutico` | `farmaceutico123` | Vendas com receita médica |
| **Vendedor** | `vendedor` | `vendedor123` | Vendas sem receita, venda assistida |
| **PDV/Caixa** | `pdv` | `pdv123` | Finalização de vendas |

### Controle de Acesso por Módulo

#### Administrador
- ✅ **Usuários**: Gerenciamento completo, criação até nível Gerente
- ✅ **Relatórios**: Analytics completos e dashboards
- ✅ **Configurações**: Sistema completo

#### Gerente
- ✅ **Operações**: Produtos, estoque, fornecedores, promoções
- ✅ **Usuários**: Criar Farmacêutico, Vendedor, PDV
- ✅ **Vendas**: Todas as modalidades

#### Farmacêutico
- ✅ **Vendas com Receita**: Medicamentos controlados
- ✅ **Validação**: Receitas médicas e documentos
- ✅ **Consultas**: Produtos e estoque

#### Vendedor
- ✅ **Vendas sem Receita**: Produtos de venda livre
- ✅ **Venda Assistida**: Controlados com justificativa
- ✅ **Clientes**: Cadastro e gestão

#### PDV/Caixa
- ✅ **Finalização**: Processar pagamentos
- ✅ **Visualização**: Vendas em andamento
- ✅ **Consulta**: Preços (somente leitura)

## Sistema de Vendas Assistidas

Para farmácias menores que não possuem farmacêutico presencial em tempo integral, o sistema implementa **vendas assistidas** de medicamentos controlados:

- **Vendedores e PDV** podem realizar vendas de controlados mediante justificativa obrigatória
- **Auditoria Completa**: Todas as vendas assistidas são registradas para supervisão farmacêutica
- **Rastreabilidade**: Logs detalhados com data, usuário, produto e justificativa
- **Conformidade**: Atende regulamentação para estabelecimentos de porte menor

## Logs de Auditoria

O sistema mantém auditoria completa de todas as operações críticas:

### Vendas Controladas
- Data e hora da transação
- Usuário responsável (vendedor/farmacêutico)
- Cliente e dados do paciente
- Produtos controlados vendidos
- Receita médica (quando aplicável)
- Justificativa (vendas assistidas)

### Relatórios de Auditoria
- **Vendas por Período**: Filtros por data, usuário, tipo
- **Medicamentos Controlados**: Top produtos, classificação ANVISA
- **Vendas Assistidas**: Relatório específico para supervisão
- **Resumo Executivo**: Estatísticas consolidadas

### Acesso aos Logs
- **Administrador**: Acesso completo a todos os relatórios
- **Gerente**: Relatórios operacionais
- **Farmacêutico**: Vendas controladas e assistidas

## Arquitetura Técnica

### Stack Tecnológico

**Backend:**
- **Framework**: Express.js 4.18 + TypeScript 5.0
- **Arquitetura**: Clean Architecture + Domain Driven Design
- **ORM**: Prisma 5.0 (type-safe)
- **Banco**: PostgreSQL 15
- **Autenticação**: JWT + Refresh Tokens
- **Logging**: Winston com rotação de logs

**Frontend:**
- **Framework**: React 18.2 + TypeScript 5.0
- **Styling**: Tailwind CSS 3.4
- **Estado**: React Query + Context API
- **Build**: Create React App

### Estrutura do Projeto

```
farmacia/
├── backend/                    # API Express.js
│   ├── src/
│   │   ├── domain/            # Entidades e regras de negócio
│   │   ├── application/       # Services e casos de uso
│   │   ├── infrastructure/    # Banco de dados e integrações
│   │   └── presentation/      # Controllers e rotas
│   └── prisma/                # Schema e migrations
├── frontend/                  # Interface React
│   └── src/
│       ├── components/        # Componentes reutilizáveis
│       ├── pages/            # Páginas da aplicação
│       └── services/         # Comunicação com API
└── tests/                     # Testes E2E
```

## Status dos Módulos

### ✅ Implementados e Funcionais

- **🔐 Autenticação**: JWT com refresh, hierarquia de usuários
- **👥 Usuários**: CRUD completo com validação hierárquica
- **👤 Clientes**: Gestão com sistema de crédito
- **💊 Produtos**: Classificação ANVISA, medicamentos controlados
- **🛒 Vendas**: Balcão, controlada e assistida
- **📦 Estoque**: Movimentações e alertas
- **🏪 Fornecedores**: Cadastro e gestão
- **🎁 Promoções**: Engine de descontos
- **📊 Auditoria**: Logs e relatórios de compliance

### 🔄 Em Desenvolvimento

- **📱 Interface Mobile**: Versão responsiva otimizada
- **📈 Analytics Avançados**: Dashboards executivos
- **🔔 Notificações**: Sistema de alertas em tempo real

## API Endpoints

### Autenticação
```bash
POST /api/auth/login          # Login do usuário
POST /api/auth/refresh        # Renovar token
POST /api/auth/logout         # Logout
GET  /api/auth/me            # Dados do usuário logado
```

### Vendas
```bash
GET  /api/vendas             # Listar vendas
POST /api/vendas             # Criar nova venda
GET  /api/vendas/:id         # Detalhes da venda
```

### Auditoria
```bash
GET  /api/auditoria/vendas-controladas    # Vendas de controlados
GET  /api/auditoria/resumo                # Resumo executivo
GET  /api/auditoria/vendas-assistidas     # Relatório de vendas assistidas
```

## Desenvolvimento

### Executar Localmente

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm start
```

### Comandos Úteis

```bash
# Banco de dados
npx prisma studio              # Interface visual
npx prisma migrate dev         # Aplicar migrations
npx prisma db seed            # Popular dados iniciais

# Build e deploy
npm run build                  # Build do projeto
npm run lint                   # Verificar código
```

## Segurança e Compliance

- **ANVISA**: Classificação completa de medicamentos
- **Receituário**: Controle de receitas especiais e controladas
- **Auditoria**: Logs detalhados para fiscalização
- **Segurança**: JWT, hash bcrypt, validações rigorosas
- **LGPD**: Controle de dados pessoais

---

**Desenvolvido para modernizar a gestão de farmácias no Brasil com conformidade regulatória total.**