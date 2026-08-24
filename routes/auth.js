const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Rate limiting para login: 10 intentos cada 15 minutos
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de inicio de sesión. Intente de nuevo en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { nombre_usuario, password } = req.body;

    if (!nombre_usuario || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios.' });
    }

    // Buscar usuario
    const usuario = await prisma.usuarios.findUnique({
      where: { nombre_usuario }
    });

    if (!usuario) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    // Verificar contraseña
    const passwordValido = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValido) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    // Crear sesión (NUNCA guardar el hash del password en la sesión)
    req.session.usuario = {
      id: usuario.id,
      nombre_usuario: usuario.nombre_usuario,
      rol: usuario.rol
    };

    res.json({
      mensaje: 'Inicio de sesión exitoso.',
      usuario: req.session.usuario
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Error al cerrar sesión.' });
    }
    res.json({ mensaje: 'Sesión cerrada exitosamente.' });
  });
});

module.exports = router;
