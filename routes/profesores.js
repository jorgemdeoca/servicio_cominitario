const express = require('express');
const { soloSuperAdmin } = require('../middleware/auth');
const router = express.Router();

// GET /api/profesores - Listar profesores (con bÃºsqueda)
router.get('/', async (req, res) => {
  try {
    const { buscar, solo_activos } = req.query;
    const where = {};

    // Por defecto solo mostrar activos
    if (solo_activos !== 'false') {
      where.activo = true;
    }

    if (buscar && buscar.trim()) {
      const termino = buscar.trim();
      where.OR = [
        { nombres: { contains: termino } },
        { apellidos: { contains: termino } },
        { cedula: { contains: termino } }
      ];
    }

    // Filtrar profesores que NO tengan secciones asignadas en un aÃ±o especÃ­fico
    const { anio_escolar_libre_id } = req.query;
    if (anio_escolar_libre_id) {
      where.secciones = {
        none: {
          seccion: {
            anio_escolar_id: parseInt(anio_escolar_libre_id)
          }
        }
      };
    }

    const profesores = await req.prisma.profesores.findMany({
      where,
      orderBy: { apellidos: 'asc' },
    });

    res.json(profesores);
  } catch (error) {
    console.error('Error al listar profesores:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// GET /api/profesores/:id - Obtener un profesor
router.get('/:id', async (req, res) => {
  try {
    const profesor = await req.prisma.profesores.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        secciones: {
          include: {
            seccion: { include: { grado: true, anio_escolar: true } }
          }
        }
      }
    });

    if (!profesor) {
      return res.status(404).json({ error: 'Profesor no encontrado.' });
    }

    res.json(profesor);
  } catch (error) {
    console.error('Error al obtener profesor:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// POST /api/profesores - Crear un nuevo profesor
router.post('/', async (req, res) => {
  try {
    const { nombres, apellidos, cedula, nacionalidad, sexo,
            fecha_nacimiento, telefono, email,
            direccion, titulo, nivel_instruccion, grado_academico,
            tipo_cargo, condicion_trabajo, anos_servicio,
            lugar_nacimiento, estado_nacimiento } = req.body;

    if (!nombres || !apellidos || !cedula) {
      return res.status(400).json({ error: 'Nombres, apellidos y cÃ©dula son obligatorios.' });
    }

    // Verificar cÃ©dula Ãºnica
    const existente = await req.prisma.profesores.findUnique({ where: { cedula } });
    if (existente) {
      return res.status(400).json({ error: `Ya existe un profesor con la cÃ©dula ${cedula}.` });
    }

    const profesor = await req.prisma.profesores.create({
      data: {
        nombres, apellidos, cedula,
        nacionalidad: nacionalidad || 'V',
        sexo: sexo || null,
        fecha_nacimiento: fecha_nacimiento ? new Date(fecha_nacimiento) : null,
        telefono: telefono || null,
        email: email || null,
        direccion: direccion || null,
        titulo: titulo || null,
        nivel_instruccion: nivel_instruccion || null,
        grado_academico: grado_academico || null,
        tipo_cargo: tipo_cargo || null,
        condicion_trabajo: condicion_trabajo || null,
        anos_servicio: anos_servicio ? parseInt(anos_servicio) : null,
        lugar_nacimiento: lugar_nacimiento || null,
        estado_nacimiento: estado_nacimiento || null,
      }
    });

    res.status(201).json(profesor);
  } catch (error) {
    console.error('Error al crear profesor:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// PUT /api/profesores/:id - Actualizar un profesor
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombres, apellidos, cedula, nacionalidad, sexo,
            fecha_nacimiento, telefono, email, activo,
            direccion, titulo, nivel_instruccion, grado_academico,
            tipo_cargo, condicion_trabajo, anos_servicio,
            lugar_nacimiento, estado_nacimiento } = req.body;

    const data = {};
    if (nombres !== undefined) data.nombres = nombres;
    if (apellidos !== undefined) data.apellidos = apellidos;
    if (cedula !== undefined) data.cedula = cedula;
    if (nacionalidad !== undefined) data.nacionalidad = nacionalidad;
    if (sexo !== undefined) data.sexo = sexo || null;
    if (fecha_nacimiento !== undefined) data.fecha_nacimiento = fecha_nacimiento ? new Date(fecha_nacimiento) : null;
    if (telefono !== undefined) data.telefono = telefono || null;
    if (email !== undefined) data.email = email || null;
    if (activo !== undefined) data.activo = activo;
    if (direccion !== undefined) data.direccion = direccion || null;
    if (titulo !== undefined) data.titulo = titulo || null;
    if (nivel_instruccion !== undefined) data.nivel_instruccion = nivel_instruccion || null;
    if (grado_academico !== undefined) data.grado_academico = grado_academico || null;
    if (tipo_cargo !== undefined) data.tipo_cargo = tipo_cargo || null;
    if (condicion_trabajo !== undefined) data.condicion_trabajo = condicion_trabajo || null;
    if (anos_servicio !== undefined) data.anos_servicio = anos_servicio ? parseInt(anos_servicio) : null;
    if (lugar_nacimiento !== undefined) data.lugar_nacimiento = lugar_nacimiento || null;
    if (estado_nacimiento !== undefined) data.estado_nacimiento = estado_nacimiento || null;

    const profesor = await req.prisma.profesores.update({
      where: { id: parseInt(id) },
      data
    });

    res.json(profesor);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe otro profesor con esa cÃ©dula.' });
    }
    console.error('Error al actualizar profesor:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// DELETE /api/profesores/:id - Desactivar profesor
router.delete('/:id', soloSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const idInt = parseInt(id);

    // Verificar si tiene secciones asignadas activas
    const asignaciones = await req.prisma.inscripciones.count({
      where: { profesor_id: idInt, estado: 'ACTIVO', eliminado: false }
    });
    if (asignaciones > 0) {
      return res.status(400).json({
        error: 'No se puede desactivar: tiene secciones asignadas con estudiantes activos.'
      });
    }

    await req.prisma.profesores.update({
      where: { id: idInt },
      data: { activo: false }
    });

    res.json({ mensaje: 'Profesor desactivado correctamente.' });
  } catch (error) {
    console.error('Error al desactivar profesor:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;

