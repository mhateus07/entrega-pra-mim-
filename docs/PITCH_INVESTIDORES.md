# Entrega Pra Mim
## Plataforma de Gestão de Entregas com Motoboys

---

## 📋 Sumário Executivo

**Entrega Pra Mim** é uma plataforma completa de logística last-mile que conecta empresas, clientes e motoboys em um ecossistema integrado de entregas urbanas. A solução oferece gestão inteligente de entregas, rastreamento em tempo real, cálculo automático de rotas e precificação, sistema de pagamentos integrado e comunicação direta entre todas as partes.

**Status:** MVP funcional em produção
**URL:** https://entregapramim.impulsiodigital.com
**Tecnologia:** Aplicação web responsiva (mobile-first)

---

## 🎯 Problema

O mercado de entregas urbanas enfrenta desafios críticos:

| Problema | Impacto |
|----------|---------|
| **Gestão descentralizada** | Empresas usam WhatsApp e planilhas, gerando erros e perda de pedidos |
| **Falta de rastreamento** | Clientes não sabem onde está sua entrega, gerando ansiedade e reclamações |
| **Precificação inconsistente** | Motoboys cobram valores diferentes, causando conflitos |
| **Comunicação fragmentada** | Ligações e mensagens em múltiplos canais dificultam o acompanhamento |
| **Pagamentos manuais** | Acerto no fim do dia gera inadimplência e desconfiança |

---

## 💡 Solução

Uma plataforma unificada que digitaliza toda a operação de entregas:

### Para Empresas/Administradores
- Dashboard completo com métricas em tempo real
- Gestão de motoboys (cadastro, disponibilidade, avaliações)
- Gestão de clientes e histórico de pedidos
- Relatórios financeiros e operacionais
- Controle de pagamentos e comissões

### Para Clientes
- Solicitação de entregas em poucos cliques
- Cálculo automático de preço baseado em distância
- Rastreamento em tempo real no mapa
- Chat direto com o motoboy
- Histórico completo de pedidos
- Múltiplas formas de pagamento (PIX, cartão)

### Para Motoboys
- App para aceitar/recusar corridas
- Navegação integrada com Google Maps
- Visualização de ganhos em tempo real
- Histórico de corridas e avaliações
- Comprovante de entrega com foto

---

## ⚙️ Funcionalidades Implementadas

### ✅ Módulo de Autenticação
- Login seguro com NextAuth.js
- 3 tipos de usuário: Admin, Cliente, Motoboy
- Sessões persistentes e seguras
- Registro com validação de dados

### ✅ Módulo de Motoboys
- Cadastro completo (dados pessoais, CNH, veículo)
- Sistema de disponibilidade por horário
- Status em tempo real (disponível, em entrega, offline)
- Atualização de localização GPS
- Histórico de entregas e avaliações
- Sistema de ranking por performance

### ✅ Módulo de Clientes
- Cadastro simplificado (PF/PJ)
- Gerenciamento de endereços favoritos
- Histórico completo de pedidos

### ✅ Módulo de Pedidos
- **3 Tipos de Serviço:**
  - Expressa (coleta imediata) - +50% no valor
  - Agendada (data/hora específica) - preço base
  - Documentos (com confirmação) - +20% no valor

- **Fluxo completo:**
  1. Solicitado → 2. Aceito → 3. Em Coleta → 4. Em Entrega → 5. Entregue

- Cálculo automático de rota e preço
- Observações e instruções especiais

### ✅ Integração Google Maps
- Cálculo de distância real (não linha reta)
- Estimativa de tempo de entrega
- Visualização de rota no mapa
- Geocodificação de endereços
- Rastreamento em tempo real

### ✅ Sistema de Alocação Inteligente
Algoritmo de pontuação para escolher o melhor motoboy:

```
Score = (40% × Proximidade) + (35% × Avaliação) + (25% × Tempo Disponível)
```

- Prioriza motoboys mais próximos
- Considera histórico de avaliações
- Implementa fila justa (FIFO)

### ✅ Rastreamento em Tempo Real
- Atualização da posição do motoboy a cada 10 segundos
- Mapa interativo com rota e posição atual
- Estimativa de chegada dinâmica
- Notificações de status

