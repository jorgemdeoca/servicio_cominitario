require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { requireAuth } = require('./middleware/auth');
const authRoutes = require('./routes/auth');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'gestion-escolar-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 8 * 60 * 60 * 1000,
    httpOnly: true,
    secure: false,
  }
}));

// Prisma accesible en rutas
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Archivos estáticos (sin autenticación)
app.use(express.static(path.join(__dirname, 'public')));

// Rutas de auth (login/logout) - ANTES del middleware global
app.use('/api/auth', authRoutes);

// ⚠️ MIDDLEWARE GLOBAL - protege todo /api/* excepto /api/auth
app.use('/api', requireAuth);

// Rutas de la API (protegidas por el middleware global)
const aniosEscolaresRoutes = require('./routes/anios-escolares');
const gradosRoutes = require('./routes/grados');
const seccionesRoutes = require('./routes/secciones');
const configuracionRoutes = require('./routes/configuracion');
const personasRoutes = require('./routes/personas');
const estudiantesRoutes = require('./routes/estudiantes');
const profesoresRoutes = require('./routes/profesores');
const inscripcionesRoutes = require('./routes/inscripciones');
const reportesRoutes = require('./routes/reportes');

app.use('/api/anios-escolares', aniosEscolaresRoutes);
app.use('/api/grados', gradosRoutes);
app.use('/api/secciones', seccionesRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/personas', personasRoutes);
app.use('/api/estudiantes', estudiantesRoutes);
app.use('/api/profesores', profesoresRoutes);
app.use('/api/inscripciones', inscripcionesRoutes);
app.use('/api/reportes', reportesRoutes);

// Endpoint para verificar sesión
app.get('/api/me', (req, res) => {
  res.json({ usuario: req.session.usuario });
});

// Cerrar Prisma al apagar
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Servidor corriendo en:`);
  console.log(`  → Local:  http://localhost:${PORT}`);
  console.log(`  → Red:    http://[IP-DEL-SERVIDOR]:${PORT}\n`);
});
