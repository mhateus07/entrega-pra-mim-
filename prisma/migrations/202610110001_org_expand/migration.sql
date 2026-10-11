-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('ADMIN', 'SUPERADMIN', 'CLIENTE', 'MOTOBOY') NOT NULL DEFAULT 'CLIENTE';

-- AlterTable
ALTER TABLE `motoboys` ADD COLUMN `organizationId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `clientes` ADD COLUMN `organizationId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `enderecos` ADD COLUMN `organizationId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `pedidos` ADD COLUMN `organizationId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `avaliacoes` ADD COLUMN `organizationId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `mensagens` ADD COLUMN `organizationId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `pagamentos` ADD COLUMN `organizationId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `saldos_motoboy` ADD COLUMN `organizationId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `transacoes_motoboy` ADD COLUMN `organizationId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `audit_logs` ADD COLUMN `organizationId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `organizations` (
    `id` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `plano` ENUM('ESSENCIAL', 'CENTRAL', 'MARCA_PROPRIA') NOT NULL DEFAULT 'ESSENCIAL',
    `status` ENUM('PENDENTE', 'ATIVA', 'SUSPENSA') NOT NULL DEFAULT 'PENDENTE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `organizations_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization_members` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `papel` ENUM('OWNER', 'DISPATCHER', 'CLIENT', 'DRIVER') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `organization_members_userId_idx`(`userId`),
    UNIQUE INDEX `organization_members_organizationId_userId_key`(`organizationId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `organization_settings` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `nomeExibicao` VARCHAR(191) NULL,
    `logoArquivo` VARCHAR(191) NULL,
    `corPrimaria` VARCHAR(7) NULL,
    `taxaPlataforma` DECIMAL(5, 4) NOT NULL DEFAULT 0,
    `repasseMotoboy` DECIMAL(5, 4) NOT NULL DEFAULT 0.7,
    `fusoHorario` VARCHAR(191) NOT NULL DEFAULT 'America/Sao_Paulo',
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `organization_settings_organizationId_key`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `motoboys_organizationId_status_createdAt_id_idx` ON `motoboys`(`organizationId`, `status`, `createdAt`, `id`);

-- CreateIndex
CREATE INDEX `motoboys_organizationId_aprovacao_createdAt_id_idx` ON `motoboys`(`organizationId`, `aprovacao`, `createdAt`, `id`);

-- CreateIndex
CREATE INDEX `clientes_organizationId_createdAt_id_idx` ON `clientes`(`organizationId`, `createdAt`, `id`);

-- CreateIndex
CREATE INDEX `enderecos_organizationId_clienteId_idx` ON `enderecos`(`organizationId`, `clienteId`);

-- CreateIndex
CREATE INDEX `pedidos_organizationId_status_createdAt_id_idx` ON `pedidos`(`organizationId`, `status`, `createdAt`, `id`);

-- CreateIndex
CREATE INDEX `pedidos_organizationId_clienteId_createdAt_id_idx` ON `pedidos`(`organizationId`, `clienteId`, `createdAt`, `id`);

-- CreateIndex
CREATE INDEX `pedidos_organizationId_motoboyId_status_createdAt_id_idx` ON `pedidos`(`organizationId`, `motoboyId`, `status`, `createdAt`, `id`);

-- CreateIndex
CREATE INDEX `avaliacoes_organizationId_motoboyId_createdAt_idx` ON `avaliacoes`(`organizationId`, `motoboyId`, `createdAt`);

-- CreateIndex
CREATE INDEX `mensagens_organizationId_pedidoId_idx` ON `mensagens`(`organizationId`, `pedidoId`);

-- CreateIndex
CREATE INDEX `pagamentos_organizationId_status_idx` ON `pagamentos`(`organizationId`, `status`);

-- CreateIndex
CREATE INDEX `pagamentos_organizationId_clienteId_idx` ON `pagamentos`(`organizationId`, `clienteId`);

-- CreateIndex
CREATE INDEX `saldos_motoboy_organizationId_idx` ON `saldos_motoboy`(`organizationId`);

-- CreateIndex
CREATE INDEX `transacoes_motoboy_organizationId_motoboyId_createdAt_id_idx` ON `transacoes_motoboy`(`organizationId`, `motoboyId`, `createdAt`, `id`);

-- CreateIndex
CREATE INDEX `audit_logs_organizationId_createdAt_idx` ON `audit_logs`(`organizationId`, `createdAt`);

-- AddForeignKey
ALTER TABLE `organization_members` ADD CONSTRAINT `organization_members_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_members` ADD CONSTRAINT `organization_members_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_settings` ADD CONSTRAINT `organization_settings_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `motoboys` ADD CONSTRAINT `motoboys_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clientes` ADD CONSTRAINT `clientes_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enderecos` ADD CONSTRAINT `enderecos_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `avaliacoes` ADD CONSTRAINT `avaliacoes_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mensagens` ADD CONSTRAINT `mensagens_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagamentos` ADD CONSTRAINT `pagamentos_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saldos_motoboy` ADD CONSTRAINT `saldos_motoboy_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transacoes_motoboy` ADD CONSTRAINT `transacoes_motoboy_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