### ✅ Chat Integrado
- Comunicação direta cliente ↔ motoboy
- Histórico de mensagens por pedido
- Interface simples e intuitiva

### ✅ Comprovante de Entrega
- Captura de foto no momento da entrega
- Armazenamento seguro de imagens
- Prova de entrega para disputas

### ✅ Sistema de Pagamentos
- **PIX:** QR Code gerado automaticamente
- **Cartão:** Integração preparada para gateway
- Histórico de transações
- Controle de saldo do motoboy

### ✅ Dashboard Administrativo
- Visão geral de pedidos (hoje, semana, mês)
- Métricas de performance
- Gráficos de faturamento
- Gestão de usuários
- Relatórios exportáveis

### ✅ Interface Responsiva
- Design mobile-first
- Funciona em qualquer dispositivo
- Tema claro/escuro
- UI moderna com Tailwind CSS

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| **Frontend** | Next.js 14 + React 18 | Framework moderno, SSR, performance |
| **Estilização** | Tailwind CSS | Desenvolvimento rápido, responsivo |
| **Backend** | Next.js API Routes | Full-stack unificado, serverless-ready |
| **Banco de Dados** | MySQL + Prisma ORM | Robusto, escalável, type-safe |
| **Autenticação** | NextAuth.js | Seguro, flexível, padrão de mercado |
| **Mapas** | Google Maps API | Líder de mercado, precisão máxima |
| **Linguagem** | TypeScript | Segurança de tipos, menos bugs |
| **Hospedagem** | VPS Linux (Ubuntu) | Controle total, custo-benefício |
| **Process Manager** | PM2 | Auto-restart, monitoramento |
| **Proxy Reverso** | Traefik | SSL automático, load balancing |

### Arquitetura
```
┌─────────────────────────────────────────────────────────┐
│                      CLIENTE                            │
│              (Browser / Mobile)                         │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS
┌─────────────────────▼───────────────────────────────────┐
│                    TRAEFIK                              │
│            (Proxy Reverso + SSL)                        │
└─────────────────────┬───────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────┐
│                   NEXT.JS                               │
│     ┌───────────────┬───────────────┐                   │
│     │    Frontend   │   API Routes  │                   │
│     │    (React)    │   (Backend)   │                   │
│     └───────────────┴───────────────┘                   │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼───────┐ ┌───▼───┐ ┌──────▼──────┐
│    MySQL      │ │ Google│ │  Storage    │
│   (Prisma)    │ │ Maps  │ │  (Uploads)  │
└───────────────┘ └───────┘ └─────────────┘
```

---

## 📊 Modelo de Negócio

### Fontes de Receita

| Modelo | Descrição | Projeção |
|--------|-----------|----------|
| **Taxa por entrega** | 10-15% sobre cada corrida | Principal |
| **Assinatura Premium** | Plano mensal para empresas com volume | Recorrente |
| **Taxa de urgência** | Adicional em entregas expressas | Variável |

### Precificação Base
- **R$ 3,00 por km** (ajustável por região)
- Multiplicadores por tipo de serviço
- Taxas adicionais configuráveis (horário, peso, etc.)

### Exemplo de Cálculo
| Distância | Tipo | Cálculo | Valor Final |
|-----------|------|---------|-------------|
| 10 km | Agendada | 10 × R$ 3,00 × 1.0 | R$ 30,00 |
| 10 km | Documentos | 10 × R$ 3,00 × 1.2 | R$ 36,00 |
| 10 km | Expressa | 10 × R$ 3,00 × 1.5 | R$ 45,00 |

---

## 📈 Mercado

### TAM (Mercado Total)
- Mercado de logística last-mile no Brasil: **R$ 30+ bilhões/ano**
- Crescimento anual: **15-20%**

### SAM (Mercado Endereçável)
- Entregas urbanas por motoboys: **R$ 8 bilhões/ano**
- Foco inicial: pequenas e médias empresas

### SOM (Mercado Alcançável)
- Meta ano 1: **R$ 500 mil em GMV**
- Meta ano 2: **R$ 2 milhões em GMV**
- Meta ano 3: **R$ 10 milhões em GMV**

