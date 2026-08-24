const express = require('express');
const router = express.Router();

// GET /api/secciones - Listar secciones (requiere anio_escolar_id)
router.get('/', async (req, res) => {
  try {
    const { anio_escolar_id, grado_id } = req.query;

    if (!anio_escolar_id) {
      return res.status(400).json({ error: 'El parámetro anio_escolar_id es obligatorio.' });
    }

    const where = { anio_escolar_id: parseInt(anio_escolar_id) };
    if (grado_id) {
      where.grado_id = parseInt(grado_id);
    }

    const secciones = await req.prisma.secciones.findMany({
      where,
      include: {
        grado: true,
        anio_escolar: true,
        profesores: {
          include: {
            profesor: true
          }
        }
      },
      orderBy: [
        { grado: { orden: 'asc' } },
        { letra: 'asc' }
      ]
    });

    res.json(secciones);
  } catch (error) {
    console.error('Error al listar secciones:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// POST /api/secciones - Crear una nueva sección
router.post('/', async (req, res) => {
  try {
    const { grado_id, anio_escolar_id, profesores_ids } = req.body;

    if (!grado_id || !anio_escolar_id) {
      return res.status(400).json({ error: 'Grado y año escolar son obligatorios.' });
    }

    if (profesores_ids && profesores_ids.length > 0) {
      // Validar que los profesores no estén asignados a OTRA sección en este MISMO año escolar
      for (const pid of profesores_ids) {
        const profesorEnEsteAnio = await req.prisma.profesores_secciones.findFirst({
          where: {
            profesor_id: parseInt(pid),
            seccion: {
              anio_escolar_id: parseInt(anio_escolar_id)
            }
          },
          include: { seccion: { include: { grado: true } } }
        });
        
        if (profesorEnEsteAnio) {
          const prof = await req.prisma.profesores.findUnique({ where: { id: parseInt(pid) } });
          return res.status(400).json({ 
            error: `El profesor ${prof.nombres} ${prof.apellidos} ya está asignado a la sección "${profesorEnEsteAnio.seccion.letra}" de ${profesorEnEsteAnio.seccion.grado.nombre} en este año escolar.` 
          });
        }
      }
    }

    // Determinar la letra automáticamente
    const seccionesExistentes = await req.prisma.secciones.findMany({
      where: {
        grado_id: parseInt(grado_id),
        anio_escolar_id: parseInt(anio_escolar_id)
      },
      orderBy: { letra: 'asc' }
    });

    let nuevaLetra = 'U';

    if (seccionesExistentes.length === 1 && seccionesExistentes[0].letra === 'U') {
      // Si hay una única sección 'U', la cambiamos a 'A' y la nueva será 'B'
      await req.prisma.secciones.update({
        where: { id: seccionesExistentes[0].id },
        data: { letra: 'A' }
      });
      nuevaLetra = 'B';
    } else if (seccionesExistentes.length > 0) {
      // Si ya hay A, B, C... buscar la última letra en orden alfabético
      const letras = seccionesExistentes.map(s => s.letra).filter(l => l !== 'U');
      if (letras.length > 0) {
        letras.sort();
        const ultimaLetra = letras[letras.length - 1];
        nuevaLetra = String.fromCharCode(ultimaLetra.charCodeAt(0) + 1);
      } else {
         nuevaLetra = 'A';
      }
    }

    const seccion = await req.prisma.secciones.create({
      data: {
        letra: nuevaLetra,
        grado_id: parseInt(grado_id),
        anio_escolar_id: parseInt(anio_escolar_id),
        profesores: profesores_ids && profesores_ids.length > 0 ? {
          create: profesores_ids.map(id => ({ profesor_id: parseInt(id) }))
        } : undefined
      },
      include: {
        grado: true,
        anio_escolar: true,
        profesores: { include: { profesor: true } }
      }
    });

    res.status(201).json(seccion);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe una sección con esa letra para ese grado y año escolar.' });
    }
    console.error('Error al crear sección:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// PUT /api/secciones/:id - Actualizar sección
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { letra, profesores_ids } = req.body;
    
    // Primero, actualizar la letra si es que se manda, y borrar las relaciones actuales con profesores
    if (profesores_ids !== undefined) {
      await req.prisma.profesores_secciones.deleteMany({
        where: { seccion_id: parseInt(id) }
      });
    }

    const dataToUpdate = {};
    if (letra) dataToUpdate.letra = letra.toUpperCase();
    
    if (profesores_ids && profesores_ids.length > 0) {
      dataToUpdate.profesores = {
        create: profesores_ids.map(pid => ({ profesor_id: parseInt(pid) }))
      };
    }

    const seccion = await req.prisma.secciones.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
      include: {
        grado: true,
        anio_escolar: true,
        profesores: { include: { profesor: true } }
      }
    });

    res.json(seccion);
  } catch (error) {
    console.error('Error al actualizar sección:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// DELETE /api/secciones/:id - Eliminar una sección
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idInt = parseInt(id);

    // Obtener info de la seccion antes de borrarla
    const seccionABorrar = await req.prisma.secciones.findUnique({
      where: { id: idInt }
    });
    if (!seccionABorrar) {
      return res.status(404).json({ error: 'Sección no encontrada.' });
    }

    // Verificar que no tenga inscripciones
    const inscripciones = await req.prisma.inscripciones.count({
      where: { seccion_id: idInt }
    });
    if (inscripciones > 0) {
      return res.status(400).json({ error: 'No se puede eliminar: tiene inscripciones asociadas.' });
    }

    await req.prisma.secciones.delete({
      where: { id: idInt }
    });

    // Reorganizar las letras de las secciones restantes del mismo grado y año
    const restantes = await req.prisma.secciones.findMany({
      where: {
        grado_id: seccionABorrar.grado_id,
        anio_escolar_id: seccionABorrar.anio_escolar_id
      },
      orderBy: { id: 'asc' }
    });

    if (restantes.length === 1) {
      // Si queda solo una, cambiar a U (unica)
      await req.prisma.secciones.update({
        where: { id: restantes[0].id },
        data: { letra: 'U' }
      });
    } else if (restantes.length > 1) {
      // Si quedan varias, reasignar A, B, C...
      const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      for (let i = 0; i < restantes.length; i++) {
        const nuevaLetra = letras[i];
        if (restantes[i].letra !== nuevaLetra) {
          await req.prisma.secciones.update({
            where: { id: restantes[i].id },
            data: { letra: nuevaLetra }
          });
        }
      }
    }

    res.json({ mensaje: 'Sección eliminada.' });
  } catch (error) {
    console.error('Error al eliminar sección:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});
// POST /api/secciones/:id/profesor - Añadir profesor a una sección existente
router.post('/:id/profesor', async (req, res) => {
  try {
    const { id } = req.params;
    const { profesor_id } = req.body;

    if (!profesor_id) return res.status(400).json({ error: 'Profesor requerido.' });

    // Validar que el profesor no tenga otra sección en este año
    const seccion = await req.prisma.secciones.findUnique({ where: { id: parseInt(id) } });
    
    const profEnAnio = await req.prisma.profesores_secciones.findFirst({
      where: {
        profesor_id: parseInt(profesor_id),
        seccion: { anio_escolar_id: seccion.anio_escolar_id }
      },
      include: { seccion: { include: { grado: true } } }
    });

    if (profEnAnio) {
      const prof = await req.prisma.profesores.findUnique({ where: { id: parseInt(profesor_id) } });
      return res.status(400).json({ 
        error: `El profesor ${prof.nombres} ${prof.apellidos} ya está asignado a la sección "${profEnAnio.seccion.letra}" de ${profEnAnio.seccion.grado.nombre}.` 
      });
    }

    const relacion = await req.prisma.profesores_secciones.create({
      data: {
        seccion_id: parseInt(id),
        profesor_id: parseInt(profesor_id)
      }
    });

    res.json(relacion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// DELETE /api/secciones/:id/profesor/:profesorId - Remover profesor de sección
router.delete('/:id/profesor/:profesorId', async (req, res) => {
  try {
    const { id, profesorId } = req.params;
    await req.prisma.profesores_secciones.delete({
      where: {
        profesor_id_seccion_id: {
          seccion_id: parseInt(id),
          profesor_id: parseInt(profesorId)
        }
      }
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
