-- AlterTable
ALTER TABLE `pedidos` ADD COLUMN `trackingToken` VARCHAR(64) NULL;

-- CreateTable
CREATE TABLE `convites` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `papel` ENUM('OWNER', 'DISPATCHER', 'CLIENT', 'DRIVER') NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `email` VARCHAR(191) NULL,
    `nome` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usadoEm` DATETIME(3) NULL,
    `usadoPorId` VARCHAR(191) NULL,
    `criadoPorId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `convites_tokenHash_key`(`tokenHash`),
    INDEX `convites_organizationId_createdAt_idx`(`organizationId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `pedidos_trackingToken_key` ON `pedidos`(`trackingToken`);

-- AddForeignKey
ALTER TABLE `convites` ADD CONSTRAINT `convites_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

