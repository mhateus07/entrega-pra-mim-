# Entrega Pra Mim
## SaaS de gestão para centrais de motofrete

---

## Sumário executivo

O **Entrega Pra Mim (EPM)** é o sistema de gestão das centrais de motofrete e empresas de entrega locais que hoje operam por WhatsApp e planilha. Cada central usa o EPM para despachar os próprios motoboys, atender as empresas clientes dela e mostrar o rastreio com a própria marca. A central paga uma **mensalidade fixa**; a plataforma **não tira comissão da corrida**.

A escolha é deliberada: em vez de competir como marketplace (Uber Flash, 99Entrega, Lalamove), o EPM vende a ferramenta para quem já tem frota e clientes. Não há o problema do "ovo e a galinha" nem dinheiro de terceiros para intermediar.

**Status:** sistema multi-tenant funcionando, a caminho do piloto pago com 3 centrais em Juiz de Fora.
**Demo:** https://entregapramim.impulsiodigital.com

---

## Problema

| Hoje, na central | Consequência |
| --- | --- |
| Corridas distribuídas no grupo de WhatsApp | Sem critério, sem registro, motoboy parado enquanto outro acumula |
| Cliente liga para saber onde está a entrega | Despachante preso ao telefone; cliente insatisfeito |
| Fechamento do dia no caderno | Discussão sobre quantas corridas cada motoboy fez |
| Cobrança das empresas por planilha | Horas no fim do mês e erros de cobrança |
| Sem prova de entrega | Disputa quando o destinatário diz que não recebeu |

---

## Solução

| Para | O que o EPM entrega |
| --- | --- |
| **Dono da central** | Painel da operação, tabela de preço própria, fechamento por motoboy e por empresa, plano e consumo do mês |
| **Despachante** | Despacho com oferta automática e fila "sem motoboy" para atribuir na mão |
| **Motoboy** | App no celular (PWA) com ofertas de corrida, contagem de 90 s, navegação e comprovante com foto |
| **Empresa cliente** | Portal para abrir pedidos sozinha e acompanhar as entregas |
| **Destinatário** | Link de rastreio sem conta e sem app, com a marca da central |

### Funcionalidades implementadas (out/2026)

- **Multi-tenant:** cada central só vê os próprios dados. Uma suíte de testes com duas centrais prova o isolamento em todas as rotas da API.
- **Convites:** motoboys, empresas e despachantes entram por link de uso único. O cadastro público é só "criar minha central".
- **Despacho com oferta:** score por proximidade, avaliação e tempo parado. Prazo para aceitar, reoferta e fila manual após 3 tentativas.
- **Rastreio público:** status, ETA aproximado, posição só durante a entrega e foto do comprovante. Sem telefone, documento ou endereço completo.
- **Fechamento:** repasse ao motoboy (percentual configurável), acerto do dinheiro recebido em mãos, valor a cobrar por empresa e exportação CSV.
- **Preço por central:** valor por km, mínimo, multiplicador por serviço e preço fixo por bairro. O preço fica congelado no pedido.
- **Planos e limites:** motoboys ativos e entregas por mês. Aviso ao passar do limite e bloqueio só acima de 120%.
- **Marca própria:** logo, nome e cor no rastreio, no login da central e no app.
- **Segurança:** aprovação de motoboy, auditoria, idempotência, rate limit, headers de segurança e sessão revalidada.

**Ainda não implementado (fase 2):** Pix e cartão pelo sistema (hoje simulados), integração com o Pedeli, ETA pela rota real, atualização em tempo real (SSE) e aviso por WhatsApp.

---

## Modelo de negócio

**Mensalidade fixa por central, em três faixas, mais implantação.**

| Plano | Limites | Preço proposto |
| --- | --- | --- |
| Essencial | 5 motoboys, 600 entregas/mês | R$ 149/mês |
| Central | 20 motoboys, 2.500 entregas/mês, portal das empresas | R$ 299/mês |
| Marca própria | 50 motoboys, 6.000 entregas/mês, marca da central | R$ 499/mês |
| Implantação | Cadastro, tabela de preço, treinamento presencial | R$ 300 a R$ 600, uma vez |

