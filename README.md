# Entrega Pra Mim

SaaS multi-tenant para **centrais de motofrete**: cada central (organização) despacha os próprios motoboys, atende as empresas clientes dela e mostra o rastreio com a própria marca. A central paga mensalidade fixa por plano; a plataforma não tira comissão da corrida. Decisão de negócio em [docs/PLANO_NEGOCIO.md](docs/PLANO_NEGOCIO.md).

Next.js 16, TypeScript, Tailwind CSS, MySQL e Prisma.

---

## Stack Tecnológica

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Next.js | 16.1.6 (App Router) | Frontend/Backend |
| TypeScript | 5+ | Tipagem estática |
| Tailwind CSS | 4 | Estilização |
| MySQL | 8.0 | Banco de dados |
| Prisma | 5+ | ORM |
| NextAuth.js | 4+ | Autenticação |
| Google Maps API | - | Mapas e rotas |
| Recharts | 3 | Gráficos |
| next-themes | - | Dark Mode |
| react-hot-toast | - | Notificações toast |
| Docker | - | Containerização |

---

> **Cadastro de motoboy:** o cadastro em `/registro` é público, mas nasce como `PENDENTE_APROVACAO`. O motoboy consegue entrar, porém só fica online, vê pedidos disponíveis e envia localização depois que um admin aprova em **Dashboard → Entregadores → Aguardando aprovação**.

> **Pagamentos:** PIX e cartão são demonstrações disponíveis apenas em desenvolvimento/testes. Em produção, somente dinheiro está habilitado até a integração de um gateway. Veja as regras, testes e pendências em [Correções operacionais](docs/CORRECOES_OPERACIONAIS.md).

## Modelo e papéis

| Papel | Quem é | Onde trabalha |
| --- | --- | --- |
| `SUPERADMIN` | Equipe da plataforma (Impulsio) | Entra em qualquer central; ativa, suspende e muda o plano em **Painel → Centrais** |
| `OWNER` | Dono da central | `/dashboard`: tudo da central, inclusive preços, marca e convite de despachantes |
| `DISPATCHER` | Despachante/operador | `/dashboard`: despacho, pedidos, motoboys, clientes, convites e fechamento |
| `CLIENT` | Empresa atendida pela central (farmácia, loja, escritório) | `/cliente`: abre e acompanha pedidos |
| `DRIVER` | Motoboy da central | `/motoboy`: recebe ofertas, faz a entrega e envia o comprovante |
| Destinatário | Pessoa sem login | `/r/[token]`: link público de rastreio |

O papel é **por central** (`OrganizationMember`). A mesma pessoa pode estar em mais de uma central e escolhe a ativa no seletor do topo. Toda leitura e escrita de negócio filtra pela central ativa (`requireOrgAccess` em `src/lib/auth-helpers.ts`). O teste `tests/integration/isolamento-orgs.test.ts` prova isso em todas as rotas e falha se surgir rota nova sem caso.

## Funcionalidades

- **Entrada:** `/registro` é "criar minha central" (nasce pendente até o superadmin ativar). Motoboys, empresas e despachantes entram por **convite** (link de uso único com validade, em Painel → Convites). Cada central tem um login próprio com a marca dela: `/o/[slug]/login`.
- **Pedidos:** a empresa cliente abre pelo portal `/cliente`, ou a central lança. O preço vem da **tabela da central** (km, mínimo, multiplicador por serviço e preço fixo por bairro de destino) e fica congelado no pedido.
- **Despacho com oferta:** a corrida é oferecida ao melhor motoboy online (proximidade, avaliação e tempo parado), com 90 s para aceitar. Se ele recusa ou o prazo vence, vai para o próximo. Depois de 3 tentativas, cai na fila "sem motoboy" em Painel → Despacho. O motoboy só vê as ofertas feitas para ele.
- **Entrega:** status em sequência, localização do motoboy, chat cliente–motoboy e comprovante com foto obrigatório para concluir.
- **Rastreio público:** link `/r/[token]` sem login. Posição do motoboy só durante a entrega; foto do comprovante depois. Nunca mostra telefone, documento, valor nem endereço completo.
- **Fechamento:** em Painel → Fechamento, por motoboy (corridas, repasse configurável, dinheiro recebido em mãos, saldo do acerto) e por empresa (valor, já pago, a cobrar), com exportação CSV.
- **Plano e uso:** limites de motoboys e de entregas por mês por plano. Entregas acima do limite são aceitas como excedente, com bloqueio só acima de 120%. Chamadas ao Google Maps são contadas por central.
- **Marca própria** (plano Marca própria): logo, nome e cor no rastreio, no login da central e no PWA (`/o/[slug]/manifest.webmanifest`).
- **PWA e tema claro/escuro** para uso no celular.

