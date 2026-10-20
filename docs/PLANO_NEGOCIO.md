# Entrega Pra Mim — Plano de Negócio

20/10/2026 · Mateus · versão editável: https://claude.ai/code/artifact/fbb9bf98-85b9-467e-b2c8-4714c0f3d6c6

## Resumo

**Recomendação: deixar de ser um "iFood de motoboy" e virar o sistema de gestão das empresas de motoboy que já existem.** O Entrega Pra Mim (EPM) hoje é pensado como marketplace: a plataforma conecta empresa, cliente e motoboy e fica com 15% de cada corrida. Esse modelo exige ter motoboys e clientes ao mesmo tempo na mesma cidade, dinheiro para subsidiar os dois lados e concorrer com Uber Flash, 99Entrega e Lalamove. Para uma operação de uma pessoa em Juiz de Fora, é a briga errada.

A tese proposta:

1. **Quem paga:** centrais de motofrete e empresas de entrega locais (5 a 50 motoboys) que hoje despacham por WhatsApp e planilha.
2. **O que compram:** despacho, rastreio com link para o cliente, comprovante com foto, fechamento do dia por motoboy e relatório para cobrar os clientes delas.
3. **Como cobra:** mensalidade fixa por central + faixa de entregas, sem tirar comissão da corrida. A frota e a relação com o cliente continuam sendo da central.
4. **Diferencial:** marca própria da central (white-label) e integração com o Pedeli, que já atende restaurantes que precisam de entrega.
5. **Meta inicial:** 3 centrais pagantes em Juiz de Fora em 90 dias, antes de qualquer expansão.

Na prática, o EPM deixa de precisar "ter" motoboys. Ele passa a vender a ferramenta para quem já tem.

## Onde o projeto está hoje

O EPM tem uma base técnica boa para piloto. O sistema já atende várias centrais no mesmo ambiente, com isolamento por organização, despacho com oferta, rastreio público, marca própria e fechamento. Ainda não deve processar pagamentos eletrônicos reais: em produção, o fluxo disponível é dinheiro e o gateway continua sendo fase 2.

| Área | Situação | O que significa na prática |
| --- | --- | --- |
| Pedido, rota e preço (Google Routes API) | Funciona | O cliente pede e o preço sai sozinho pela distância |
| App do motoboy (PWA), status, foto de comprovante | Funciona | Dá para operar entregas reais hoje |
| Rastreio e chat | Funciona, por *polling* a cada 5–10 s | Serve no piloto; fica caro com volume |
| Aprovação de motoboy, auditoria, idempotência, rate limit | Funciona (P0, out/2026) | Seguro o bastante para um piloto |
| Pix e cartão | **Simulado**; em produção só aceita dinheiro | Não há como cobrar nem repassar pelo sistema |
| Despacho automático | Oferece ao melhor motoboy, expira, reoferta e cai na fila manual | O job de despacho precisa estar ativo em produção |
| ETA | Aproximado; usa a posição atual em linha reta durante a entrega | A rota real e o ETA calibrado ficam para a fase 2 |
| Várias empresas no mesmo sistema (multi-tenant) | **Implementado e coberto por testes** | É a base para vender como SaaS; falta validar o piloto com centrais reais |

**Parte técnica:** Next.js 16.4 (App Router) + Prisma + MySQL + Redis opcional + Docker, com 168 testes passando, além de lint, typecheck e build. O schema usa `Organization`, `OrganizationMember`, pedidos, despacho, pagamentos, fechamento, uso, convites e auditoria. Os papéis são por central (`OWNER`, `DISPATCHER`, `CLIENT`, `DRIVER`) e há `SUPERADMIN` da plataforma. O gateway eletrônico continua fora do piloto.

## Por que mudar o modelo

O problema do marketplace não é o código. É o "ovo e a galinha": sem motoboys, nenhum cliente fica; sem pedidos, nenhum motoboy fica. Resolver isso custa caro em marketing e subsídio, e quem já está na cidade (Uber Flash, 99Entrega) tem os dois lados prontos.

