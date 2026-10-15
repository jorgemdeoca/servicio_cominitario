const express = require('express');
const { soloSuperAdmin } = require('../middleware/auth');
const router = express.Router();

// GET /api/configuracion - Obtener toda la configuración (solo SUPER_ADMIN)
router.get('/', soloSuperAdmin, async (req, res) => {
  try {
    const configs = await req.prisma.configuracion.findMany();

    // Convertir array de {clave, valor} a un objeto plano
    const resultado = {};
    for (const config of configs) {
      resultado[config.clave] = config.valor;
    }

    res.json(resultado);
  } catch (error) {
    console.error('Error al obtener configuración:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// PUT /api/configuracion - Actualizar configuración (solo SUPER_ADMIN)
router.put('/', soloSuperAdmin, async (req, res) => {
  try {
    const datos = req.body;
    const fs = require('fs');
    const path = require('path');

    if (datos.logo_institucion_base64) {
      const dataUrl = datos.logo_institucion_base64;

      // Validar que sea una imagen PNG o JPEG
      if (!/^data:image\/(png|jpeg|jpg);base64,/.test(dataUrl)) {
        return res.status(400).json({ error: 'El logo debe ser una imagen PNG o JPEG.' });
      }

      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Validar tamaño máximo: 500 KB
      const maxBytes = 500 * 1024;
      if (buffer.length > maxBytes) {
        return res.status(400).json({ error: 'El logo no debe superar 500 KB.' });
      }

      // Guardar el archivo en disco
      const imgDir = path.join(__dirname, '../public/img');
      if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
      const logoPath = path.join(imgDir, 'logo_escuela.png');
      fs.writeFileSync(logoPath, buffer);

      // Guardar la URL relativa en BD (en lugar del base64 pesado)
      datos.logo_url = '/img/logo_escuela.png';

      // Eliminar el base64 — no se guarda en BD
      delete datos.logo_institucion_base64;
    }

    // Para cada clave en el body, hacer upsert
    for (const [clave, valor] of Object.entries(datos)) {
      await req.prisma.configuracion.upsert({
        where: { clave },
        update: { valor },
        create: { clave, valor }
      });
    }

    res.json({ mensaje: 'Configuración actualizada correctamente.' });
  } catch (error) {
    console.error('Error al actualizar configuración:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

module.exports = router;
