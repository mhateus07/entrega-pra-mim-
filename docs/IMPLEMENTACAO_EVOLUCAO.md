# Evolução operacional — execução

Escopo autorizado em 22/10/2026. Preservar identidade Chegada e isolamento entre centrais.

## Plano e critérios

- [x] Consistência: GPS antes da primeira oferta, localização recente, agendamento no fuso da central, remuneração congelada e consistente.
- [x] Operação: ocorrências, histórico, reatribuição antes da coleta, busca, alertas e falhas de conexão visíveis.
- [x] Experiência: navegação móvel, ações de campo maiores, formulário com destinatário, rascunho e repetição.
- [x] Controle: acertos registrados e configurações operacionais.
- [x] Comercial: explicar ativação e exemplos por segmento.
- [x] Validação: tipos, lint, testes de domínio/integração e build.
- [ ] Expansão: pagamentos reais (Stripe Connect pronto no código e inativo sem as variáveis `STRIPE_*`; a decisão de provedor está na issue #23), notificações externas, importações e rotas de múltiplas paradas. Serviços externos dependem de provisionamento; não habilitar simulações em produção.

## Implantação

Novos campos exigem `prisma migrate deploy` antes do novo servidor. Não aplicar migrations em banco de produção durante desenvolvimento.
Valores legados sem registro histórico não podem ser reconstruídos com certeza: preservar valores já contabilizados e identificar estimativas; nunca reescrever saldos existentes automaticamente.
