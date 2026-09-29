-- CreateTable
CREATE TABLE `mensagens` (
    `id` VARCHAR(191) NOT NULL,
    `pedidoId` VARCHAR(191) NOT NULL,
    `remetente` VARCHAR(191) NOT NULL,
    `conteudo` TEXT NOT NULL,
    `lida` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `mensagens_pedidoId_idx`(`pedidoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pagamentos` (
    `id` VARCHAR(191) NOT NULL,
    `pedidoId` VARCHAR(191) NOT NULL,
    `clienteId` VARCHAR(191) NOT NULL,
    `valor` DOUBLE NOT NULL,
    `taxaPlataforma` DOUBLE NOT NULL DEFAULT 0,
    `valorMotoboy` DOUBLE NOT NULL DEFAULT 0,
    `metodo` ENUM('PIX', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DINHEIRO') NOT NULL,
    `status` ENUM('PENDENTE', 'PROCESSANDO', 'APROVADO', 'RECUSADO', 'CANCELADO', 'REEMBOLSADO') NOT NULL DEFAULT 'PENDENTE',
    `gatewayId` VARCHAR(191) NULL,
    `gatewayResponse` TEXT NULL,
    `pixQrCode` TEXT NULL,
    `pixCopiaCola` TEXT NULL,
    `pixExpiraEm` DATETIME(3) NULL,
    `cartaoUltimos4` VARCHAR(191) NULL,
    `cartaoBandeira` VARCHAR(191) NULL,
    `aprovadoEm` DATETIME(3) NULL,
    `canceladoEm` DATETIME(3) NULL,
    `reembolsadoEm` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pagamentos_pedidoId_key`(`pedidoId`),
    INDEX `pagamentos_clienteId_idx`(`clienteId`),
    INDEX `pagamentos_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `saldos_motoboy` (
    `id` VARCHAR(191) NOT NULL,
    `motoboyId` VARCHAR(191) NOT NULL,
    `saldoDisponivel` DOUBLE NOT NULL DEFAULT 0,
    `saldoPendente` DOUBLE NOT NULL DEFAULT 0,
    `totalRecebido` DOUBLE NOT NULL DEFAULT 0,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `saldos_motoboy_motoboyId_key`(`motoboyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transacoes_motoboy` (
    `id` VARCHAR(191) NOT NULL,
    `motoboyId` VARCHAR(191) NOT NULL,
    `pedidoId` VARCHAR(191) NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `valor` DOUBLE NOT NULL,
    `descricao` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDENTE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `transacoes_motoboy_motoboyId_idx`(`motoboyId`),
    INDEX `transacoes_motoboy_pedidoId_idx`(`pedidoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `mensagens` ADD CONSTRAINT `mensagens_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `pedidos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagamentos` ADD CONSTRAINT `pagamentos_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `pedidos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagamentos` ADD CONSTRAINT `pagamentos_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saldos_motoboy` ADD CONSTRAINT `saldos_motoboy_motoboyId_fkey` FOREIGN KEY (`motoboyId`) REFERENCES `motoboys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transacoes_motoboy` ADD CONSTRAINT `transacoes_motoboy_motoboyId_fkey` FOREIGN KEY (`motoboyId`) REFERENCES `motoboys`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transacoes_motoboy` ADD CONSTRAINT `transacoes_motoboy_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `pedidos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
