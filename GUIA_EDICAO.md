# Guia Rápido de Edição - Entrega Pra Mim

## Páginas Principais

| O que editar | Arquivo |
|--------------|---------|
| **Página inicial (Landing)** | `src/app/page.tsx` |
| **Login** | `src/app/(auth)/login/page.tsx` |
| **Cadastro** | `src/app/(auth)/cadastro/page.tsx` |
| **Dashboard Admin** | `src/app/(dashboard)/dashboard/page.tsx` |
| **Área do Cliente** | `src/app/(cliente)/cliente/page.tsx` |
| **Área do Motoboy** | `src/app/(motoboy)/motoboy/page.tsx` |

---

## Layout e Componentes Visuais

| O que editar | Arquivo |
|--------------|---------|
| **Cabeçalho (Header)** | `src/components/ui/Header.tsx` |
| **Layout geral (HTML, fontes)** | `src/app/layout.tsx` |
| **Estilos globais (CSS)** | `src/app/globals.css` |
| **Botões** | `src/components/ui/Button.tsx` |
| **Cards** | `src/components/ui/Card.tsx` |
| **Inputs** | `src/components/ui/Input.tsx` |
| **Badges (etiquetas)** | `src/components/ui/Badge.tsx` |
| **Toggle dark/light** | `src/components/ui/ThemeToggle.tsx` |

---

## Formulários

| O que editar | Arquivo |
|--------------|---------|
| **Novo Pedido** | `src/components/forms/NovoPedidoForm.tsx` |

---

## Mapas e Rastreamento

| O que editar | Arquivo |
|--------------|---------|
| **Mapa** | `src/components/maps/MapContainer.tsx` |
| **Rastreamento** | `src/components/maps/TrackingMap.tsx` |

---

## Pagamentos

| O que editar | Arquivo |
|--------------|---------|
| **Formulário pagamento** | `src/components/payment/PaymentForm.tsx` |
| **Pagamento PIX** | `src/components/payment/PixPayment.tsx` |

---

## Chat

| O que editar | Arquivo |
|--------------|---------|
| **Caixa de chat** | `src/components/chat/ChatBox.tsx` |

---

## Configurações e Lógica

| O que editar | Arquivo |
|--------------|---------|
| **Preços por km** | `src/lib/pricing.ts` |
| **Conexão banco de dados** | `src/lib/prisma.ts` |
| **Autenticação** | `src/lib/auth.ts` |
| **Variáveis de ambiente** | `.env` |

---

## Banco de Dados

| O que editar | Arquivo |
|--------------|---------|
| **Estrutura das tabelas** | `prisma/schema.prisma` |

Após editar o schema, rode:
```bash
npx prisma db push
```

---

## Estrutura de Pastas

```
src/
├── app/
│   ├── page.tsx           ← Página inicial
│   ├── layout.tsx         ← Layout geral
│   ├── globals.css        ← CSS global
│   ├── (auth)/            ← Login/Cadastro
│   ├── (cliente)/         ← Área cliente
│   ├── (motoboy)/         ← Área motoboy
│   ├── (dashboard)/       ← Admin
│   └── api/               ← APIs (backend)
│
├── components/
│   ├── ui/                ← Botões, Cards, Header
│   ├── forms/             ← Formulários
│   ├── maps/              ← Mapas
│   ├── chat/              ← Chat
│   └── payment/           ← Pagamentos
│
└── lib/                   ← Configurações
```

---

## APIs (Backend)

| Endpoint | Arquivo |
|----------|---------|
| **Autenticação** | `src/app/api/auth/[...nextauth]/route.ts` |
| **Pedidos** | `src/app/api/pedidos/route.ts` |
| **Motoboys** | `src/app/api/motoboys/route.ts` |
| **Clientes** | `src/app/api/clientes/route.ts` |
| **Endereços** | `src/app/api/enderecos/route.ts` |
| **Pagamentos** | `src/app/api/pagamentos/route.ts` |
| **Avaliações** | `src/app/api/avaliacoes/route.ts` |
| **Rotas (Google Maps)** | `src/app/api/rotas/route.ts` |

---

## Comandos Úteis

```bash
# Rodar projeto em desenvolvimento
npm run dev

# Atualizar banco de dados após mudar schema
npx prisma db push

# Visualizar banco de dados
npx prisma studio

# Build para produção
npm run build

# Rodar em produção
npm start
```

---

## Cores e Tema

As cores principais estão em `src/app/globals.css` e usam Tailwind CSS.

Cores mais usadas no projeto:
- **Primária:** `blue-600` / `blue-500`
- **Sucesso:** `green-600` / `green-500`
- **Alerta:** `yellow-600` / `yellow-500`
- **Erro:** `red-600` / `red-500`
- **Fundo claro:** `gray-50` / `white`
- **Fundo escuro:** `gray-900` / `gray-800`

---

## Credenciais de Teste

```
Admin:    admin@entregapramim.com / Demo@123
Cliente:  cliente@entregapramim.com / Demo@123
Motoboy:  motoboy@entregapramim.com / Demo@123
```
