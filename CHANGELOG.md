# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

## [Não lançado] — SaaS multi-tenant para centrais de motofrete

### Etapa 5 — Marca da central (white-label básico) (2026-10-11)

**Na prática**
- Em **Painel → Marca**, o dono de uma central no plano **Marca própria** envia o logo e define o nome de exibição e a cor principal.
- A marca aparece:
  - no **link de rastreio** que o cliente final recebe;
  - na **tela de login da central** (`/o/nome-da-central/login`);
  - no **app instalado no celular** (PWA), com nome, cor e ícone da central.
- Nos planos Essencial e Central aparece a marca do Entrega Pra Mim. A tela explica que o recurso é do plano Marca própria.
- Toda central ganha um **link de acesso próprio** (copiável na tela de Marca). Quem entra por ele cai direto naquela central.
- O despachante vê a configuração de marca, mas só o dono altera.

**Técnico**
- Sem migration: os campos `nomeExibicao`, `logoArquivo` e `corPrimaria` de `OrganizationSettings` já existiam.
- `src/lib/marca.ts`: `marcaPermitida(plano)`, `marcaPublica(slug)` e validação de nome de arquivo. Logo e cor só são expostos no plano `MARCA_PROPRIA`.
- Rotas:
  - `GET/PUT /api/organizacao/marca` (PUT: dono e plano Marca própria; cor `#RRGGBB`);
  - `POST/DELETE /api/organizacao/marca/logo` (multipart; JPG/PNG/WebP reconhecidos pelos bytes, como no comprovante; SVG recusado; até 1 MB; `LOGO_DIR`);
  - `GET /api/publico/organizacoes/[slug]` e `.../logo`;
  - `GET /o/[slug]/manifest.webmanifest`;
  - página `/o/[slug]/login`, que após o login troca a sessão para aquela central.
- O rastreio público lê logo e cor pela mesma regra de plano.
- Deploy: volume `logos` em `docker-compose.yml` (`LOGO_DIR=/app/storage/logos`) e diretório criado no `Dockerfile`.
- UI: `/dashboard/marca` (item "Marca" no menu), com prévia do rastreio.
- Testes:
  - `marca.test.ts`: plano, permissão do dono, cor inválida, SVG e arquivo grande recusados, logo servido, marca do EPM fora do plano, manifest por central;
  - isolamento cobrindo as 4 rotas novas.

  Total: 149 testes.

### Etapa 4 — Fechamento do dia/mês (2026-10-11)

**Na prática**
- Em **Painel → Fechamento**, o dono escolhe o período: hoje, ontem, este mês, mês passado ou datas livres. O sistema mostra duas visões:
  - **Por motoboy:** corridas, km, valor das corridas, repasse (70% por padrão, ajustável em Preços), dinheiro que o motoboy recebeu em mãos e o **saldo do acerto**. Positivo é o que a central paga a ele; negativo é o que ele devolve.
  - **Por empresa cliente:** corridas, km, valor total, quanto já foi pago e quanto falta cobrar.
- Botão **Exportar CSV** nas duas visões. O arquivo abre direto no Excel em português (separador ";" e vírgula nos centavos).
- O relatório só lê os dados: não mexe em saldo nem em dinheiro.
- Entram as corridas entregues no período, pela hora de entrega no fuso da central. Uma corrida entregue às 23h30 conta naquele dia.

**Técnico**
- `src/lib/fechamento.ts`:
  - `porMotoboy` e `porCliente` fazem as contas em `Prisma.Decimal` com `money()`;
  - `inicioDoDia` calcula a meia-noite no fuso da central;
  - `gerarCsv` grava com BOM UTF-8 e protege contra fórmula no Excel (CSV injection).
- `GET /api/fechamento?de&ate&visao=motoboy|cliente[&formato=csv]`, só para a gestão, com período de até 1 ano. Lê só `Pedido` + `Pagamento`.
- Sem migration: `OrganizationSettings.repasseMotoboy` já existia. Ele passa a ser editado pela tabela de preço (`PUT /api/organizacao/precos`).
- UI: `/dashboard/fechamento` (item "Fechamento" no menu) e o campo "Repasse ao motoboy (%)" em Preços.
- Testes:
  - unitários de agregação, saldo negativo, CSV e fuso;
  - integração com período no fuso, exclusão de outra central, CSV, permissão, nenhum lançamento em saldo e período inválido;
  - isolamento: o caso do fechamento agora pega vazamento (validado injetando o erro), e todas as listagens exigem resposta 200.

  Total: 141 testes.

