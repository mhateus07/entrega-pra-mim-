#!/bin/sh
# Backup do Entrega Pra Mim: banco (mysqldump) + arquivos (comprovantes e logos).
# Roda no serviço "backup" do docker-compose.yml, todo dia às BACKUP_HORA (padrão 03:00,
# horário de Brasília), e guarda BACKUP_RETENCAO_DIAS dias (padrão 14) em ./backups.
#
# Backup na hora:   docker compose run --rm backup agora
# Restaurar banco:  gunzip -c backups/banco-AAAAMMDD-HHMM.sql.gz | docker compose exec -T db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" entrega_pra_mim'
set -u

DESTINO=/backups
HORA=${BACKUP_HORA:-03:00}
RETENCAO=${BACKUP_RETENCAO_DIAS:-14}

log() { echo "[backup $(date '+%Y-%m-%d %H:%M:%S')] $*"; }

fazer_backup() {
  ts=$(date +%Y%m%d-%H%M)
  umask 077
  if mysqldump -h db -u root --single-transaction --quick --routines --triggers --no-tablespaces --set-gtid-purged=OFF entrega_pra_mim \
      | gzip > "$DESTINO/banco-$ts.sql.gz.tmp" && [ -s "$DESTINO/banco-$ts.sql.gz.tmp" ]; then
    mv "$DESTINO/banco-$ts.sql.gz.tmp" "$DESTINO/banco-$ts.sql.gz"
    log "banco ok: banco-$ts.sql.gz ($(du -h "$DESTINO/banco-$ts.sql.gz" | cut -f1))"
  else
    rm -f "$DESTINO/banco-$ts.sql.gz.tmp"
    log "ERRO: falha no mysqldump"
    return 1
  fi
  if tar czf "$DESTINO/arquivos-$ts.tar.gz" -C /dados comprovantes logos; then
    log "arquivos ok: arquivos-$ts.tar.gz ($(du -h "$DESTINO/arquivos-$ts.tar.gz" | cut -f1))"
  else
    log "ERRO: falha ao compactar comprovantes e logos"
    return 1
  fi
  find "$DESTINO" -maxdepth 1 \( -name 'banco-*.sql.gz' -o -name 'arquivos-*.tar.gz' \) -mtime +"$RETENCAO" -print -delete | sed 's/^/[backup] apagado (retenção): /'
}

if [ "${1:-}" = "agora" ]; then
  fazer_backup
  exit $?
fi

log "agendado para todo dia às $HORA, guardando $RETENCAO dias"
while true; do
  agora=$(date +%s)
  alvo=$(date -d "today $HORA" +%s)
  [ "$alvo" -le "$agora" ] && alvo=$(date -d "tomorrow $HORA" +%s)
  sleep $((alvo - agora))
  fazer_backup || log "o próximo backup será tentado amanhã às $HORA"
done
