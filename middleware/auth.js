// Middleware de autenticación global
// Verifica que el usuario tenga sesión activa
function requireAuth(req, res, next) {
  if (req.session && req.session.usuario) {
    return next();
  }
  return res.status(401).json({ error: 'No autorizado. Debe iniciar sesión.' });
}

// Middleware de rol: solo SUPER_ADMIN
function soloSuperAdmin(req, res, next) {
  if (req.session && req.session.usuario && req.session.usuario.rol === 'SUPER_ADMIN') {
    return next();
  }
  return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Super Administrador.' });
}

module.exports = { requireAuth, soloSuperAdmin };
