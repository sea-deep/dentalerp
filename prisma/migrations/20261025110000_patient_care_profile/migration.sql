-- CreateTable
CREATE TABLE `PatientCareProfile` (
    `id` VARCHAR(191) NOT NULL,
    `hospitalId` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `assignedDoctorId` VARCHAR(191) NULL,
    `weightKg` DOUBLE NULL,
    `heightCm` DOUBLE NULL,
    `systolicBP` INTEGER NULL,
    `diastolicBP` INTEGER NULL,
    `pulse` INTEGER NULL,
    `temperatureC` DOUBLE NULL,
    `measuredAt` DATETIME(3) NULL,
    `pastSurgeries` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PatientCareProfile_patientId_key`(`patientId`),
    INDEX `PatientCareProfile_hospitalId_idx`(`hospitalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PatientCareProfile` ADD CONSTRAINT `PatientCareProfile_hospitalId_fkey` FOREIGN KEY (`hospitalId`) REFERENCES `Hospital`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PatientCareProfile` ADD CONSTRAINT `PatientCareProfile_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PatientCareProfile` ADD CONSTRAINT `PatientCareProfile_assignedDoctorId_fkey` FOREIGN KEY (`assignedDoctorId`) REFERENCES `Staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

