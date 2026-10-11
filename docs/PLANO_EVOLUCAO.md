# Plano de evolução — Entrega Pra Mim

## 1. Objetivo

Transformar o MVP atual em uma plataforma B2B de logística urbana confiável para pequenas e médias empresas, com despacho operacional, rastreamento verificável, pagamentos conciliados, governança multi-tenant e uma experiência mobile-first para operador, cliente e entregador.

Direção recomendada para o produto:

- **Núcleo:** SaaS B2B para empresas que solicitam e acompanham entregas.
- **Execução:** frota própria, parceiros credenciados ou combinação das duas.
- **Extensão futura:** marketplace aberto de entregadores e autoatendimento B2C, somente depois de o núcleo operacional estar estável.

Essa decisão é importante porque o sistema atual mistura cliente final, empresa contratante e administrador em três papéis globais. A evolução precisa criar a entidade de organização/empresa antes de adicionar cobrança recorrente, white-label, franquias ou múltiplas cidades.

## 2. Diagnóstico atual

### O que já está bom

- Stack coerente para um MVP: Next.js App Router, TypeScript, Prisma, MySQL, Redis opcional e Docker.
- Build, lint e typecheck passam localmente.
- Testes unitários e de rotas passam; há testes de concorrência financeira e de disputa por entrega.
- Autorização por papel e propriedade foi centralizada em helpers.
- Valores financeiros principais já usam `DECIMAL(14,2)` e há lock transacional por pedido.
- Upload de comprovante valida magic bytes, grava fora de `public/` e serve o arquivo por rota autenticada.
- Paginação, índices básicos, fallback de rota e design tokens já formam uma boa base de produto.
- CI já sobe MySQL, aplica migrations e executa lint, tipos, testes e build.

### Limitações que impedem escala ou produção financeira

1. **Pagamentos eletrônicos são mock.** `src/lib/pagamentos.ts` gera PIX e cartão simulados, com aprovação aleatória. Não há gateway, webhook, idempotência de provedor, estorno real, chargeback ou conciliação.
2. **Despacho não é uma operação fechada.** O algoritmo calcula um motoboy recomendado, mas não cria oferta, expiração, aceite automático, reatribuição, escalonamento ou fila de exceção.
3. **ETA não é dinâmico.** O rastreamento retorna 10 ou 15 minutos fixos; não calcula a rota da posição atual até a próxima parada.
4. **Tempo real é polling.** Tracking, chat, PIX e listas consultam a API em intervalos fixos. Isso aumenta custo, latência e carga quando a base cresce.
5. **Não existe tenant/organização.** O isolamento atual é por implantação, não por empresa dentro da aplicação. Não há memberships, convites, unidades, contratos, planos ou limites.
6. **Cadastro de motoboy é público.** A criação não passa por aprovação, verificação documental, aceite de termos ou status de onboarding.
7. **Há exposição indevida de localização.** `GET /api/motoboys/[id]/localizacao` exige login, mas não exige que o usuário seja o motoboy, admin ou participante de um pedido relacionado.
8. **Controles de abuso são incompletos.** Chat, localização, upload, avaliações e várias leituras não têm rate limit específico; quando Redis falha, o fallback em memória perde consistência entre processos.
9. **Modelo financeiro ainda é um saldo agregado.** Há transações simples, mas não um ledger imutável, contas a receber/pagar, reservas, taxas do gateway, saques e reconciliação por evento.
10. **Documentação diverge do código.** Há documentos antigos citando Next.js 14/React 18, pagamentos como implementados e deploy com `prisma db push`, enquanto o CI usa migrations e a produção bloqueia pagamentos eletrônicos.

## 3. Critérios de sucesso

O produto deve ser considerado pronto para uma operação piloto quando:

- 100% das mutações de pedido e pagamento forem idempotentes e auditáveis.
- Nenhum usuário conseguir visualizar localização, endereço, telefone ou documento fora do escopo da organização/pedido.
- Um pedido puder ser despachado, aceito, expirado, reatribuído e escalado sem intervenção manual em condições normais.
- O ETA vier de rota atualizada e indicar a hora da última atualização.
- PIX/cartão forem confirmados por webhook assinado e consultados apenas como reconciliação, não como fonte primária de aprovação.
- Todo pagamento aprovado, estornado, expirado ou falho tiver correspondência em eventos do provedor e no ledger interno.
- O operador consiga responder a uma exceção em menos de 60 segundos.
- A aplicação tenha logs estruturados, métricas, alertas e backup restaurável testado.
- A suíte cubra transições, autorização, concorrência, webhooks, uploads, tenant isolation e fluxos críticos de UI.

## 4. Arquitetura-alvo

### 4.1 Princípio de implementação

