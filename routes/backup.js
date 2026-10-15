const express = require('express');
const { soloSuperAdmin } = require('../middleware/auth');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();

// Ruta de los binarios MySQL de Laragon
const MYSQL_BIN = process.env.MYSQL_BIN_PATH
  || 'C:\\laragon\\bin\\mysql\\mysql-8.4.3-winx64\\bin';

// ── GET /api/backup/exportar ──────────────────────
// Ejecuta mysqldump y envía el .sql como descarga
router.get('/exportar', soloSuperAdmin, async (req, res) => {
  try {
    // Obtener nombre de la institución para el archivo
    const config = await req.prisma.configuracion.findUnique({
      where: { clave: 'nombre_escuela' }
    });
    const nombreEscuela = (config?.valor || 'Institucion')
      .replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ0-9 ]/g, '')
      .trim()
      .replace(/\s+/g, '_');

    const fecha = new Date().toISOString().slice(0, 10); // 2026-10-11
    const filename = `${nombreEscuela}_backup_${fecha}.sql`;

    // Parsear DATABASE_URL para obtener user/host/port/db
    const dbUrl = new URL(process.env.DATABASE_URL);
    const args = [
      `-u${dbUrl.username}`,
      `--host=${dbUrl.hostname}`,
      `--port=${dbUrl.port || 3306}`,
      '--single-transaction',
      '--routines',
      '--triggers',
      '--add-drop-table',
      '--set-charset',
      dbUrl.pathname.slice(1)
    ];
    if (dbUrl.password) args.splice(1, 0, `-p${dbUrl.password}`);

    const mysqldump = path.join(MYSQL_BIN, 'mysqldump.exe');

    execFile(mysqldump, args, { maxBuffer: 100 * 1024 * 1024 }, async (err, stdout, stderr) => {
      if (err) {
        console.error('Error mysqldump:', err.message);
        return res.status(500).json({ error: 'Error al generar backup: ' + err.message });
      }

      // Registrar fecha del último backup
      try {
        await req.prisma.configuracion.upsert({
          where: { clave: 'backup_ultimo' },
          update: { valor: new Date().toISOString() },
          create: { clave: 'backup_ultimo', valor: new Date().toISOString() }
        });
      } catch (e) { /* silencioso */ }

      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(stdout);
    });
  } catch (error) {
    console.error('Error backup:', error);
    res.status(500).json({ error: 'Error interno al exportar backup.' });
  }
});

// ── POST /api/backup/importar ─────────────────────
// Recibe un .sql y lo restaura con mysql < archivo
const upload = multer({
  dest: path.join(__dirname, '../temp/'),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.sql')) cb(null, true);
    else cb(new Error('Solo se permiten archivos .sql'));
  }
});

router.post('/importar', soloSuperAdmin, upload.single('backup'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se envió un archivo .sql' });
  }

  const filePath = req.file.path;

  try {
    // Guardar datos del usuario actual ANTES de restaurar
    const usuarioActual = req.session.usuario;

    // Parsear DATABASE_URL
    const dbUrl = new URL(process.env.DATABASE_URL);
    const dbName = dbUrl.pathname.slice(1);
    const mysql = path.join(MYSQL_BIN, 'mysql.exe');

    const args = [
      `-u${dbUrl.username}`,
      `--host=${dbUrl.hostname}`,
      `--port=${dbUrl.port || 3306}`,
      dbName
    ];
    if (dbUrl.password) args.splice(1, 0, `-p${dbUrl.password}`);

    // Ejecutar restauración: mysql < archivo.sql
    await new Promise((resolve, reject) => {
      const proc = execFile(mysql, args, { maxBuffer: 100 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) reject(err);
        else resolve(stdout);
      });
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(proc.stdin);
    });

    // Después de restaurar, asegurar que el usuario actual siga existiendo
    try {
      const existeUsuario = await req.prisma.usuarios.findUnique({
        where: { nombre_usuario: usuarioActual.nombre }
      });
      if (!existeUsuario) {
        const bcrypt = require('bcrypt');
        const hash = await bcrypt.hash('admin123', 10);
        await req.prisma.usuarios.create({
          data: {
            nombre_usuario: usuarioActual.nombre,
            password_hash: hash,
            rol: 'SUPER_ADMIN'
          }
        });
        console.log(`[BACKUP] Usuario SUPER_ADMIN "${usuarioActual.nombre}" re-creado con password temporal.`);
      }
    } catch (e) {
      console.error('[BACKUP] Error al verificar/recrear usuario:', e.message);
    }

    // Registrar fecha de restauración
    try {
      await req.prisma.configuracion.upsert({
        where: { clave: 'backup_ultimo_restaurado' },
        update: { valor: new Date().toISOString() },
        create: { clave: 'backup_ultimo_restaurado', valor: new Date().toISOString() }
      });
    } catch (e) { /* silencioso */ }

    res.json({ ok: true, mensaje: 'Backup restaurado exitosamente.' });
  } catch (error) {
    console.error('Error al importar backup:', error);
    res.status(500).json({ error: 'Error al restaurar backup: ' + error.message });
  } finally {
    // Limpiar archivo temporal
    fs.unlink(filePath, () => {});
  }
});

// ── GET /api/backup/recordatorio ──────────────────
router.get('/recordatorio', soloSuperAdmin, async (req, res) => {
  try {
    const frecuencia = await req.prisma.configuracion.findUnique({
      where: { clave: 'backup_frecuencia_recordatorio' }
    });
    const ultimo = await req.prisma.configuracion.findUnique({
      where: { clave: 'backup_ultimo' }
    });
    res.json({
      frecuencia: frecuencia?.valor || 'MENSUAL',
      ultimo_backup: ultimo?.valor || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Error interno.' });
  }
});

// ── PUT /api/backup/recordatorio ──────────────────
router.put('/recordatorio', soloSuperAdmin, async (req, res) => {
  const { frecuencia } = req.body;
  const validos = ['SEMANAL', 'QUINCENAL', 'MENSUAL', 'DESACTIVADO'];
  if (!validos.includes(frecuencia)) {
    return res.status(400).json({ error: 'Frecuencia no válida.' });
  }
  try {
    await req.prisma.configuracion.upsert({
      where: { clave: 'backup_frecuencia_recordatorio' },
      update: { valor: frecuencia },
      create: { clave: 'backup_frecuencia_recordatorio', valor: frecuencia }
    });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar.' });
  }
});

module.exports = router;
