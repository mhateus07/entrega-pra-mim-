-- Setup do banco de dados MySQL
CREATE USER IF NOT EXISTS 'entrega_user'@'localhost' IDENTIFIED BY 'SUA_SENHA_FORTE_AQUI';
GRANT ALL PRIVILEGES ON entrega_pra_mim.* TO 'entrega_user'@'localhost';
FLUSH PRIVILEGES;