Manter um **monólito modular** por enquanto. O volume atual não justifica microserviços; separar agora aumentaria custo operacional e complexidade de consistência. A separação deve ser por módulos e contratos internos:

```text
Web/PWA + API
      |
  módulos de domínio
      |
MySQL + Redis + object storage
      |
worker de jobs/outbox + gateway + mapas + notificações
```

Módulos recomendados:

- `identity`: usuários, sessões, MFA, recuperação e verificação.
- `organizations`: empresas, unidades, memberships, papéis e limites.
- `customers`: destinatários, contatos e endereços.
- `deliveries`: pedido, paradas, itens, janela, SLA e estado.
- `dispatch`: candidatos, ofertas, aceite, expiração e reatribuição.
- `tracking`: pings de localização, rota, ETA e histórico de eventos.
- `pricing`: regras versionadas, zonas, adicionais e cotações.
- `payments`: intents, webhooks, reembolsos, taxas e ledger.
- `notifications`: push, e-mail, WhatsApp/SMS opcional e preferências.
- `proofs`: foto, assinatura, geolocalização e retenção.
- `reporting`: métricas operacionais, financeiras e exportações.
- `audit`: trilha de ações administrativas e alterações sensíveis.

### 4.2 Modelo de dados da próxima versão

Adicionar gradualmente:

- `Organization`, `OrganizationMember`, `OrganizationRole`, `OrganizationSettings`.
- `Branch`/`Unit` para operação por filial e cidade.
- `Customer` separado de `User`, permitindo destinatário sem login.
- `Delivery`, `DeliveryStop`, `DeliveryItem`, `DeliveryStatusEvent`.
- `DispatchJob`, `DispatchCandidate`, `DispatchOffer` e `DispatchAttempt`.
- `DriverProfile`, `DriverDocument`, `DriverVehicle`, `DriverApproval`.
- `LocationPing` com precisão, origem, timestamp do dispositivo e política de retenção.
- `Quote` e `PricingRuleVersion` para congelar o preço aceito pelo cliente.
- `PaymentIntent`, `PaymentAttempt`, `ProviderEvent`, `Refund`, `Dispute`.
- `LedgerAccount`, `LedgerEntry`, `Payout` e `ReconciliationRun`.
- `IdempotencyKey`, `OutboxEvent`, `Notification`, `DeviceSubscription`, `AuditLog`.

Não remover os modelos atuais em uma única migration. Criar os novos modelos, fazer backfill, migrar leituras, migrar escritas e só depois aposentar colunas antigas.

### 4.3 Estado de pedido

Trocar transições implícitas por uma máquina de estados explícita, com evento imutável:

```text
RASCUNHO -> COTADO -> CONFIRMADO -> DESPACHANDO -> OFERTADO
OFERTADO -> ACEITO -> A_CAMINHO_DA_COLETA -> COLETADO
COLETADO -> A_CAMINHO_DA_ENTREGA -> ENTREGUE
qualquer estado operacional -> CANCELADO / FALHA / EXCEÇÃO
```

Cada transição deve registrar ator, origem, destino, motivo, timestamp, dispositivo e correlação. A API pode continuar em REST durante a migração, mas o domínio não deve mais permitir alterações genéricas de status.

## 5. Roadmap priorizado

### P0 — segurança, dados e operação mínima (0–2 semanas)

Objetivo: eliminar risco de fraude, vazamento e perda financeira.

- Fechar localização por pedido/organização; aplicar `requirePedidoAccess` também na rota direta.
- Remover cadastro público de motoboy; criar fluxo `PENDENTE_APROVACAO` administrado.
- Exigir `Idempotency-Key` em criação de pedido, criação de pagamento, upload e ações sensíveis.
- Criar `AuditLog` para login, troca de papel, mudança de status, pagamento, reembolso, documento e acesso a comprovante.
- Adicionar rate limit por IP + usuário + recurso em login, registro, localização, chat, upload e pagamentos; falhar fechado em operações financeiras se Redis estiver indisponível.
- Limitar body/upload no proxy e na aplicação; adicionar headers de segurança, CORS explícito e `remotePatterns` de imagem restritos.
- Substituir `prisma db push` por `prisma migrate deploy` em todos os scripts e guias de deploy.
- Fazer `assertEnv()` realmente bloquear boot produtivo e validar variáveis de gateway, storage, Redis e observabilidade.
- Criar endpoints `/api/health/live` e `/api/health/ready`, com checagem de banco, Redis e storage.
- Atualizar documentação para refletir o estado real do produto.

**Aceite:** testes de autorização negativos passam para todos os recursos; deploy novo usa somente migrations; nenhuma rota sensível expõe dados sem vínculo; repetição de POST não duplica pedido, pagamento ou mensagem.

### P1 — dinheiro real e despacho confiável (2–6 semanas)

