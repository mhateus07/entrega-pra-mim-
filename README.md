# Entrega Pra Mim

Plataforma completa de entregas com motoboys, desenvolvida com Next.js 14, TypeScript, Tailwind CSS, MySQL e Prisma.

---

## Stack Tecnológica

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Next.js | 14+ (App Router) | Frontend/Backend |
| TypeScript | 5+ | Tipagem estática |
| Tailwind CSS | 3+ | Estilização |
| MySQL | 8.0 | Banco de dados |
| Prisma | 5+ | ORM |
| NextAuth.js | 4+ | Autenticação |
| Google Maps API | - | Mapas e rotas |
| Recharts | 2+ | Gráficos |
| next-themes | - | Dark Mode |
| react-hot-toast | - | Notificações toast |
| Docker | - | Containerização |

---

## Funcionalidades Implementadas

### Base

#### Painel do Cliente (`/cliente`)
- Criar nova entrega com cálculo automático de rota e preço
- Três tipos de serviço: Expressa, Agendada, Documentos
- Acompanhar status do pedido
- Cancelar pedidos (quando permitido)
- Avaliar entregas após conclusão
- Histórico de pedidos

#### Painel do Motoboy (`/motoboy`)
- Alternar status (Online/Offline)
- Ver pedidos disponíveis na região
- Aceitar e gerenciar entregas
- Fluxo de status: Aceito → Em Coleta → Em Entrega → Entregue
- Histórico de entregas com estatísticas
- Ver avaliações recebidas

#### Painel Administrativo (`/dashboard`)
- Visão geral com estatísticas
- Gerenciamento de pedidos (filtros, atribuir motoboy, cancelar)
- Gerenciamento de motoboys (status, avaliações, veículos)
- Gerenciamento de clientes (busca, histórico)

---

### Fase 1: Dashboard + Dark Mode + PWA

#### Gráficos no Dashboard
- **Faturamento Mensal**: Gráfico de área mostrando receita por mês
- **Pedidos por Dia**: Gráfico de barras com volume de pedidos
- **Status dos Pedidos**: Gráfico de pizza com distribuição de status

#### Dark Mode
- Toggle de tema claro/escuro em todas as páginas
- Persistência via `localStorage`
- Suporte a preferência do sistema
- Cores otimizadas para ambos os temas

#### PWA (Progressive Web App)
- Manifesto configurado (`/public/manifest.json`)
- Ícones para instalação
- Suporte a instalação em dispositivos móveis

---

### Fase 2: Rastreamento em Tempo Real + Notificações

#### Rastreamento ao Vivo
- Mapa interativo com Google Maps
- Posição do motoboy atualizada em tempo real
- Marcadores: Coleta (verde), Entrega (vermelho), Motoboy (azul)
- Rota desenhada entre pontos
- ETA (tempo estimado de chegada)

#### Compartilhamento de Localização
- Motoboy compartilha GPS automaticamente durante entrega
- Usa API de Geolocalização do navegador
- Indicador visual de compartilhamento ativo

#### Notificações
- Push notifications do navegador
- Toast notifications para feedback
- Alertas de mudança de status
- Notificação de novos pedidos para motoboys

---

### Fase 3: Chat + Comprovante com Foto

#### Sistema de Chat
- Chat em tempo real entre cliente e motoboy
- Mensagens com timestamps
- Indicadores de leitura (✓/✓✓)
- Badge de mensagens não lidas
- Chat flutuante (minimizável)
- Polling automático a cada 5 segundos

#### Comprovante de Entrega
- Captura de foto via câmera do dispositivo
- Preferência para câmera traseira
- Upload da galeria como alternativa
- Preview antes de enviar
- Obrigatório para confirmar entrega
- Cliente visualiza foto após entrega

---

### Fase 4: Sistema de Pagamentos

#### Métodos de Pagamento
- **PIX**: QR Code gerado automaticamente, verificação automática de status
- **Cartão de Crédito**: Validação completa (Luhn, CVV, validade)
- **Cartão de Débito**: Mesmo fluxo do crédito
- **Dinheiro**: Confirmação manual pelo motoboy na entrega

