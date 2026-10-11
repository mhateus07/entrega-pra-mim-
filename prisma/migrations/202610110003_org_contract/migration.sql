-- Contract multi-tenant: organizationId obrigatório e unicidade por organização.
-- Os índices novos são criados antes de remover os únicos antigos, que sustentam as FKs de userId.

-- DropForeignKey
ALTER TABLE `motoboys` DROP FOREIGN KEY `motoboys_organizationId_fkey`;

-- DropForeignKey
ALTER TABLE `clientes` DROP FOREIGN KEY `clientes_organizationId_fkey`;

-- DropForeignKey
ALTER TABLE `enderecos` DROP FOREIGN KEY `enderecos_organizationId_fkey`;

-- DropForeignKey
ALTER TABLE `pedidos` DROP FOREIGN KEY `pedidos_organizationId_fkey`;

-- DropForeignKey
ALTER TABLE `avaliacoes` DROP FOREIGN KEY `avaliacoes_organizationId_fkey`;

-- DropForeignKey
ALTER TABLE `mensagens` DROP FOREIGN KEY `mensagens_organizationId_fkey`;

-- DropForeignKey
ALTER TABLE `pagamentos` DROP FOREIGN KEY `pagamentos_organizationId_fkey`;

-- DropForeignKey
ALTER TABLE `saldos_motoboy` DROP FOREIGN KEY `saldos_motoboy_organizationId_fkey`;

-- DropForeignKey
ALTER TABLE `transacoes_motoboy` DROP FOREIGN KEY `transacoes_motoboy_organizationId_fkey`;

-- CreateIndex
CREATE INDEX `motoboys_userId_idx` ON `motoboys`(`userId`);

-- CreateIndex
CREATE UNIQUE INDEX `motoboys_organizationId_userId_key` ON `motoboys`(`organizationId`, `userId`);

-- CreateIndex
CREATE UNIQUE INDEX `motoboys_organizationId_cnh_key` ON `motoboys`(`organizationId`, `cnh`);

-- CreateIndex
CREATE UNIQUE INDEX `motoboys_organizationId_veiculoPlaca_key` ON `motoboys`(`organizationId`, `veiculoPlaca`);

-- CreateIndex
CREATE INDEX `clientes_userId_idx` ON `clientes`(`userId`);

-- CreateIndex
CREATE UNIQUE INDEX `clientes_organizationId_userId_key` ON `clientes`(`organizationId`, `userId`);

-- CreateIndex
CREATE UNIQUE INDEX `clientes_organizationId_cpfCnpj_key` ON `clientes`(`organizationId`, `cpfCnpj`);

-- DropIndex
DROP INDEX `motoboys_userId_key` ON `motoboys`;

-- DropIndex
DROP INDEX `motoboys_cnh_key` ON `motoboys`;

-- DropIndex
DROP INDEX `motoboys_veiculoPlaca_key` ON `motoboys`;

-- DropIndex
DROP INDEX `clientes_userId_key` ON `clientes`;

-- DropIndex
DROP INDEX `clientes_cpfCnpj_key` ON `clientes`;

-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('SUPERADMIN', 'CLIENTE', 'MOTOBOY') NOT NULL DEFAULT 'CLIENTE';

-- AlterTable
ALTER TABLE `motoboys` MODIFY `organizationId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `clientes` MODIFY `organizationId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `enderecos` MODIFY `organizationId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `pedidos` MODIFY `organizationId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `avaliacoes` MODIFY `organizationId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `mensagens` MODIFY `organizationId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `pagamentos` MODIFY `organizationId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `saldos_motoboy` MODIFY `organizationId` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `transacoes_motoboy` MODIFY `organizationId` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `motoboys` ADD CONSTRAINT `motoboys_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clientes` ADD CONSTRAINT `clientes_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enderecos` ADD CONSTRAINT `enderecos_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `avaliacoes` ADD CONSTRAINT `avaliacoes_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `mensagens` ADD CONSTRAINT `mensagens_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagamentos` ADD CONSTRAINT `pagamentos_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saldos_motoboy` ADD CONSTRAINT `saldos_motoboy_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transacoes_motoboy` ADD CONSTRAINT `transacoes_motoboy_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
