const express = require('express');
const router = express.Router();

// GET /api/estudiantes - Listar estudiantes (con búsqueda y paginación)
router.get('/', async (req, res) => {
  try {
    const { buscar, pagina = 1, limite = 20 } = req.query;
    const skip = (parseInt(pagina) - 1) * parseInt(limite);
    const take = parseInt(limite);

    const where = { eliminado: false };

    if (buscar && buscar.trim()) {
      const termino = buscar.trim();
      where.OR = [
        { primer_nombre: { contains: termino } },
        { primer_apellido: { contains: termino } },
        { segundo_nombre: { contains: termino } },
        { segundo_apellido: { contains: termino } },
        { codigo_escolar: { contains: termino } }
      ];
    }

    const [estudiantes, total] = await Promise.all([
      req.prisma.estudiantes.findMany({
        where,
        include: {
          madre: { select: { id: true, nombres: true, apellidos: true, cedula: true, telefono: true } },
          padre: { select: { id: true, nombres: true, apellidos: true, cedula: true, telefono: true } },
          representante: { select: { id: true, nombres: true, apellidos: true, cedula: true, telefono: true } },
        },
        orderBy: { primer_apellido: 'asc' },
        skip,
        take,
      }),
      req.prisma.estudiantes.count({ where })
    ]);

    res.json({
      datos: estudiantes,
      total,
      pagina: parseInt(pagina),
      totalPaginas: Math.ceil(total / take)
    });
  } catch (error) {
    console.error('Error al listar estudiantes:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// GET /api/estudiantes/:id - Obtener un estudiante con todas sus relaciones
router.get('/:id', async (req, res) => {
  try {
    const estudiante = await req.prisma.estudiantes.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        madre: true,
        padre: true,
        representante: true,
        inscripciones: {
          where: { eliminado: false },
          include: {
            seccion: { include: { grado: true } },
            anio_escolar: true,
          },
          orderBy: { anio_escolar: { nombre: 'desc' } }
        }
      }
    });

    if (!estudiante || estudiante.eliminado) {
      return res.status(404).json({ error: 'Estudiante no encontrado.' });
    }

    res.json(estudiante);
  } catch (error) {
    console.error('Error al obtener estudiante:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// =============================================
// Función auxiliar: buscar o crear persona por cédula
// =============================================
async function buscarOCrearPersona(prisma, datosPersona) {
  const { cedula, nombres, apellidos, nacionalidad, fecha_nacimiento,
          profesion_oficio, estado_civil, telefono, direccion } = datosPersona;

  if (!cedula || !nombres || !apellidos) {
    return null;
  }

  // Buscar si ya existe
  let persona = await prisma.personas.findUnique({ where: { cedula } });

  if (persona) {
    // Si estaba eliminada, reactivarla y actualizar datos
    if (persona.eliminado) {
      persona = await prisma.personas.update({
        where: { id: persona.id },
        data: {
          nombres, apellidos,
          nacionalidad: nacionalidad || 'V',
          fecha_nacimiento: fecha_nacimiento ? new Date(fecha_nacimiento) : null,
          profesion_oficio: profesion_oficio || null,
          estado_civil: estado_civil || null,
          telefono: telefono || null,
          direccion: direccion || null,
          eliminado: false
        }
      });
    }
    return persona;
  }

  // Crear nueva persona
  persona = await prisma.personas.create({
    data: {
      cedula, nombres, apellidos,
      nacionalidad: nacionalidad || 'V',
      fecha_nacimiento: fecha_nacimiento ? new Date(fecha_nacimiento) : null,
      profesion_oficio: profesion_oficio || null,
      estado_civil: estado_civil || null,
      telefono: telefono || null,
      direccion: direccion || null,
    }
  });

  return persona;
}

// POST /api/estudiantes - Crear estudiante con madre, padre y representante integrados
router.post('/', async (req, res) => {
  try {
    const { estudiante, madre, padre, representante_es } = req.body;
    // representante_es: 'MADRE' | 'PADRE' | 'OTRO'
    // Si es 'OTRO', viene req.body.representante con los datos

    // Validaciones del estudiante
    if (!estudiante || !estudiante.primer_apellido || !estudiante.primer_nombre ||
        !estudiante.sexo || !estudiante.fecha_nacimiento) {
      return res.status(400).json({
        error: 'Primer apellido, primer nombre, sexo y fecha de nacimiento del estudiante son obligatorios.'
      });
    }

    // Validar que madre y padre tengan al menos cédula y nombres
    if (!madre || !madre.cedula || !madre.nombres || !madre.apellidos) {
      return res.status(400).json({ error: 'Los datos de la madre son obligatorios (cédula, nombres, apellidos).' });
    }
    if (!padre || !padre.cedula || !padre.nombres || !padre.apellidos) {
      return res.status(400).json({ error: 'Los datos del padre son obligatorios (cédula, nombres, apellidos).' });
    }

    if (!representante_es) {
      return res.status(400).json({ error: 'Debe indicar quién es el representante legal.' });
    }

    // Verificar código escolar único
    if (estudiante.codigo_escolar) {
      const existeCodigo = await req.prisma.estudiantes.findUnique({
        where: { codigo_escolar: estudiante.codigo_escolar }
      });
      if (existeCodigo) {
        return res.status(400).json({ error: `El código escolar "${estudiante.codigo_escolar}" ya está en uso.` });
      }
    }

    // Usar transacción para crear todo de una vez
    const resultado = await req.prisma.$transaction(async (prisma) => {
      // 1. Crear o encontrar a la madre
      const madreDB = await buscarOCrearPersona(prisma, madre);

      // 2. Crear o encontrar al padre
      const padreDB = await buscarOCrearPersona(prisma, padre);

      // 3. Determinar el representante
      let representanteId;
      if (representante_es === 'MADRE') {
        representanteId = madreDB.id;
      } else if (representante_es === 'PADRE') {
        representanteId = padreDB.id;
      } else {
        // Es otra persona, crearla/buscarla
        const repData = req.body.representante;
        if (!repData || !repData.cedula || !repData.nombres || !repData.apellidos) {
          throw new Error('Los datos del representante (tercera persona) son obligatorios.');
        }
        const repDB = await buscarOCrearPersona(prisma, repData);
        representanteId = repDB.id;
      }

      // 4. Crear el estudiante
      const nuevoEstudiante = await prisma.estudiantes.create({
        data: {
          primer_apellido: estudiante.primer_apellido,
          segundo_apellido: estudiante.segundo_apellido || null,
          primer_nombre: estudiante.primer_nombre,
          segundo_nombre: estudiante.segundo_nombre || null,
          nacionalidad: estudiante.nacionalidad || 'V',
          codigo_escolar: estudiante.codigo_escolar || null,
          sexo: estudiante.sexo,
          fecha_nacimiento: new Date(estudiante.fecha_nacimiento),
          lugar_nacimiento: estudiante.lugar_nacimiento || null,
          estado_nacimiento: estudiante.estado_nacimiento || null,
          lateralidad: estudiante.lateralidad || null,
          tipo_sangre: estudiante.tipo_sangre || null,
          madre_id: madreDB.id,
          padre_id: padreDB.id,
          representante_id: representanteId,
        },
        include: {
          madre: { select: { id: true, nombres: true, apellidos: true, cedula: true } },
          padre: { select: { id: true, nombres: true, apellidos: true, cedula: true } },
          representante: { select: { id: true, nombres: true, apellidos: true, cedula: true } },
        }
      });

      return nuevoEstudiante;
    });

    res.status(201).json(resultado);
  } catch (error) {
    if (error.message && error.message.includes('obligatorios')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error al crear estudiante:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// PUT /api/estudiantes/:id - Actualizar un estudiante (y opcionalmente sus personas)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { estudiante, madre, padre, representante_es } = req.body;

    const resultado = await req.prisma.$transaction(async (prisma) => {
      // Actualizar madre si viene
      if (madre && madre.cedula) {
        const madreDB = await buscarOCrearPersona(prisma, madre);
        if (madreDB) {
          await prisma.estudiantes.update({
            where: { id: parseInt(id) },
            data: { madre_id: madreDB.id }
          });
        }
      }

      // Actualizar padre si viene
      if (padre && padre.cedula) {
        const padreDB = await buscarOCrearPersona(prisma, padre);
        if (padreDB) {
          await prisma.estudiantes.update({
            where: { id: parseInt(id) },
            data: { padre_id: padreDB.id }
          });
        }
      }

      // Actualizar representante
      if (representante_es) {
        const est = await prisma.estudiantes.findUnique({
          where: { id: parseInt(id) },
          select: { madre_id: true, padre_id: true }
        });

        let representanteId;
        if (representante_es === 'MADRE') {
          representanteId = est.madre_id;
        } else if (representante_es === 'PADRE') {
          representanteId = est.padre_id;
        } else {
          const repData = req.body.representante;
          if (repData && repData.cedula) {
            const repDB = await buscarOCrearPersona(prisma, repData);
            representanteId = repDB.id;
          }
        }
        if (representanteId) {
          await prisma.estudiantes.update({
            where: { id: parseInt(id) },
            data: { representante_id: representanteId }
          });
        }
      }

      // Actualizar datos del estudiante
      const data = {};
      if (estudiante) {
        if (estudiante.primer_apellido !== undefined) data.primer_apellido = estudiante.primer_apellido;
        if (estudiante.segundo_apellido !== undefined) data.segundo_apellido = estudiante.segundo_apellido || null;
        if (estudiante.primer_nombre !== undefined) data.primer_nombre = estudiante.primer_nombre;
        if (estudiante.segundo_nombre !== undefined) data.segundo_nombre = estudiante.segundo_nombre || null;
        if (estudiante.nacionalidad !== undefined) data.nacionalidad = estudiante.nacionalidad;
        if (estudiante.codigo_escolar !== undefined) data.codigo_escolar = estudiante.codigo_escolar || null;
        if (estudiante.sexo !== undefined) data.sexo = estudiante.sexo;
        if (estudiante.fecha_nacimiento !== undefined) data.fecha_nacimiento = new Date(estudiante.fecha_nacimiento);
        if (estudiante.lugar_nacimiento !== undefined) data.lugar_nacimiento = estudiante.lugar_nacimiento || null;
        if (estudiante.estado_nacimiento !== undefined) data.estado_nacimiento = estudiante.estado_nacimiento || null;
        if (estudiante.lateralidad !== undefined) data.lateralidad = estudiante.lateralidad || null;
        if (estudiante.tipo_sangre !== undefined) data.tipo_sangre = estudiante.tipo_sangre || null;
      }

      const actualizado = await prisma.estudiantes.update({
        where: { id: parseInt(id) },
        data,
        include: {
          madre: { select: { id: true, nombres: true, apellidos: true, cedula: true } },
          padre: { select: { id: true, nombres: true, apellidos: true, cedula: true } },
          representante: { select: { id: true, nombres: true, apellidos: true, cedula: true } },
        }
      });

      return actualizado;
    });

    res.json(resultado);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'El código escolar ya está en uso por otro estudiante.' });
    }
    console.error('Error al actualizar estudiante:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// DELETE /api/estudiantes/:id - Eliminación lógica
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idInt = parseInt(id);

    const inscripcionesActivas = await req.prisma.inscripciones.count({
      where: { estudiante_id: idInt, estado: 'ACTIVO', eliminado: false }
    });
    if (inscripcionesActivas > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar: tiene inscripciones activas. Retire al estudiante primero.'
      });
    }

    await req.prisma.estudiantes.update({
      where: { id: idInt },
      data: { eliminado: true }
    });

    res.json({ mensaje: 'Estudiante eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar estudiante:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
