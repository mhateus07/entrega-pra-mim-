ALTER TABLE `organization_settings`
  ADD COLUMN `atrasoColetaMinutos` INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN `atrasoEntregaMinutos` INTEGER NOT NULL DEFAULT 45,
  ADD COLUMN `telefoneSuporte` VARCHAR(30) NULL;
ALTER TABLE `motoboys`
  ADD COLUMN `localizacaoEm` DATETIME(3) NULL,
  ADD COLUMN `disponivelDesde` DATETIME(3) NULL;
ALTER TABLE `pedidos`
  ADD COLUMN `valorRepasse` DECIMAL(14,2) NULL,
  ADD COLUMN `repasseEstimado` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `destinatarioNome` VARCHAR(120) NULL,
  ADD COLUMN `destinatarioTelefone` VARCHAR(30) NULL,
  ADD COLUMN `referenciaCliente` VARCHAR(100) NULL,
  ADD COLUMN `chegadaColetaEm` DATETIME(3) NULL;
-- Congela uma referência para legados, explicitamente estimada. Não altera
-- pagamentos, transações nem saldos previamente contabilizados.
UPDATE `pedidos` p LEFT JOIN `organization_settings` s ON s.organizationId = p.organizationId
SET p.valorRepasse = ROUND(p.valorTotal * COALESCE(s.repasseMotoboy, 0.7), 2), p.repasseEstimado = true;
CREATE TABLE `pedido_eventos` (
 `id` VARCHAR(191) NOT NULL, `pedidoId` VARCHAR(191) NOT NULL, `organizationId` VARCHAR(191) NOT NULL,
 `userId` VARCHAR(191) NULL, `descricao` VARCHAR(500) NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY (`id`), INDEX `pedido_eventos_org_pedido_data` (`organizationId`,`pedidoId`,`createdAt`),
 CONSTRAINT `pedido_eventos_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `pedidos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `ocorrencias` (
 `id` VARCHAR(191) NOT NULL, `organizationId` VARCHAR(191) NOT NULL, `pedidoId` VARCHAR(191) NOT NULL,
 `autorId` VARCHAR(191) NOT NULL, `tipo` VARCHAR(50) NOT NULL, `descricao` VARCHAR(1000) NOT NULL,
 `resolucao` VARCHAR(1000) NULL, `resolvidaEm` DATETIME(3) NULL, `resolvidaPorId` VARCHAR(191) NULL,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), PRIMARY KEY (`id`),
 INDEX `ocorrencias_org_status_data` (`organizationId`,`resolvidaEm`,`createdAt`),
 CONSTRAINT `ocorrencias_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `pedidos` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE TABLE `acertos` (
 `id` VARCHAR(191) NOT NULL, `organizationId` VARCHAR(191) NOT NULL, `motoboyId` VARCHAR(191) NOT NULL,
 `criadoPorId` VARCHAR(191) NOT NULL, `chave` VARCHAR(100) NOT NULL, `valor` DECIMAL(14,2) NOT NULL,
 `referencia` VARCHAR(200) NOT NULL, `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY (`id`), UNIQUE INDEX `acertos_org_chave` (`organizationId`,`chave`),
 INDEX `acertos_org_motoboy_data` (`organizationId`,`motoboyId`,`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
