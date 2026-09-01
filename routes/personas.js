const express = require('express');
const router = express.Router();

// GET /api/personas - Listar personas (con búsqueda y paginación)
router.get('/', async (req, res) => {
  try {
    const { buscar, pagina = 1, limite = 20 } = req.query;
    const skip = (parseInt(pagina) - 1) * parseInt(limite);
    const take = parseInt(limite);

    const where = { eliminado: false };

    // Búsqueda por nombre, apellido o cédula
    if (buscar && buscar.trim()) {
      const termino = buscar.trim();
      where.OR = [
        { nombres: { contains: termino } },
        { apellidos: { contains: termino } },
        { cedula: { contains: termino } }
      ];
    }

    const [personas, total] = await Promise.all([
      req.prisma.personas.findMany({
        where,
        orderBy: { apellidos: 'asc' },
        skip,
        take,
      }),
      req.prisma.personas.count({ where })
    ]);

    res.json({
      datos: personas,
      total,
      pagina: parseInt(pagina),
      totalPaginas: Math.ceil(total / take)
    });
  } catch (error) {
    console.error('Error al listar personas:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// GET /api/personas/buscar-cedula/:cedula - Buscar persona por cédula exacta
router.get('/buscar-cedula/:cedula', async (req, res) => {
  try {
    const persona = await req.prisma.personas.findUnique({
      where: { cedula: req.params.cedula }
    });

    if (!persona || persona.eliminado) {
      return res.json(null);
    }

    res.json(persona);
  } catch (error) {
    console.error('Error al buscar persona:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// GET /api/personas/:id - Obtener una persona por ID
router.get('/:id', async (req, res) => {
  try {
    const persona = await req.prisma.personas.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        estudiantes_como_madre: {
          where: { eliminado: false },
          select: { id: true, primer_nombre: true, segundo_nombre: true, primer_apellido: true, segundo_apellido: true }
        },
        estudiantes_como_padre: {
          where: { eliminado: false },
          select: { id: true, primer_nombre: true, segundo_nombre: true, primer_apellido: true, segundo_apellido: true }
        },
        estudiantes_como_representante: {
          where: { eliminado: false },
          select: { id: true, primer_nombre: true, segundo_nombre: true, primer_apellido: true, segundo_apellido: true }
        }
      }
    });

    if (!persona || persona.eliminado) {
      return res.status(404).json({ error: 'Persona no encontrada.' });
    }

    res.json(persona);
  } catch (error) {
    console.error('Error al obtener persona:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// POST /api/personas - Crear una nueva persona
router.post('/', async (req, res) => {
  try {
    const { apellidos, nombres, cedula, nacionalidad, fecha_nacimiento,
            profesion_oficio, estado_civil, telefono, direccion, observaciones } = req.body;

    // Validaciones
    if (!apellidos || !nombres || !cedula || !nacionalidad) {
      return res.status(400).json({ error: 'Apellidos, nombres, cédula y nacionalidad son obligatorios.' });
    }

    if (!['V', 'E'].includes(nacionalidad)) {
      return res.status(400).json({ error: 'Nacionalidad debe ser V o E.' });
    }

    // Verificar cédula única
    const existente = await req.prisma.personas.findUnique({ where: { cedula } });
    if (existente) {
      if (existente.eliminado) {
        // Reactivar persona eliminada
        const reactivada = await req.prisma.personas.update({
          where: { id: existente.id },
          data: {
            apellidos, nombres, nacionalidad,
            fecha_nacimiento: fecha_nacimiento ? new Date(fecha_nacimiento) : null,
            profesion_oficio: profesion_oficio || null,
            estado_civil: estado_civil || null,
            telefono: telefono || null,
            direccion: direccion || null,
            observaciones: observaciones || null,
            eliminado: false
          }
        });
        return res.status(201).json(reactivada);
      }
      return res.status(400).json({ error: `Ya existe una persona con la cédula ${cedula}.` });
    }

    const persona = await req.prisma.personas.create({
      data: {
        apellidos, nombres, cedula, nacionalidad,
        fecha_nacimiento: fecha_nacimiento ? new Date(fecha_nacimiento) : null,
        profesion_oficio: profesion_oficio || null,
        estado_civil: estado_civil || null,
        telefono: telefono || null,
        direccion: direccion || null,
        observaciones: observaciones || null,
      }
    });

    res.status(201).json(persona);
  } catch (error) {
    console.error('Error al crear persona:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// PUT /api/personas/:id - Actualizar una persona
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { apellidos, nombres, cedula, nacionalidad, fecha_nacimiento,
            profesion_oficio, estado_civil, telefono, direccion, observaciones } = req.body;

    const data = {};
    if (apellidos !== undefined) data.apellidos = apellidos;
    if (nombres !== undefined) data.nombres = nombres;
    if (cedula !== undefined) data.cedula = cedula;
    if (nacionalidad !== undefined) data.nacionalidad = nacionalidad;
    if (fecha_nacimiento !== undefined) data.fecha_nacimiento = fecha_nacimiento ? new Date(fecha_nacimiento) : null;
    if (profesion_oficio !== undefined) data.profesion_oficio = profesion_oficio || null;
    if (estado_civil !== undefined) data.estado_civil = estado_civil || null;
    if (telefono !== undefined) data.telefono = telefono || null;
    if (direccion !== undefined) data.direccion = direccion || null;
    if (observaciones !== undefined) data.observaciones = observaciones || null;

    const persona = await req.prisma.personas.update({
      where: { id: parseInt(id) },
      data
    });

    res.json(persona);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe otra persona con esa cédula.' });
    }
    console.error('Error al actualizar persona:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// DELETE /api/personas/:id - Eliminación lógica
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idInt = parseInt(id);

    // Verificar que no sea representante activo de algún estudiante
    const esRepresentante = await req.prisma.estudiantes.count({
      where: { representante_id: idInt, eliminado: false }
    });
    if (esRepresentante > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar: es representante de estudiantes activos. Cambie el representante primero.'
      });
    }

    await req.prisma.personas.update({
      where: { id: idInt },
      data: { eliminado: true }
    });

    res.json({ mensaje: 'Persona eliminada correctamente.' });
  } catch (error) {
    console.error('Error al eliminar persona:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
