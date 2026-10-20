# Runbook do piloto — Entrega Pra Mim

Estado verificado em 20/10/2026. Este runbook descreve o caminho mínimo para validar o produto com uma central real sem ativar pagamentos eletrônicos.

## Regra do piloto

Use dinheiro como forma de pagamento. PIX e cartão permanecem simulados e bloqueados em produção até existir gateway, webhook assinado, conciliação, estorno e tratamento de chargeback.

## Antes de começar

- usar Node.js 20.9+;
- preencher `.env` com `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `CRON_SECRET` e as chaves realmente necessárias;
- usar HTTPS e um segredo forte, gerado fora do repositório;
- configurar `REDIS_URL` em produção;
- configurar domínio, Google Maps e diretórios persistentes de comprovantes e logos;
- criar a organização, convidar os usuários e definir preço/limites antes do primeiro pedido.

## Validação local

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

Com um servidor já iniciado:

```bash
SMOKE_URL=http://127.0.0.1:3000 \
SMOKE_CRON_SECRET="$CRON_SECRET" \
npm run smoke
```

O smoke verifica página inicial, liveness, readiness, autenticação pública, proteção de rota, organização inexistente e o job de despacho.

## Deploy recomendado

Na VPS, a configuração principal é Docker Compose:

```bash
docker compose config
docker compose up -d --build
docker compose logs -f app despacho-cron
```

Depois do deploy, conferir:

```bash
curl -fsS https://SEU_DOMINIO/api/health/live
curl -fsS https://SEU_DOMINIO/api/health/ready
SMOKE_URL=https://SEU_DOMINIO SMOKE_CRON_SECRET="$CRON_SECRET" npm run smoke
```

As migrations devem ser aplicadas com `prisma migrate deploy`. Não usar `prisma db push` em produção.

## Backup e restauração

O serviço `backup` gera diariamente um dump do MySQL e um arquivo dos comprovantes/logos em `./backups`, com retenção padrão de 14 dias:

```bash
docker compose run --rm backup agora
ls -lh backups/
```

O backup local não é suficiente contra perda da VPS. Copiar os arquivos para um destino externo e testar a restauração antes de aceitar dados críticos:

```bash
gunzip -c backups/banco-AAAAMMDD-HHMM.sql.gz \
  | docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" entrega_pra_mim'
```

## Checklist funcional do piloto

- criar uma central e conferir a marca própria;
- convidar operador, cliente e motoboy;
- aprovar o motoboy e registrar disponibilidade/localização;
- criar um pedido e conferir preço congelado no pedido;
- acompanhar a oferta, expiração, reoferta e fila manual;
- abrir o link público e confirmar que ele não expõe dados desnecessários;
- registrar localização, chat e comprovante de entrega;
- concluir a corrida e conferir o fechamento/CSV;
- repetir duas ações concorrentes e confirmar que não há dupla atribuição ou crédito;
- verificar cancelamento, auditoria e permissões entre duas organizações.

## Métricas para os primeiros 30 dias

- entregas criadas, concluídas, canceladas e reofertadas;
- tempo entre criação, aceite, coleta e conclusão;
- percentual com comprovante e percentual com rastreio compartilhado;
- falhas do job de despacho e tamanho da fila manual;
- tempo gasto no fechamento diário;
- incidentes de permissão, privacidade ou duplicidade;
- chamadas e custo do Maps por organização;
- uptime, erros HTTP 5xx e uso de banco/storage.

O objetivo do piloto é provar operação e retenção de uma central. Gateway real, eventos em tempo real, expansão comercial e automações avançadas só entram depois que esses números forem observados em entregas reais.
