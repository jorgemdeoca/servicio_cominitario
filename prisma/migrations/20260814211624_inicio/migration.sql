-- CreateTable
CREATE TABLE `usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre_usuario` VARCHAR(50) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `rol` ENUM('SUPER_ADMIN', 'ADMIN') NOT NULL,
    `creado_en` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `usuarios_nombre_usuario_key`(`nombre_usuario`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `configuracion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clave` VARCHAR(100) NOT NULL,
    `valor` TEXT NULL,

    UNIQUE INDEX `configuracion_clave_key`(`clave`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `grados` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(50) NOT NULL,
    `orden` INTEGER NOT NULL,
    `nivel` ENUM('INICIAL', 'PRIMARIA') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `anios_escolares` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombre` VARCHAR(20) NOT NULL,
    `fecha_inicio` DATE NULL,
    `fecha_fin` DATE NULL,
    `activo` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `secciones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `letra` VARCHAR(5) NOT NULL,
    `grado_id` INTEGER NOT NULL,
    `anio_escolar_id` INTEGER NOT NULL,

    INDEX `secciones_grado_id_idx`(`grado_id`),
    INDEX `secciones_anio_escolar_id_idx`(`anio_escolar_id`),
    UNIQUE INDEX `secciones_grado_id_anio_escolar_id_letra_key`(`grado_id`, `anio_escolar_id`, `letra`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `personas` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `apellidos` VARCHAR(200) NOT NULL,
    `nombres` VARCHAR(200) NOT NULL,
    `cedula` VARCHAR(20) NOT NULL,
    `nacionalidad` ENUM('V', 'E') NOT NULL,
    `fecha_nacimiento` DATE NULL,
    `profesion_oficio` VARCHAR(100) NULL,
    `estado_civil` VARCHAR(30) NULL,
    `telefono` VARCHAR(20) NULL,
    `direccion` TEXT NULL,
    `observaciones` TEXT NULL,
    `eliminado` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `personas_cedula_key`(`cedula`),
    INDEX `personas_apellidos_idx`(`apellidos`),
    INDEX `personas_nombres_idx`(`nombres`),
    INDEX `personas_eliminado_idx`(`eliminado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `estudiantes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `primer_apellido` VARCHAR(100) NOT NULL,
    `segundo_apellido` VARCHAR(100) NULL,
    `primer_nombre` VARCHAR(100) NOT NULL,
    `segundo_nombre` VARCHAR(100) NULL,
    `nacionalidad` ENUM('V', 'E') NOT NULL,
    `codigo_escolar` VARCHAR(30) NULL,
    `lateralidad` VARCHAR(20) NULL,
    `sexo` ENUM('M', 'F') NOT NULL,
    `fecha_nacimiento` DATE NOT NULL,
    `lugar_nacimiento` VARCHAR(100) NULL,
    `estado_nacimiento` VARCHAR(100) NULL,
    `tipo_parto` ENUM('NORMAL', 'CESAREA', 'FORCEPS', 'PREMATURO') NULL,
    `meses_prematuro` INTEGER NULL,
    `apreciacion_medico` VARCHAR(20) NULL,
    `apreciacion_detalle` TEXT NULL,
    `enfermedades_padecidas` TEXT NULL,
    `hospitalizado` BOOLEAN NULL DEFAULT false,
    `hospitalizado_detalle` TEXT NULL,
    `alergico` BOOLEAN NULL DEFAULT false,
    `alergico_detalle` VARCHAR(200) NULL,
    `limitacion_motora` BOOLEAN NOT NULL DEFAULT false,
    `limitacion_visual` BOOLEAN NOT NULL DEFAULT false,
    `limitacion_crecimiento` BOOLEAN NOT NULL DEFAULT false,
    `limitacion_auditiva` BOOLEAN NOT NULL DEFAULT false,
    `limitacion_genetica` BOOLEAN NOT NULL DEFAULT false,
    `vacunas_completas` BOOLEAN NULL DEFAULT true,
    `vacunas_faltantes` VARCHAR(200) NULL,
    `tratamiento_medico` BOOLEAN NULL DEFAULT false,
    `tratamiento_detalle` TEXT NULL,
    `numero_hermanos` INTEGER NULL,
    `lugar_entre_hermanos` INTEGER NULL,
    `madre_id` INTEGER NULL,
    `padre_id` INTEGER NULL,
    `representante_id` INTEGER NOT NULL,
    `eliminado` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `estudiantes_codigo_escolar_key`(`codigo_escolar`),
    INDEX `estudiantes_madre_id_idx`(`madre_id`),
    INDEX `estudiantes_padre_id_idx`(`padre_id`),
    INDEX `estudiantes_representante_id_idx`(`representante_id`),
    INDEX `estudiantes_primer_apellido_idx`(`primer_apellido`),
    INDEX `estudiantes_eliminado_idx`(`eliminado`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profesores` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nombres` VARCHAR(100) NOT NULL,
    `apellidos` VARCHAR(100) NOT NULL,
    `cedula` VARCHAR(20) NOT NULL,
    `telefono` VARCHAR(20) NULL,
    `email` VARCHAR(150) NULL,

    UNIQUE INDEX `profesores_cedula_key`(`cedula`),
    INDEX `profesores_apellidos_idx`(`apellidos`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inscripciones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `estudiante_id` INTEGER NOT NULL,
    `seccion_id` INTEGER NOT NULL,
    `anio_escolar_id` INTEGER NOT NULL,
    `profesor_id` INTEGER NULL,
    `fecha_inscripcion` DATE NOT NULL,
    `literal` ENUM('A', 'B', 'C', 'D', 'E') NULL,
    `estado` ENUM('ACTIVO', 'APROBADO', 'REPROBADO', 'RETIRADO') NOT NULL DEFAULT 'ACTIVO',
    `modalidad` ENUM('NUEVO_INGRESO', 'REGULAR', 'REPITIENTE', 'TRASLADO', 'PROSECUCION') NOT NULL DEFAULT 'REGULAR',
    `direccion` TEXT NULL,
    `telefono` VARCHAR(20) NULL,
    `correo_electronico` VARCHAR(150) NULL,
    `talla` VARCHAR(10) NULL,
    `peso` VARCHAR(10) NULL,
    `talla_camisa` VARCHAR(10) NULL,
    `talla_pantalon` VARCHAR(10) NULL,
    `talla_zapato` VARCHAR(10) NULL,
    `doc_partida_nacimiento` BOOLEAN NOT NULL DEFAULT false,
    `doc_boleta_promocion` BOOLEAN NOT NULL DEFAULT false,
    `doc_ci_madre` BOOLEAN NOT NULL DEFAULT false,
    `doc_ci_padre` BOOLEAN NOT NULL DEFAULT false,
    `doc_foto_estudiante` BOOLEAN NOT NULL DEFAULT false,
    `doc_foto_representante` BOOLEAN NOT NULL DEFAULT false,
    `doc_carpeta_marron` BOOLEAN NOT NULL DEFAULT false,
    `doc_acta_compromiso` BOOLEAN NOT NULL DEFAULT false,
    `misma_institucion` BOOLEAN NULL DEFAULT true,
    `institucion_procedencia` VARCHAR(200) NULL,
    `motivo_retiro_procedencia` VARCHAR(200) NULL,
    `con_quien_vive` ENUM('MADRE', 'PADRE', 'AMBOS', 'OTROS_FAMILIARES') NULL,
    `tiene_hermanos_institucion` BOOLEAN NULL DEFAULT false,
    `cantidad_hermanos` INTEGER NULL,
    `tipo_vivienda` ENUM('CASA', 'APARTAMENTO', 'HABITACION', 'MATERIAL_IMPROVISADO') NULL,
    `condicion_infraestructura` ENUM('BUENA', 'REGULAR') NULL,
    `integracion_pasivo` BOOLEAN NOT NULL DEFAULT false,
    `integracion_inquieto` BOOLEAN NOT NULL DEFAULT false,
    `integracion_tierno` BOOLEAN NOT NULL DEFAULT false,
    `integracion_sensible` BOOLEAN NOT NULL DEFAULT false,
    `habilidades` TEXT NULL,
    `observaciones_generales` TEXT NULL,
    `motivo_retiro_saliente` VARCHAR(200) NULL,
    `fecha_retiro` DATE NULL,
    `eliminado` BOOLEAN NOT NULL DEFAULT false,

    INDEX `inscripciones_estudiante_id_idx`(`estudiante_id`),
    INDEX `inscripciones_seccion_id_idx`(`seccion_id`),
    INDEX `inscripciones_anio_escolar_id_idx`(`anio_escolar_id`),
    INDEX `inscripciones_profesor_id_idx`(`profesor_id`),
    INDEX `inscripciones_estado_idx`(`estado`),
    INDEX `inscripciones_eliminado_idx`(`eliminado`),
    UNIQUE INDEX `inscripciones_estudiante_id_anio_escolar_id_key`(`estudiante_id`, `anio_escolar_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `secciones` ADD CONSTRAINT `secciones_grado_id_fkey` FOREIGN KEY (`grado_id`) REFERENCES `grados`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `secciones` ADD CONSTRAINT `secciones_anio_escolar_id_fkey` FOREIGN KEY (`anio_escolar_id`) REFERENCES `anios_escolares`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `estudiantes` ADD CONSTRAINT `estudiantes_madre_id_fkey` FOREIGN KEY (`madre_id`) REFERENCES `personas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `estudiantes` ADD CONSTRAINT `estudiantes_padre_id_fkey` FOREIGN KEY (`padre_id`) REFERENCES `personas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `estudiantes` ADD CONSTRAINT `estudiantes_representante_id_fkey` FOREIGN KEY (`representante_id`) REFERENCES `personas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inscripciones` ADD CONSTRAINT `inscripciones_estudiante_id_fkey` FOREIGN KEY (`estudiante_id`) REFERENCES `estudiantes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inscripciones` ADD CONSTRAINT `inscripciones_seccion_id_fkey` FOREIGN KEY (`seccion_id`) REFERENCES `secciones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inscripciones` ADD CONSTRAINT `inscripciones_anio_escolar_id_fkey` FOREIGN KEY (`anio_escolar_id`) REFERENCES `anios_escolares`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inscripciones` ADD CONSTRAINT `inscripciones_profesor_id_fkey` FOREIGN KEY (`profesor_id`) REFERENCES `profesores`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
