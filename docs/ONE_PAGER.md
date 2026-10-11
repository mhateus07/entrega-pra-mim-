# Entrega Pra Mim
### Sistema de gestão para centrais de motofrete

> Sua central despachando, rastreando e fechando o dia num sistema só, com a sua marca, por preço fixo. Sem comissão por corrida.

---

## O problema

Centrais de motofrete e empresas de entrega locais (5 a 50 motoboys) operam pelo WhatsApp e por planilha:

- corridas distribuídas no grupo, sem critério;
- cliente ligando para perguntar "cadê meu motoboy?";
- fechamento do dia no caderno e discussão sobre quantas corridas cada um fez;
- planilha no fim do mês para cobrar cada empresa atendida.

---

## A solução

Um SaaS em que cada central (organização) opera os próprios motoboys e clientes, isolada das outras:

| Recurso | O que resolve |
| --- | --- |
| **Despacho com oferta** | A corrida vai ao motoboy de melhor posição, com 90 s para aceitar; sem aceite, passa ao próximo e depois à fila do despachante |
| **Link de rastreio** | O destinatário acompanha sem conta e sem app, sem expor telefone ou endereço completo |
| **Comprovante com foto** | Prova de entrega no pedido e no link do cliente |
| **Fechamento** | Por motoboy (repasse e acerto do dinheiro recebido) e por empresa (quanto cobrar), com exportação para Excel |
| **Portal da empresa cliente** | A farmácia, a loja ou o escritório abre o pedido sozinho |
| **Tabela de preço da central** | Por km, corrida mínima, tipo de serviço e preço fixo por bairro |
| **Marca própria** | Logo, nome e cor da central no rastreio, no login e no app |

---

## Modelo de receita

**Mensalidade fixa por central. A plataforma não tira comissão da corrida.**

| Plano | Inclui | Preço proposto |
| --- | --- | --- |
| Essencial | Até 5 motoboys e 600 entregas/mês | R$ 149/mês |
| Central | Até 20 motoboys e 2.500 entregas/mês, portal das empresas clientes | R$ 299/mês |
| Marca própria | Até 50 motoboys e 6.000 entregas/mês, marca da central | R$ 499/mês |
| Implantação | Cadastro, tabela de preço e treinamento presencial | R$ 300 a R$ 600, uma vez |

Entrega acima do limite: R$ 0,10 cada (ou mudança de plano). Os valores são uma proposta para validar com os primeiros clientes.

---

## Concorrência

| Alternativa | Como cobra | Onde o EPM ganha |
| --- | --- | --- |
| WhatsApp + planilha | Grátis | Rastreio, comprovante, fechamento e menos briga |
| [Machine / Gaudium](https://www.mobiletime.com.br/?p=724529) | Por corrida, com taxa de adesão | Preço fixo; suporte local; foco em entrega B2B |
| [Foody Delivery](https://saipos.com/foody-delivery) | Planos de R$ 138 a R$ 289 (página da Saipos) | Atende além de comida (farmácia, documentos); integração com o Pedeli |

---

## Onde estamos (out/2026)

- Multi-tenant com isolamento testado em todas as rotas da API
- Despacho com oferta, rastreio público, convites, fechamento e marca própria funcionando
- Pix e cartão ainda simulados (fase 2); hoje a central cobra os clientes como já faz

## Próximos 90 dias

**Meta: 3 centrais pagando e usando no dia a dia em Juiz de Fora**, com 70%+ das corridas delas passando pelo sistema.

1. Conversar com 8 a 10 donos de central antes de vender
2. Piloto pago com 3 centrais (50% de desconto por 60 dias, implantação presencial)
3. Transformar em prova: depoimento e um número concreto ("fechamento caiu de 1 hora para 10 minutos")

## Fase 2 (se a fase 1 vender)

Cobrança Pix pelo sistema, integração com o Pedeli, ETA real pela rota, atualização em tempo real (SSE) e aviso por WhatsApp.

---

**Tecnologia:** Next.js 16 + TypeScript + Prisma + MySQL + Redis + Google Routes API, em Docker. Testes automatizados de isolamento entre centrais, concorrência e segurança rodando no CI.

**Demo:** https://entregapramim.impulsiodigital.com
