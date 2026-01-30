# Resumo Técnico - Entrega Pra Mim

## Visão Geral

Plataforma de entregas com motoboys desenvolvida em **3 fases**, utilizando tecnologias modernas e boas práticas de desenvolvimento.

---

## Tecnologias Utilizadas

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| Frontend | Next.js 14 (App Router) | SSR, SEO, API Routes integradas |
| Linguagem | TypeScript | Tipagem estática, melhor DX |
| Estilização | Tailwind CSS | Utility-first, produtividade |
| Banco de Dados | MySQL 8.0 | Relacional, robusto, escalável |
| ORM | Prisma | Type-safe, migrations, studio |
| Autenticação | NextAuth.js | Flexível, session management |
| Mapas | Google Maps API | Rotas, distâncias, geocoding |
| Gráficos | Recharts | React-based, customizável |
| Temas | next-themes | Dark mode simplificado |
| Notificações | react-hot-toast | Toast notifications elegantes |

---

## Arquitetura

### Padrão de Projeto
- **App Router** do Next.js 14
- **Route Groups** para organização (`(auth)`, `(cliente)`, etc.)
- **API Routes** para backend
- **Server Components** onde possível
- **Client Components** para interatividade

### Estrutura de Pastas
```
src/
├── app/           # Páginas e APIs (App Router)
├── components/    # Componentes React reutilizáveis
├── hooks/         # Custom hooks
├── lib/           # Configurações e utilitários
├── types/         # Tipos TypeScript
└── utils/         # Funções auxiliares
```

### Banco de Dados
- **9 tabelas** principais
- Relacionamentos bem definidos
- Índices para performance
- Soft delete onde aplicável

---

## Funcionalidades por Fase

### Fase Base (v1.0.0)
| Funcionalidade | Status |
|----------------|--------|
| Autenticação (Login/Registro) | Completo |
| 3 tipos de usuário (Admin, Cliente, Motoboy) | Completo |
| CRUD de Pedidos | Completo |
| CRUD de Motoboys | Completo |
| CRUD de Clientes | Completo |
| CRUD de Endereços | Completo |
| Cálculo de rotas (Google Maps) | Completo |
| Sistema de preços por km | Completo |
| Algoritmo de alocação | Completo |
| Sistema de avaliações | Completo |
| Dashboard Admin | Completo |
| Dashboard Cliente | Completo |
| Dashboard Motoboy | Completo |

### Fase 1 (v1.1.0) - Dashboard + Dark Mode + PWA
| Funcionalidade | Status |
|----------------|--------|
| Gráfico de Faturamento | Completo |
| Gráfico de Pedidos/Dia | Completo |
| Gráfico de Status | Completo |
| Dark Mode toggle | Completo |
| Persistência de tema | Completo |
| PWA Manifest | Completo |
| Meta tags PWA | Completo |

### Fase 2 (v1.2.0) - Rastreamento + Notificações
| Funcionalidade | Status |
|----------------|--------|
| Mapa de rastreamento | Completo |
| Localização do motoboy em tempo real | Completo |
| Compartilhamento de GPS | Completo |
| Push notifications (browser) | Completo |
| Toast notifications | Completo |
| Polling para atualizações | Completo |
| ETA (tempo estimado) | Completo |

### Fase 3 (v1.3.0) - Chat + Comprovante
| Funcionalidade | Status |
|----------------|--------|
| Chat cliente-motoboy | Completo |
| Mensagens em tempo real (polling) | Completo |
| Indicadores de leitura | Completo |
| Captura de foto (câmera) | Completo |
| Upload de galeria | Completo |
| Comprovante obrigatório | Completo |
| Visualização pelo cliente | Completo |

---

## APIs Desenvolvidas

### Autenticação
- `POST /api/auth/[...nextauth]` - NextAuth handlers

### Pedidos
- `GET /api/pedidos` - Listar (com filtros)
- `POST /api/pedidos` - Criar
- `GET /api/pedidos/[id]` - Buscar
- `PATCH /api/pedidos/[id]` - Atualizar
- `DELETE /api/pedidos/[id]` - Cancelar
- `GET /api/pedidos/[id]/rastreamento` - Tracking
- `GET/POST /api/pedidos/[id]/mensagens` - Chat
- `GET/POST /api/pedidos/[id]/comprovante` - Foto

