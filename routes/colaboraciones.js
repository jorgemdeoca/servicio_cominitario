const express = require('express');
const router = express.Router();

// ==========================================
// GET /api/colaboraciones?anio_escolar_id=X
// Listar todas las colaboraciones del año
// ==========================================
router.get('/', async (req, res) => {
  try {
    const { anio_escolar_id } = req.query;
    if (!anio_escolar_id) {
      return res.status(400).json({ error: 'El parámetro anio_escolar_id es obligatorio.' });
    }

    const colaboraciones = await req.prisma.colaboraciones.findMany({
      where: {
        inscripcion: {
          anio_escolar_id: parseInt(anio_escolar_id),
          eliminado: false
        }
      },
      include: {
        representante: {
          select: { id: true, apellidos: true, nombres: true, cedula: true }
        },
        pagos: {
          orderBy: { fecha_pago: 'asc' }
        },
        inscripcion: {
          include: {
            seccion: {
              include: { grado: { select: { id: true, nombre: true, orden: true } } }
            },
            anio_escolar: { select: { id: true, nombre: true } }
          }
        }
      },
      orderBy: { fecha_registro: 'desc' }
    });

    res.json(colaboraciones);
  } catch (error) {
    console.error('Error al listar colaboraciones:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ==========================================
// GET /api/colaboraciones/resumen?anio_escolar_id=X
// Resumen agrupado por grado → sección con totales
// ==========================================
router.get('/resumen', async (req, res) => {
  try {
    const { anio_escolar_id } = req.query;
    if (!anio_escolar_id) {
      return res.status(400).json({ error: 'El parámetro anio_escolar_id es obligatorio.' });
    }

    const colaboraciones = await req.prisma.colaboraciones.findMany({
      where: {
        inscripcion: {
          anio_escolar_id: parseInt(anio_escolar_id),
          eliminado: false
        }
      },
      include: {
        representante: {
          select: { apellidos: true, nombres: true, cedula: true }
        },
        pagos: {
          orderBy: { fecha_pago: 'asc' }
        },
        inscripcion: {
          include: {
            seccion: {
              include: { grado: { select: { id: true, nombre: true, orden: true } } }
            }
          }
        }
      }
    });

    // Agrupar por grado → sección
    const gradosMap = {};

    for (const colab of colaboraciones) {
      const grado = colab.inscripcion.seccion.grado;
      const seccion = colab.inscripcion.seccion;

      if (!gradosMap[grado.id]) {
        gradosMap[grado.id] = {
          grado_id: grado.id,
          grado_nombre: grado.nombre,
          grado_orden: grado.orden,
          secciones: {},
          total_grado: 0
        };
      }

      const seccionKey = seccion.id;
      if (!gradosMap[grado.id].secciones[seccionKey]) {
        gradosMap[grado.id].secciones[seccionKey] = {
          seccion_id: seccion.id,
          seccion_letra: seccion.letra,
          colaboraciones: [],
          total_seccion: 0
        };
      }

      // Calcular monto abonado (suma de pagos)
      const montoAbonado = colab.pagos.reduce((sum, p) => sum + parseFloat(p.monto), 0);
      const montoPendiente = parseFloat(colab.monto_total) - montoAbonado;

      const registro = {
        id: colab.id,
        representante: `${colab.representante.apellidos}, ${colab.representante.nombres}`,
        representante_cedula: colab.representante.cedula,
        estudiante: colab.estudiante_nombre,
        hijos_inscritos: colab.hijos_inscritos,
        colaboraciones_requeridas: colab.colaboraciones_requeridas,
        producto: colab.producto,
        monto_total: parseFloat(colab.monto_total),
        monto_abonado: montoAbonado,
        monto_pendiente: montoPendiente,
        pagos: colab.pagos.map(p => ({
          id: p.id,
          monto: parseFloat(p.monto),
          tipo_pago: p.tipo_pago,
          referencia_pago: p.referencia_pago,
          fecha_pago: p.fecha_pago
        })),
        observaciones: colab.observaciones
      };

      gradosMap[grado.id].secciones[seccionKey].colaboraciones.push(registro);
      gradosMap[grado.id].secciones[seccionKey].total_seccion += montoAbonado;
      gradosMap[grado.id].total_grado += montoAbonado;
    }

    // Convertir a array y ordenar
    const grados = Object.values(gradosMap)
      .sort((a, b) => a.grado_orden - b.grado_orden)
      .map(g => ({
        ...g,
        secciones: Object.values(g.secciones).sort((a, b) => a.seccion_letra.localeCompare(b.seccion_letra))
      }));

    const total_global = grados.reduce((sum, g) => sum + g.total_grado, 0);

    res.json({ grados, total_global });
  } catch (error) {
    console.error('Error al generar resumen de colaboraciones:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ==========================================
// GET /api/colaboraciones/inscripcion/:inscripcionId
// Obtener la colaboración de una inscripción específica
// ==========================================
router.get('/inscripcion/:inscripcionId', async (req, res) => {
  try {
    const colaboracion = await req.prisma.colaboraciones.findUnique({
      where: { inscripcion_id: parseInt(req.params.inscripcionId) },
      include: {
        representante: {
          select: { apellidos: true, nombres: true, cedula: true }
        },
        pagos: {
          orderBy: { fecha_pago: 'asc' }
        }
      }
    });

    if (!colaboracion) {
      return res.json(null);
    }

    // Calcular abonado y pendiente
    const montoAbonado = colaboracion.pagos.reduce((sum, p) => sum + parseFloat(p.monto), 0);

    res.json({
      ...colaboracion,
      monto_total: parseFloat(colaboracion.monto_total),
      monto_abonado: montoAbonado,
      monto_pendiente: parseFloat(colaboracion.monto_total) - montoAbonado
    });
  } catch (error) {
    console.error('Error al obtener colaboración:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ==========================================
// GET /api/colaboraciones/hijos-representante/:representanteId
// Contar hijos inscritos y calcular descuento
// ==========================================
router.get('/hijos-representante/:representanteId', async (req, res) => {
  try {
    const { anio_escolar_id } = req.query;
    if (!anio_escolar_id) {
      return res.status(400).json({ error: 'anio_escolar_id es obligatorio.' });
    }

    const representanteId = parseInt(req.params.representanteId);

    // Contar inscripciones activas de estudiantes cuyo representante sea este
    const hijosInscritos = await req.prisma.inscripciones.count({
      where: {
        anio_escolar_id: parseInt(anio_escolar_id),
        eliminado: false,
        estado: 'ACTIVO',
        estudiante: {
          representante_id: representanteId,
          eliminado: false
        }
      }
    });

    // Regla de descuento: N >= 3 → paga N-1, sino paga N
    const colaboracionesRequeridas = hijosInscritos >= 3 ? hijosInscritos - 1 : hijosInscritos;

    res.json({
      representante_id: representanteId,
      hijos_inscritos: hijosInscritos,
      colaboraciones_requeridas: colaboracionesRequeridas
    });
  } catch (error) {
    console.error('Error al contar hijos:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ==========================================
// POST /api/colaboraciones
// Crear una colaboración (vinculada a una inscripción)
// ==========================================
router.post('/', async (req, res) => {
  try {
    const {
      inscripcion_id, representante_id, estudiante_nombre,
      hijos_inscritos, colaboraciones_requeridas,
      monto_total, producto, observaciones,
      pago // Objeto opcional: { monto, tipo_pago, referencia_pago }
    } = req.body;

    if (!inscripcion_id || !representante_id) {
      return res.status(400).json({ error: 'inscripcion_id y representante_id son obligatorios.' });
    }

    // Verificar que no exista ya una colaboración para esta inscripción
    const existente = await req.prisma.colaboraciones.findUnique({
      where: { inscripcion_id: parseInt(inscripcion_id) }
    });
    if (existente) {
      return res.status(400).json({ error: 'Ya existe una colaboración para esta inscripción.' });
    }

    const data = {
      inscripcion_id: parseInt(inscripcion_id),
      representante_id: parseInt(representante_id),
      estudiante_nombre: estudiante_nombre || '',
      hijos_inscritos: hijos_inscritos || 1,
      colaboraciones_requeridas: colaboraciones_requeridas || 1,
      monto_total: parseFloat(monto_total) || 0,
      producto: producto || null,
      observaciones: observaciones || null
    };

    // Si viene un pago inicial, crearlo junto con la colaboración
    if (pago && pago.monto && parseFloat(pago.monto) > 0) {
      data.pagos = {
        create: {
          monto: parseFloat(pago.monto),
          tipo_pago: pago.tipo_pago || 'EFECTIVO',
          referencia_pago: pago.tipo_pago === 'PAGO_MOVIL' ? (pago.referencia_pago || null) : null
        }
      };
    }

    const colaboracion = await req.prisma.colaboraciones.create({
      data,
      include: { pagos: true }
    });

    res.status(201).json(colaboracion);
  } catch (error) {
    console.error('Error al crear colaboración:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ==========================================
// PUT /api/colaboraciones/:id
// Actualizar datos generales de la colaboración
// ==========================================
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { monto_total, producto, observaciones, hijos_inscritos, colaboraciones_requeridas } = req.body;

    const data = {};
    if (monto_total !== undefined) data.monto_total = parseFloat(monto_total);
    if (producto !== undefined) data.producto = producto;
    if (observaciones !== undefined) data.observaciones = observaciones;
    if (hijos_inscritos !== undefined) data.hijos_inscritos = parseInt(hijos_inscritos);
    if (colaboraciones_requeridas !== undefined) data.colaboraciones_requeridas = parseInt(colaboraciones_requeridas);

    const colaboracion = await req.prisma.colaboraciones.update({
      where: { id: parseInt(id) },
      data,
      include: { pagos: true }
    });

    res.json(colaboracion);
  } catch (error) {
    console.error('Error al actualizar colaboración:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ==========================================
// POST /api/colaboraciones/:id/pagos
// Añadir un pago parcial a una colaboración existente
// ==========================================
router.post('/:id/pagos', async (req, res) => {
  try {
    const colaboracionId = parseInt(req.params.id);
    const { monto, tipo_pago, referencia_pago } = req.body;

    if (!monto || parseFloat(monto) <= 0) {
      return res.status(400).json({ error: 'El monto debe ser mayor a 0.' });
    }
    if (!tipo_pago) {
      return res.status(400).json({ error: 'El tipo de pago es obligatorio.' });
    }

    const pago = await req.prisma.colaboracion_pagos.create({
      data: {
        colaboracion_id: colaboracionId,
        monto: parseFloat(monto),
        tipo_pago,
        referencia_pago: tipo_pago === 'PAGO_MOVIL' ? (referencia_pago || null) : null
      }
    });

    // Devolver la colaboración actualizada con todos sus pagos
    const colaboracion = await req.prisma.colaboraciones.findUnique({
      where: { id: colaboracionId },
      include: { pagos: { orderBy: { fecha_pago: 'asc' } } }
    });

    const montoAbonado = colaboracion.pagos.reduce((sum, p) => sum + parseFloat(p.monto), 0);

    res.status(201).json({
      pago,
      colaboracion: {
        ...colaboracion,
        monto_total: parseFloat(colaboracion.monto_total),
        monto_abonado: montoAbonado,
        monto_pendiente: parseFloat(colaboracion.monto_total) - montoAbonado
      }
    });
  } catch (error) {
    console.error('Error al registrar pago:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ==========================================
// DELETE /api/colaboraciones/:id/pagos/:pagoId
// Eliminar un pago específico
// ==========================================
router.delete('/:id/pagos/:pagoId', async (req, res) => {
  try {
    await req.prisma.colaboracion_pagos.delete({
      where: { id: parseInt(req.params.pagoId) }
    });
    res.json({ mensaje: 'Pago eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar pago:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ==========================================
// DELETE /api/colaboraciones/:id
// Eliminar una colaboración completa (y sus pagos por cascade)
// ==========================================
router.delete('/:id', async (req, res) => {
  try {
    await req.prisma.colaboraciones.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ mensaje: 'Colaboración eliminada correctamente.' });
  } catch (error) {
    console.error('Error al eliminar colaboración:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