### Público-Alvo Inicial
1. **Restaurantes e dark kitchens** - entregas de comida
2. **E-commerces locais** - entregas same-day
3. **Farmácias** - entregas urgentes
4. **Escritórios de advocacia/contabilidade** - documentos
5. **Floriculturas** - entregas expressas

---

## 🏆 Diferenciais Competitivos

| Diferencial | Concorrentes | Entrega Pra Mim |
|-------------|--------------|-----------------|
| **Custo** | Taxas de 20-30% | Taxas de 10-15% |
| **Tecnologia própria** | Dependem de terceiros | 100% proprietária |
| **Customização** | Padronizado | Adaptável por cliente |
| **Suporte** | Automatizado | Humanizado |
| **White-label** | Não disponível | Disponível |
| **Integração** | Limitada | API aberta |

### Vantagens Técnicas
- **Código proprietário** - não depende de plataformas terceiras
- **Escalável** - arquitetura preparada para crescimento
- **Modular** - fácil adicionar novas funcionalidades
- **Open API** - integração com sistemas existentes

---

## 🚀 Roadmap

### ✅ Fase 1 - MVP (Concluído)
- [x] Sistema de autenticação
- [x] Cadastro de motoboys e clientes
- [x] Criação e gestão de pedidos
- [x] Integração Google Maps
- [x] Rastreamento em tempo real
- [x] Chat integrado
- [x] Comprovante com foto
- [x] Sistema de pagamentos
- [x] Dashboard administrativo
- [x] Deploy em produção

### 📋 Fase 2 - Otimização (Q1 2026)
- [ ] App nativo iOS/Android (React Native)
- [ ] Notificações push
- [ ] Integração com gateways de pagamento (Stripe, Mercado Pago)
- [ ] Sistema de cupons e promoções
- [ ] Programa de fidelidade

### 📋 Fase 3 - Expansão (Q2-Q3 2026)
- [ ] Multi-tenancy (várias empresas na mesma plataforma)
- [ ] API pública para integrações
- [ ] Integração com iFood, Rappi (agregador)
- [ ] Sistema de rotas otimizadas (múltiplas entregas)
- [ ] BI e analytics avançado

### 📋 Fase 4 - Escala (Q4 2026)
- [ ] Expansão para outras cidades
- [ ] Marketplace de motoboys
- [ ] Seguros integrados
- [ ] Financiamento para motoboys (antecipação)

---

## 💰 Investimento

### Uso dos Recursos

| Área | Percentual | Aplicação |
|------|------------|-----------|
| **Tecnologia** | 40% | Apps nativos, infraestrutura, segurança |
| **Marketing** | 30% | Aquisição de clientes e motoboys |
| **Operações** | 20% | Equipe, suporte, processos |
| **Reserva** | 10% | Capital de giro |

### Métricas de Acompanhamento
- **GMV** (Volume Bruto de Mercadorias)
- **Take Rate** (Taxa de comissão efetiva)
- **CAC** (Custo de Aquisição de Cliente)
- **LTV** (Valor Vitalício do Cliente)
- **Churn** (Taxa de cancelamento)
- **NPS** (Satisfação do cliente)

---

## 👥 Equipe Necessária

### Estrutura Inicial
| Função | Responsabilidade |
|--------|------------------|
| **CEO/Founder** | Estratégia, vendas, investidores |
| **CTO** | Tecnologia, produto, infraestrutura |
| **Operações** | Onboarding, suporte, qualidade |
| **Marketing** | Aquisição, branding, growth |

### Fase de Escala (+6 meses)
- Desenvolvedores adicionais
- Equipe de suporte
- Comercial/Vendas
- Financeiro

---

## 📞 Contato

**Plataforma:** https://entregapramim.impulsiodigital.com
**Repositório:** Privado (disponível sob NDA)
**Documentação técnica:** Disponível

---

## 📎 Anexos

### Screenshots da Plataforma
*(Disponíveis mediante solicitação)*

1. Dashboard Administrativo
2. Tela de Novo Pedido (Cliente)
3. Rastreamento em Tempo Real
4. Interface do Motoboy
5. Sistema de Pagamentos

### Documentação Técnica
- Arquitetura do Sistema
- Modelagem do Banco de Dados
- API Reference
- Guia de Deploy

---

*Documento gerado em Janeiro/2026*
*Versão 1.0*
