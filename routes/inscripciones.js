const express = require('express');
const router = express.Router();
const { buscarOCrearPersona } = require('./estudiantes');

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

// =============================================
// POST /api/inscripciones/completa
// Endpoint unificado: crea personas + estudiante + inscripción + colaboración
// TODO en UNA sola transacción. Si CUALQUIER paso falla, se revierte TODO.
// =============================================
router.post('/completa', async (req, res) => {
  try {
    const {
      estudiante: estData, madre, padre, representante_es, representante,
      inscripcion: inscData, colaboracion: colabData
    } = req.body;

    // === VALIDACIONES PREVIAS (fuera de la transacción) ===
    if (!estData || !estData.primer_apellido || !estData.primer_nombre ||
        !estData.sexo || !estData.fecha_nacimiento) {
      return res.status(400).json({
        error: 'Primer apellido, primer nombre, sexo y fecha de nacimiento del estudiante son obligatorios.'
      });
    }

    if (!madre || !madre.cedula || !madre.nombres || !madre.apellidos) {
      return res.status(400).json({ error: 'Los datos de la madre son obligatorios (cédula, nombres, apellidos).' });
    }

    if (!representante_es) {
      return res.status(400).json({ error: 'Debe indicar quién es el representante legal.' });
    }

    if (!inscData || !inscData.seccion_id || !inscData.anio_escolar_id || !inscData.fecha_inscripcion) {
      return res.status(400).json({
        error: 'Sección, año escolar y fecha de inscripción son obligatorios.'
      });
    }

    // Verificar código escolar único (fuera de transacción para respuesta rápida)
    if (estData.codigo_escolar) {
      const existeCodigo = await req.prisma.estudiantes.findUnique({
        where: { codigo_escolar: estData.codigo_escolar }
      });
      if (existeCodigo) {
        return res.status(400).json({ error: `El código escolar "${estData.codigo_escolar}" ya está en uso.` });
      }
    }

    // === TRANSACCIÓN UNIFICADA ===
    const resultado = await req.prisma.$transaction(async (prisma) => {

      // 1. Crear/buscar personas
      const madreDB = await buscarOCrearPersona(prisma, madre);

      const padreDB = (padre && padre.cedula && padre.nombres && padre.apellidos)
        ? await buscarOCrearPersona(prisma, padre)
        : null;

      let representanteId;
      if (representante_es === 'MADRE') {
        representanteId = madreDB.id;
      } else if (representante_es === 'PADRE') {
        if (!padreDB) {
          throw new Error('Se seleccionó al padre como representante, pero no se proporcionaron sus datos.');
        }
        representanteId = padreDB.id;
      } else {
        if (!representante || !representante.cedula || !representante.nombres || !representante.apellidos) {
          throw new Error('Los datos del representante (tercera persona) son obligatorios.');
        }
        const repDB = await buscarOCrearPersona(prisma, representante);
        representanteId = repDB.id;
      }

      // 2. Crear estudiante
      const nuevoEstudiante = await prisma.estudiantes.create({
        data: {
          primer_apellido: estData.primer_apellido,
          segundo_apellido: estData.segundo_apellido || null,
          primer_nombre: estData.primer_nombre,
          segundo_nombre: estData.segundo_nombre || null,
          nacionalidad: estData.nacionalidad || 'V',
          codigo_escolar: estData.codigo_escolar || null,
          sexo: estData.sexo,
          fecha_nacimiento: new Date(estData.fecha_nacimiento),
          lugar_nacimiento: estData.lugar_nacimiento || null,
          estado_nacimiento: estData.estado_nacimiento || null,
          lateralidad: estData.lateralidad || null,
          tipo_sangre: estData.tipo_sangre || null,
          madre_id: madreDB.id,
          padre_id: padreDB ? padreDB.id : null,
          representante_id: representanteId,
        }
      });

      // 3. Verificar que no esté ya inscrito en este año
      const yaInscrito = await prisma.inscripciones.findUnique({
        where: {
          estudiante_id_anio_escolar_id: {
            estudiante_id: nuevoEstudiante.id,
            anio_escolar_id: parseInt(inscData.anio_escolar_id)
          }
        }
      });
      if (yaInscrito && !yaInscrito.eliminado) {
        throw new Error('Este estudiante ya está inscrito en este año escolar.');
      }

      // 4. Crear inscripción
      const inscripcion = await prisma.inscripciones.create({
        data: {
          estudiante_id: nuevoEstudiante.id,
          seccion_id: parseInt(inscData.seccion_id),
          anio_escolar_id: parseInt(inscData.anio_escolar_id),
          fecha_inscripcion: new Date(inscData.fecha_inscripcion),
          modalidad: inscData.modalidad || 'REGULAR',
          estado: 'ACTIVO',
          direccion: inscData.direccion || null,
          telefono: inscData.telefono || null,
          correo_electronico: inscData.correo_electronico || null,
          talla: inscData.talla || null,
          peso: inscData.peso || null,
          talla_camisa: inscData.talla_camisa || null,
          talla_pantalon: inscData.talla_pantalon || null,
          talla_zapato: inscData.talla_zapato || null,
          doc_partida_nacimiento: inscData.doc_partida_nacimiento || false,
          doc_boleta_promocion: inscData.doc_boleta_promocion || false,
          doc_ci_madre: inscData.doc_ci_madre || false,
          doc_ci_padre: inscData.doc_ci_padre || false,
          doc_foto_estudiante: inscData.doc_foto_estudiante || false,
          doc_foto_representante: inscData.doc_foto_representante || false,
          doc_carpeta_marron: inscData.doc_carpeta_marron || false,
          doc_acta_compromiso: inscData.doc_acta_compromiso || false,
          misma_institucion: inscData.misma_institucion !== undefined ? inscData.misma_institucion : true,
          institucion_procedencia: inscData.institucion_procedencia || null,
          motivo_retiro_procedencia: inscData.motivo_retiro_procedencia || null,
          con_quien_vive: inscData.con_quien_vive || null,
          tiene_hermanos_institucion: inscData.tiene_hermanos_institucion || false,
          cantidad_hermanos: inscData.cantidad_hermanos ? parseInt(inscData.cantidad_hermanos) : null,
          tipo_vivienda: inscData.tipo_vivienda || null,
          condicion_infraestructura: inscData.condicion_infraestructura || null,
          integracion_pasivo: inscData.social ? inscData.social.pasivo : false,
          integracion_inquieto: inscData.social ? inscData.social.inquieto : false,
          integracion_tierno: inscData.social ? inscData.social.tierno : false,
          integracion_sensible: inscData.social ? inscData.social.sensible : false,
          habilidades: inscData.social ? inscData.social.habilidades : null,
        }
      });

      // 5. Datos médicos del estudiante (si vienen)
      if (inscData.medico) {
        await prisma.estudiantes.update({
          where: { id: nuevoEstudiante.id },
          data: {
            tipo_parto: inscData.medico.tipo_parto || null,
            meses_prematuro: inscData.medico.meses_prematuro || null,
            apreciacion_medico: inscData.medico.apreciacion_medico || null,
            apreciacion_detalle: inscData.medico.apreciacion_detalle || null,
            vacunas_completas: inscData.medico.vacunas_completas !== undefined ? inscData.medico.vacunas_completas : true,
            vacunas_faltantes: inscData.medico.vacunas_faltantes || null,
            alergico: inscData.medico.alergico || false,
            alergico_detalle: inscData.medico.alergico_detalle || null,
            hospitalizado: inscData.medico.tratamiento || false,
            hospitalizado_detalle: inscData.medico.tratamiento_detalle || null,
            enfermedades_padecidas: inscData.medico.enfermedades || null
          }
        });
      }

      // 6. Crear colaboración (si viene)
      if (colabData && (colabData.monto_total > 0 || colabData.producto)) {
        const colabCreate = {
          inscripcion_id: inscripcion.id,
          representante_id: representanteId,
          estudiante_nombre: colabData.estudiante_nombre || '',
          hijos_inscritos: colabData.hijos_inscritos || 1,
          colaboraciones_requeridas: colabData.colaboraciones_requeridas || 1,
          monto_total: parseFloat(colabData.monto_total) || 0,
          producto: colabData.producto || null,
          observaciones: colabData.observaciones || null
        };

        if (colabData.pago && colabData.pago.monto && parseFloat(colabData.pago.monto) > 0) {
          colabCreate.pagos = {
            create: {
              monto: parseFloat(colabData.pago.monto),
              tipo_pago: colabData.pago.tipo_pago || 'EFECTIVO',
              referencia_pago: colabData.pago.tipo_pago === 'PAGO_MOVIL' ? (colabData.pago.referencia_pago || null) : null
            }
          };
        }

        await prisma.colaboraciones.create({ data: colabCreate });
      }

      return {
        estudiante: nuevoEstudiante,
        inscripcion,
        representante_id: representanteId
      };
    });

    res.status(201).json(resultado);
  } catch (error) {
    if (error.code === 'P2002') {
      if (error.meta && error.meta.target && error.meta.target.includes('codigo_escolar')) {
        return res.status(400).json({ error: 'El código escolar ya está en uso por otro estudiante.' });
      }
      if (error.meta && error.meta.target && error.meta.target.includes('estudiante_id')) {
        return res.status(400).json({ error: 'Este estudiante ya fue inscrito en este año escolar.' });
      }
      return res.status(400).json({ error: 'Registro duplicado detectado. Verifique los datos.' });
    }
    if (error.message && (error.message.includes('obligatorios') || error.message.includes('representante') || error.message.includes('inscrito'))) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error en inscripción completa:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// POST /api/inscripciones - Crear una nueva inscripción (solo inscripción, estudiante ya existe)
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

    const inscripcion = await req.prisma.$transaction(async (prisma) => {
      const insc = await prisma.inscripciones.create({
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

      // Actualizar datos médicos del estudiante (dentro de la misma transacción)
      if (medico) {
        await prisma.estudiantes.update({
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
            hospitalizado: medico.tratamiento || false,
            hospitalizado_detalle: medico.tratamiento_detalle || null,
            enfermedades_padecidas: medico.enfermedades || null
          }
        });
      }

      return insc;
    });

    res.status(201).json(inscripcion);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Este estudiante ya fue inscrito en este año escolar.' });
    }
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
