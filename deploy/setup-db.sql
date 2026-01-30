-- Setup do banco de dados MySQL
CREATE USER IF NOT EXISTS 'entrega_user'@'localhost' IDENTIFIED BY 'EntregaDB2026Seguro';
GRANT ALL PRIVILEGES ON entrega_pra_mim.* TO 'entrega_user'@'localhost';
FLUSH PRIVILEGES;
