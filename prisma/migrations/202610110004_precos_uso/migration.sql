-- CreateTable
CREATE TABLE `pricing_rules` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `precoPorKm` DECIMAL(10, 2) NOT NULL DEFAULT 3,
    `valorMinimo` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `multAgendada` DECIMAL(5, 2) NOT NULL DEFAULT 1,
    `multDocumentos` DECIMAL(5, 2) NOT NULL DEFAULT 1.2,
    `multExpressa` DECIMAL(5, 2) NOT NULL DEFAULT 1.5,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pricing_rules_organizationId_key`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pricing_bairros` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `bairro` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `valor` DECIMAL(10, 2) NOT NULL,

    UNIQUE INDEX `pricing_bairros_organizationId_bairro_key`(`organizationId`, `bairro`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `usage_counters` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `mes` CHAR(7) NOT NULL,
    `entregas` INTEGER NOT NULL DEFAULT 0,
    `chamadasMaps` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `usage_counters_organizationId_mes_key`(`organizationId`, `mes`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `pricing_rules` ADD CONSTRAINT `pricing_rules_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pricing_bairros` ADD CONSTRAINT `pricing_bairros_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `usage_counters` ADD CONSTRAINT `usage_counters_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;




-- Backfill: cada central existente recebe a tabela de preço que era global
-- (R$ 3,00/km; agendada 1,0; documentos 1,2; expressa 1,5; sem mínimo).
INSERT INTO `pricing_rules` (`id`, `organizationId`, `precoPorKm`, `valorMinimo`, `multAgendada`, `multDocumentos`, `multExpressa`, `updatedAt`)
SELECT CONCAT('prc_', `id`), `id`, 3, 0, 1, 1.2, 1.5, CURRENT_TIMESTAMP(3) FROM `organizations`;

-- Uso histórico de entregas por mês (horário de Brasília, UTC-3)
INSERT INTO `usage_counters` (`id`, `organizationId`, `mes`, `entregas`, `chamadasMaps`)
SELECT CONCAT('uso_', t.`org`, '_', REPLACE(t.`mes`, '-', '')), t.`org`, t.`mes`, t.`n`, 0
FROM (
  SELECT `organizationId` AS `org`, DATE_FORMAT(`createdAt` - INTERVAL 3 HOUR, '%Y-%m') AS `mes`, COUNT(*) AS `n`
  FROM `pedidos` GROUP BY `org`, `mes`
) AS t;
