const express = require('express');
const router = express.Router();

// Helper: crea fecha UTC a partir de 'YYYY-MM-DD' para evitar desfase de zona horaria
function fechaUTC(fechaStr) {
  const partes = fechaStr.split('-');
  return new Date(Date.UTC(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2])));
}

// ============================================
// GET /api/asistencias/diaria
// Retorna secciones con matrícula + asistencia para una fecha
// + docente de guardia guardado (si existe)
// ============================================
router.get('/diaria', async (req, res) => {
  try {
    const { anio_escolar_id, fecha } = req.query;
    if (!anio_escolar_id || !fecha) {
      return res.status(400).json({ error: 'Se requiere anio_escolar_id y fecha' });
    }

    const anioId = parseInt(anio_escolar_id);
    const fechaDate = fechaUTC(fecha);

    // 1. Obtener todas las secciones del año escolar con su grado
    const secciones = await req.prisma.secciones.findMany({
      where: { anio_escolar_id: anioId },
      include: {
        grado: true,
        asistencia_diaria: {
          where: { fecha: fechaDate }
        }
      },
      orderBy: [
        { grado: { orden: 'asc' } },
        { letra: 'asc' }
      ]
    });

    // 2. Para cada sección, contar matrícula por sexo
    const filas = await Promise.all(secciones.map(async (sec) => {
      const matricula = await req.prisma.inscripciones.groupBy({
        by: ['estudiante_id'],
        where: {
          seccion_id: sec.id,
          anio_escolar_id: anioId,
          estado: { not: 'RETIRADO' },
          eliminado: false
        }
      });

      const estudianteIds = matricula.map(m => m.estudiante_id);

      let matriculaV = 0;
      let matriculaH = 0;

      if (estudianteIds.length > 0) {
        const estudiantes = await req.prisma.estudiantes.findMany({
          where: {
            id: { in: estudianteIds },
            eliminado: false
          },
          select: { sexo: true }
        });
        matriculaV = estudiantes.filter(e => e.sexo === 'M').length;
        matriculaH = estudiantes.filter(e => e.sexo === 'F').length;
      }

      const asistencia = sec.asistencia_diaria[0] || null;

      return {
        seccion_id: sec.id,
        grado_nombre: sec.grado.nombre,
        grado_nivel: sec.grado.nivel,
        grado_orden: sec.grado.orden,
        seccion_letra: sec.letra,
        matricula_v: matriculaV,
        matricula_h: matriculaH,
        matricula_t: matriculaV + matriculaH,
        asistencia_v: asistencia ? asistencia.varones_asistentes : null,
        asistencia_h: asistencia ? asistencia.hembras_asistentes : null,
        tiene_registro: !!asistencia
      };
    }));

    // 3. Buscar docente de guardia guardado para ese día
    const guardia = await req.prisma.asistencia_guardia.findUnique({
      where: {
        fecha_anio_escolar_id: {
          fecha: fechaDate,
          anio_escolar_id: anioId
        }
      },
      include: {
        profesor: {
          select: { id: true, nombres: true, apellidos: true, cedula: true, nacionalidad: true }
        }
      }
    });

    res.json({
      filas: filas,
      guardia: guardia ? {
        profesor_id: guardia.profesor_id,
        nombre_completo: guardia.profesor.nombres + ' ' + guardia.profesor.apellidos,
        ci: guardia.profesor.nacionalidad + '-' + guardia.profesor.cedula
      } : null
    });
  } catch (error) {
    console.error('Error al obtener asistencia diaria:', error);
    res.status(500).json({ error: 'Error al obtener asistencia diaria' });
  }
});

