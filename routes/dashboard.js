const express = require('express');
const router = express.Router();

// GET /api/dashboard/estadisticas
router.get('/estadisticas', async (req, res) => {
  try {
    const prisma = req.prisma;

    // Obtener año escolar activo
    const anioActivo = await prisma.anios_escolares.findFirst({
      where: { activo: true }
    });

    const anioId = anioActivo ? anioActivo.id : null;

    // Conteos principales
    const [estudiantes, personas, inscripciones, profesores] = await Promise.all([
      prisma.estudiantes.count({ where: { eliminado: false } }),
      prisma.personas.count({ where: { eliminado: false } }),
      anioId
        ? prisma.inscripciones.count({
            where: { eliminado: false, anio_escolar_id: anioId, estado: 'ACTIVO' }
          })
        : 0,
      prisma.profesores.count({ where: { activo: true } })
    ]);

    // Estudiantes sin inscribir en el año activo
    let sinInscribir = [];
    if (anioId) {
      sinInscribir = await prisma.estudiantes.findMany({
        where: {
          eliminado: false,
          inscripciones: {
            none: {
              anio_escolar_id: anioId,
              eliminado: false,
              estado: 'ACTIVO'
            }
          }
        },
        select: {
          id: true,
          primer_nombre: true,
          segundo_nombre: true,
          primer_apellido: true,
          segundo_apellido: true,
          codigo_escolar: true
        },
        orderBy: { primer_apellido: 'asc' },
        take: 10
      });
    }

    // Conteo total sin inscribir
    let totalSinInscribir = 0;
    if (anioId) {
      totalSinInscribir = await prisma.estudiantes.count({
        where: {
          eliminado: false,
          inscripciones: {
            none: {
              anio_escolar_id: anioId,
              eliminado: false,
              estado: 'ACTIVO'
            }
          }
        }
      });
    }

    // Inscritos sin colaboración
    let sinColaboracion = [];
    let totalSinColab = 0;
    if (anioId) {
      const inscSinColab = await prisma.inscripciones.findMany({
        where: {
          eliminado: false,
          anio_escolar_id: anioId,
          estado: 'ACTIVO',
          colaboracion: null
        },
        select: {
          id: true,
          estudiante: {
            select: {
              primer_nombre: true,
              segundo_nombre: true,
              primer_apellido: true,
              segundo_apellido: true
            }
          },
          seccion: {
            include: {
              grado: { select: { nombre: true } }
            }
          }
        },
        orderBy: { estudiante: { primer_apellido: 'asc' } },
        take: 10
      });

      sinColaboracion = inscSinColab;

      totalSinColab = await prisma.inscripciones.count({
        where: {
          eliminado: false,
          anio_escolar_id: anioId,
          estado: 'ACTIVO',
          colaboracion: null
        }
      });
    }

    // Matrícula por grado (para gráfico de barras)
    let matriculaPorGrado = [];
    if (anioId) {
      const grados = await prisma.grados.findMany({
        orderBy: { orden: 'asc' },
        include: {
          secciones: {
            where: { anio_escolar_id: anioId },
            include: {
              inscripciones: {
                where: { eliminado: false, estado: 'ACTIVO' },
                select: { estudiante: { select: { sexo: true } } }
              }
            }
          }
        }
      });

      matriculaPorGrado = grados.map(g => {
        let varones = 0;
        let hembras = 0;
        g.secciones.forEach(s => {
          s.inscripciones.forEach(i => {
            if (i.estudiante.sexo === 'M') varones++;
            else hembras++;
          });
        });
        return {
          nombre: g.nombre,
          varones,
          hembras,
          total: varones + hembras
        };
      }).filter(g => g.total > 0);
    }

    // Totales por sexo
    const totalVarones = matriculaPorGrado.reduce((sum, g) => sum + g.varones, 0);
    const totalHembras = matriculaPorGrado.reduce((sum, g) => sum + g.hembras, 0);

    res.json({
      anio_activo: anioActivo ? anioActivo.nombre : null,
      estudiantes,
      personas,
      inscripciones,
      profesores,
      sinInscribir,
      totalSinInscribir,
      sinColaboracion,
      totalSinColab,
      matriculaPorGrado,
      totalVarones,
      totalHembras
    });

  } catch (error) {
    console.error('Error en dashboard estadísticas:', error);
    res.status(500).json({ error: 'Error al cargar estadísticas del dashboard.' });
  }
});

module.exports = router;