### Etapa 3 — Link público de rastreio e portal da empresa cliente (2026-10-11)

**Na prática**
- Todo pedido tem um **link de rastreio** (botão "Link de rastreio" no pedido, com cópia e envio pelo WhatsApp). Quem recebe a entrega acompanha sem criar conta: status, horários, primeiro nome do entregador e previsão aproximada.
- O mapa com a posição do motoboy aparece **só enquanto o pedido está "em entrega"**. Antes disso, revelaria onde fica o remetente. Depois da entrega, o link mostra a foto do comprovante.
- O link nunca mostra telefone, documento, valor nem o endereço completo, só bairro e cidade.
- O cadastro deixou de ser aberto. Motoboys, empresas clientes e despachantes entram por **convite**: a central gera o link em **Painel → Convites** e manda pelo WhatsApp.
- Cada link vale uma vez e expira em 7 dias, por padrão. Pode ser preso a um e-mail ou revogado.
- Quem já tem conta em outra central usa o mesmo e-mail e senha.
- Só o dono convida despachantes.
- O cadastro público agora é **"Criar minha central"**: gera a central e o dono, no plano Essencial e com status pendente. O dono consegue entrar, mas vê "aguardando ativação" até a equipe da plataforma ativar em **Painel → Centrais**, que só o superadmin vê.
- O painel `/cliente` continua sendo o portal da empresa cliente, agora sempre dentro da central que a convidou.

**Técnico**
- Migration `202610110005_rastreio_convites`:
  - `Pedido.trackingToken` (único, 43 caracteres aleatórios, gerado na criação; pedidos antigos ganham token na primeira vez em `POST /api/pedidos/[id]/rastreio-publico`);
  - modelo `Convite` (papel, `tokenHash` SHA-256, e-mail opcional, `expiresAt`, `usadoEm`).
- Rotas públicas, todas sob `/api/publico/*` (o `public-api.ts` libera só GET/POST) e com rate limit por IP:
  - `GET /api/publico/rastreio/[token]` e `.../comprovante`;
  - `GET/POST /api/publico/convites/[token]` (aceite atômico com `updateMany` condicional);
  - `POST /api/publico/centrais`.
- Rotas autenticadas:
  - `GET/POST /api/convites` e `DELETE /api/convites/[id]` (gestão);
  - `GET /api/plataforma/organizacoes` e `PATCH /api/plataforma/organizacoes/[id]` (superadmin: status e plano).
- `POST /api/clientes` e `POST /api/motoboys` deixaram de ser públicos e viraram cadastro direto pela gestão da central. `organizacaoPadrao` foi removido.
- Libs novas:
  - `src/lib/contas.ts`: `vincularConta` reaproveita conta existente conferindo a senha, com mensagem única que não revela se o e-mail existe; também tem os perfis por central e `gerarSlug`;
  - `src/lib/tokens.ts`;
  - `src/lib/rastreio-publico.ts`.
- UI:
  - páginas `/r/[token]`, `/convite/[token]` e `/registro` ("criar minha central");
  - `/dashboard/convites` e `/dashboard/plataforma`;
  - componente `CompartilharRastreio`;
  - aviso de central pendente ou suspensa no painel.
- Testes:
  - `convites-centrais.test.ts`: conta nova, e-mail preso, conta existente com senha certa e errada, aceites concorrentes, revogação, despachante, central pendente → ativação, privacidade do rastreio;
  - isolamento cobrindo as 10 rotas novas.

  Total: 132 testes.

### Etapa 2 — Preço por central e limites do plano (2026-10-11)

**Na prática**
- Cada central monta a própria tabela de preço em **Painel → Preços**: valor por km, corrida mínima, acréscimo por tipo de serviço e preço fixo por bairro de destino. A tela também simula o preço de uma corrida.
- Só o dono da central altera a tabela. O despachante pode consultar.
- O preço é calculado quando o pedido é criado e fica congelado nele: mudar a tabela depois não altera pedidos já feitos.
- O sistema respeita o plano contratado:

  | Plano | Motoboys ativos | Entregas por mês |
  |---|---|---|
  | Essencial | 5 | 600 |
  | Central | 20 | 2.500 |
  | Marca própria | 50 | 6.000 |