Objetivo: operar pedidos reais em uma cidade com controle de caixa.

- Escolher gateway com Pix, cartão tokenizado, webhook assinado, reembolso, chargeback, split/marketplace e onboarding de recebedores. Para o contexto brasileiro, Mercado Pago é candidato forte para o primeiro piloto por documentar Pix com idempotência, Split Payments e webhooks assinados; validar contrato, KYC, taxas e disponibilidade comercial antes de fechar.
- Implementar adapter de gateway: `createPayment`, `getPayment`, `refund`, `verifyWebhook`.
- Criar endpoint de webhook que valide assinatura, persista evento bruto minimizado, responda rápido e processe de forma idempotente via outbox/worker.
- Nunca enviar PAN/CVV ao backend próprio quando o gateway oferecer tokenização/hosted checkout.
- Criar ledger interno de partidas dobradas; saldo passa a ser projeção derivada, não a fonte de verdade.
- Implementar dispatch persistente: raio inicial, candidatos, oferta com TTL, aceite único, retry, fallback manual e escalonamento.
- Trocar distância Haversine como critério principal por matriz de rota para os melhores candidatos; usar modo `TWO_WHEELER` quando a cobertura e o custo forem aceitáveis.
- Calcular ETA da posição atual à próxima parada, com timestamp, confiança e fallback explícito.
- Criar console operacional: mapa, pedidos sem entregador, ofertas expirando, atrasos, incidentes e ações manuais.

**Aceite:** em teste de carga concorrente, um pedido tem no máximo um aceite; um webhook repetido não duplica pagamento/ledger; o operador consegue localizar e reatribuir pedidos sem editar banco.

### P2 — multi-tenant e produto B2B (6–12 semanas)

Objetivo: vender para mais de uma empresa sem clonar a aplicação.

- Introduzir `organizationId` em todos os agregados de negócio e backfill controlado.
- Criar convite de equipe, papéis por organização, unidades, regiões de atendimento e limites por plano.
- Separar empresa contratante, cliente/destinatário e motoboy.
- Criar catálogo de serviços, tabelas de preço versionadas, zonas, horário de operação, adicional de urgência e regras por cliente.
- Criar pedido em lote/importação CSV e API de integração com chave por organização.
- Criar webhooks de saída para status de entrega e pagamento.
- Exportar CSV/Excel de pedidos, comprovantes, faturamento e repasses.
- Implementar retenção/anonimização de dados e fluxo de solicitação de exclusão conforme política jurídica definida.

**Aceite:** teste automatizado com duas organizações prova isolamento em todas as leituras, mutações, arquivos, relatórios e jobs; uma empresa consegue configurar preço e usuários sem suporte técnico.

### P3 — diferenciais de eficiência (3–6 meses)

Objetivo: ganhar margem, retenção e densidade operacional.

- ETA calibrado por histórico real e janela de coleta/entrega.
- Batch delivery e roteirização de múltiplas paradas.
- Otimização de rota com restrições de capacidade, horário, prioridade e região.
- Navegação turn-by-turn e deep links para o entregador.
- Push real via Service Worker; e-mail/WhatsApp transacional com opt-in e templates.
- SLA, score de risco, previsão de atraso e alertas proativos.
- Payout automatizado, carteira do parceiro, taxas por cidade e conciliação diária.
- Aplicativo nativo somente se o PWA não atender localização em background, navegação e confiabilidade da operação.

## 6. Backlog de produto

### Operador/empresa

- Inbox de exceções com prioridade, SLA e responsável.
- Busca por código, telefone, endereço, veículo e status.
- Ações em lote para reatribuir, cancelar e exportar.
- Timeline auditável do pedido.
- Configuração de regiões, horários, feriados, preços e mensagens.
- Relatórios de taxa de aceite, tempo até coleta, tempo em trânsito, entrega no prazo, cancelamento e custo por entrega.

### Cliente/destinatário

- Cotação com validade e preço congelado.
- Endereço com busca/autocomplete e confirmação no mapa.
- Janela de entrega e instruções estruturadas.
- Rastreamento com ETA real, última atualização e compartilhamento seguro.
- Notificação por status sem exigir que a tela fique aberta.
- Reagendamento, suporte e abertura de incidente.

### Motoboy

- Onboarding, documentos, aprovação e aceite de termos.
- Oferta com distância, estimativa, valor líquido, tempo para aceitar e rota até coleta.
- Modo online/offline com heartbeat e stale location.
- Navegação, checklist de coleta/entrega e prova georreferenciada.
- Ganhos disponíveis, pendentes, taxas, repasses e contestação.
- Proteção contra excesso de ofertas, fadiga e concorrência de duas entregas incompatíveis.

## 7. Segurança e privacidade

