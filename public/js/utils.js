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