> **Pagamentos:** PIX e cartão são simulados (`src/lib/pagamentos.ts`) e bloqueados em produção. Só dinheiro está habilitado; a central cobra os clientes como já faz e usa o fechamento para conferir. O gateway real é fase 2 ([docs/PLANO_EVOLUCAO.md](docs/PLANO_EVOLUCAO.md)). A taxa da plataforma sobre a corrida é configuração por central, com padrão 0.

---

## Arquitetura do Projeto

```
entrega_pra_mim/
├── prisma/
│   └── schema.prisma              # Modelos do banco de dados
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── icons/                     # Ícones do app
│   └── uploads/
│       └── comprovantes/          # Fotos de comprovante
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/             # Página de login
│   │   │   └── registro/          # Página de registro
│   │   ├── (cliente)/
│   │   │   └── cliente/
│   │   │       ├── page.tsx       # Dashboard do cliente
│   │   │       ├── nova-entrega/  # Criar pedido
│   │   │       └── pedido/[id]/   # Detalhe do pedido
│   │   ├── (motoboy)/
│   │   │   └── motoboy/
│   │   │       ├── page.tsx       # Dashboard do motoboy
│   │   │       ├── historico/     # Histórico de entregas
│   │   │       └── pedido/[id]/   # Detalhe do pedido
│   │   ├── (dashboard)/
│   │   │   └── dashboard/
│   │   │       ├── page.tsx       # Dashboard admin
│   │   │       ├── pedidos/       # Gerenciar pedidos
│   │   │       ├── motoboys/      # Gerenciar motoboys
│   │   │       └── clientes/      # Gerenciar clientes
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/ # NextAuth
│   │   │   ├── pedidos/           # CRUD pedidos
│   │   │   ├── motoboys/          # CRUD motoboys
│   │   │   ├── clientes/          # CRUD clientes
│   │   │   ├── enderecos/         # CRUD endereços
│   │   │   ├── avaliacoes/        # Avaliações
│   │   │   ├── rotas/             # Cálculo de rotas
│   │   │   └── pagamentos/        # Pagamentos
│   │   ├── layout.tsx             # Layout principal
│   │   ├── page.tsx               # Página inicial
│   │   └── providers.tsx          # Context providers
│   ├── components/
│   │   ├── ui/                    # Componentes base
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── ThemeToggle.tsx
│   │   ├── charts/                # Gráficos
│   │   │   └── DashboardCharts.tsx
│   │   ├── maps/                  # Mapas
│   │   │   └── TrackingMap.tsx
│   │   ├── chat/                  # Chat
│   │   │   └── ChatBox.tsx
│   │   ├── camera/                # Câmera
│   │   │   └── PhotoCapture.tsx
│   │   └── payment/               # Pagamentos
│   │       ├── PaymentForm.tsx    # Formulário
│   │       └── PixPayment.tsx     # Componente PIX
│   ├── hooks/
│   │   ├── useTracking.ts         # Rastreamento
│   │   └── useNotifications.ts    # Notificações
│   ├── lib/
│   │   ├── prisma.ts              # Cliente Prisma
│   │   ├── auth.ts                # Configuração NextAuth
│   │   ├── google-maps.ts         # Google Maps
│   │   ├── pricing.ts             # Cálculo de preços
│   │   ├── pagamentos.ts          # Lib de pagamentos
│   │   ├── alocacao.ts            # Algoritmo de alocação
│   │   └── validations.ts         # Schemas Zod
│   ├── types/
│   │   └── index.ts               # Tipos TypeScript
│   └── utils/
│       └── helpers.ts             # Funções auxiliares
├── .env                           # Variáveis de ambiente
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## API Routes

Todas exigem login e central ativa, salvo as marcadas como públicas. Recurso de outra central responde 404.

| Área | Rotas |
| --- | --- |
| Sessão | `/api/auth/*` (NextAuth), `GET /api/organizacoes` (centrais do usuário para o seletor) |
| Pedidos | `GET/POST /api/pedidos` (POST aceita `Idempotency-Key`), `GET/PATCH/DELETE /api/pedidos/[id]`, `.../rastreamento`, `.../mensagens`, `.../comprovante`, `.../comprovante/arquivo`, `POST .../rastreio-publico` |
| Despacho | `GET /api/despacho/ofertas` e `POST /api/despacho/ofertas/[id]` (motoboy aceita/recusa), `GET/POST /api/despacho/fila` (gestão: fila manual e reoferta) |
| Motoboys | `GET/POST /api/motoboys` (POST: cadastro direto pela gestão), `GET/PATCH/DELETE /api/motoboys/[id]`, `.../aprovacao`, `.../localizacao`, `.../resumo`, `.../saldo`, `.../transacoes` |
| Clientes e endereços | `GET/POST /api/clientes`, `/api/clientes/[id]`, `/api/enderecos`, `/api/enderecos/[id]` |
| Pagamentos | `GET/POST /api/pagamentos` (POST aceita `Idempotency-Key`), `GET/POST/DELETE /api/pagamentos/[id]` |
| Avaliações e rota | `GET/POST /api/avaliacoes`, `POST /api/rotas` (cotação pela tabela da central) |
| Central | `GET /api/organizacao/uso`, `GET/PUT /api/organizacao/precos`, `GET/PUT /api/organizacao/marca`, `POST/DELETE /api/organizacao/marca/logo`, `GET/POST /api/convites`, `DELETE /api/convites/[id]`, `GET /api/fechamento` (`?de&ate&visao=motoboy\|cliente&formato=csv`), `GET /api/dashboard` |
| Plataforma | `GET /api/plataforma/organizacoes`, `PATCH /api/plataforma/organizacoes/[id]` (superadmin) |
| Públicas | `GET /api/health/live`, `GET /api/health/ready`, `GET /api/publico/rastreio/[token]` (+ `/comprovante`), `GET/POST /api/publico/convites/[token]`, `POST /api/publico/centrais`, `GET /api/publico/organizacoes/[slug]` (+ `/logo`) |
| Job | `POST /api/jobs/despacho` com `Authorization: Bearer CRON_SECRET` (chamado a cada 15 s pelo serviço `despacho-cron`) |

### Idempotência
`POST /api/pedidos` e `POST /api/pagamentos` aceitam o header `Idempotency-Key` (8–255 caracteres `[A-Za-z0-9_:.-]`). A primeira resposta 2xx/4xx fica guardada por 24 h para cada usuário. Repetir a mesma chave com o mesmo corpo devolve a resposta original com `Idempotent-Replayed: true`. Com outro corpo, a resposta é 422; enquanto a original ainda processa, 409.

### Rate limit
- **Por IP:** login, cadastro e rotas públicas.
- **Por usuário:** chat (20/min), upload (10/min), envio de localização (30/min), pagamentos (20/min) e polling (60/min).
- **Google Maps:** rota, pedido e geocodificação somam um limite único por usuário, de 20/min e 300/dia.

Com `REDIS_URL`, o contador é compartilhado entre instâncias.

### Sessão e senha
A sessão JWT dura 7 dias e guarda a central ativa e o papel nela. A cada 5 minutos, o usuário e o papel são relidos do banco; usuário excluído passa a receber 401. Senhas novas têm de 8 a 72 caracteres e recusam sequências e repetições óbvias.

### Headers
Todas as respostas levam HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` e uma CSP sem `script-src`. A CSP cobre `frame-ancestors`, `base-uri`, `form-action` e `object-src`. O otimizador de imagens não aceita domínios externos.

### Auditoria
A tabela `audit_logs`, com `organizationId`, registra:
- login, com sucesso ou falha;
- aprovação e exclusão de motoboy;
- status de pedido (inclusive o aceite por oferta);
- pagamentos;
- envio e acesso a comprovante;
- convites;
- link de rastreio;
- marca;
- alterações de central.

É só inserção, e uma falha ao gravar não interrompe a operação.

---

## Modelos de Dados (Prisma)

Schema completo em `prisma/schema.prisma`. Migrations versionadas em `prisma/migrations` (sempre aditivas: acrescentar → preencher → restringir).

| Grupo | Modelos |
| --- | --- |
| Central | `Organization` (slug, `plano`, `status`), `OrganizationMember` (papel por central), `OrganizationSettings` (marca, taxa da plataforma, % de repasse, fuso, prazo e tentativas do despacho), `Convite` |
| Preço e uso | `PricingRule`, `PricingBairro`, `UsageCounter` (entregas e chamadas ao Maps por mês) |
| Operação | `Motoboy`, `Cliente`, `Endereco`, `Pedido` (preço congelado, `trackingToken`, controle do despacho), `DispatchOffer`, `Mensagem`, `Avaliacao` |
| Financeiro (simulado/legado) | `Pagamento`, `SaldoMotoboy`, `TransacaoMotoboy` |
| Plataforma | `User` (e-mail global; `SUPERADMIN` ou conta comum), `AuditLog`, `IdempotencyKey`, tabelas do NextAuth |

Todos os agregados de negócio têm `organizationId`. CNH, placa, CPF/CNPJ e o perfil do usuário são únicos **por central**, então a mesma pessoa pode estar em duas centrais.

---

## Componentes Principais

### UI Components (`/components/ui/`)

| Componente | Props | Descrição |
|------------|-------|-----------|
| `Button` | `variant`, `size`, `isLoading`, `disabled` | Botão estilizado |
| `Card` | `variant`, `className` | Container com borda/sombra |
| `Badge` | `variant`, `size` | Tag colorida |
| `ThemeToggle` | - | Toggle dark/light mode |

### Charts (`/components/charts/`)

| Componente | Props | Descrição |
|------------|-------|-----------|
| `FaturamentoChart` | `data` | Gráfico de área |
| `PedidosPorDiaChart` | `data` | Gráfico de barras |
| `StatusPedidosChart` | `data` | Gráfico de pizza |

### Maps (`/components/maps/`)

| Componente | Props | Descrição |
|------------|-------|-----------|
| `TrackingMap` | `origem`, `destino`, `motoboyLocation` | Mapa com rastreamento |

### Chat (`/components/chat/`)

| Componente | Props | Descrição |
|------------|-------|-----------|
| `ChatBox` | `pedidoId`, `userType`, `enabled` | Chat flutuante |

### Camera (`/components/camera/`)

| Componente | Props | Descrição |
|------------|-------|-----------|
| `PhotoCapture` | `pedidoId`, `onPhotoSent` | Captura de foto |

---

## Hooks Customizados

### useTracking
```typescript
const { data, isLoading, error, refresh } = useTracking({
  pedidoId: string,
  enabled?: boolean,
  pollingInterval?: number, // ms, default 5000
  onStatusChange?: (newStatus, oldStatus) => void
})
```

### useLocationSharing
```typescript
const { isSharing, error, startSharing, stopSharing } = useLocationSharing(
  motoboyId: string | null,
  enabled: boolean
)
```

### useNotifications
```typescript
const {
  permission,
  isSupported,
  requestPermission,
  sendNotification,
  notifyOrderStatus,
  notifyNewOrder
} = useNotifications()
```

---

## Fórmula de Preço

Cada central configura a própria tabela em **Painel → Preços** (`PricingRule`). Centrais novas começam com R$ 3,00/km e multiplicadores de 1,0 (agendada), 1,2 (documentos) e 1,5 (expressa).

```
valorBase  = preço fixo do bairro de destino (se houver) ou km × precoPorKm
valorTotal = max(valorBase × multiplicador do serviço, valorMinimo)
```

O valor é calculado na criação do pedido (`calcularPrecoComRegra` em `src/lib/pricing.ts`) e nunca recalculado depois.

---

## Fluxo do Pedido

```
SOLICITADO ──(oferta aceita pelo motoboy ou atribuição manual)──▶ ACEITO
ACEITO ──▶ EM_COLETA ──▶ EM_ENTREGA ──(foto do comprovante)──▶ ENTREGUE
CANCELADO: a partir de SOLICITADO, ACEITO, EM_COLETA ou EM_ENTREGA
```

## Despacho com oferta

Implementado em `src/lib/despacho.ts`:

1. Quando o pedido é criado, `ofertarPedido` escolhe o melhor motoboy online e aprovado da central. O score vem de `src/lib/alocacao.ts`: proximidade da coleta (40%), avaliação (35%) e tempo parado (25%).
2. A oferta (`DispatchOffer`) vale 90 s (`despachoTtlSegundos`). Há no máximo uma oferta aberta por pedido, e o mesmo motoboy não recebe duas ofertas ao mesmo tempo.
3. O aceite é atômico: usa o lock do pedido e a reserva condicional do motoboy, então duas respostas nunca atribuem o pedido duas vezes.
4. Se o motoboy recusa ou o prazo vence, o job oferece ao próximo, sem repetir quem já recebeu neste ciclo.
5. Depois de 3 tentativas (`despachoMaxTentativas`), ou sem ninguém online, o pedido vai para a fila manual (`despachoManual`).
6. Entrega agendada entra no despacho 30 minutos antes do horário.

---

## Instalação e Execução

### Pré-requisitos
- Node.js 18+
- Docker e Docker Compose
- Conta Google Cloud (para mapas)

### 1. Clonar e Instalar

```bash
cd /Users/mateushenrique/Documents/entrega_pra_mim
npm install
```

### 2. Configurar Ambiente

Criar arquivo `.env`:

```env
# Banco de Dados
DATABASE_URL="mysql://root:root123@localhost:3306/entrega_pra_mim"

# NextAuth (gere o segredo com: openssl rand -base64 32)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="cole-aqui-o-resultado-do-openssl"

# Job de despacho (opcional em desenvolvimento; obrigatório em produção)
CRON_SECRET="gere com: openssl rand -hex 32"

# Google Maps
GOOGLE_MAPS_API_KEY="sua-chave-aqui"
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="sua-chave-aqui"
```

### 3. Iniciar MySQL

```bash
docker run -d \
  --name entrega-mysql \
  -e MYSQL_ROOT_PASSWORD=root123 \
  -e MYSQL_DATABASE=entrega_pra_mim \
  -p 3306:3306 \
  mysql:8.0
```

### 4. Configurar Banco de Dados

```bash
npx prisma migrate deploy   # aplica as migrations versionadas em prisma/migrations
npx prisma generate
```

> Não use `prisma db push`: ele altera o banco sem histórico e diverge do que roda no CI e em produção. Para mudar o schema em desenvolvimento, use `npx prisma migrate dev --name descricao`.

### 5. Criar o superadmin (e, opcionalmente, dados de demonstração)

A migration já cria a "Central Principal". Para entrar como superadmin e dono dela:

```bash
ADMIN_EMAIL=voce@exemplo.com ADMIN_PASSWORD='senha-com-12-ou-mais' ORG_SLUG=central-principal npx tsx scripts/create-admin.ts
```

Para popular a Central Principal com dados fictícios (**apaga os dados existentes**):

```bash
DEMO_MODE=1 DEMO_PASSWORD='senha-demo' npx tsx scripts/seed-demo.ts
```

Para o despacho expirar ofertas e passar ao próximo em desenvolvimento, chame o job de tempos em tempos:

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/jobs/despacho
```

Ou manualmente via Prisma Studio:
```bash
npx prisma studio
```

### 6. Iniciar Servidor

```bash
npm run dev
```

Acesse: **http://localhost:3000**

---

## Credenciais de Teste

Não há credenciais fixas. Crie o superadmin com `scripts/create-admin.ts` (passo 5). Uma central nova nasce em `/registro` e é ativada em Painel → Centrais. Motoboys, empresas e despachantes entram pelos convites da central, e motoboys precisam de aprovação para receber ofertas.

---

## Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build produção
npm run build
npm start

# Prisma
npx prisma studio      # Interface visual do banco
npx prisma migrate deploy # Aplicar migrations pendentes
npx prisma migrate dev --name x # Criar migration (desenvolvimento)
npx prisma generate    # Gerar cliente
npx prisma migrate reset # Resetar banco

# Docker MySQL
docker ps                    # Listar containers
docker logs entrega-mysql    # Ver logs
docker restart entrega-mysql # Reiniciar
docker stop entrega-mysql    # Parar
docker start entrega-mysql   # Iniciar
```

---

## Configuração Google Maps API

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie ou selecione um projeto
3. Vá em **APIs e Serviços** > **Biblioteca**
4. Ative as APIs:
   - Maps JavaScript API (chave do navegador)
   - Routes API (chave do servidor; Directions/Distance Matrix são legado)
   - Geocoding API (chave do servidor)
5. Vá em **Credenciais** > **Criar Credenciais** > **Chave de API**
6. Restrinja a chave por domínio (produção)
7. Copie para `.env`

**Crédito gratuito**: $200/mês (~40.000 requisições de rotas)

---

## Troubleshooting

### Erro de conexão MySQL
```bash
docker ps                    # Verificar se está rodando
docker logs entrega-mysql    # Ver logs de erro
docker restart entrega-mysql # Reiniciar container
```

### Erro de porta 3000 em uso
```bash
lsof -i :3000    # Encontrar processo
kill -9 <PID>    # Encerrar processo
```

### Prisma não encontra banco
```bash
npx prisma migrate status   # Ver migrations pendentes
npx prisma migrate reset    # Recriar o banco LOCAL (apaga dados)
```

### Erro de permissão de câmera/localização
- Verifique se está usando HTTPS (ou localhost)
- Permita acesso nas configurações do navegador

---

## Próximas Fases (Roadmap)

Ver [docs/PLANO_EVOLUCAO.md](docs/PLANO_EVOLUCAO.md) (seção 12) e [CHANGELOG.md](CHANGELOG.md). Resumo:

- [x] P0: segurança e operação mínima
- [x] Multi-tenant, preço por central e limites, rastreio público e convites, fechamento, marca própria, despacho com oferta
- [ ] Aviso por WhatsApp e domínio próprio da central
- [ ] Piloto pago com 3 centrais
- [ ] Fase 2: gateway Pix, integração com o Pedeli, ETA real, SSE

---

## Licença

Projeto privado - Todos os direitos reservados.

---

## Autor

Desenvolvido com Next.js, TypeScript e muito cafe