| | Marketplace (modelo atual do one-pager) | SaaS para centrais (recomendado) |
| --- | --- | --- |
| Quem você precisa conquistar | Motoboys + empresas + consumidores, ao mesmo tempo | Só o dono da central |
| Receita | 10–15% da corrida, só quando há corrida | Mensalidade previsível |
| Responsabilidade | Atrasos, avarias, disputas trabalhistas e de pagamento ficam com você | Ficam com a central; você fornece a ferramenta |
| Dinheiro de terceiros | Recebe e repassa (exige gateway, split, KYC, conciliação) | Opcional: a central cobra os clientes dela como já faz |
| Concorrência direta | Uber Flash, 99Entrega, Lalamove, iFood | Machine Entregas, Foody Delivery, planilha e WhatsApp |
| Escala | Cidade a cidade, com operação | Venda remota, a mesma ferramenta serve qualquer cidade |

O marketplace não some: vira a fase 3. Uma central que usa o EPM pode, mais tarde, abrir pedidos para o público com a marca dela. Isso nasce já com frota e clientes.

**Parte técnica:** quase todo o código atual já se aproveita. Os papéis são por organização: o `OWNER` administra a central, o `DISPATCHER` opera o despacho, o `CLIENT` solicita/acompanha entregas e o `DRIVER` executa corridas. A central controla preço, plano, marca, limites e repasse operacional. O split de 15% (`taxa da plataforma`) não é regra do piloto e pagamentos eletrônicos ficam fora da primeira venda.

## Pra quem vender

**Comece pelas centrais de motofrete de Juiz de Fora.** São elas que têm a dor mais cara, decidem rápido (o dono é quem compra) e já têm motoboys. Os outros segmentos entram depois, nesta ordem.

| Prioridade | Segmento | A dor (o que acontece hoje) | Por que comprariam o EPM |
| --- | --- | --- | --- |
| 1 | **Centrais de motofrete / empresas de entrega** (5–50 motoboys) | Despacho em grupo de WhatsApp, fechamento do dia no caderno, cliente ligando para saber "cadê meu motoboy", briga sobre quantas corridas cada um fez | Despacho organizado, rastreio com link para o cliente, comprovante com foto, relatório por motoboy e por cliente para cobrar no fim do mês |
| 2 | **Restaurantes e lojas com frota própria** (2–10 motoboys) | Sem controle de quem levou o quê, taxa paga por corrida sem conferência | Controle e acerto com os motoboys. Entra junto com o Pedeli |
| 3 | **Farmácias, laboratórios, cartórios e escritórios** (entrega de documentos e amostras) | Precisam provar que entregaram e quando | Comprovante com foto, horário e trilha de auditoria (já existe no código) |
| 4 | **Prefeituras e cidades pequenas da Zona da Mata** (fase 3) | Não têm app local de entregas | White-label: um empreendedor local abre "o app de entregas da cidade" com o EPM |

### Como reconhecer o cliente ideal (segmento 1)

- Tem de 5 a 50 motoboys, próprios ou parceiros fixos.
- Atende empresas com contrato mensal (farmácias, lojas, escritórios), e não só corridas avulsas.
- O dono ou um despachante passa o dia no WhatsApp distribuindo corridas.
- Já perdeu cliente por atraso ou por falta de informação.

**O que não é cliente agora:** o consumidor final que quer mandar um pacote (é o terreno do Uber Flash) e o motoboy autônomo isolado (não paga mensalidade).

## Concorrência e diferencial

No segmento de centrais, o concorrente real é o WhatsApp, que é de graça. Os concorrentes pagos são grandes, mas genéricos e distantes.

