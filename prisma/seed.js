const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando el seeder...');

  // 1. Crear el primer año escolar activo
  const anioEscolar = await prisma.anios_escolares.create({
    data: {
      nombre: '2025-2026',
      fecha_inicio: new Date('2025-09-01'),
      fecha_fin: new Date('2026-07-31'),
      activo: true,
    },
  });
  console.log(`Año escolar creado: ${anioEscolar.nombre}`);

  // 2. Crear los grados (Nivel Inicial y Primaria)
  const gradosData = [
    { nombre: 'Preescolar A', orden: 1, nivel: 'INICIAL' },
    { nombre: 'Preescolar B', orden: 2, nivel: 'INICIAL' },
    { nombre: '1er Grado', orden: 3, nivel: 'PRIMARIA' },
    { nombre: '2do Grado', orden: 4, nivel: 'PRIMARIA' },
    { nombre: '3er Grado', orden: 5, nivel: 'PRIMARIA' },
    { nombre: '4to Grado', orden: 6, nivel: 'PRIMARIA' },
    { nombre: '5to Grado', orden: 7, nivel: 'PRIMARIA' },
    { nombre: '6to Grado', orden: 8, nivel: 'PRIMARIA' },
  ];

  for (const grado of gradosData) {
    await prisma.grados.create({
      data: grado,
    });
  }
  console.log('Grados creados exitosamente.');

  // 3. Crear usuario SUPER_ADMIN por defecto
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.usuarios.create({
    data: {
      nombre_usuario: 'admin',
      password_hash: passwordHash,
      rol: 'SUPER_ADMIN',
    },
  });
  console.log(`Usuario administrador creado: ${admin.nombre_usuario}`);

  // 4. Datos de configuración inicial (Membrete de la escuela)
  const configuracionesData = [
    { clave: 'nombre_escuela', valor: 'U.E.E. "General Aquilino Juáres"' },
    { clave: 'codigo_plantel', valor: '00000000' },
    { clave: 'direccion_escuela', valor: 'Cabudare' },
    { clave: 'municipio_escuela', valor: 'Palavecino' },
    { clave: 'parroquia_escuela', valor: 'Cabudare' },
    { clave: 'estado_escuela', valor: 'Lara' },
    { clave: 'telefono_escuela', valor: '' },
    { clave: 'nombre_director', valor: '' },
    { clave: 'ministerio_texto', valor: 'República Bolivariana de Venezuela\nMinisterio del Poder Popular para la Educación\nUnidad Educativa Estadal\n"General Aquilino Juáres"' },
  ];

  for (const config of configuracionesData) {
    await prisma.configuracion.create({
      data: config,
    });
  }
  console.log('Configuración de la escuela insertada.');

  console.log('¡Seeder terminado con éxito!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
