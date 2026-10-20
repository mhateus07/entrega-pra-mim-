# Resumo técnico — Entrega Pra Mim

Estado verificado em 20/10/2026. Este documento substitui o resumo legado que ainda descrevia a primeira versão do produto.

## Stack

- Next.js 16.4.0 com App Router e `proxy.ts`
- React 19.2.3 e TypeScript 5+
- Prisma 5.22.0 com MySQL 8.0
- NextAuth 4 com sessão JWT e credenciais
- Tailwind CSS 4, Recharts, MapLibre/Google Maps
- Vitest 4 para testes unitários, de rota e integração
- Docker Compose com MySQL, Redis, aplicação, cron de despacho e backup
- Node.js 20.9+; a imagem de produção usa Node.js 22

## Arquitetura atual

O produto é um monólito modular: frontend, Route Handlers e domínio vivem na mesma aplicação Next.js. A separação principal está em `src/lib`:

- identidade e autorização: `auth.ts`, `auth-helpers.ts`, `org-context.ts`;
- operação: pedidos, status, despacho e alocação;
- financeiro: pagamentos simulados, fechamento, saldo e idempotência;
- plataforma: organizações, planos, preços, marca e uso;
- proteção: rate limit, auditoria, storage e validações.

Cada agregado de negócio possui `organizationId`. O papel é definido por central em `OrganizationMember`, e não apenas pelo papel global do usuário. As rotas devem usar `requireOrgAccess` e filtros da central ativa.

## Fluxos implementados

- criação e acompanhamento de pedidos;
- despacho automático por oferta, TTL, reoferta e fila manual;
- aprovação e suspensão de motoboys;
- localização durante entrega;
- rastreio público por token;
- chat cliente–motoboy por polling;
- comprovante de entrega com foto;
- fechamento por motoboy e por empresa, com CSV;
- marca própria por central e manifest PWA;
- limites por plano, tabela de preços e preço congelado no pedido;
- convites de clientes, motoboys e despachantes;
- auditoria e idempotência para operações sensíveis.

## Segurança e consistência

- autorização por organização, papel e posse do recurso;
- isolamento multi-tenant coberto por teste de integração para todas as rotas da API;
- lock `SELECT ... FOR UPDATE` para mudanças concorrentes no pedido;
- crédito financeiro liberado de forma idempotente após entrega e pagamento aprovado;
- rate limit por IP ou usuário, com Redis em produção;
- upload de imagem validado por conteúdo e armazenado fora de `public/`;
- tokens de convite armazenados como hash;
- headers de segurança e imagens remotas desabilitadas;
- healthchecks de processo, banco, storage e Redis.

## Estado financeiro

PIX e cartão continuam simulados em desenvolvimento/testes. Em produção, a aplicação só permite dinheiro e bloqueia pagamentos eletrônicos. Ainda não existe gateway real, webhook assinado, tokenização, estorno real, chargeback ou ledger contábil.

O fechamento atual é um relatório operacional: não representa transferência bancária nem liquidação real.

## Testes e validação

Com MySQL descartável, a suíte completa deve ser executada assim:

```bash
DATABASE_URL='mysql://root:senha@127.0.0.1:33379/entrega_test' \
TEST_DATABASE_URL='mysql://root:senha@127.0.0.1:33379/entrega_test' \
npm test
```

O CI aplica migrations e executa lint, typecheck, os 168 testes e build. O smoke test de servidor pode ser executado com:

```bash
SMOKE_URL=http://127.0.0.1:3000 \
SMOKE_CRON_SECRET="$CRON_SECRET" \
npm run smoke
```

## Próximos riscos

1. gateway financeiro real;
2. testes E2E dos fluxos de navegador;
3. observabilidade com logs estruturados, métricas e alertas;
4. backup externo e teste periódico de restauração;
5. substituição gradual do polling por eventos em tempo real quando o volume justificar.