| Concorrente | O que é | Como cobra | Onde o EPM ganha |
| --- | --- | --- | --- |
| WhatsApp + planilha | O jeito atual da maioria | Grátis | Rastreio, comprovante, relatório e menos briga no fechamento |
| [Machine / Gaudium](https://www.mobiletime.com.br/?p=724529) | App white-label de transporte e entregas; ~1.500 municípios (dado de 2022); o módulo de entregas tinha 100+ empresas | Por corrida despachada, com taxa de adesão; sem exclusividade por cidade | Preço fixo e previsível; suporte local e presencial; foco em entrega B2B (contratos, documentos), e não em corrida de passageiro |
| [Foody Delivery](https://saipos.com/foody-delivery) (parceira da Saipos) | Logística para restaurantes, com plano "central de entregas" | Planos de R$ 138 a R$ 289 (segundo página da Saipos; a periodicidade não está clara) | Atende também o que não é comida (farmácia, documentos); integração com o Pedeli |
| Uber Flash, 99Entrega, Lalamove | Marketplaces de corrida | Por corrida | Não competem pela central: são a alternativa que tira clientes dela. O EPM ajuda a central a se defender |

### Os três diferenciais que valem a pena defender

1. **A marca é da central.** O cliente final recebe o link de rastreio com o logo e o nome da central, e não o do EPM. Isso a Machine faz; a Foody, não tanto.
2. **Preço fixo, sem comissão.** É o mesmo argumento do Pedeli, aplicado à logística. A Machine cobra por corrida, então fica mais cara quanto melhor vai a central.
3. **Pedeli + EPM.** Um restaurante no Pedeli chama motoboy da central parceira com um clique. Isso cria um canal de vendas que nenhum concorrente local tem.

Os dados de concorrentes são de páginas públicas. Vale confirmar preço e cobertura da Machine e da Foody pedindo uma proposta como cliente.

## Modelo de receita e preço

**Mensalidade fixa por central, em três faixas, mais uma taxa de implantação.** Os valores abaixo são uma proposta de partida para testar com os primeiros clientes. Ficam entre o Pedeli (R$ 79,99) e a faixa da Foody.

| Plano | Para quem | Inclui | Preço proposto |
| --- | --- | --- | --- |
| Essencial | Central pequena ou restaurante com frota | Até 5 motoboys, 600 entregas/mês, rastreio, comprovante, relatórios | R$ 149/mês |
| Central | Central de motofrete típica | Até 20 motoboys, 2.500 entregas/mês, portal para as empresas clientes da central, fechamento por motoboy | R$ 299/mês |
| Marca própria | Central que quer "o app dela" | Motoboys e entregas maiores, logo, cores e domínio da central no link de rastreio e no PWA | R$ 499/mês |
| Implantação | Todos | Cadastro de motoboys e clientes, tabela de preços, treinamento presencial | R$ 300 a R$ 600, única vez |

Regras simples para não perder dinheiro:

- Passou do limite de entregas: R$ 0,10 por entrega extra, ou sobe de plano.
- Os 3 primeiros clientes ganham 60 dias com 50% de desconto em troca de feedback semanal e depoimento. Não dê de graça: quem não paga nada não usa a sério.
- Receita futura opcional: cobrar Pix pelo sistema e ficar com uma pequena taxa por transação, só depois do gateway (fase 2).

### Custo por cliente (o que pode comer a margem)

O maior custo variável é o Google Maps. Cada pedido chama a Routes API para calcular a rota e o preço, e o rastreio pode chamar de novo. Na tabela pública do Google, a Routes API custa na ordem de US$ 5 por 1.000 chamadas, com uma cota gratuita mensal. **Esse valor é aproximado e precisa ser conferido na tabela atual.** Com 2.500 entregas e ~3 chamadas cada, dá ~7.500 chamadas/mês, o que pode chegar a dezenas de reais por central.

**Parte técnica:** registrar quantas chamadas de mapa cada organização faz (uma tabela de uso por `organizationId`/mês). Fazer cache da cotação por par origem–destino e calcular o ETA do rastreio só quando o motoboy andar uma distância mínima. O limite do plano deve ser checado no `POST /api/pedidos`. Com isso, o custo do Maps fica abaixo de 10% da mensalidade.

## Produto: o que construir e o que cortar

**A regra é construir só o que a primeira central precisa para largar o WhatsApp.** O resto espera um cliente pagando pedir.

### Fase 1: piloto vendável (4 a 6 semanas)

| # | Entrega | Na operação | No código |
| --- | --- | --- | --- |
| 1 | Multi-tenant | Várias centrais no mesmo sistema, cada uma vendo só o que é dela | Modelos `Organization` e `OrganizationMember`; `organizationId` em `Motoboy`, `Cliente`, `Pedido`, `Pagamento`; filtro obrigatório nos helpers de acesso; teste com duas orgs provando o isolamento |
| 2 | Portal da empresa cliente | A farmácia atendida pela central abre o pedido sozinha, sem ligar | Reaproveitar o painel `/cliente`, agora preso à organização da central |
| 3 | Link público de rastreio | O destinatário acompanha sem criar conta | Rota `/r/[token]` com token aleatório por pedido, mostrando só status, mapa e foto do comprovante |
| 4 | Fechamento do dia/mês | Quantas corridas cada motoboy fez, quanto receber; quanto cobrar de cada empresa | Relatório e exportação CSV a partir de `Pedido` + `Pagamento`; sem movimentar dinheiro |
| 5 | Tabela de preço por central | Cada central cobra do seu jeito (por km, por bairro, valor mínimo) | `PricingRule` por organização, substituindo a regra global; preço congelado no pedido |
| 6 | Marca da central | Logo e cor da central no rastreio e no app | Campos de marca em `OrganizationSettings`, lidos pelos tokens do `globals.css` e pelo `manifest.json` dinâmico |
| 7 | Aviso por WhatsApp | O cliente recebe "saiu para entrega" e "entregue" com o link | Reaproveitar a integração com a Evolution API que já existe no Pedeli |
| 8 | Despacho com oferta | O sistema oferece a corrida, espera o aceite e passa para o próximo | `DispatchOffer` com TTL configurável e fallback para o despachante (Etapa 6) |

### Cortar ou adiar

- **Pix e cartão pelo sistema:** a central já cobra os clientes dela. Fica para a fase 2, com Mercado Pago (já integrado no Pedeli).
- **Ledger, saldo e saque do motoboy:** troque por um relatório de fechamento. Carteira digital só junto com o gateway.
- **Apps nativos iOS/Android:** o PWA basta até alguém reclamar do GPS em segundo plano.
- **Marketplace aberto ao público:** fase 3.
- **Chat cliente–motoboy:** manter como está, sem investir. O WhatsApp automático resolve a maior parte.

### Fase 2 (meses 3 a 6, se a fase 1 vender)

Integração Pedeli → EPM, ETA real pela posição atual, troca do polling por SSE ou WebSocket, cobrança Pix pelo sistema e importação de pedidos por CSV ou API.

## Como conseguir os primeiros 10 clientes em Juiz de Fora

**Venda presencial, uma central por vez, antes de qualquer anúncio.** Nesse público, anúncio pago converte mal. Uma visita com o sistema rodando no celular converte bem.

1. **Montar a lista (semana 1).** Buscar no Google Maps e no Instagram por "motoboy", "motofrete", "tele-entrega" e "entregas rápidas" em Juiz de Fora. Anotar nome, número de motoboys e quem são os clientes de cada central. A meta é de 20 a 30 nomes numa planilha.
2. **Perguntar antes de vender (semanas 1–2).** Conversar com 8 a 10 donos, sem pitch: "Como vocês distribuem as corridas hoje? Como fecham o dia? Já perderam cliente por atraso?". Anotar as palavras que eles usam, porque elas viram o texto do site e dos posts.
3. **Usar o Pedeli como porta de entrada.** Perguntar a cada restaurante do Pedeli quem faz as entregas. Cada resposta é o nome de uma central e já vem com uma indicação.
4. **Falar com o cliente original.** Quem encomendou o projeto conhece o mercado e talvez seja o primeiro piloto, um parceiro ou uma indicação. Antes, resolva a questão do código (ver Riscos).
5. **Piloto pago com 3 centrais (semanas 4–10).** 50% de desconto por 60 dias, implantação presencial e um grupo de WhatsApp direto. Medir quantas corridas passam pelo sistema contra o total da central.
6. **Transformar em prova (mês 3).** Depoimento em vídeo do dono e um número concreto ("fechamento do dia caiu de 1 hora para 10 minutos"). Com isso, abrir a venda para Zona da Mata e Grande BH pelo Instagram da Impulsio e por indicação.

### O pitch em uma frase

"Sua central despachando, rastreando e fechando o dia num sistema só, com a sua marca, por preço fixo. Sem comissão por corrida."

### Ajustes na marca

A identidade visual deve falar primeiro com o dono da central (B2B), e só depois com o motoboy e o cliente final. Isso favorece a direção "Rota viva" com toques de "Operação de rua". O one-pager e o pitch para investidores devem ser reescritos com este posicionamento. Os números de TAM/SAM atuais (R$ 30 bi / R$ 8 bi) não têm fonte e falam do mercado de entregas inteiro, e não do mercado de software para centrais.

## Metas e riscos

**A meta que importa nos primeiros 90 dias é ter 3 centrais pagando e usando no dia a dia.** Faturamento vem depois. As metas de 12 meses são uma referência para decidir se vale continuar, e não uma previsão.

| Marco | Meta | Receita mensal aproximada |
| --- | --- | --- |
| 90 dias | 3 centrais pagantes; 70%+ das corridas delas passando pelo sistema | ~R$ 450 (com desconto de piloto) |
| 6 meses | 10 centrais, das quais pelo menos 3 fora de Juiz de Fora | ~R$ 3.000 |
| 12 meses | 25 centrais; cancelamento abaixo de 3% ao mês | ~R$ 7.500 |

**Sinal para parar ou mudar:** se depois de 10 conversas nenhuma central topar um piloto pago, o problema é o segmento ou a oferta, e não o código. Antes de construir mais, volte à seção "Pra quem vender".

### Riscos

| Risco | Por que importa | O que fazer |
| --- | --- | --- |
| **De quem é o código** | O projeto nasceu encomendado por um cliente. Pela Lei de Software (Lei 9.609/98, art. 4º), o programa feito sob contrato de serviço pertence ao contratante, salvo acordo em contrário | Ler o contrato e o que foi pago. Se não houver cláusula clara, fazer um termo de cessão ou licença com o cliente antes de vender. Não é parecer jurídico |
| **Foco dividido com o Pedeli** | O Pedeli tem 5 lacunas abertas (iFood, fiscal, TEF...). Dois SaaS ao mesmo tempo, sozinho, é o jeito mais comum de nenhum decolar | Limitar o EPM a um dia por semana até haver uma central pagando, ou pausar uma lacuna do Pedeli. Reaproveitar ao máximo o que já existe no Pedeli |
| **Custo do Google Maps** | Pode corroer a margem nos planos baratos | Medir o uso por organização desde o primeiro dia |
| **Dados de localização (LGPD)** | O sistema guarda onde o motoboy esteve e o endereço de terceiros | Política de retenção (ex.: apagar pings de GPS após 90 dias), termos de uso e contrato de operação de dados com cada central |
| **Machine baixar preço ou chegar forte** | É grande e já está em muitas cidades | Defender pelo atendimento local, pela integração com o Pedeli e pelo preço fixo |

## Próximos 30 dias

**Agora validar com gente e medir a operação.** A base do piloto já está implementada; as próximas semanas devem priorizar conversas, implantação assistida e dados reais antes de ampliar o escopo técnico.

- [ ] Ler o contrato com o cliente original e resolver a cessão ou licença do código
- [ ] Montar a lista de 20 a 30 centrais de Juiz de Fora
- [ ] Conversar com 8 a 10 donos de central
- [ ] Perguntar aos restaurantes do Pedeli quem faz as entregas deles
- [ ] Pedir proposta da Machine Entregas e da Foody como se fosse uma central
- [ ] Conferir a tabela atual da Routes API do Google e calcular o custo por plano
- [ ] Decidir os preços finais com base nas conversas
- [x] Multi-tenant (`Organization` + isolamento), link público de rastreio, despacho por oferta e fechamento
- [ ] Reescrever o one-pager com o novo posicionamento

### Decisões em aberto

- O cliente original entra como sócio, como cliente piloto ou fica de fora?
- O EPM fica "by Impulsio", como o Pedeli, ou ganha marca independente?
- Quanto tempo por semana vai para o EPM enquanto o Pedeli está no lançamento?

## Fontes

- [Mobile Time: Machine/Gaudium, modelo e alcance (2022)](https://www.mobiletime.com.br/?p=724529)
- [Saipos: página da Foody Delivery, planos e funcionalidades](https://saipos.com/foody-delivery)
- Repositório do Entrega Pra Mim: `docs/ONE_PAGER.md`, `docs/PLANO_EVOLUCAO.md`, `docs/CORRECOES_OPERACIONAIS.md`, `prisma/schema.prisma` e o histórico de commits
