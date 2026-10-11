# Prompt para o Claude Code — Reposicionamento do Entrega Pra Mim (Fase 1)

> Como usar: abra o Claude Code na raiz do projeto, entre em plan mode (Shift+Tab) e cole tudo o que está abaixo da linha. Ele vai planejar a Etapa 0, parar e esperar sua aprovação. Depois, cada etapa termina num ponto de parada para você revisar antes da próxima.

---

## Contexto

Você vai trabalhar no **Entrega Pra Mim (EPM)**: Next.js 16 (App Router) + TypeScript + Prisma 5 + MySQL 8 + NextAuth 4 + Redis opcional + Vitest, com deploy em Docker.

O produto está mudando de modelo de negócio. Antes de qualquer coisa, leia nesta ordem:

1. `docs/PLANO_NEGOCIO.md`: a decisão de negócio. Este é o documento que manda.
2. `docs/PLANO_EVOLUCAO.md`: o roadmap técnico anterior. Ele continua valendo nos princípios (monólito modular, migrations aditivas, máquina de estados, auditoria), mas a **ordem das prioridades mudou**.
3. `docs/CORRECOES_OPERACIONAIS.md`, `prisma/schema.prisma`, `src/lib/auth-helpers.ts`, `src/lib/pedido-permissions.ts`, `src/lib/pricing.ts`, `src/lib/pagamentos.ts`, `src/lib/alocacao.ts`, `src/middleware.ts` e os testes em `tests/`.

### A mudança, em uma frase

O EPM deixa de ser um **marketplace** (a plataforma liga empresa, cliente e motoboy e fica com 15% da corrida) e vira um **SaaS multi-tenant para centrais de motofrete**. Cada central (organização) usa o sistema para despachar os próprios motoboys, atender as empresas clientes dela e mostrar rastreio com a própria marca. A central paga mensalidade fixa por plano, e a plataforma não tira comissão da corrida.

### Novo mapa de papéis

| Hoje | Passa a ser |
| --- | --- |
| `ADMIN` global | `SUPERADMIN` da plataforma (Impulsio), que vê todas as organizações. Dentro de cada org: `OWNER` (dono da central) e `DISPATCHER` (despachante/operador) |
| `CLIENTE` | Empresa atendida pela central (farmácia, loja, escritório), com membership `CLIENT` numa organização |
| `MOTOBOY` | Motoboy com membership `DRIVER` numa organização. A aprovação (`AprovacaoMotoboy`) passa a ser por organização |
| Destinatário | Pessoa sem login, que acompanha pelo link público de rastreio |

## Regras de trabalho (valem para todas as etapas)

- Trabalhe numa branch `feat/saas-multitenant` e faça um commit por etapa (Conventional Commits, em português, como o histórico atual).
- **Nunca** toque no banco de produção nem rode deploy. Use só banco local ou de teste.
- Migrations sempre **aditivas** (expand → backfill → contract), seguindo a seção 4.2 do `PLANO_EVOLUCAO.md`. Nada de `prisma db push`. Cada migration nova precisa de um backfill que crie uma organização padrão ("Central Principal") e vincule a ela todos os dados existentes, para que a instalação atual continue funcionando.
- Ao fim de cada etapa, rode `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`. Se algum falhar, corrija antes de parar.
- Não remova código de pagamento simulado, ledger nem chat. Eles saem do caminho principal, mas ficam no código.
- Ao fim de cada etapa, **pare** e me entregue um resumo em dois níveis:
  - **Na prática:** o que muda para o dono da central, o motoboy e o cliente, em linguagem simples.
  - **Técnico:** arquivos, modelos, rotas e migrations alterados, além dos testes adicionados.
- Registre cada etapa no `CHANGELOG.md` nesse mesmo formato de dois níveis.
- Se encontrar uma decisão de produto que este prompt não cobre, pergunte. Não invente.

## Etapas

### Etapa 0 — Diagnóstico e plano (sem alterar código)

Leia os arquivos listados acima e me devolva:

- Um mapa de todos os lugares onde `role`, `clienteId`, `motoboyId` e a taxa de 15% (`taxaPlataforma` em `src/lib/pagamentos.ts`) são usados.
- Todas as constraints `@unique` globais que viram problema em multi-tenant (por exemplo, `Motoboy.cnh`, `Motoboy.veiculoPlaca`, `User.email`) e a sua proposta para cada uma.
- O plano detalhado das Etapas 1 a 6, com a lista de migrations.

**Pare e espere minha aprovação.**

### Etapa 1 — Fundação multi-tenant

**Na prática:** várias centrais usam o mesmo sistema, e nenhuma vê dados da outra.

- Crie os modelos `Organization` (nome, slug único, plano, status), `OrganizationMember` (userId, organizationId, papel por org: `OWNER`, `DISPATCHER`, `CLIENT`, `DRIVER`) e `OrganizationSettings` (marca, taxa de plataforma opcional com padrão 0, fuso).
- Acrescente `organizationId` em `Motoboy`, `Cliente`, `Endereco`, `Pedido`, `Pagamento`, `Avaliacao`, `Mensagem`, `TransacaoMotoboy`, `SaldoMotoboy` e `AuditLog`, com índices compostos `(organizationId, ...)` nas consultas de lista.
- Ponha a organização ativa na sessão do NextAuth (`activeOrganizationId` + papel na org). Um usuário pode pertencer a mais de uma org, então crie um seletor simples de org.
- Reescreva os helpers de `auth-helpers.ts` e `pedido-permissions.ts` para que **toda** leitura e escrita filtre pela org ativa. O ideal é um helper único, `requireOrgAccess`, e nenhuma query de negócio sem `organizationId`.
- Converta o `ADMIN` atual em `SUPERADMIN` e mantenha a compatibilidade com o backfill.
- **Teste obrigatório:** uma suíte com duas organizações provando que a org A não lê, não altera, não lista e não baixa comprovante da org B, em todas as rotas de `src/app/api`.

