-- AlterTable
ALTER TABLE `pedidos` MODIFY `valorBase` DECIMAL(14, 2) NOT NULL,
    MODIFY `valorTotal` DECIMAL(14, 2) NOT NULL;

-- AlterTable
ALTER TABLE `pagamentos` MODIFY `valor` DECIMAL(14, 2) NOT NULL,
    MODIFY `taxaPlataforma` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    MODIFY `valorMotoboy` DECIMAL(14, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `saldos_motoboy` MODIFY `saldoDisponivel` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    MODIFY `saldoPendente` DECIMAL(14, 2) NOT NULL DEFAULT 0,
    MODIFY `totalRecebido` DECIMAL(14, 2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `transacoes_motoboy` MODIFY `valor` DECIMAL(14, 2) NOT NULL;

-- CreateIndex
CREATE INDEX `motoboys_status_createdAt_id_idx` ON `motoboys`(`status`, `createdAt`, `id`);

-- CreateIndex
CREATE INDEX `pedidos_status_createdAt_id_idx` ON `pedidos`(`status`, `createdAt`, `id`);

-- CreateIndex
CREATE INDEX `pedidos_clienteId_createdAt_id_idx` ON `pedidos`(`clienteId`, `createdAt`, `id`);

-- CreateIndex
CREATE INDEX `pedidos_motoboyId_status_createdAt_id_idx` ON `pedidos`(`motoboyId`, `status`, `createdAt`, `id`);

-- CreateIndex
CREATE INDEX `transacoes_motoboy_motoboyId_createdAt_id_idx` ON `transacoes_motoboy`(`motoboyId`, `createdAt`, `id`);