// ============================================
// POST /api/asistencias/diaria/masivo
// Guarda todas las asistencias de un día + docente de guardia
// ============================================
router.post('/diaria/masivo', async (req, res) => {
  try {
    const { fecha, anio_escolar_id, profesor_id, registros } = req.body;

    if (!fecha || !anio_escolar_id || !registros || !Array.isArray(registros)) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const fechaDate = fechaUTC(fecha);
    const anioId = parseInt(anio_escolar_id);
    const resultados = [];

    // 1. Guardar asistencia por sección
    for (const reg of registros) {
      if (reg.varones_asistentes === null && reg.hembras_asistentes === null) continue;

      const registro = await req.prisma.asistencia_diaria.upsert({
        where: {
          seccion_id_fecha: {
            seccion_id: parseInt(reg.seccion_id),
            fecha: fechaDate
          }
        },
        update: {
          varones_asistentes: parseInt(reg.varones_asistentes) || 0,
          hembras_asistentes: parseInt(reg.hembras_asistentes) || 0
        },
        create: {
          seccion_id: parseInt(reg.seccion_id),
          fecha: fechaDate,
          varones_asistentes: parseInt(reg.varones_asistentes) || 0,
          hembras_asistentes: parseInt(reg.hembras_asistentes) || 0
        }
      });
      resultados.push(registro);
    }

    // 2. Guardar docente de guardia (si se seleccionó)
    if (profesor_id) {
      await req.prisma.asistencia_guardia.upsert({
        where: {
          fecha_anio_escolar_id: {
            fecha: fechaDate,
            anio_escolar_id: anioId
          }
        },
        update: {
          profesor_id: parseInt(profesor_id)
        },
        create: {
          fecha: fechaDate,
          anio_escolar_id: anioId,
          profesor_id: parseInt(profesor_id)
        }
      });
    }

    res.json({ ok: true, guardados: resultados.length });
  } catch (error) {
    console.error('Error al guardar asistencias masivo:', error);
    res.status(500).json({ error: 'Error al guardar asistencias' });
  }
});

// ============================================
// GET /api/asistencias/reporte-pdf
// Datos completos para generar el PDF de asistencia diaria
// ============================================
router.get('/reporte-pdf', async (req, res) => {
  try {
    const { anio_escolar_id, fecha, profesor_id } = req.query;

    if (!anio_escolar_id || !fecha || !profesor_id) {
      return res.status(400).json({ error: 'Se requiere anio_escolar_id, fecha y profesor_id' });
    }

    const anioId = parseInt(anio_escolar_id);
    const fechaDate = fechaUTC(fecha);
    const profId = parseInt(profesor_id);

    // 1. Datos del profesor (docente de guardia)
    const profesor = await req.prisma.profesores.findUnique({
      where: { id: profId },
      select: { nombres: true, apellidos: true, cedula: true, nacionalidad: true }
    });

    if (!profesor) {
      return res.status(404).json({ error: 'Profesor no encontrado' });
    }

    // 2. Configuración de la escuela
    const configs = await req.prisma.configuracion.findMany({
      where: { clave: { in: ['nombre_escuela', 'localidad', 'estado'] } }
    });
    const configMap = {};
    configs.forEach(c => { configMap[c.clave] = c.valor; });

    // 3. Año escolar
    const anioEscolar = await req.prisma.anios_escolares.findUnique({
      where: { id: anioId },
      select: { nombre: true }
    });

    // 4. Secciones con matrícula y asistencia
    const secciones = await req.prisma.secciones.findMany({
      where: { anio_escolar_id: anioId },
      include: {
        grado: true,
        asistencia_diaria: {
          where: { fecha: fechaDate }
        }
      },
      orderBy: [
        { grado: { orden: 'asc' } },
        { letra: 'asc' }
      ]
    });

    const filas = await Promise.all(secciones.map(async (sec) => {
      const inscripciones = await req.prisma.inscripciones.findMany({
        where: {
          seccion_id: sec.id,
          anio_escolar_id: anioId,
          estado: { not: 'RETIRADO' },
          eliminado: false
        },
        include: {
          estudiante: { select: { sexo: true, eliminado: true } }
        }
      });

      const activos = inscripciones.filter(i => !i.estudiante.eliminado);
      const matV = activos.filter(i => i.estudiante.sexo === 'M').length;
      const matH = activos.filter(i => i.estudiante.sexo === 'F').length;

      const asist = sec.asistencia_diaria[0] || null;
      const asistV = asist ? asist.varones_asistentes : 0;
      const asistH = asist ? asist.hembras_asistentes : 0;

      return {
        grado_nombre: sec.grado.nombre,
        grado_nivel: sec.grado.nivel,
        seccion_letra: sec.letra,
        matricula_v: matV,
        matricula_h: matH,
        matricula_t: matV + matH,
        asistencia_v: asistV,
        asistencia_h: asistH,
        asistencia_t: asistV + asistH,
        inasistencia_v: matV - asistV,
        inasistencia_h: matH - asistH,
        inasistencia_t: (matV - asistV) + (matH - asistH)
      };
    }));

    // 5. Calcular resumen por nivel
    const resumen = {
      INICIAL: { asist_v: 0, asist_h: 0, asist_t: 0 },
      PRIMARIA: { asist_v: 0, asist_h: 0, asist_t: 0 }
    };

    filas.forEach(f => {
      const nivel = f.grado_nivel;
      if (resumen[nivel]) {
        resumen[nivel].asist_v += f.asistencia_v;
        resumen[nivel].asist_h += f.asistencia_h;
        resumen[nivel].asist_t += f.asistencia_t;
      }
    });

    res.json({
      profesor: {
        nombre_completo: profesor.nombres + ' ' + profesor.apellidos,
        ci: profesor.nacionalidad + '-' + profesor.cedula
      },
      config: configMap,
      anio_escolar: anioEscolar ? anioEscolar.nombre : '',
      filas: filas,
      resumen: resumen
    });
  } catch (error) {
    console.error('Error al generar reporte PDF:', error);
    res.status(500).json({ error: 'Error al generar reporte' });
  }
});

