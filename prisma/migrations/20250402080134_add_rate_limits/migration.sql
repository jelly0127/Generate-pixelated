-- CreateTable
CREATE TABLE `MacAddressLimit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `macAddress` VARCHAR(191) NOT NULL,
    `dailyRequestCount` INTEGER NOT NULL DEFAULT 0,
    `lastRequestDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastRequestTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MacAddressLimit_macAddress_key`(`macAddress`),
    INDEX `MacAddressLimit_macAddress_idx`(`macAddress`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ApiRateLimit` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'global',
    `requestCount` INTEGER NOT NULL DEFAULT 0,
    `windowStartTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
