# Devlog — Entrega Pra Mim

Diário curto das sessões, mais novo no topo. O detalhe de cada mudança fica no `CHANGELOG.md`; as pendências, nas issues do quadro "Entrega Pra Mim".

## 2026-10-22 · Evolução operacional publicada

**Na prática**
- Está no ar o pacote de operação: despacho só para motoboy com GPS recente, agendamento no horário da central, valor do motoboy congelado por corrida, ocorrências, histórico, troca de motoboy, painel de atrasos, busca, acertos e novos campos na nova entrega.
- A central ou a empresa cliente avisa o destinatário pelo WhatsApp em um clique ("saiu para entrega" / "entregue").
- O pagamento online (Stripe Connect) está pronto e desligado até a decisão do provedor.

**Técnico**
- PR #38 (merge `e5e9393`): 2 migrations aplicadas no start do contêiner, com backup do banco antes. Pedidos antigos ficaram com o repasse marcado como estimado.
- PR #40 (merge `742092a`): `src/lib/public-api.ts` libera `POST /api/pagamentos/stripe/webhook` no proxy (a rota autentica pela assinatura).
- 181 testes (com MySQL), typecheck, lint e build ok; healthchecks e despacho-cron ok depois do deploy.

**Próximo passo**
- Decidir Stripe × Mercado Pago (#23).
- Provedor para o aviso automático por WhatsApp e domínio próprio por central (#16).
- Investigar o teste intermitente de preços (#39).
- Padronizar o comando de deploy (hoje `docker compose up -d --build` direto na VPS).
