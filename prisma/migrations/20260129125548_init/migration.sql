-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha` VARCHAR(191) NOT NULL,
    `nome` VARCHAR(191) NOT NULL,
    `telefone` VARCHAR(191) NULL,
    `role` ENUM('ADMIN', 'CLIENTE', 'MOTOBOY') NOT NULL DEFAULT 'CLIENTE',
    `emailVerified` DATETIME(3) NULL,
    `image` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `accounts` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `providerAccountId` VARCHAR(191) NOT NULL,
    `refresh_token` TEXT NULL,
    `access_token` TEXT NULL,
    `expires_at` INTEGER NULL,
    `token_type` VARCHAR(191) NULL,
    `scope` VARCHAR(191) NULL,
    `id_token` TEXT NULL,
    `session_state` VARCHAR(191) NULL,

    UNIQUE INDEX `accounts_provider_providerAccountId_key`(`provider`, `providerAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sessions_sessionToken_key`(`sessionToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `verification_tokens` (
    `identifier` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `expires` DATETIME(3) NOT NULL,

    UNIQUE INDEX `verification_tokens_token_key`(`token`),
    UNIQUE INDEX `verification_tokens_identifier_token_key`(`identifier`, `token`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `motoboys` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `cnh` VARCHAR(191) NOT NULL,
    `veiculoTipo` VARCHAR(191) NOT NULL,
    `veiculoMarca` VARCHAR(191) NOT NULL,
    `veiculoModelo` VARCHAR(191) NOT NULL,
    `veiculoPlaca` VARCHAR(191) NOT NULL,
    `status` ENUM('DISPONIVEL', 'EM_ENTREGA', 'OFFLINE') NOT NULL DEFAULT 'OFFLINE',
    `latitudeAtual` DOUBLE NULL,
    `longitudeAtual` DOUBLE NULL,
    `avaliacaoMedia` DOUBLE NOT NULL DEFAULT 5.0,
    `totalEntregas` INTEGER NOT NULL DEFAULT 0,
    `ultimaAtividade` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `motoboys_userId_key`(`userId`),
    UNIQUE INDEX `motoboys_cnh_key`(`cnh`),
    UNIQUE INDEX `motoboys_veiculoPlaca_key`(`veiculoPlaca`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `disponibilidades` (
    `id` VARCHAR(191) NOT NULL,
    `motoboyId` VARCHAR(191) NOT NULL,
    `diaSemana` ENUM('DOMINGO', 'SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO') NOT NULL,
    `horaInicio` VARCHAR(191) NOT NULL,
    `horaFim` VARCHAR(191) NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `disponibilidades_motoboyId_diaSemana_key`(`motoboyId`, `diaSemana`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clientes` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `cpfCnpj` VARCHAR(191) NULL,
    `tipoPessoa` VARCHAR(191) NOT NULL DEFAULT 'PF',
    `razaoSocial` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `clientes_userId_key`(`userId`),
    UNIQUE INDEX `clientes_cpfCnpj_key`(`cpfCnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `enderecos` (
    `id` VARCHAR(191) NOT NULL,
    `clienteId` VARCHAR(191) NOT NULL,
    `apelido` VARCHAR(191) NULL,
    `cep` VARCHAR(191) NOT NULL,
    `logradouro` VARCHAR(191) NOT NULL,
    `numero` VARCHAR(191) NOT NULL,
    `complemento` VARCHAR(191) NULL,
    `bairro` VARCHAR(191) NOT NULL,
    `cidade` VARCHAR(191) NOT NULL,
    `estado` VARCHAR(191) NOT NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `favorito` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pedidos` (
    `id` VARCHAR(191) NOT NULL,
    `clienteId` VARCHAR(191) NOT NULL,
    `motoboyId` VARCHAR(191) NULL,
    `enderecoOrigemId` VARCHAR(191) NOT NULL,
    `enderecoDestinoId` VARCHAR(191) NOT NULL,
    `tipoServico` ENUM('EXPRESSA', 'AGENDADA', 'DOCUMENTOS') NOT NULL,
    `status` ENUM('SOLICITADO', 'ACEITO', 'EM_COLETA', 'EM_ENTREGA', 'ENTREGUE', 'CANCELADO') NOT NULL DEFAULT 'SOLICITADO',
    `descricaoItem` VARCHAR(191) NULL,
    `observacoes` TEXT NULL,
    `pesoAproximado` DOUBLE NULL,
    `distanciaKm` DOUBLE NOT NULL,
    `duracaoEstimada` INTEGER NOT NULL,
    `valorBase` DOUBLE NOT NULL,
    `multiplicador` DOUBLE NOT NULL,
    `valorTotal` DOUBLE NOT NULL,
    `dataAgendada` DATETIME(3) NULL,
    `aceitoEm` DATETIME(3) NULL,
    `coletadoEm` DATETIME(3) NULL,
    `entregueEm` DATETIME(3) NULL,
    `canceladoEm` DATETIME(3) NULL,
    `motivoCancelamento` VARCHAR(191) NULL,
    `assinaturaRecebedor` VARCHAR(191) NULL,
    `fotoComprovante` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `avaliacoes` (
    `id` VARCHAR(191) NOT NULL,
    `pedidoId` VARCHAR(191) NOT NULL,
    `motoboyId` VARCHAR(191) NOT NULL,
    `nota` INTEGER NOT NULL,
    `comentario` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `avaliacoes_pedidoId_key`(`pedidoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `accounts` ADD CONSTRAINT `accounts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `motoboys` ADD CONSTRAINT `motoboys_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `disponibilidades` ADD CONSTRAINT `disponibilidades_motoboyId_fkey` FOREIGN KEY (`motoboyId`) REFERENCES `motoboys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `clientes` ADD CONSTRAINT `clientes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `enderecos` ADD CONSTRAINT `enderecos_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_clienteId_fkey` FOREIGN KEY (`clienteId`) REFERENCES `clientes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_motoboyId_fkey` FOREIGN KEY (`motoboyId`) REFERENCES `motoboys`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_enderecoOrigemId_fkey` FOREIGN KEY (`enderecoOrigemId`) REFERENCES `enderecos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_enderecoDestinoId_fkey` FOREIGN KEY (`enderecoDestinoId`) REFERENCES `enderecos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `avaliacoes` ADD CONSTRAINT `avaliacoes_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `pedidos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `avaliacoes` ADD CONSTRAINT `avaliacoes_motoboyId_fkey` FOREIGN KEY (`motoboyId`) REFERENCES `motoboys`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