- Passou do limite de entregas, o pedido continua sendo aceito e a entrega conta como excedente (R$ 0,10 cada). O dono vê um aviso no painel. Acima de 120% do limite, novos pedidos são bloqueados com uma mensagem clara.
- O painel mostra o plano, as entregas do mês e os motoboys ativos em relação ao limite.
- A tela de nova entrega do cliente mostra o preço por km da tabela da central dele.
- Rotas e endereços repetidos saem de um cache, sem nova chamada paga ao Google Maps. Cada chamada real é contada por central.

**Técnico**
- Modelos: `PricingRule` (1 por org: `precoPorKm`, `valorMinimo`, `multAgendada | multDocumentos | multExpressa`), `PricingBairro` (bairro normalizado, único por org) e `UsageCounter` (org + mês `AAAA-MM` no fuso da central; `entregas`, `chamadasMaps`).
- Migration `202610110004_precos_uso`: cria as tabelas, copia a tabela global antiga (R$ 3/km; 1,0/1,2/1,5) para cada central existente e preenche o histórico de entregas por mês.
- `src/lib/pricing.ts`: `calcularPrecoComRegra` (bairro fixo → valor base; multiplicador; mínimo) e `normalizarBairro`. `calcularPreco` continua com a regra padrão, para a landing. `src/lib/pricing-org.ts` carrega a regra da central.
- `src/lib/planos.ts` (limites e `situacaoEntregas`) e `src/lib/uso.ts` (`registrarEntrega` na mesma transação da criação do pedido; `verificarLimiteMotoboys` no cadastro e na aprovação; `registrarChamadaMaps`; `lerUso`).
- `src/lib/cache.ts`: Redis com alternativa em memória. `google-maps.ts` faz cache de rota (24 h) e geocodificação (30 dias) e conta chamadas por `organizationId`.
- Rotas novas: `GET/PUT /api/organizacao/precos` (PUT só OWNER) e `GET /api/organizacao/uso`. `POST /api/pedidos` e `POST /api/rotas` usam a tabela da central, e a resposta do pedido pode trazer `aviso`.
- UI: `/dashboard/precos`, `PlanoUsoCard` no painel e item "Preços" no menu.
- Testes:
  - unitários de preço, planos e cache do Maps;
  - integração com bairro fixo, aviso e bloqueio do limite, preço congelado após a tabela mudar e o status avançar, limite de motoboys e permissão do dono;
  - isolamento cobrindo as rotas novas.

  Total: 116 testes.

### Etapa 1 — Fundação multi-tenant (2026-10-11)

**Na prática**
- Várias centrais usam o mesmo sistema, e nenhuma vê os dados da outra: pedidos, motoboys, clientes, endereços, pagamentos, avaliações, chat e comprovantes ficam presos à central.
- A instalação atual virou a "Central Principal". Todos os dados existentes foram para ela e tudo continua funcionando.
- Quem pertence a mais de uma central escolhe a central ativa no topo da tela. O papel muda conforme a central: dono, despachante, cliente ou entregador.
- O antigo administrador virou **superadmin** da plataforma (equipe Impulsio). Ele pode entrar em qualquer central para dar suporte e continua como dono da Central Principal.
- A plataforma deixou de tirar 15% da corrida. A taxa agora é uma configuração por central, com padrão 0. Pagamentos antigos mantêm os valores já gravados.
- Remover um motoboy ou cliente tira essa pessoa só da central atual. A conta só é apagada se ela não estiver em nenhuma outra central.

