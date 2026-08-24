const express = require('express');
const router = express.Router();

// GET /api/anios-escolares - Listar todos los años escolares
router.get('/', async (req, res) => {
  try {
    const anios = await req.prisma.anios_escolares.findMany({
      orderBy: { nombre: 'desc' }
    });
    res.json(anios);
  } catch (error) {
    console.error('Error al listar años escolares:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// POST /api/anios-escolares - Crear un nuevo año escolar
router.post('/', async (req, res) => {
  try {
    const { nombre, fecha_inicio, fecha_fin } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'El nombre del año escolar es obligatorio.' });
    }

    // Verificar que no exista
    const existente = await req.prisma.anios_escolares.findFirst({
      where: { nombre }
    });
    if (existente) {
      return res.status(400).json({ error: `El año escolar "${nombre}" ya existe.` });
    }

    const anio = await req.prisma.anios_escolares.create({
      data: {
        nombre,
        fecha_inicio: fecha_inicio ? new Date(fecha_inicio) : null,
        fecha_fin: fecha_fin ? new Date(fecha_fin) : null,
      }
    });

    res.status(201).json(anio);
  } catch (error) {
    console.error('Error al crear año escolar:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// PUT /api/anios-escolares/:id - Actualizar un año escolar
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, fecha_inicio, fecha_fin } = req.body;

    const data = {};
    if (nombre !== undefined) data.nombre = nombre;
    if (fecha_inicio !== undefined) data.fecha_inicio = fecha_inicio ? new Date(fecha_inicio) : null;
    if (fecha_fin !== undefined) data.fecha_fin = fecha_fin ? new Date(fecha_fin) : null;

    const anio = await req.prisma.anios_escolares.update({
      where: { id: parseInt(id) },
      data
    });

    res.json(anio);
  } catch (error) {
    console.error('Error al actualizar año escolar:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// PUT /api/anios-escolares/:id/activar - Activar un año escolar (desactiva los demás)
router.put('/:id/activar', async (req, res) => {
  try {
    const { id } = req.params;

    // Usar transacción: desactivar todos, luego activar el seleccionado
    const anio = await req.prisma.$transaction(async (prisma) => {
      await prisma.anios_escolares.updateMany({
        data: { activo: false }
      });
      return prisma.anios_escolares.update({
        where: { id: parseInt(id) },
        data: { activo: true }
      });
    });

    res.json({ mensaje: `Año escolar "${anio.nombre}" activado.`, anio });
  } catch (error) {
    console.error('Error al activar año escolar:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// PUT /api/anios-escolares/:id/finalizar - Finalizar un año escolar
router.put('/:id/finalizar', async (req, res) => {
  try {
    const { id } = req.params;
    const anio = await req.prisma.anios_escolares.update({
      where: { id: parseInt(id) },
      data: { activo: false }
    });
    res.json({ mensaje: `Año escolar "${anio.nombre}" finalizado.`, anio });
  } catch (error) {
    console.error('Error al finalizar año escolar:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// DELETE /api/anios-escolares/:id - Eliminar un año escolar
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const idInt = parseInt(id);

    // Verificar que no tenga inscripciones
    const inscripciones = await req.prisma.inscripciones.count({
      where: { anio_escolar_id: idInt }
    });
    if (inscripciones > 0) {
      return res.status(400).json({ error: 'No se puede eliminar: tiene inscripciones asociadas.' });
    }

    // Verificar que no tenga secciones
    const secciones = await req.prisma.secciones.count({
      where: { anio_escolar_id: idInt }
    });
    if (secciones > 0) {
      return res.status(400).json({ error: 'No se puede eliminar: tiene secciones asociadas. Elimine las secciones primero.' });
    }

    await req.prisma.anios_escolares.delete({
      where: { id: idInt }
    });

    res.json({ mensaje: 'Año escolar eliminado.' });
  } catch (error) {
    console.error('Error al eliminar año escolar:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