#### Fluxo de Checkout
1. Cliente cria pedido
2. Seleciona método de pagamento
3. PIX: Exibe QR Code e aguarda confirmação
4. Cartão: Processa e aprova/recusa
5. Dinheiro: Registra pendente, motoboy confirma
6. Redirecionamento automático após aprovação

#### Split de Pagamento
```
Taxa da Plataforma: 15%
Ganho do Motoboy: 85%
```

#### Ganhos do Motoboy
- Dashboard com saldo disponível, pendente e total
- Histórico de transações
- Filtros por tipo (crédito, débito, saque)
- Crédito automático ao confirmar pagamento

#### Integrações (Preparado)
- Mercado Pago
- Stripe
- PagSeguro

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

### Autenticação
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/[...nextauth]` | NextAuth handlers |

### Pedidos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/pedidos` | Listar pedidos (com filtros) |
| POST | `/api/pedidos` | Criar pedido |
| GET | `/api/pedidos/[id]` | Buscar pedido |
| PATCH | `/api/pedidos/[id]` | Atualizar pedido |
| DELETE | `/api/pedidos/[id]` | Cancelar pedido |
| GET | `/api/pedidos/[id]/rastreamento` | Dados de rastreamento |
| GET/POST | `/api/pedidos/[id]/mensagens` | Chat do pedido |
| GET/POST | `/api/pedidos/[id]/comprovante` | Foto de comprovante |

### Motoboys
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/motoboys` | Listar motoboys |
| POST | `/api/motoboys` | Criar motoboy |
| GET | `/api/motoboys/[id]` | Buscar motoboy |
| PATCH | `/api/motoboys/[id]` | Atualizar motoboy |
| DELETE | `/api/motoboys/[id]` | Remover motoboy |
| GET/POST | `/api/motoboys/[id]/localizacao` | Localização GPS |

### Clientes
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/clientes` | Listar clientes |
| POST | `/api/clientes` | Criar cliente |
| GET | `/api/clientes/[id]` | Buscar cliente |
| PATCH | `/api/clientes/[id]` | Atualizar cliente |

### Endereços
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/enderecos` | Listar endereços |
| POST | `/api/enderecos` | Criar endereço |
| GET | `/api/enderecos/[id]` | Buscar endereço |
| PATCH | `/api/enderecos/[id]` | Atualizar endereço |
| DELETE | `/api/enderecos/[id]` | Remover endereço |

### Outros
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/avaliacoes` | Criar avaliação |
| POST | `/api/rotas` | Calcular rota |

---

## Modelos de Dados (Prisma)

### User
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  senha         String
  nome          String
  telefone      String?
  role          UserRole  @default(CLIENTE) // ADMIN, CLIENTE, MOTOBOY
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Motoboy
```prisma
model Motoboy {
  id              String        @id @default(cuid())
  userId          String        @unique
  cnh             String        @unique
  veiculoTipo     String
  veiculoMarca    String
  veiculoModelo   String
  veiculoPlaca    String        @unique
  status          StatusMotoboy @default(OFFLINE) // DISPONIVEL, EM_ENTREGA, OFFLINE
  latitudeAtual   Float?
  longitudeAtual  Float?
  avaliacaoMedia  Float         @default(5.0)
  totalEntregas   Int           @default(0)
  ultimaAtividade DateTime?
}
```

### Cliente
```prisma
model Cliente {
  id         String   @id @default(cuid())
  userId     String   @unique
  cpfCnpj    String?  @unique
  tipoPessoa String   @default("PF") // PF ou PJ
  razaoSocial String?
}
```

### Pedido
```prisma
model Pedido {
  id                String       @id @default(cuid())
  clienteId         String
  motoboyId         String?
  enderecoOrigemId  String
  enderecoDestinoId String
  tipoServico       TipoServico  // EXPRESSA, AGENDADA, DOCUMENTOS
  status            StatusPedido @default(SOLICITADO)
  descricaoItem     String?
  observacoes       String?
  pesoAproximado    Float?
  distanciaKm       Float
  duracaoEstimada   Int          // minutos
  valorBase         Float
  multiplicador     Float
  valorTotal        Float
  dataAgendada      DateTime?
  aceitoEm          DateTime?
  coletadoEm        DateTime?
  entregueEm        DateTime?
  canceladoEm       DateTime?
  motivoCancelamento String?
  fotoComprovante   String?
}
```