**Técnico**
- Modelos novos: `Organization` (slug único, `plano`, `status`), `OrganizationMember` (papel `OWNER | DISPATCHER | CLIENT | DRIVER`, único por org+usuário) e `OrganizationSettings` (marca, `taxaPlataforma` padrão 0, `repasseMotoboy` padrão 0,70, fuso).
- `organizationId` em `Motoboy`, `Cliente`, `Endereco`, `Pedido`, `Pagamento`, `Avaliacao`, `Mensagem`, `SaldoMotoboy`, `TransacaoMotoboy` e `AuditLog` (opcional neste último), com índices `(organizationId, ...)`.
- Unicidade por central: `Motoboy (org, userId | cnh | veiculoPlaca)` e `Cliente (org, userId | cpfCnpj)`. `User.email` continua global.
- `UserRole`: `ADMIN` → `SUPERADMIN`.
- Migrations: `202610110001_org_expand` (colunas opcionais), `202610110002_org_backfill` (Central Principal, memberships e preenchimento), `202610110003_org_contract` (NOT NULL e troca de uniques). Validadas sobre dados no formato antigo e em banco vazio.
- Sessão: `activeOrganizationId`, `orgRole`, `orgStatus` e `motoboyId`/`clienteId` resolvidos na central ativa (`src/lib/org-context.ts`). A troca usa `update()` do NextAuth, com membership validada no banco. A revalidação acontece a cada 5 min.
- `auth-helpers.ts`: `requireOrgAccess(papéis?)`, `requireGestor`, `requireOwner`, `requireSuperadmin`. Os helpers de posse (`requirePedidoAccess`, `requireClienteOwnership`, `requireMotoboyOwnership`) respondem 404 para recurso de outra central. `pedido-permissions.ts` e `pedido-status.ts` passam a usar o papel na org.
- Todas as rotas de `src/app/api` filtram por `organizationId`. Chat e comprovante deixaram de comparar `userId` direto. Rota nova: `GET /api/organizacoes`. Componente `OrgSwitcher` no painel e no cabeçalho. O middleware de páginas roteia pelo papel na org.
- `dividirPagamento(total, taxa)` usa a taxa da central (padrão 0).
- Cadastro público continua entrando na central padrão (`DEFAULT_ORGANIZATION_SLUG`) até a Etapa 3.
- Scripts (`create-admin`, `seed-demo`, `seed-preview`, `create-demo-users`) adaptados. `create-admin` aceita `ORG_SLUG` para dar o papel de OWNER.
- Testes: `tests/integration/isolamento-orgs.test.ts` cria duas centrais e prova, em todas as rotas, que a A não lê, lista, altera nem baixa dados da B. A suíte falha se surgir rota sem caso. Também cobre fixtures multi-tenant e taxa 0 por padrão. Total: 103 testes.

## [1.4.0] - 2026-01-30

### Fase 4: Sistema de Pagamentos

#### Adicionado
- **Pagamento PIX**
  - Geração de QR Code (simulado, pronto para gateway real)
  - Código copia e cola
  - Expiração automática (30 min)
  - Polling para verificação de status
  - Componente `PixPayment` com timer visual

- **Pagamento com Cartão**
  - Formulário de cartão com validação
  - Algoritmo de Luhn para validação de número
  - Detecção automática de bandeira (Visa, Mastercard, Elo, etc.)
  - Validação de data de validade e CVV
  - Suporte a crédito e débito

- **Pagamento em Dinheiro**
  - Registro do pagamento pendente
  - Confirmação pelo motoboy na entrega
  - Botão de confirmação na tela do pedido

- **Fluxo de Checkout**
  - Etapa de pagamento integrada ao criar pedido
  - Seleção de método de pagamento
  - Redirecionamento automático após aprovação
  - Cancelamento e retry de pagamento

- **Split de Pagamento**
  - Taxa da plataforma: 15%
  - Valor do motoboy: 85%
  - Cálculo automático na criação do pagamento

- **Saldo do Motoboy**
  - Modelo `SaldoMotoboy` para controle de ganhos
  - Modelo `TransacaoMotoboy` para histórico
  - Crédito automático ao confirmar pagamento
  - Página de ganhos `/motoboy/ganhos`
  - Exibição de saldo disponível, pendente e total

- **Interface do Motoboy**
  - Card de ganhos na dashboard
  - Página detalhada de transações
  - Filtros por tipo de transação
  - Botão de saque (em desenvolvimento)

- **Exibição de Pagamento**
  - Status do pagamento nas páginas de pedido
  - Informações do cartão (últimos 4 dígitos)
  - Data de aprovação
  - Método de pagamento utilizado

#### Arquivos Criados
- `src/lib/pagamentos.ts` - Biblioteca de pagamentos
- `src/app/api/pagamentos/route.ts` - API criar/listar pagamentos
- `src/app/api/pagamentos/[id]/route.ts` - API verificar/cancelar
- `src/app/api/motoboys/[id]/saldo/route.ts` - API saldo do motoboy
- `src/app/api/motoboys/[id]/transacoes/route.ts` - API transações
- `src/components/payment/PaymentForm.tsx` - Formulário de pagamento
- `src/components/payment/PixPayment.tsx` - Componente PIX
- `src/app/(motoboy)/motoboy/ganhos/page.tsx` - Página de ganhos

