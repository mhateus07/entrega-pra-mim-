-- Backfill multi-tenant: a instalação existente vira a "Central Principal".
-- Todos os dados atuais passam a pertencer a ela, para que nada pare de funcionar.

INSERT INTO `organizations` (`id`, `nome`, `slug`, `plano`, `status`, `createdAt`, `updatedAt`)
VALUES ('org_central_principal', 'Central Principal', 'central-principal', 'MARCA_PROPRIA', 'ATIVA', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- Sem comissão da plataforma (modelo SaaS); repasse padrão ao motoboy de 70% (só relatório).
-- Pagamentos antigos mantêm os valores de taxa já gravados.
INSERT INTO `organization_settings` (`id`, `organizationId`, `taxaPlataforma`, `repasseMotoboy`, `fusoHorario`, `updatedAt`)
VALUES ('orgset_central_principal', 'org_central_principal', 0, 0.7, 'America/Sao_Paulo', CURRENT_TIMESTAMP(3));

-- ADMIN global vira SUPERADMIN da plataforma
UPDATE `users` SET `role` = 'SUPERADMIN' WHERE `role` = 'ADMIN';

-- Papel de cada usuário dentro da Central Principal.
-- O superadmin existente também é OWNER, para continuar operando a central atual.
INSERT INTO `organization_members` (`id`, `organizationId`, `userId`, `papel`, `createdAt`)
SELECT CONCAT('mem_', `id`), 'org_central_principal', `id`,
  CASE `role` WHEN 'SUPERADMIN' THEN 'OWNER' WHEN 'MOTOBOY' THEN 'DRIVER' ELSE 'CLIENT' END,
  CURRENT_TIMESTAMP(3)
FROM `users`;

UPDATE `motoboys` SET `organizationId` = 'org_central_principal' WHERE `organizationId` IS NULL;
UPDATE `clientes` SET `organizationId` = 'org_central_principal' WHERE `organizationId` IS NULL;
UPDATE `enderecos` SET `organizationId` = 'org_central_principal' WHERE `organizationId` IS NULL;
UPDATE `pedidos` SET `organizationId` = 'org_central_principal' WHERE `organizationId` IS NULL;
UPDATE `pagamentos` SET `organizationId` = 'org_central_principal' WHERE `organizationId` IS NULL;
UPDATE `avaliacoes` SET `organizationId` = 'org_central_principal' WHERE `organizationId` IS NULL;
UPDATE `mensagens` SET `organizationId` = 'org_central_principal' WHERE `organizationId` IS NULL;
UPDATE `saldos_motoboy` SET `organizationId` = 'org_central_principal' WHERE `organizationId` IS NULL;
UPDATE `transacoes_motoboy` SET `organizationId` = 'org_central_principal' WHERE `organizationId` IS NULL;
UPDATE `audit_logs` SET `organizationId` = 'org_central_principal' WHERE `organizationId` IS NULL;
