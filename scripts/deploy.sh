#!/bin/bash
# Script de Deploy para Entrega Pra Mim
# Execute no VPS como usuário 'entrega'

set -e  # Para se houver erro

APP_DIR="/home/entrega/entrega_pra_mim"
REPO_URL="SEU_REPOSITORIO_GIT_AQUI"  # ex: git@github.com:usuario/entrega_pra_mim.git

echo "=== Deploy Entrega Pra Mim ==="
echo "Data: $(date)"
echo ""

# Criar diretório de logs se não existir
mkdir -p /home/entrega/logs

# Se o diretório não existir, clonar
if [ ! -d "$APP_DIR" ]; then
    echo ">>> Clonando repositório..."
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
else
    echo ">>> Atualizando repositório..."
    cd $APP_DIR
    git fetch origin
    git reset --hard origin/main  # ou master
fi

echo ">>> Instalando dependências..."
npm ci --production=false

echo ">>> Gerando Prisma Client..."
npx prisma generate

echo ">>> Aplicando migrações do banco..."
npx prisma db push

echo ">>> Fazendo build da aplicação..."
npm run build

echo ">>> Reiniciando aplicação com PM2..."
pm2 restart ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production

echo ">>> Salvando configuração do PM2..."
pm2 save

echo ""
echo "=== Deploy concluído! ==="
echo "Verifique o status com: pm2 status"
echo "Veja os logs com: pm2 logs entrega-pra-mim"
