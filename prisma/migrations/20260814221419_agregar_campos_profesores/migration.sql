-- AlterTable
ALTER TABLE `profesores` ADD COLUMN `activo` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `fecha_nacimiento` DATE NULL,
    ADD COLUMN `nacionalidad` ENUM('V', 'E') NOT NULL DEFAULT 'V',
    ADD COLUMN `sexo` ENUM('M', 'F') NULL;

-- CreateIndex
CREATE INDEX `profesores_activo_idx` ON `profesores`(`activo`);
