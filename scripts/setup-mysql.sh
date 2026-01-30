#!/bin/bash
# Script para configurar MySQL
# Execute após setup-vps.sh

echo "=== Configurando MySQL ==="

# Executar configuração segura do MySQL
sudo mysql_secure_installation

# Criar banco de dados e usuário
echo "Criando banco de dados e usuário..."

sudo mysql -e "
CREATE DATABASE IF NOT EXISTS entrega_pra_mim CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'entrega_user'@'localhost' IDENTIFIED BY 'SUA_SENHA_FORTE_AQUI';
GRANT ALL PRIVILEGES ON entrega_pra_mim.* TO 'entrega_user'@'localhost';
FLUSH PRIVILEGES;
"

echo "Banco de dados criado!"
echo ""
echo "Use esta DATABASE_URL no seu .env:"
echo "DATABASE_URL=\"mysql://entrega_user:SUA_SENHA_FORTE_AQUI@localhost:3306/entrega_pra_mim\""
