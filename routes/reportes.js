const express = require('express');
const router = express.Router();

// GET /api/reportes/matricula
router.get('/matricula', async (req, res) => {
  try {
    const { anio_escolar_id, seccion_id } = req.query;
    if (!anio_escolar_id || !seccion_id) {
      return res.status(400).json({ error: 'Los parametros anio_escolar_id y seccion_id son obligatorios.' });
    }

    const seccion = await req.prisma.secciones.findUnique({
      where: { id: parseInt(seccion_id) },
      include: {
        grado: true,
        anio_escolar: true,
        profesores: { include: { profesor: true } }
      }
    });
    if (!seccion) return res.status(404).json({ error: 'Seccion no encontrada.' });

    const configs = await req.prisma.configuracion.findMany();
    const config = {};
    for (const c of configs) config[c.clave] = c.valor;

    const inscripciones = await req.prisma.inscripciones.findMany({
      where: {
        seccion_id: parseInt(seccion_id),
        anio_escolar_id: parseInt(anio_escolar_id),
        eliminado: false,
        estado: { not: 'RETIRADO' }
      },
      include: {
        estudiante: {
          include: {
            representante: {
              select: { nombres: true, apellidos: true, cedula: true, nacionalidad: true, telefono: true }
            }
          }
        }
      },
      orderBy: [
        { estudiante: { primer_apellido: 'asc' } },
        { estudiante: { primer_nombre: 'asc' } }
      ]
    });

    const calcularEdad = (fechaNac) => {
      if (!fechaNac) return '';
      const hoy = new Date();
      const nac = new Date(fechaNac);
      let edad = hoy.getFullYear() - nac.getFullYear();
      const m = hoy.getMonth() - nac.getMonth();
      if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
      return edad;
    };

    let varones = 0, hembras = 0;

    const estudiantesFormateados = inscripciones.map((insc, idx) => {
      const e = insc.estudiante;
      const nombreCompleto = [e.primer_apellido, e.segundo_apellido, e.primer_nombre, e.segundo_nombre]
        .filter(Boolean).join(' ');
      if (e.sexo === 'M') varones++;
      else if (e.sexo === 'F') hembras++;
      const rep = e.representante;
      return {
        numero: idx + 1,
        codigo_escolar: e.codigo_escolar || '',
        apellidos_nombres: nombreCompleto,
        lugar_nacimiento: e.lugar_nacimiento || '',
        fecha_nacimiento: e.fecha_nacimiento
          ? new Date(e.fecha_nacimiento).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })
          : '',
        edad: calcularEdad(e.fecha_nacimiento),
        sexo: e.sexo || '',
        representante: rep ? `${rep.apellidos}, ${rep.nombres}` : '',
        ci_representante: rep ? `${rep.nacionalidad}-${rep.cedula}` : '',
        direccion: insc.direccion || '',
        telefono: (rep && rep.telefono) ? rep.telefono : (insc.telefono || '')
      };
    });

    const profesoresArray = seccion.profesores.map(p => ({
      nombre: `${p.profesor.nombres.split(' ')[0]} ${p.profesor.apellidos.split(' ')[0]}`,
      cedula: `${p.profesor.nacionalidad || 'V'}-${p.profesor.cedula}`
    })).slice(0, 2); // Max 2 profesores

    res.json({
      config,
      anio_escolar: seccion.anio_escolar,
      grado: seccion.grado,
      seccion: { id: seccion.id, letra: seccion.letra },
      profesores: profesoresArray,
      estudiantes: estudiantesFormateados,
      totales: { varones, hembras, total: varones + hembras }
    });
  } catch (error) {
    console.error('Error en reporte matricula:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// GET /api/reportes/ficha-inscripcion?inscripcion_id=X
router.get('/ficha-inscripcion', async (req, res) => {
  try {
    const { inscripcion_id } = req.query;
    if (!inscripcion_id) return res.status(400).json({ error: 'El parametro inscripcion_id es obligatorio.' });

    const inscripcion = await req.prisma.inscripciones.findUnique({
      where: { id: parseInt(inscripcion_id) },
      include: {
        estudiante: { include: { madre: true, padre: true, representante: true } },
        seccion: {
          include: {
            grado: true,
            anio_escolar: true,
            profesores: { include: { profesor: true } }
          }
        },
        anio_escolar: true
      }
    });

    if (!inscripcion || inscripcion.eliminado) {
      return res.status(404).json({ error: 'Inscripcion no encontrada.' });
    }

    const configs = await req.prisma.configuracion.findMany();
    const config = {};
    for (const c of configs) config[c.clave] = c.valor;

    res.json({ inscripcion, config });
  } catch (error) {
    console.error('Error en reporte ficha:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// GET /api/reportes/estadisticas?anio_escolar_id=X
router.get('/estadisticas', async (req, res) => {
  try {
    const { anio_escolar_id } = req.query;
    if (!anio_escolar_id) return res.status(400).json({ error: 'El parametro anio_escolar_id es obligatorio.' });

    const secciones = await req.prisma.secciones.findMany({
      where: { anio_escolar_id: parseInt(anio_escolar_id) },
      include: {
        grado: true,
        inscripciones: {
          where: { eliminado: false, estado: { not: 'RETIRADO' } },
          include: { estudiante: { select: { sexo: true } } }
        }
      },
      orderBy: [{ grado: { orden: 'asc' } }, { letra: 'asc' }]
    });

    const porGrado = {};
    let totalGlobal = 0, varonesGlobal = 0, hembraGlobal = 0;

    for (const sec of secciones) {
      const nombreGrado = sec.grado.nombre;
      if (!porGrado[nombreGrado]) {
        porGrado[nombreGrado] = {
          grado: nombreGrado, nivel: sec.grado.nivel,
          orden: sec.grado.orden, secciones: [],
          totalGrado: 0, varonesGrado: 0, hembraGrado: 0
        };
      }
      const varones = sec.inscripciones.filter(i => i.estudiante.sexo === 'M').length;
      const hembras = sec.inscripciones.filter(i => i.estudiante.sexo === 'F').length;
      const total = sec.inscripciones.length;

      porGrado[nombreGrado].secciones.push({ letra: sec.letra, varones, hembras, total });
      porGrado[nombreGrado].totalGrado += total;
      porGrado[nombreGrado].varonesGrado += varones;
      porGrado[nombreGrado].hembraGrado += hembras;
      totalGlobal += total;
      varonesGlobal += varones;
      hembraGlobal += hembras;
    }

    const anio = await req.prisma.anios_escolares.findUnique({ where: { id: parseInt(anio_escolar_id) } });

    res.json({
      anio_escolar: anio,
      por_grado: Object.values(porGrado).sort((a, b) => a.orden - b.orden),
      totales_globales: { varones: varonesGlobal, hembras: hembraGlobal, total: totalGlobal }
    });
  } catch (error) {
    console.error('Error en estadisticas:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
