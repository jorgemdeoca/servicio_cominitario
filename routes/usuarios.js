const express = require('express');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { requireAuth, soloSuperAdmin } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

router.use(requireAuth, soloSuperAdmin);

router.get('/', async (req, res) => {
  try {
    const usuarios = await prisma.usuarios.findMany({
      select: { id: true, nombre_usuario: true, rol: true, creado_en: true },
      orderBy: { creado_en: 'desc' }
    });
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { nombre_usuario, password, rol } = req.body;
    if (!nombre_usuario || !password || !rol) return res.status(400).json({ error: 'Faltan datos obligatorios' });
    
    const existe = await prisma.usuarios.findUnique({ where: { nombre_usuario } });
    if (existe) return res.status(400).json({ error: 'El nombre de usuario ya existe' });

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const nuevoUsuario = await prisma.usuarios.create({ data: { nombre_usuario, password_hash, rol }, select: { id: true, nombre_usuario: true, rol: true } });
    res.status(201).json({ mensaje: 'Usuario creado', usuario: nuevoUsuario });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { password, rol } = req.body;

    const updateData = {};
    if (rol) updateData.rol = rol;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(password, salt);
    }

    if (rol === 'ADMIN') {
      const targetUser = await prisma.usuarios.findUnique({ where: { id } });
      if (targetUser && targetUser.rol === 'SUPER_ADMIN') {
        const count = await prisma.usuarios.count({ where: { rol: 'SUPER_ADMIN' } });
        if (count <= 1) return res.status(400).json({ error: 'Debe existir al menos un SUPER_ADMIN.' });
      }
    }

    const usuario = await prisma.usuarios.update({ where: { id }, data: updateData, select: { id: true, nombre_usuario: true, rol: true } });
    res.json({ mensaje: 'Actualizado', usuario });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (req.session.usuario.id === id) return res.status(400).json({ error: 'No puede auto-eliminarse' });

    const targetUser = await prisma.usuarios.findUnique({ where: { id } });
    if (targetUser && targetUser.rol === 'SUPER_ADMIN') {
      const count = await prisma.usuarios.count({ where: { rol: 'SUPER_ADMIN' } });
      if (count <= 1) return res.status(400).json({ error: 'No puede eliminar el último SUPER_ADMIN' });
    }

    await prisma.usuarios.delete({ where: { id } });
    res.json({ mensaje: 'Eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

module.exports = router;