### Mensagem
```prisma
model Mensagem {
  id         String   @id @default(cuid())
  pedidoId   String
  remetente  String   // 'CLIENTE' ou 'MOTOBOY'
  conteudo   String   @db.Text
  lida       Boolean  @default(false)
  createdAt  DateTime @default(now())
}
```

### Avaliacao
```prisma
model Avaliacao {
  id         String   @id @default(cuid())
  pedidoId   String   @unique
  motoboyId  String
  nota       Int      // 1 a 5
  comentario String?
}
```

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

| Tipo de Serviço | Multiplicador | Exemplo (10km) |
|-----------------|---------------|----------------|
| Agendada | 1.0x | R$ 30,00 |
| Documentos | 1.2x | R$ 36,00 |
| Expressa | 1.5x | R$ 45,00 |

**Base**: R$ 3,00 por km

```typescript
const calcularPreco = (distanciaKm: number, tipoServico: TipoServico) => {
  const PRECO_POR_KM = 3.0
  const MULTIPLICADORES = {
    AGENDADA: 1.0,
    DOCUMENTOS: 1.2,
    EXPRESSA: 1.5,
  }
  return distanciaKm * PRECO_POR_KM * MULTIPLICADORES[tipoServico]
}
```

---

## Fluxo do Pedido

```
                    ┌──────────────┐
                    │  SOLICITADO  │
                    └──────┬───────┘
                           │ Motoboy aceita
                    ┌──────▼───────┐
                    │    ACEITO    │
                    └──────┬───────┘
                           │ Chegou na coleta
                    ┌──────▼───────┐
                    │   EM_COLETA  │
                    └──────┬───────┘
                           │ Saiu para entrega
                    ┌──────▼───────┐
                    │  EM_ENTREGA  │
                    └──────┬───────┘
                           │ Entregou + foto
                    ┌──────▼───────┐
                    │   ENTREGUE   │
                    └──────────────┘

    * CANCELADO pode ocorrer em SOLICITADO ou ACEITO
```

---

## Algoritmo de Alocação

O sistema usa um algoritmo de pontuação para selecionar o melhor motoboy:

```
Score = (0.40 × Proximidade) + (0.35 × Avaliação) + (0.25 × Tempo Ocioso)
```

| Fator | Peso | Descrição |
|-------|------|-----------|
| Proximidade | 40% | Distância até o local de coleta |
| Avaliação | 35% | Média de avaliações do motoboy |
| Tempo Ocioso | 25% | Tempo desde última entrega (FIFO) |

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

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="super-secret-key-change-in-production"

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
npx prisma db push
npx prisma generate
```

### 5. Criar Usuário Admin (Opcional)

```bash
npx tsx scripts/create-admin.ts
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

| Tipo | Email | Senha |
|------|-------|-------|
| Admin | admin@entregapramim.com | admin123 |

Para criar novos usuários, acesse `/registro`

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
npx prisma db push     # Sincronizar schema
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
   - Maps JavaScript API
   - Directions API
   - Distance Matrix API
   - Geocoding API
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
npx prisma db push --force-reset  # Recriar tabelas
```

### Erro de permissão de câmera/localização
- Verifique se está usando HTTPS (ou localhost)
- Permita acesso nas configurações do navegador

---

## Próximas Fases (Roadmap)

- [ ] **Fase 4**: Integração de Pagamentos (PIX/Cartão)
- [ ] **Fase 5**: Agendamento + Cupons de Desconto
- [ ] **Fase 6**: Testes Automatizados + Segurança + Monitoramento

---

## Licença

Projeto privado - Todos os direitos reservados.

---

## Autor

Desenvolvido com Next.js, TypeScript e muito cafe