**Pare.**

### Etapa 2 — Preço por central e limites do plano

**Na prática:** cada central monta a própria tabela de preço, e o sistema respeita o limite do plano contratado.

- Troque as constantes globais de `src/lib/pricing.ts` (`PRECO_POR_KM`, `MULTIPLICADORES`) por um modelo `PricingRule` por organização: preço por km, valor mínimo, multiplicador por tipo de serviço e, opcionalmente, preço fixo por bairro. Crie também uma tela de configuração no dashboard.
- Congele o preço aceito no pedido (já existe `valorTotal`; garanta que ele nunca seja recalculado depois de criado).
- Crie o enum de plano (`ESSENCIAL`, `CENTRAL`, `MARCA_PROPRIA`) com limites de motoboys e de entregas por mês. Verifique os limites no cadastro de motoboy e no `POST /api/pedidos`, com mensagem clara quando o limite for estourado. Os valores estão no `PLANO_NEGOCIO.md`.
- Crie a tabela `UsageCounter` (org, mês, entregas, chamadas ao Google Maps) e incremente o contador em `src/lib/google-maps.ts`. Adicione cache de cotação por par origem–destino (Redis, com fallback em memória).

**Pare.**

### Etapa 3 — Link público de rastreio e portal da empresa cliente

**Na prática:** o destinatário acompanha a entrega sem criar conta, e a empresa cliente da central abre pedidos sozinha.

- Adicione `trackingToken` (aleatório, 32+ caracteres, único) em `Pedido` e crie a página pública `/r/[token]`. Ela mostra só status, mapa com a posição do motoboy durante a entrega, ETA, foto do comprovante após a entrega e a marca da central. Não mostre telefone, documento nem endereço completo de terceiros. Acrescente essa rota em `src/lib/public-api.ts` com rate limit por IP.
- Adapte o painel `/cliente` para ser o portal da empresa cliente dentro da organização. O dono da central convida a empresa por e-mail ou link (convite com expiração).
- Mude o cadastro em `/registro`: deixa de ser público e aberto, e passa a ser por convite da central (para motoboy e para empresa cliente). Mantenha um cadastro público apenas para "criar minha central", que gera a org e o OWNER.

**Pare.**

### Etapa 4 — Fechamento do dia/mês

**Na prática:** o dono da central sabe em minutos quantas corridas cada motoboy fez, quanto pagar a cada um e quanto cobrar de cada empresa cliente.

- Crie a página `/dashboard/fechamento` com filtro por período, com duas visões: **por motoboy** (corridas, km, valor) e **por empresa cliente** (corridas e valor a cobrar).
- Adicione exportação em CSV das duas visões.
- O relatório só lê `Pedido` e `Pagamento`; não movimenta saldo nem dinheiro. Use `src/lib/money.ts` para os valores.

**Pare.**

### Etapa 5 — Marca da central (white-label básico)

**Na prática:** o rastreio e o app aparecem com o logo, o nome e a cor da central.

- Em `OrganizationSettings`, guarde logo (upload validado como o do comprovante), nome de exibição e cor primária.
- Aplique a marca no link público `/r/[token]`, no login da org (`/o/[slug]/login`) e no PWA (`manifest.json` gerado por rota, por org).
- Restrinja o recurso ao plano `MARCA_PROPRIA`. Nos outros planos, aparece a marca do EPM.

**Pare.**

### Etapa 6 — Despacho com oferta

**Na prática:** o sistema oferece a corrida ao melhor motoboy e, se ele não aceitar em até 90 segundos, passa para o próximo. Se ninguém aceitar, o despachante é avisado.

- Crie `DispatchOffer` (pedido, motoboy, status, expiresAt) usando o score já existente em `src/lib/alocacao.ts`.
- O aceite deve ser atômico (reaproveite o lock de `pedido-transaction.ts`). A expiração e a reoferta rodam num job simples (rota chamada por cron ou loop no worker, a escolher na Etapa 0).
- Crie uma fila de "sem motoboy" no dashboard para atribuição manual.
- **Teste obrigatório:** concorrência com dois motoboys aceitando a mesma oferta (só um consegue); expiração gera nova oferta; após N tentativas, o pedido cai na fila manual.

**Pare.**

### Etapa 7 — Textos e documentação

- Reescreva a landing (`src/app/page.tsx`) para falar com o dono da central: "Sua central despachando, rastreando e fechando o dia num sistema só, com a sua marca, por preço fixo. Sem comissão por corrida." Tire a calculadora de preço voltada ao consumidor final, ou transforme-a numa demonstração para a central.
- Atualize `README.md`, `docs/ONE_PAGER.md` e `docs/PITCH_INVESTIDORES.md` para o novo modelo. Remova os números de TAM/SAM sem fonte e a "taxa de 10–15% por corrida".
- Atualize `docs/PLANO_EVOLUCAO.md` com a nova ordem: multi-tenant → preço/limites → rastreio público → fechamento → marca → despacho → (fase 2) gateway Pix, integração Pedeli, ETA real, SSE.

## Fora de escopo nesta fase

Não implemente: gateway de pagamento real (Pix/cartão), split, ledger novo, saque do motoboy, apps nativos, marketplace aberto ao público, integração com o Pedeli, WebSocket/SSE nem cobrança automática da mensalidade das centrais. Se alguma etapa parecer exigir um desses itens, pare e me pergunte.

## Comece agora pela Etapa 0.
