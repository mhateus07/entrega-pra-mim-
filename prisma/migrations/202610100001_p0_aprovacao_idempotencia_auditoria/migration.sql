-- AlterTable
ALTER TABLE `motoboys` ADD COLUMN `aprovacao` ENUM('PENDENTE_APROVACAO', 'APROVADO', 'REPROVADO', 'SUSPENSO') NOT NULL DEFAULT 'PENDENTE_APROVACAO',
    ADD COLUMN `aprovacaoEm` DATETIME(3) NULL,
    ADD COLUMN `motivoAprovacao` VARCHAR(191) NULL;

-- Motoboys que já operavam antes da aprovação obrigatória continuam ativos;
-- só cadastros novos nascem como PENDENTE_APROVACAO.
UPDATE `motoboys` SET `aprovacao` = 'APROVADO', `aprovacaoEm` = CURRENT_TIMESTAMP(3);

-- CreateTable
CREATE TABLE `idempotency_keys` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `escopo` VARCHAR(100) NOT NULL,
    `chave` VARCHAR(255) NOT NULL,
    `requestHash` VARCHAR(64) NOT NULL,
    `statusCode` INTEGER NULL,
    `resposta` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idempotency_keys_createdAt_idx`(`createdAt`),
    UNIQUE INDEX `idempotency_keys_userId_escopo_chave_key`(`userId`, `escopo`, `chave`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `acao` VARCHAR(100) NOT NULL,
    `entidade` VARCHAR(50) NOT NULL,
    `entidadeId` VARCHAR(191) NULL,
    `dados` JSON NULL,
    `ip` VARCHAR(64) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_entidade_entidadeId_createdAt_idx`(`entidade`, `entidadeId`, `createdAt`),
    INDEX `audit_logs_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `audit_logs_acao_createdAt_idx`(`acao`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `motoboys_aprovacao_createdAt_id_idx` ON `motoboys`(`aprovacao`, `createdAt`, `id`);

