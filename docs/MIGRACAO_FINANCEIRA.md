# Migração de valores monetários e histórico de schema

## Mudança

Valores monetários de pedidos, pagamentos, saldos e transações passam de DOUBLE para DECIMAL(14,2). Distância, peso, coordenadas e multiplicadores continuam sendo ponto flutuante. A comissão é calculada com aritmética decimal e arredondamento de metade para cima; o repasse é a diferença entre total e comissão, preservando a soma.

As APIs continuam retornando números JSON para valores monetários. Datas continuam ISO. Os cálculos no banco e o registro financeiro permanecem decimais; números da interface são utilizados para exibição.

## Banco novo

Executar `npx prisma migrate deploy`. O histórico agora inclui:

1. Schema inicial.
2. Tabelas de mensagens, pagamentos, saldos e transações ausentes no histórico anterior.
3. Conversão dos campos monetários e índices das consultas paginadas.

O CI usa esse caminho, sem db push, para verificar instalações novas.

## Banco existente

Não executar as migrations sem conferir o estado atual. Nenhuma migration foi aplicada em produção nesta tarefa.

1. Gerar backup e restaurá-lo em uma instância de homologação.
2. Conferir `npx prisma migrate status` e comparar o schema real com o histórico. Ambientes criados com `db push` podem já possuir as quatro tabelas da migration `202609290001_complete_financial_schema`.
3. Somente se essas tabelas, campos, índices e relacionamentos corresponderem integralmente à migration, registrar essa migration como já aplicada usando `npx prisma migrate resolve --applied 202609290001_complete_financial_schema`. Não usar esse comando para ignorar divergências ou uma aplicação parcial.
4. Com DATABASE_URL apontando para a cópia de homologação, executar `node scripts/audit-money.mjs`. O script é somente leitura e reporta limites e valores com mais de duas casas. Código de saída 1 exige revisão; não significa autorização para arredondar saldos silenciosamente.
5. Resolver valores fora do intervalo e decidir como conciliar casas excedentes. A conversão para DECIMAL arredonda para centavos; ela não recupera precisão já perdida no DOUBLE nem conserta créditos duplicados históricos.
6. Executar as migrations na cópia, comparar totais/saldos e testar os fluxos do roteiro operacional.
7. Programar a atualização da aplicação e do banco na mesma janela, depois da homologação. A versão antiga da aplicação não deve continuar gravando durante a migração.

A reversão deve usar o backup e a versão anterior do código. Converter Decimal de volta a DOUBLE não restaura os valores originais com casas excedentes.

## Listagens

Pedidos, clientes, motoboys, pagamentos e extrato usam `page` (1 a 10000) e `limit` (1 a 100, padrão 20). A resposta inclui `pagination` com `page`, `pageSize`, `total` e `totalPages`. Filtros e autorização são aplicados antes de paginar/contar; a ordenação usa data e ID para desempate.

Os painéis possuem controles Anterior/Próxima. Ativos e histórico do cliente são listas independentes. Estatísticas administrativas e ganhos do motoboy são agregados no servidor, sem depender da página. Dashboard considera dias em America/Sao_Paulo e recebimentos aprovados pela data de aprovação.
