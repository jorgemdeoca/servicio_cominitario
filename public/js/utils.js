// Utilidades compartidas del sistema

// Hacer una peticion a la API con manejo automatico de sesion
async function apiFetch(url, options = {}) {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  const mergedOptions = { ...defaultOptions, ...options };

  const response = await fetch(url, mergedOptions);

  // Si no autorizado, redirigir al login
  if (response.status === 401) {
    window.location.href = '/index.html';
    return null;
  }

  return response;
}

// Mostrar una alerta temporal
function showAlert(containerId, message, type = 'error') {
  const alertEl = document.getElementById(containerId);
  if (!alertEl) return;
  alertEl.textContent = message;
  alertEl.className = `alert alert-${type}`;
  alertEl.style.display = 'block';

  if (type === 'success') {
    setTimeout(() => {
      alertEl.style.display = 'none';
    }, 3000);
  }
}

// Ocultar alerta
function hideAlert(containerId) {
  const alertEl = document.getElementById(containerId);
  if (alertEl) alertEl.style.display = 'none';
}

// Formatear rol para mostrar en pantalla
function formatRol(rol) {
  const roles = {
    'SUPER_ADMIN': 'Super Administrador',
    'ADMIN': 'Administrador'
  };
  return roles[rol] || rol;
}

// Convierte YYYY-MM-DDTHH... a DD/MM/YYYY
function formatearFecha(isoString) {
  if (!isoString) return '--';
  const parts = isoString.substring(0, 10).split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return isoString;
}

// T6: Genera iniciales para el avatar (máx 2 letras)
function avatarInitials(fullName) {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/[\s,]+/).filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// T6: Color determinístico basado en el nombre (paleta institucional)
function nameToColor(name) {
  const palette = [
    '#1E3A5F', '#2563EB', '#0D9488', '#7C3AED',
    '#059669', '#A16207', '#D97706', '#DC2626',
    '#0369A1', '#475569'
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

// T8: Renderiza "Mostrando X–Y de Z registros" debajo de la tabla
function renderResultsCount(containerId, pagina, porPagina, total) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!total) { el.textContent = ''; return; }
  const desde = ((pagina - 1) * porPagina) + 1;
  const hasta = Math.min(pagina * porPagina, total);
  el.textContent = `Mostrando ${desde}–${hasta} de ${total} registro${total !== 1 ? 's' : ''}`;
}

