-- CreateTable
CREATE TABLE `MedicineCatalog` (
    `id` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `brandName` VARCHAR(255) NOT NULL,
    `genericName` VARCHAR(255) NOT NULL,
    `composition` TEXT NULL,
    `strength` VARCHAR(120) NULL,
    `form` VARCHAR(60) NULL,
    `manufacturer` VARCHAR(255) NULL,
    `packSize` VARCHAR(160) NULL,
    `price` DECIMAL(10, 2) NULL,
    `therapeuticClass` VARCHAR(80) NULL,
    `isDiscontinued` BOOLEAN NOT NULL DEFAULT false,
    `searchText` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MedicineCatalog_productId_key`(`productId`),
    INDEX `MedicineCatalog_brandName_idx`(`brandName`),
    INDEX `MedicineCatalog_genericName_idx`(`genericName`),
    INDEX `MedicineCatalog_therapeuticClass_idx`(`therapeuticClass`),
    INDEX `MedicineCatalog_isDiscontinued_idx`(`isDiscontinued`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
