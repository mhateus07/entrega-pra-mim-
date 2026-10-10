# Correções de pedidos e pagamentos

## Regras implementadas

- Somente cliente proprietário e administrador criam pedidos; ambos os endereços devem pertencer ao cliente informado.
- Cliente pode cancelar seu pedido, mas não aceitar ou concluir entregas.
- Motoboy aceita um pedido livre em seu próprio nome. Uma transação impede dois aceites do mesmo pedido ou dois pedidos ativos para o mesmo entregador.
- Alterar o perfil não permite liberar um entregador ocupado nem definir manualmente o status EM_ENTREGA.
- Conclusão exige comprovante já enviado pela rota de upload. Concluir a entrega não cria nem aprova pagamento.
- Somente cliente proprietário e administrador consultam/cancelam pagamentos; dinheiro é confirmado pelo entregador atribuído ou administrador, no momento da entrega ou depois dela.
- Crédito é liberado uma única vez quando pagamento está APROVADO e pedido ENTREGUE. Pedido, transação e saldo são alterados na mesma transação do banco.
- A criação do pagamento usa a comissão centralizada de 15%; concluir entrega preserva os valores registrados no pagamento.
- Créditos pendentes antigos são transferidos para disponível sem somar novamente ao total. Duplicações e divergências históricas exigem conciliação manual; esta alteração não corrige retroativamente pagamentos falsamente aprovados pela versão antiga.
- Cancelamento de pedido pago ou em processamento é bloqueado até conciliação/reembolso. Ainda não há integração de reembolso real.
- PIX/cartões são simulados somente em desenvolvimento/testes. Em produção a interface oferece dinheiro e a API rejeita novas cobranças eletrônicas com 503.
- O saldo representa registros internos de ganhos, não transferência bancária. A regra de repasse e cobrança da comissão de entregas em dinheiro precisa ser definida junto à integração financeira.

## Segurança operacional (P0, out/2026)

- Cadastro de motoboy nasce `PENDENTE_APROVACAO`. Sem aprovação, o motoboy não fica DISPONIVEL, não vê pedidos SOLICITADO de terceiros, não aceita pedido e não envia localização. Admin aprova, reprova ou suspende em `PATCH /api/motoboys/[id]/aprovacao`; reprovar/suspender exige motivo e é recusado se houver entrega em andamento. A migration `202610100001` marca como APROVADO todos os motoboys já existentes.
- `GET /api/motoboys/[id]/localizacao` só responde ao próprio motoboy, ao admin e ao cliente com pedido ACEITO/EM_COLETA/EM_ENTREGA com aquele motoboy.
- Criação de pedido e de pagamento aceita `Idempotency-Key`; a resposta fica guardada em `idempotency_keys` por 24h. Dados de cartão não entram no hash nem na resposta guardada.
- `audit_logs` recebe as ações sensíveis (login, aprovação, status de pedido, pagamento, comprovante). Só inserção, melhor esforço.
- Rate limit por usuário em chat, upload, localização e polling; upload recusa `Content-Length` acima de 5 MB antes de ler o corpo.
- `src/instrumentation.ts` chama `assertEnv()` no boot; em produção, variável obrigatória ausente ou `NEXTAUTH_SECRET` com menos de 32 caracteres encerra o processo.
- `/api/health/live` (HEALTHCHECK do Docker) e `/api/health/ready` (banco, Redis, storage) são públicos e não expõem mensagens de erro.

## Validação local

1. `npm ci` e `npx prisma generate`.
2. `npm run typecheck`.
3. `npm test`: testes unitários e de rotas; testes MySQL aparecem como ignorados sem TEST_DATABASE_URL.
4. Para a suíte completa, criar um MySQL descartável com banco chamado `entrega_test`, apontar DATABASE_URL para ele e executar `npx prisma migrate deploy`.
5. Definir TEST_DATABASE_URL para o mesmo banco e executar `npm test`. A suíte cria e remove apenas suas próprias fixtures.
6. `npm run build`. O build requer acesso ao Google Fonts para obter Montserrat.

A validação no GitHub Actions executa migrations, lint, tipos, testes com MySQL e build. O lint global passa sem erros; ainda há avisos sobre imagens e declarações não utilizadas.

## Homologação manual

1. Criar entrega como cliente; tentar operar pedido e consultar pagamento de outro cliente deve falhar.
2. Entrar com dois motoboys disponíveis e tentar aceitar o mesmo pedido. Somente um deve conseguir.
3. Selecionar dinheiro e seguir ACEITO → EM_COLETA → EM_ENTREGA. O instante de coleta é registrado ao entrar em EM_ENTREGA.
4. Enviar foto e concluir. Sem confirmação de recebimento, pagamento permanece pendente e saldo não aumenta.
5. Confirmar recebimento na página do pedido. Repetir a requisição: apenas um crédito deve existir.
6. Fazer também o fluxo inverso: confirmar recebimento antes de concluir. Crédito só aparece após a conclusão.

## Próximas etapas

- Escolher gateway e definir cobrança/repasse em dinheiro; implementar tokenização, webhooks assinados, conciliação e reembolso.
- Auditar os saldos e pagamentos históricos antes de qualquer repasse real.
- Homologar a migração Decimal e o alinhamento do histórico em uma cópia do banco existente; seguir [Migração financeira](MIGRACAO_FINANCEIRA.md). Valores decimais, paginação dos painéis, índices e correções dos erros de lint já estão implementados.

Nenhum deploy ou alteração no banco de produção faz parte desta etapa.
