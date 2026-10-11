-- AlterTable
ALTER TABLE `organization_settings` ADD COLUMN `despachoMaxTentativas` INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN `despachoTtlSegundos` INTEGER NOT NULL DEFAULT 90;

-- AlterTable
ALTER TABLE `pedidos` ADD COLUMN `despachoManual` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `tentativasDespacho` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `dispatch_offers` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `pedidoId` VARCHAR(191) NOT NULL,
    `motoboyId` VARCHAR(191) NOT NULL,
    `status` ENUM('OFERTADA', 'ACEITA', 'RECUSADA', 'EXPIRADA', 'CANCELADA') NOT NULL DEFAULT 'OFERTADA',
    `tentativa` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `respondidaEm` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `dispatch_offers_organizationId_status_expiresAt_idx`(`organizationId`, `status`, `expiresAt`),
    INDEX `dispatch_offers_pedidoId_status_idx`(`pedidoId`, `status`),
    INDEX `dispatch_offers_motoboyId_status_expiresAt_idx`(`motoboyId`, `status`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `dispatch_offers` ADD CONSTRAINT `dispatch_offers_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispatch_offers` ADD CONSTRAINT `dispatch_offers_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `pedidos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dispatch_offers` ADD CONSTRAINT `dispatch_offers_motoboyId_fkey` FOREIGN KEY (`motoboyId`) REFERENCES `motoboys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