### Motoboys
- `GET /api/motoboys` - Listar
- `POST /api/motoboys` - Criar
- `GET /api/motoboys/[id]` - Buscar
- `PATCH /api/motoboys/[id]` - Atualizar
- `DELETE /api/motoboys/[id]` - Remover
- `GET/POST /api/motoboys/[id]/localizacao` - GPS

### Clientes
- `GET /api/clientes` - Listar
- `POST /api/clientes` - Criar
- `GET /api/clientes/[id]` - Buscar
- `PATCH /api/clientes/[id]` - Atualizar

### Endereços
- `GET /api/enderecos` - Listar
- `POST /api/enderecos` - Criar
- `GET /api/enderecos/[id]` - Buscar
- `PATCH /api/enderecos/[id]` - Atualizar
- `DELETE /api/enderecos/[id]` - Remover

### Outros
- `POST /api/avaliacoes` - Criar avaliação
- `POST /api/rotas` - Calcular rota

---

## Componentes Desenvolvidos

### UI Base
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| Button | `ui/Button.tsx` | Botão com variantes e loading |
| Card | `ui/Card.tsx` | Container estilizado |
| Badge | `ui/Badge.tsx` | Tag colorida |
| ThemeToggle | `ui/ThemeToggle.tsx` | Toggle dark/light |

### Gráficos
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| FaturamentoChart | `charts/DashboardCharts.tsx` | Área chart |
| PedidosPorDiaChart | `charts/DashboardCharts.tsx` | Bar chart |
| StatusPedidosChart | `charts/DashboardCharts.tsx` | Pie chart |

### Mapas
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| TrackingMap | `maps/TrackingMap.tsx` | Mapa com tracking |

### Chat
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| ChatBox | `chat/ChatBox.tsx` | Chat flutuante |

### Câmera
| Componente | Arquivo | Descrição |
|------------|---------|-----------|
| PhotoCapture | `camera/PhotoCapture.tsx` | Captura de foto |

---

## Hooks Customizados

| Hook | Arquivo | Descrição |
|------|---------|-----------|
| useTracking | `hooks/useTracking.ts` | Rastreamento de pedido |
| useLocationSharing | `hooks/useTracking.ts` | Compartilhamento GPS |
| useNotifications | `hooks/useNotifications.ts` | Push notifications |

---

## Modelos de Dados

```
User (1) ──── (1) Motoboy
  │               │
  │               ├── (N) Pedido
  │               ├── (N) Avaliacao
  │               └── (N) Disponibilidade
  │
  └──── (1) Cliente
            │
            ├── (N) Endereco
            └── (N) Pedido
                    │
                    ├── (1) Avaliacao
                    └── (N) Mensagem
```

---

## Algoritmos Implementados

### Cálculo de Preço
```typescript
valorTotal = distanciaKm * PRECO_POR_KM * MULTIPLICADOR[tipoServico]

// PRECO_POR_KM = 3.00
// MULTIPLICADORES = { AGENDADA: 1.0, DOCUMENTOS: 1.2, EXPRESSA: 1.5 }
```

### Alocação de Motoboy
```typescript
score = (0.40 * proximidadeNorm) +
        (0.35 * avaliacaoNorm) +
        (0.25 * tempoOciosoNorm)

// Motoboy com maior score recebe a oferta
```

---

## Segurança

- Senhas hasheadas com bcrypt (salt rounds: 10)
- Sessões gerenciadas pelo NextAuth
- Validação de entrada com Zod
- Verificação de permissões por role
- Proteção contra CSRF
- Sanitização de uploads

---

## Performance

- Server Components para renderização inicial
- Client Components apenas onde necessário
- Polling otimizado (5-10 segundos)
- Lazy loading de componentes pesados
- Índices no banco de dados

---

## Próximos Passos (Roadmap)

### Fase 4 - Pagamentos
- [ ] Integração com gateway de pagamento
- [ ] PIX automático
- [ ] Cartão de crédito/débito
- [ ] Histórico de transações
- [ ] Split de pagamento (motoboy/plataforma)

### Fase 5 - Agendamento + Cupons
- [ ] Calendário para agendamentos
- [ ] Recorrência de pedidos
- [ ] Sistema de cupons
- [ ] Programa de fidelidade

### Fase 6 - Qualidade + Monitoramento
- [ ] Testes unitários (Jest)
- [ ] Testes E2E (Playwright)
- [ ] Logging estruturado
- [ ] Métricas de performance
- [ ] Alertas de erro
