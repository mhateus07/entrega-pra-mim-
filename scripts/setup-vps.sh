#!/bin/bash
# Script de configuração do VPS para Entrega Pra Mim
# Execute como root no seu VPS Hostinger

echo "=== Atualizando sistema ==="
apt update && apt upgrade -y

echo "=== Instalando Node.js 20 LTS ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo "=== Instalando MySQL 8 ==="
apt install -y mysql-server
systemctl start mysql
systemctl enable mysql

echo "=== Instalando Nginx ==="
apt install -y nginx
systemctl start nginx
systemctl enable nginx

echo "=== Instalando PM2 (gerenciador de processos) ==="
npm install -g pm2

echo "=== Instalando Git ==="
apt install -y git

echo "=== Instalando Certbot (SSL) ==="
apt install -y certbot python3-certbot-nginx

echo "=== Criando usuário para a aplicação ==="
useradd -m -s /bin/bash entrega
usermod -aG sudo entrega

echo "=== Configurando firewall ==="
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 3306/tcp  # MySQL (remover em produção se não precisar acesso externo)
ufw --force enable

echo "=== Verificando instalações ==="
node -v
npm -v
mysql --version
nginx -v

echo ""
echo "=== Setup concluído! ==="
echo "Próximos passos:"
echo "1. Configure o MySQL: sudo mysql_secure_installation"
echo "2. Crie o banco de dados"
echo "3. Clone o repositório"
echo "4. Configure as variáveis de ambiente"