#### Modificados
- `prisma/schema.prisma` - Modelos Pagamento, SaldoMotoboy, TransacaoMotoboy
- `src/app/(cliente)/cliente/nova-entrega/page.tsx` - Fluxo com pagamento
- `src/app/(cliente)/cliente/pedido/[id]/page.tsx` - Exibição de pagamento
- `src/app/(motoboy)/motoboy/page.tsx` - Card de ganhos
- `src/app/(motoboy)/motoboy/pedido/[id]/page.tsx` - Confirmação dinheiro
- `src/app/api/pedidos/[id]/route.ts` - Include pagamento

#### Configurações
```typescript
// Taxa da plataforma
taxaPlataforma: 0.15  // 15%

// Expiração do PIX
pixExpiracaoMinutos: 30
```

#### Métodos de Pagamento
| Método | Status |
|--------|--------|
| PIX | Simulado (pronto para Mercado Pago/Stripe) |
| Cartão Crédito | Simulado (90% aprovação) |
| Cartão Débito | Simulado (90% aprovação) |
| Dinheiro | Confirmação manual pelo motoboy |

---

## [1.3.0] - 2026-01-30

### Fase 3: Chat + Comprovante com Foto

#### Adicionado
- **Sistema de Chat**
  - Modelo `Mensagem` no banco de dados
  - API `GET/POST /api/pedidos/[id]/mensagens`
  - Componente `ChatBox` com chat flutuante
  - Indicador de mensagens não lidas
  - Marcação de leitura automática
  - Polling a cada 5 segundos
  - Timestamps e indicadores (✓/✓✓)

- **Comprovante de Entrega**
  - API `GET/POST /api/pedidos/[id]/comprovante`
  - Componente `PhotoCapture` para captura de fotos
  - Suporte a câmera traseira do dispositivo
  - Upload da galeria como alternativa
  - Preview antes de enviar
  - Validação de tipo (JPG, PNG, WebP) e tamanho (5MB)
  - Armazenamento em `/public/uploads/comprovantes/`

- **Integração nas Páginas**
  - Chat entre cliente e motoboy durante entrega
  - Foto obrigatória para confirmar entrega
  - Visualização do comprovante pelo cliente

#### Arquivos Criados
- `src/app/api/pedidos/[id]/mensagens/route.ts`
- `src/app/api/pedidos/[id]/comprovante/route.ts`
- `src/components/chat/ChatBox.tsx`
- `src/components/camera/PhotoCapture.tsx`
- `public/uploads/comprovantes/.gitkeep`

#### Modificados
- `prisma/schema.prisma` - Adicionado modelo Mensagem
- `src/app/(cliente)/cliente/pedido/[id]/page.tsx` - Chat e visualização de comprovante
- `src/app/(motoboy)/motoboy/pedido/[id]/page.tsx` - Chat e captura de foto

---

## [1.2.0] - 2026-01-30

### Fase 2: Rastreamento em Tempo Real + Notificações

#### Adicionado
- **Rastreamento ao Vivo**
  - Componente `TrackingMap` com Google Maps
  - Marcadores coloridos (origem, destino, motoboy)
  - Rota desenhada entre pontos
  - Centralização automática no motoboy

- **Compartilhamento de Localização**
  - Hook `useLocationSharing` para motoboys
  - API `GET/POST /api/motoboys/[id]/localizacao`
  - Indicador visual de compartilhamento ativo
  - Uso da API de Geolocalização do navegador

- **Sistema de Notificações**
  - Hook `useNotifications` para push notifications
  - Hook `useTracking` para rastreamento com polling
  - API `GET /api/pedidos/[id]/rastreamento`
  - Toast notifications com react-hot-toast
  - Alertas de mudança de status
  - Notificação de novos pedidos

- **Melhorias na Interface**
  - Indicador de localização sendo compartilhada
  - ETA (tempo estimado de chegada)
  - Botão para solicitar permissão de notificação

#### Arquivos Criados
- `src/app/api/motoboys/[id]/localizacao/route.ts`
- `src/app/api/pedidos/[id]/rastreamento/route.ts`
- `src/components/maps/TrackingMap.tsx`
- `src/hooks/useTracking.ts`
- `src/hooks/useNotifications.ts`

