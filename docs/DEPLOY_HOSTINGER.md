# Deploy na Hostinger VPS

Guia completo para colocar o **Entrega Pra Mim** em produção usando VPS da Hostinger.

---

## Pré-requisitos

1. VPS Hostinger (Ubuntu 22.04 recomendado)
2. Domínio ou subdomínio configurado
3. Acesso SSH ao servidor
4. Chave da API Google Maps

---

## Passo 1: Acessar o VPS

```bash
ssh root@SEU_IP_DO_VPS
```

Se preferir usar chave SSH (mais seguro):
```bash
ssh-keygen -t ed25519 -C "seu@email.com"
ssh-copy-id root@SEU_IP_DO_VPS
```

---

## Passo 2: Configurar o Servidor

```bash
# Atualizar sistema
apt update && apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Instalar MySQL
apt install -y mysql-server

# Instalar Nginx
apt install -y nginx

# Instalar PM2 globalmente
npm install -g pm2

# Instalar Git
apt install -y git

# Instalar Certbot (SSL)
apt install -y certbot python3-certbot-nginx
```

---

## Passo 3: Configurar MySQL

```bash
# Configuração segura
sudo mysql_secure_installation
# Responda: Y, defina senha root, Y para todas as perguntas

# Criar banco e usuário
sudo mysql

# No console MySQL:
CREATE DATABASE entrega_pra_mim CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'entrega_user'@'localhost' IDENTIFIED BY 'SuaSenhaForte123!';
GRANT ALL PRIVILEGES ON entrega_pra_mim.* TO 'entrega_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## Passo 4: Criar Usuário da Aplicação

```bash
# Criar usuário (não usar root para a aplicação)
useradd -m -s /bin/bash entrega
passwd entrega  # Defina uma senha

# Adicionar ao grupo sudo se necessário
usermod -aG sudo entrega

# Criar diretório de logs
mkdir -p /home/entrega/logs
chown entrega:entrega /home/entrega/logs
```

---

## Passo 5: Clonar e Configurar o Projeto

```bash
# Trocar para o usuário entrega
su - entrega

# Clonar repositório
git clone https://github.com/SEU_USUARIO/entrega_pra_mim.git
cd entrega_pra_mim

# Instalar dependências
npm ci

# Criar arquivo .env
cp .env.production.example .env
nano .env  # Editar com seus valores
```

### Configurar o .env

```env
DATABASE_URL="mysql://entrega_user:SuaSenhaForte123!@localhost:3306/entrega_pra_mim"
NEXTAUTH_URL="https://seudominio.com.br"
NEXTAUTH_SECRET="gere_com_openssl_rand_base64_32"
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="sua_chave_aqui"
NODE_ENV="production"
```

Gerar NEXTAUTH_SECRET:
```bash
openssl rand -base64 32
```

---

## Passo 6: Preparar Banco de Dados

```bash
# Gerar Prisma Client
npx prisma generate

# Aplicar schema ao banco
npx prisma db push

# (Opcional) Criar admin
npx ts-node scripts/create-admin.ts
```

---

## Passo 7: Build da Aplicação

```bash
npm run build
```

---

## Passo 8: Configurar PM2

```bash
# Iniciar aplicação
pm2 start ecosystem.config.js --env production

# Verificar status
pm2 status

# Ver logs
pm2 logs entrega-pra-mim

# Configurar para iniciar no boot
pm2 startup
pm2 save
```

---

## Passo 9: Configurar Nginx

```bash
# Voltar para root
exit

# Copiar configuração
cp /home/entrega/entrega_pra_mim/deploy/nginx.conf /etc/nginx/sites-available/entrega-pra-mim

# Editar com seu domínio
nano /etc/nginx/sites-available/entrega-pra-mim
# Substitua "seudominio.com.br" pelo seu domínio real

# Ativar site
ln -s /etc/nginx/sites-available/entrega-pra-mim /etc/nginx/sites-enabled/

# Remover site padrão
rm /etc/nginx/sites-enabled/default

# Testar configuração
nginx -t

# Reiniciar Nginx
systemctl restart nginx
```

---

## Passo 10: Configurar SSL (HTTPS)

```bash
# Obter certificado SSL gratuito
certbot --nginx -d seudominio.com.br -d www.seudominio.com.br

