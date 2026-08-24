const express = require('express');
const router = express.Router();

// GET /api/inscripciones - Listar inscripciones (con filtros)
router.get('/', async (req, res) => {
  try {
    const { anio_escolar_id, seccion_id, grado_id, buscar, estado, pagina = 1, limite = 20 } = req.query;
    const skip = (parseInt(pagina) - 1) * parseInt(limite);
    const take = parseInt(limite);

    const where = { eliminado: false };

    if (anio_escolar_id) where.anio_escolar_id = parseInt(anio_escolar_id);
    if (seccion_id) where.seccion_id = parseInt(seccion_id);
    if (estado) where.estado = estado;

    // Filtrar por grado (a través de sección)
    if (grado_id) {
      where.seccion = { grado_id: parseInt(grado_id) };
    }

    // Búsqueda por nombre del estudiante
    if (buscar && buscar.trim()) {
      const termino = buscar.trim();
      where.estudiante = {
        eliminado: false,
        OR: [
          { primer_nombre: { contains: termino } },
          { primer_apellido: { contains: termino } },
          { segundo_nombre: { contains: termino } },
          { segundo_apellido: { contains: termino } },
          { codigo_escolar: { contains: termino } }
        ]
      };
    }

    const [inscripciones, total] = await Promise.all([
      req.prisma.inscripciones.findMany({
        where,
        include: {
          estudiante: {
            select: {
              id: true, primer_nombre: true, segundo_nombre: true,
              primer_apellido: true, segundo_apellido: true,
              codigo_escolar: true, sexo: true, fecha_nacimiento: true,
            }
          },
          seccion: {
            include: { grado: { select: { id: true, nombre: true, orden: true } } }
          },
          anio_escolar: { select: { id: true, nombre: true } }
        },
        orderBy: [
          { seccion: { grado: { orden: 'asc' } } },
          { seccion: { letra: 'asc' } },
          { estudiante: { primer_apellido: 'asc' } },
        ],
        skip,
        take,
      }),
      req.prisma.inscripciones.count({ where })
    ]);

    res.json({
      datos: inscripciones,
      total,
      pagina: parseInt(pagina),
      totalPaginas: Math.ceil(total / take)
    });
  } catch (error) {
    console.error('Error al listar inscripciones:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// GET /api/inscripciones/:id - Obtener una inscripción completa
router.get('/:id', async (req, res) => {
  try {
    const inscripcion = await req.prisma.inscripciones.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        estudiante: {
          include: {
            madre: true,
            padre: true,
            representante: true,
          }
        },
        seccion: { include: { grado: true } },
        anio_escolar: true
      }
    });

    if (!inscripcion || inscripcion.eliminado) {
      return res.status(404).json({ error: 'Inscripción no encontrada.' });
    }

    res.json(inscripcion);
  } catch (error) {
    console.error('Error al obtener inscripción:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// POST /api/inscripciones - Crear una nueva inscripción
router.post('/', async (req, res) => {
  try {
    const {
      estudiante_id, seccion_id, anio_escolar_id,
      fecha_inscripcion, modalidad,
      // Datos variables
      direccion, telefono, correo_electronico,
      talla, peso, talla_camisa, talla_pantalon, talla_zapato,
      // Documentos
      doc_partida_nacimiento, doc_boleta_promocion, doc_ci_madre,
      doc_ci_padre, doc_foto_estudiante, doc_foto_representante,
      doc_carpeta_marron, doc_acta_compromiso,
      // Procedencia
      misma_institucion, institucion_procedencia, motivo_retiro_procedencia,
      con_quien_vive, tiene_hermanos_institucion, cantidad_hermanos,
      // Socioeconómicos
      tipo_vivienda, condicion_infraestructura,
      medico, social
    } = req.body;

    // Validaciones obligatorias
    if (!estudiante_id || !seccion_id || !anio_escolar_id || !fecha_inscripcion) {
      return res.status(400).json({
        error: 'Estudiante, sección, año escolar y fecha de inscripción son obligatorios.'
      });
    }

    // Verificar que el estudiante no esté ya inscrito en este año
    const yaInscrito = await req.prisma.inscripciones.findUnique({
      where: {
        estudiante_id_anio_escolar_id: {
          estudiante_id: parseInt(estudiante_id),
          anio_escolar_id: parseInt(anio_escolar_id)
        }
      }
    });
    if (yaInscrito && !yaInscrito.eliminado) {
      return res.status(400).json({
        error: 'Este estudiante ya está inscrito en este año escolar.'
      });
    }

    const inscripcion = await req.prisma.inscripciones.create({
      data: {
        estudiante_id: parseInt(estudiante_id),
        seccion_id: parseInt(seccion_id),
        anio_escolar_id: parseInt(anio_escolar_id),
        fecha_inscripcion: new Date(fecha_inscripcion),
        modalidad: modalidad || 'REGULAR',
        estado: 'ACTIVO',
        // Datos variables
        direccion: direccion || null,
        telefono: telefono || null,
        correo_electronico: correo_electronico || null,
        talla: talla || null,
        peso: peso || null,
        talla_camisa: talla_camisa || null,
        talla_pantalon: talla_pantalon || null,
        talla_zapato: talla_zapato || null,
        // Documentos
        doc_partida_nacimiento: doc_partida_nacimiento || false,
        doc_boleta_promocion: doc_boleta_promocion || false,
        doc_ci_madre: doc_ci_madre || false,
        doc_ci_padre: doc_ci_padre || false,
        doc_foto_estudiante: doc_foto_estudiante || false,
        doc_foto_representante: doc_foto_representante || false,
        doc_carpeta_marron: doc_carpeta_marron || false,
        doc_acta_compromiso: doc_acta_compromiso || false,
        // Procedencia
        misma_institucion: misma_institucion !== undefined ? misma_institucion : true,
        institucion_procedencia: institucion_procedencia || null,
        motivo_retiro_procedencia: motivo_retiro_procedencia || null,
        con_quien_vive: con_quien_vive || null,
        tiene_hermanos_institucion: tiene_hermanos_institucion || false,
        cantidad_hermanos: cantidad_hermanos ? parseInt(cantidad_hermanos) : null,
        // Socioeconómicos
        tipo_vivienda: tipo_vivienda || null,
        condicion_infraestructura: condicion_infraestructura || null,
        // Social (Solo inicial)
        integracion_pasivo: social ? social.pasivo : false,
        integracion_inquieto: social ? social.inquieto : false,
        integracion_tierno: social ? social.tierno : false,
        integracion_sensible: social ? social.sensible : false,
        habilidades: social ? social.habilidades : null,
      },
      include: {
        estudiante: { select: { primer_nombre: true, primer_apellido: true } },
        seccion: { include: { grado: true } },
        anio_escolar: true,
      }
    });

    // Actualizar datos médicos del estudiante
    if (medico) {
      await req.prisma.estudiantes.update({
        where: { id: parseInt(estudiante_id) },
        data: {
          tipo_parto: medico.tipo_parto || null,
          meses_prematuro: medico.meses_prematuro || null,
          apreciacion_medico: medico.apreciacion_medico || null,
          apreciacion_detalle: medico.apreciacion_detalle || null,
          vacunas_completas: medico.vacunas_completas !== undefined ? medico.vacunas_completas : true,
          vacunas_faltantes: medico.vacunas_faltantes || null,
          alergico: medico.alergico || false,
          alergico_detalle: medico.alergico_detalle || null,
          hospitalizado: medico.tratamiento || false, // Asumiendo esto como tratamiento
          hospitalizado_detalle: medico.tratamiento_detalle || null,
          enfermedades_padecidas: medico.enfermedades || null
        }
      });
    }

    res.status(201).json(inscripcion);
  } catch (error) {
    console.error('Error al crear inscripción:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// PUT /api/inscripciones/:id - Actualizar una inscripción
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = {};
    const body = req.body;

    // Campos actualizables
    const campos = [
      'seccion_id', 'modalidad', 'estado', 'literal',
      'direccion', 'telefono', 'correo_electronico',
      'talla', 'peso', 'talla_camisa', 'talla_pantalon', 'talla_zapato',
      'doc_partida_nacimiento', 'doc_boleta_promocion', 'doc_ci_madre',
      'doc_ci_padre', 'doc_foto_estudiante', 'doc_foto_representante',
      'doc_carpeta_marron', 'doc_acta_compromiso',
      'misma_institucion', 'institucion_procedencia', 'motivo_retiro_procedencia',
      'con_quien_vive', 'tiene_hermanos_institucion', 'cantidad_hermanos',
      'tipo_vivienda', 'condicion_infraestructura',
      'motivo_retiro_saliente', 'fecha_retiro',
      'observaciones_generales',
      'integracion_pasivo', 'integracion_inquieto', 'integracion_tierno',
      'integracion_sensible', 'habilidades'
    ];

    campos.forEach(campo => {
      if (body[campo] !== undefined) {
        if (['seccion_id', 'cantidad_hermanos'].includes(campo)) {
          data[campo] = body[campo] ? parseInt(body[campo]) : null;
        } else if (campo === 'fecha_retiro') {
          data[campo] = body[campo] ? new Date(body[campo]) : null;
        } else {
          data[campo] = body[campo];
        }
      }
    });

    if (body.social) {
      data.integracion_pasivo = body.social.pasivo;
      data.integracion_inquieto = body.social.inquieto;
      data.integracion_tierno = body.social.tierno;
      data.integracion_sensible = body.social.sensible;
      data.habilidades = body.social.habilidades;
    }

    const inscripcion = await req.prisma.inscripciones.update({
      where: { id: parseInt(id) },
      data,
      include: {
        estudiante: { select: { primer_nombre: true, primer_apellido: true, id: true } },
        seccion: { include: { grado: true } },
        anio_escolar: true
      }
    });

    if (body.medico) {
      await req.prisma.estudiantes.update({
        where: { id: inscripcion.estudiante.id },
        data: {
          tipo_parto: body.medico.tipo_parto || null,
          meses_prematuro: body.medico.meses_prematuro || null,
          apreciacion_medico: body.medico.apreciacion_medico || null,
          apreciacion_detalle: body.medico.apreciacion_detalle || null,
          vacunas_completas: body.medico.vacunas_completas !== undefined ? body.medico.vacunas_completas : true,
          vacunas_faltantes: body.medico.vacunas_faltantes || null,
          alergico: body.medico.alergico || false,
          alergico_detalle: body.medico.alergico_detalle || null,
          hospitalizado: body.medico.tratamiento || false,
          hospitalizado_detalle: body.medico.tratamiento_detalle || null,
          enfermedades_padecidas: body.medico.enfermedades || null
        }
      });
    }

    res.json(inscripcion);
  } catch (error) {
    console.error('Error al actualizar inscripción:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// PUT /api/inscripciones/:id/retirar - Retirar un estudiante
router.put('/:id/retirar', async (req, res) => {
  try {
    const { motivo_retiro_saliente, fecha_retiro } = req.body;

    const inscripcion = await req.prisma.inscripciones.update({
      where: { id: parseInt(req.params.id) },
      data: {
        estado: 'RETIRADO',
        motivo_retiro_saliente: motivo_retiro_saliente || null,
        fecha_retiro: fecha_retiro ? new Date(fecha_retiro) : new Date(),
      }
    });

    res.json({ mensaje: 'Estudiante retirado correctamente.', inscripcion });
  } catch (error) {
    console.error('Error al retirar estudiante:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// DELETE /api/inscripciones/:id - Eliminación lógica
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.inscripciones.update({
      where: { id: parseInt(req.params.id) },
      data: { eliminado: true }
    });
    res.json({ mensaje: 'Inscripción eliminada correctamente.' });
  } catch (error) {
    console.error('Error al eliminar inscripción:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
