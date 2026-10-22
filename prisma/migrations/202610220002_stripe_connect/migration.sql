ALTER TABLE `organization_settings` ADD COLUMN `stripeAccountId` VARCHAR(100) NULL;
CREATE UNIQUE INDEX `organization_settings_stripeAccountId_key` ON `organization_settings` (`stripeAccountId`);
CREATE TABLE `gateway_eventos` (
 `id` VARCHAR(100) NOT NULL, `organizationId` VARCHAR(191) NOT NULL, `tipo` VARCHAR(100) NOT NULL,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`),
 INDEX `gateway_eventos_org_data` (`organizationId`,`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
