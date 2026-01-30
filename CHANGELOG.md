# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/).

---

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