#### Modificados
- `src/app/providers.tsx` - Adicionado Toaster
- `src/app/(cliente)/cliente/pedido/[id]/page.tsx` - Rastreamento e notificações
- `src/app/(motoboy)/motoboy/page.tsx` - Compartilhamento de localização e toasts

#### Dependências Adicionadas
- `react-hot-toast`

---

## [1.1.0] - 2026-01-30

### Fase 1: Dashboard com Gráficos + Dark Mode + PWA

#### Adicionado
- **Gráficos no Dashboard**
  - Componente `FaturamentoChart` - Gráfico de área
  - Componente `PedidosPorDiaChart` - Gráfico de barras
  - Componente `StatusPedidosChart` - Gráfico de pizza
  - Dados simulados para demonstração

- **Dark Mode**
  - Componente `ThemeToggle` para alternar tema
  - Suporte a tema do sistema
  - Persistência via localStorage
  - Estilos dark mode em todas as páginas

- **PWA (Progressive Web App)**
  - Arquivo `manifest.json` configurado
  - Meta tags para PWA no layout
  - Ícones para instalação

#### Arquivos Criados
- `src/components/charts/DashboardCharts.tsx`
- `src/components/ui/ThemeToggle.tsx`
- `public/manifest.json`

#### Modificados
- `src/app/layout.tsx` - Meta tags PWA
- `src/app/providers.tsx` - ThemeProvider
- `src/app/globals.css` - Variáveis CSS dark mode
- `src/app/(dashboard)/dashboard/page.tsx` - Gráficos e ThemeToggle
- `src/app/(cliente)/cliente/page.tsx` - ThemeToggle
- `src/app/(motoboy)/motoboy/page.tsx` - ThemeToggle

#### Dependências Adicionadas
- `recharts`
- `date-fns`
- `next-themes`

---

## [1.0.0] - 2026-01-30

### Release Inicial

#### Adicionado
- **Autenticação**
  - Login/Registro com NextAuth.js
  - Suporte a 3 roles: Admin, Cliente, Motoboy
  - Proteção de rotas por role
  - Hash de senha com bcryptjs

- **Painel do Cliente**
  - Dashboard com pedidos ativos e histórico
  - Criação de pedidos com cálculo de rota
  - 3 tipos de serviço: Expressa, Agendada, Documentos
  - Acompanhamento de status
  - Cancelamento de pedidos
  - Avaliação de entregas

- **Painel do Motoboy**
  - Dashboard com status e pedidos
  - Toggle online/offline
  - Lista de pedidos disponíveis
  - Aceitação e gerenciamento de entregas
  - Fluxo de status completo
  - Histórico com estatísticas

- **Painel Administrativo**
  - Dashboard com métricas gerais
  - Gerenciamento de pedidos
  - Gerenciamento de motoboys
  - Gerenciamento de clientes

- **APIs REST**
  - CRUD completo para todas entidades
  - Validação com Zod
  - Tratamento de erros padronizado

- **Integração Google Maps**
  - Cálculo de rotas e distâncias
  - Geocodificação de endereços
  - Estimativa de tempo

- **Sistema de Preços**
  - Base: R$ 3,00/km
  - Multiplicadores por tipo de serviço
  - Cálculo automático

- **Algoritmo de Alocação**
  - Score baseado em proximidade (40%)
  - Score baseado em avaliação (35%)
  - Score baseado em tempo ocioso (25%)

#### Estrutura do Banco de Dados
- User (usuários base)
- Motoboy (dados do entregador)
- Cliente (dados do cliente)
- Endereco (endereços salvos)
- Pedido (entregas)
- Avaliacao (ratings)
- Disponibilidade (agenda do motoboy)
- Account/Session (NextAuth)

#### Dependências Principais
- Next.js 14+
- TypeScript 5+
- Tailwind CSS 3+
- Prisma 5+
- NextAuth.js 4+
- Zod
- bcryptjs
- @googlemaps/js-api-loader

---

## Legenda

- **Adicionado**: Novas funcionalidades
- **Modificado**: Alterações em funcionalidades existentes
- **Removido**: Funcionalidades removidas
- **Corrigido**: Correções de bugs
- **Segurança**: Correções de vulnerabilidades