- Entrega acima do limite: R$ 0,10 cada, ou mudança de plano.
- Os valores são uma **proposta** para validar com os primeiros clientes.
- Receita futura opcional: taxa por transação Pix, só depois do gateway (fase 2).

### Custo variável principal

O Google Maps (Routes API e Geocoding) é medido por central e por mês, e rotas e endereços repetidos saem de cache. O objetivo é manter esse custo abaixo de 10% da mensalidade. O preço da API precisa ser conferido na tabela atual do Google.

---

## Mercado e cliente ideal

O foco inicial são **centrais de motofrete com 5 a 50 motoboys** que atendem empresas com contrato mensal (farmácias, lojas, escritórios) e despacham pelo WhatsApp.

A ordem de entrada é: centrais de motofrete → restaurantes e lojas com frota própria (junto com o Pedeli) → farmácias, laboratórios e cartórios → cidades pequenas da Zona da Mata (fase 3, white-label).

> O tamanho do mercado de software para centrais ainda não foi medido. O primeiro passo é levantar de 20 a 30 centrais em Juiz de Fora e conversar com 8 a 10 donos. Os números de mercado entram aqui quando tiverem fonte.

---

## Concorrência

| Concorrente | Modelo | Onde o EPM ganha |
| --- | --- | --- |
| WhatsApp + planilha | Grátis | Rastreio, comprovante, fechamento e menos discussão |
| [Machine / Gaudium](https://www.mobiletime.com.br/?p=724529) | White-label de transporte e entregas, cobrado por corrida com taxa de adesão | Preço fixo e previsível; suporte local; foco em entrega B2B |
| [Foody Delivery](https://saipos.com/foody-delivery) | Logística para restaurantes, planos de R$ 138 a R$ 289 | Atende também o que não é comida; integração com o Pedeli |
| Uber Flash, 99Entrega, Lalamove | Marketplaces por corrida | Não disputam a central: o EPM ajuda a central a se defender deles |

Os dados de concorrentes vêm de páginas públicas e devem ser confirmados pedindo proposta como cliente.

### Diferenciais a defender

1. **A marca é da central:** o cliente final vê o logo e o nome dela, não o do EPM.
2. **Preço fixo, sem comissão:** fica mais barato quanto mais a central cresce.
3. **Pedeli + EPM:** restaurantes no Pedeli chamam motoboy da central parceira, um canal de vendas que os concorrentes locais não têm.

---

## Metas e sinais

| Marco | Meta | Receita mensal aproximada |
| --- | --- | --- |
| 90 dias | 3 centrais pagantes; 70%+ das corridas delas no sistema | ~R$ 450 (com desconto de piloto) |
| 6 meses | 10 centrais, ao menos 3 fora de Juiz de Fora | ~R$ 3.000 |
| 12 meses | 25 centrais; cancelamento abaixo de 3% ao mês | ~R$ 7.500 |

**Sinal para parar ou mudar:** se, depois de 10 conversas, nenhuma central topar um piloto pago, o problema é o segmento ou a oferta, e não o código.

### Riscos

| Risco | Mitigação |
| --- | --- |
| Titularidade do código (projeto nasceu sob encomenda) | Resolver cessão ou licença com o cliente original antes de vender |
| Foco dividido com o Pedeli | Limitar o tempo do EPM até haver uma central pagando |
| Custo do Google Maps | Medição por central desde o primeiro dia; cache de cotação |
| Dados de localização (LGPD) | Política de retenção, termos de uso e contrato de operação de dados com cada central |

---

## Stack tecnológica

| Camada | Tecnologia |
| --- | --- |
| Aplicação | Next.js 16 (App Router) + React 19 + TypeScript |
| Dados | MySQL 8 + Prisma (migrations versionadas), Redis opcional (rate limit e cache) |
| Autenticação | NextAuth (sessão JWT revalidada), papéis por central |
| Mapas | Google Routes API e Geocoding, com cache e medição por central |
| Infra | Docker Compose atrás do Traefik, job de despacho em contêiner auxiliar |
| Qualidade | CI com migrations, lint, tipos, testes de integração em MySQL (isolamento, concorrência, segurança) e build |

---

*Atualizado em outubro/2026 com o reposicionamento para SaaS (ver `docs/PLANO_NEGOCIO.md`).*
