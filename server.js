require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const { requireAuth, soloSuperAdmin } = require('./middleware/auth');
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

// Proteger acceso directo a configuración HTML
app.get('/configuracion.html', (req, res, next) => {
  if (!req.session || !req.session.usuario) {
    return res.redirect('/index.html');
  }
  if (req.session.usuario.rol !== 'SUPER_ADMIN') {
    return res.redirect('/dashboard.html');
  }
  next();
});

// Archivos estáticos (sin autenticación global, excepto las reglas específicas arriba)
app.use(express.static(path.join(__dirname, 'public')));

// Rutas de auth (login/logout) - ANTES del middleware global
app.use('/api/auth', authRoutes);

// Endpoint público para configuración básica (nombre escuela, año activo)
app.get('/api/config-publica', async (req, res) => {
  try {
    const configs = await prisma.configuracion.findMany({
      where: { clave: { in: ['nombre_escuela'] } }
    });
    const anioActivo = await prisma.anios_escolares.findFirst({
      where: { activo: true }
    });
    
    const configData = {};
    configs.forEach(c => { configData[c.clave] = c.valor; });
    if (anioActivo) { configData.anio_escolar = anioActivo.nombre; }
    
    res.json(configData);
  } catch (error) {
    res.json({});
  }
});

// ⚠️ MIDDLEWARE GLOBAL - protege todo /api/* excepto /api/auth y /api/config-publica
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
const usuariosRoutes = require('./routes/usuarios');
const colaboracionesRoutes = require('./routes/colaboraciones');
const dashboardRoutes = require('./routes/dashboard');

app.use('/api/anios-escolares', aniosEscolaresRoutes);
app.use('/api/grados', gradosRoutes);
app.use('/api/secciones', seccionesRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/personas', personasRoutes);
app.use('/api/estudiantes', estudiantesRoutes);
app.use('/api/profesores', profesoresRoutes);
app.use('/api/inscripciones', inscripcionesRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/colaboraciones', colaboracionesRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Endpoint para verificar sesión
app.get('/api/me', (req, res) => {
  res.json({ usuario: req.session.usuario });
});

// Endpoint para apagar el sistema (solo SUPER_ADMIN)
app.post('/api/sistema/apagar', soloSuperAdmin, async (req, res) => {
  console.log('\n  ⚠️  Apagado solicitado por: ' + req.session.usuario.nombre);
  res.json({ ok: true, mensaje: 'El sistema se apagará en unos segundos...' });

  // Dar tiempo para que la respuesta llegue al navegador
  setTimeout(async () => {
    // 1. Desconectar Prisma
    await prisma.$disconnect();

    // 2. Intentar apagar MySQL
    const mysqladminPath = path.join(
      'C:\\laragon\\bin\\mysql\\mysql-8.4.3-winx64\\bin',
      'mysqladmin.exe'
    );
    execFile(mysqladminPath, ['-u', 'root', 'shutdown'], (err) => {
      if (err) {
        console.log('  [!] No se pudo apagar MySQL automáticamente:', err.message);
      } else {
        console.log('  [OK] MySQL apagado.');
      }
      // 3. Cerrar el proceso Node.js
      console.log('  [OK] Servidor Node.js apagado.\n');
      process.exit(0);
    });
  }, 1500);
});

// Cerrar Prisma al apagar con Ctrl+C
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  ✅ Servidor corriendo en puerto ${PORT}`);
  console.log(`  → Local:  http://localhost:${PORT}`);

  const interfaces = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(interfaces)) {
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        console.log(`  → Red (${name}):  http://${addr.address}:${PORT}`);
      }
    }
  }
  console.log('');
});
