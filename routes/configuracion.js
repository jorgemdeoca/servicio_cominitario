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
      const base64Data = datos.logo_institucion_base64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const logoPath = path.join(__dirname, '../public/img/logo_escuela.png');
      fs.writeFileSync(logoPath, buffer);
      
      // Eliminar del objeto para no guardarlo en la base de datos
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