// ============================================
// GET /api/asistencias/dias-no-laborables
// ============================================
router.get('/dias-no-laborables', async (req, res) => {
  try {
    const { anio_escolar_id } = req.query;
    if (!anio_escolar_id) {
      return res.status(400).json({ error: 'Se requiere anio_escolar_id' });
    }

    const dias = await req.prisma.dias_no_laborables.findMany({
      where: { anio_escolar_id: parseInt(anio_escolar_id) },
      orderBy: { fecha: 'asc' }
    });

    res.json(dias);
  } catch (error) {
    console.error('Error al obtener días no laborables:', error);
    res.status(500).json({ error: 'Error al obtener días no laborables' });
  }
});

// ============================================
// POST /api/asistencias/dias-no-laborables
// ============================================
router.post('/dias-no-laborables', async (req, res) => {
  try {
    const { fecha, motivo, anio_escolar_id } = req.body;

    if (!fecha || !anio_escolar_id) {
      return res.status(400).json({ error: 'Se requiere fecha y anio_escolar_id' });
    }

    const fechaDate = fechaUTC(fecha);

    const existe = await req.prisma.dias_no_laborables.findFirst({
      where: {
        fecha: fechaDate,
        anio_escolar_id: parseInt(anio_escolar_id)
      }
    });

    if (existe) {
      return res.status(400).json({ error: 'Este día ya está marcado como no laborable' });
    }

    const dia = await req.prisma.dias_no_laborables.create({
      data: {
        fecha: fechaDate,
        motivo: motivo || null,
        anio_escolar_id: parseInt(anio_escolar_id)
      }
    });

    res.json({ ok: true, dia });
  } catch (error) {
    console.error('Error al agregar día no laborable:', error);
    res.status(500).json({ error: 'Error al agregar día no laborable' });
  }
});

// ============================================
// DELETE /api/asistencias/dias-no-laborables/:id
// ============================================
router.delete('/dias-no-laborables/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await req.prisma.dias_no_laborables.delete({ where: { id: id } });
    res.json({ ok: true });
  } catch (error) {
    console.error('Error al eliminar día no laborable:', error);
    res.status(500).json({ error: 'Error al eliminar día no laborable' });
  }
});

// ============================================
// GET /api/asistencias/profesores-activos
// ============================================
router.get('/profesores-activos', async (req, res) => {
  try {
    const profesores = await req.prisma.profesores.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        cedula: true,
        nacionalidad: true
      },
      orderBy: [
        { apellidos: 'asc' },
        { nombres: 'asc' }
      ]
    });

    res.json(profesores);
  } catch (error) {
    console.error('Error al obtener profesores activos:', error);
    res.status(500).json({ error: 'Error al obtener profesores' });
  }
});

module.exports = router;