Adotar OWASP ASVS 5.0 como checklist verificável, com foco em autorização, validação, sessão, upload, logs e proteção de dados.

- Trocar senha mínima de 6 por política de senha mais forte e proteção contra credenciais vazadas.
- Adicionar verificação de e-mail, recuperação de senha, revogação de sessões e MFA para admin.
- Normalizar CPF/CNPJ, telefone, e-mail e placa antes de persistir; validar dígitos verificadores.
- Classificar PII e definir retenção por tipo de dado.
- Criptografar segredos e documentos em repouso; preferir object storage privado com URL assinada de curta duração.
- Reduzir dados retornados por endpoint; telefone e endereço completo só quando necessários ao estágio da entrega.
- Registrar acesso administrativo a dados sensíveis, sem colocar segredo, CVV ou payload completo em logs.
- Criar threat model para: IDOR, abuso de localização, fraude de pagamento, replay de webhook, upload malicioso, enumeração de usuários e abuso de registro.

## 8. Observabilidade e confiabilidade

- Logs JSON com `requestId`, `organizationId`, `userId`, `pedidoId`, `paymentId`, duração e resultado.
- Error tracking com stack trace sanitizada e alertas de regressão.
- Métricas: latência p50/p95, erro por endpoint, fila de dispatch, webhooks pendentes, pagamentos divergentes, Redis, Maps API e storage.
- Tracing nas chamadas MySQL, Redis, Google Maps e gateway.
- Jobs com retry exponencial, dead-letter e painel de reprocessamento.
- Backup diário criptografado, retenção definida e restauração ensaiada mensalmente.
- Runbook para gateway indisponível, Maps indisponível, Redis indisponível, atraso em massa, perda de localização e falha de deploy.
- Deploy com migrations compatíveis, healthcheck, smoke test e rollback documentado.

## 9. Estratégia de testes

- Unitários: pricing, transições, permissões, score, idempotência, normalização e cálculo do ledger.
- Integração MySQL: migrations, isolamento por organização, concorrência, webhook, reembolso e upload.
- Contrato: gateway, Google Routes, webhooks de saída e API pública.
- E2E: cadastro/aprovação, cotação, pedido, dispatch, rastreamento, entrega, comprovante, pagamento e avaliação.
- Segurança automatizada: IDOR por cada recurso, replay de webhook, brute force, upload, payload grande, sessão expirada e tenant escape.
- Carga: localização, tracking, chat, criação de pedidos e dispatch em picos.
- Teste manual de campo com GPS ruim, perda de conexão, tela bloqueada, câmera negada, bateria baixa e endereço ambíguo.

## 10. Métricas do produto

### Norte

- Entregas concluídas no prazo por empresa ativa.

### Operação

- Tempo até aceite.
- Tempo até coleta.
- Tempo de trânsito.
- Percentual no SLA.
- Taxa de reatribuição.
- Taxa de cancelamento e motivo.
- Cobertura de localização válida.
- Custo de Maps por entrega.

### Financeiro

- GMV, receita líquida e take rate.
- Margem por entrega/cidade.
- Pagamentos pendentes, aprovados, estornados e divergentes.
- Prazo de repasse e saldo em trânsito.

### Produto

- Cotação → pedido.
- Pedido → pagamento.
- Pedido → aceite.
- Retenção de empresas em 30/90 dias.
- Entregas por empresa e por entregador.
- NPS/avaliação e reincidência de incidentes.

## 11. Decisões que precisam ser tomadas antes da P1

1. O pagador é a empresa contratante ou o destinatário?
2. A plataforma cobra do cliente, do motoboy ou ambos?
3. O motoboy é empregado, parceiro, terceiro ou vendedor no marketplace?
4. Haverá dinheiro na entrega? Se sim, quem assume risco, cobrança e conciliação?
5. A unidade de operação é cidade, filial, região ou organização?
6. Qual SLA e política de cancelamento/reembolso por tipo de serviço?
7. Quais dados precisam ser mantidos e por quanto tempo?
8. Qual gateway será homologado e quem será o recebedor legal do pagamento?
9. Qual cidade e volume serão usados no piloto?

## 12. Ordem prática de execução

1. Corrigir P0 e atualizar documentação.
2. Escolher o modelo B2B e desenhar o modelo de organização.
3. Homologar gateway e política financeira antes de expor cobrança real.
4. Implementar ledger, webhooks e idempotência.
5. Implementar dispatch persistente e console operacional.
6. Implementar ETA/localização em tempo real.
7. Migrar para multi-tenant com backfill e testes de isolamento.
8. Rodar piloto controlado em uma cidade e medir métricas por duas semanas.
9. Corrigir gargalos observados no piloto.
10. Só então investir em otimização de rotas, integrações comerciais e aplicativo nativo.