# Seguir as instruções do Certbot
# Escolha redirecionar HTTP para HTTPS (opção 2)

# Renovação automática já está configurada
# Testar renovação
certbot renew --dry-run
```

---

## Passo 11: Configurar Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

---

## Passo 12: Configurar DNS na Hostinger

1. Acesse o painel da Hostinger
2. Vá em **Domínios** → **DNS Zone**
3. Adicione registro A:
   - **Tipo**: A
   - **Nome**: @ (ou subdomínio, ex: "entregas")
   - **Aponta para**: IP do seu VPS
   - **TTL**: 14400

4. Para www:
   - **Tipo**: A
   - **Nome**: www
   - **Aponta para**: IP do seu VPS

5. Aguarde propagação (até 24h, geralmente minutos)

---

## Comandos Úteis

### PM2
```bash
pm2 status                    # Ver status
pm2 logs entrega-pra-mim      # Ver logs
pm2 restart entrega-pra-mim   # Reiniciar
pm2 stop entrega-pra-mim      # Parar
pm2 delete entrega-pra-mim    # Remover
```

### Nginx
```bash
nginx -t                      # Testar configuração
systemctl restart nginx       # Reiniciar
systemctl status nginx        # Ver status
tail -f /var/log/nginx/error.log  # Ver erros
```

### MySQL
```bash
mysql -u entrega_user -p      # Conectar
mysqldump -u root -p entrega_pra_mim > backup.sql  # Backup
```

### Deploy de Atualização
```bash
su - entrega
cd entrega_pra_mim
git pull origin main
npm ci
npx prisma generate
npx prisma db push
npm run build
pm2 restart entrega-pra-mim
```

---

## Usando Subdomínio

Se preferir usar um subdomínio (ex: `entregas.seusite.com.br`):

1. No DNS da Hostinger, crie registro A para o subdomínio
2. No Nginx, altere `server_name`:
   ```
   server_name entregas.seusite.com.br;
   ```
3. No Certbot:
   ```bash
   certbot --nginx -d entregas.seusite.com.br
   ```
4. No `.env`:
   ```
   NEXTAUTH_URL="https://entregas.seusite.com.br"
   ```

---

## Troubleshooting

### Erro 502 Bad Gateway
```bash
# Verificar se a aplicação está rodando
pm2 status
pm2 logs entrega-pra-mim

# Verificar porta
netstat -tlnp | grep 3000
```

### Erro de conexão com MySQL
```bash
# Testar conexão
mysql -u entrega_user -p -h localhost entrega_pra_mim

# Verificar se MySQL está rodando
systemctl status mysql
```

### Aplicação não inicia
```bash
# Ver logs detalhados
pm2 logs entrega-pra-mim --lines 100

# Verificar .env
cat /home/entrega/entrega_pra_mim/.env
```

### SSL não funciona
```bash
# Verificar certificado
certbot certificates

# Renovar manualmente
certbot renew

# Verificar Nginx
nginx -t
```

---

## Backup Automático

Crie um script de backup:

```bash
# /home/entrega/backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/entrega/backups"
mkdir -p $BACKUP_DIR

# Backup do banco
mysqldump -u entrega_user -pSuaSenha entrega_pra_mim > $BACKUP_DIR/db_$DATE.sql

# Backup dos uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /home/entrega/entrega_pra_mim/public/uploads

# Manter apenas últimos 7 dias
find $BACKUP_DIR -mtime +7 -delete

echo "Backup concluído: $DATE"
```

Agendar com cron:
```bash
crontab -e
# Adicionar linha:
0 3 * * * /home/entrega/backup.sh >> /home/entrega/logs/backup.log 2>&1
```

---

## Monitoramento

### Instalar htop
```bash
apt install htop
htop  # Monitorar recursos
```

### PM2 Monitoramento
```bash
pm2 monit  # Dashboard em tempo real
```

### Alertas (opcional)
Configure alertas no PM2:
```bash
pm2 set pm2:sysmonit true
pm2 plus  # Dashboard online (gratuito para 1 servidor)
```
