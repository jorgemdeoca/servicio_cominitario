const express = require('express');
const { soloSuperAdmin } = require('../middleware/auth');
const router = express.Router();

// GET /api/grados - Listar todos los grados
router.get('/', async (req, res) => {
  try {
    const grados = await req.prisma.grados.findMany({
      orderBy: { orden: 'asc' }
    });
    res.json(grados);
  } catch (error) {
    console.error('Error al listar grados:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// POST /api/grados - Crear un nuevo grado (solo SUPER_ADMIN)
router.post('/', soloSuperAdmin, async (req, res) => {
  try {
    const { nombre, orden, nivel } = req.body;

    if (!nivel) {
      return res.status(400).json({ error: 'El nivel es obligatorio.' });
    }

    if (!['INICIAL', 'PRIMARIA'].includes(nivel)) {
      return res.status(400).json({ error: 'El nivel debe ser INICIAL o PRIMARIA.' });
    }

    if (nivel === 'PRIMARIA' && (!nombre || orden === undefined)) {
      return res.status(400).json({ error: 'Nombre y orden son obligatorios para primaria.' });
    }

    // Si es INICIAL (Preescolar), manejar la asignacion automatica de letra
    if (nivel === 'INICIAL') {
      // Contar cuantos preescolares ya existen
      const preescolaresExistentes = await req.prisma.grados.findMany({
        where: { nivel: 'INICIAL' },
        orderBy: { orden: 'asc' }
      });

      const letras = ['A', 'B', 'C', 'D', 'E'];
      const nuevaLetraIndex = preescolaresExistentes.length;
      
      if (nuevaLetraIndex >= letras.length) {
        return res.status(400).json({ error: 'Se ha alcanzado el maximo de preescolares permitidos.' });
      }

      const nuevaLetra = letras[nuevaLetraIndex];
      const nuevoNombre = `Preescolar ${nuevaLetra}`;
      const nuevoOrden = nuevaLetraIndex;

      // Verificar que no exista uno con ese nombre
      const existe = await req.prisma.grados.findFirst({
        where: { nombre: nuevoNombre }
      });
      if (existe) {
        return res.status(400).json({ error: `Ya existe ${nuevoNombre}.` });
      }

      const grado = await req.prisma.grados.create({
        data: { nombre: nuevoNombre, orden: nuevoOrden, nivel: 'INICIAL' }
      });

      return res.status(201).json(grado);
    }

    // Para PRIMARIA, verificar duplicados
    const existe = await req.prisma.grados.findFirst({
      where: { nombre }
    });
    if (existe) {
      return res.status(400).json({ error: `Ya existe el grado "${nombre}".` });
    }

    const grado = await req.prisma.grados.create({
      data: { nombre, orden: parseInt(orden), nivel }
    });

    res.status(201).json(grado);
  } catch (error) {
    console.error('Error al crear grado:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// PUT /api/grados/:id - Actualizar un grado (solo SUPER_ADMIN)
router.put('/:id', soloSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, orden, nivel } = req.body;

    const data = {};
    if (nombre !== undefined) data.nombre = nombre;
    if (orden !== undefined) data.orden = parseInt(orden);
    if (nivel !== undefined) {
      if (!['INICIAL', 'PRIMARIA'].includes(nivel)) {
        return res.status(400).json({ error: 'El nivel debe ser INICIAL o PRIMARIA.' });
      }
      data.nivel = nivel;
    }

    const grado = await req.prisma.grados.update({
      where: { id: parseInt(id) },
      data
    });

    res.json(grado);
  } catch (error) {
    console.error('Error al actualizar grado:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// DELETE /api/grados/:id - Eliminar un grado (solo SUPER_ADMIN)
router.delete('/:id', soloSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const idInt = parseInt(id);

    // Verificar que no tenga secciones
    const secciones = await req.prisma.secciones.count({
      where: { grado_id: idInt }
    });
    if (secciones > 0) {
      return res.status(400).json({ error: 'No se puede eliminar: tiene secciones asociadas.' });
    }

    // Obtener info del grado antes de borrarlo
    const gradoABorrar = await req.prisma.grados.findUnique({ where: { id: idInt } });
    if (!gradoABorrar) {
      return res.status(404).json({ error: 'Grado no encontrado.' });
    }

    await req.prisma.grados.delete({
      where: { id: idInt }
    });

    // Si era INICIAL (Preescolar), reorganizar los restantes
    if (gradoABorrar.nivel === 'INICIAL') {
      const restantes = await req.prisma.grados.findMany({
        where: { nivel: 'INICIAL' },
        orderBy: { orden: 'asc' }
      });

      const letras = ['A', 'B', 'C', 'D', 'E'];
      for (let i = 0; i < restantes.length; i++) {
        const nuevoNombre = `Preescolar ${letras[i]}`;
        const nuevoOrden = i;
        if (restantes[i].nombre !== nuevoNombre || restantes[i].orden !== nuevoOrden) {
          await req.prisma.grados.update({
            where: { id: restantes[i].id },
            data: { nombre: nuevoNombre, orden: nuevoOrden }
          });
        }
      }
    }

    res.json({ mensaje: 'Grado eliminado.' });
  } catch (error) {
    console.error('Error al eliminar grado:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
