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


// =========================================================
// VALIDACIONES EN TIEMPO REAL - Funciones compartidas
// =========================================================

/**
 * Restringe un input para solo aceptar letras (con acentos, ñ, ü) y espacios.
 * Uso: nombres, apellidos, nacionalidad exacta, lugar/estado de nacimiento, etc.
 */
function validarSoloLetras(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('input', function () {
    const cursor = this.selectionStart;
    const antes = this.value;
    this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
    // Restaurar posición del cursor si se eliminó algo
    if (this.value !== antes) {
      this.setSelectionRange(cursor - 1, cursor - 1);
    }
    actualizarEstadoValidacion(this, true);
  });
}

/**
 * Restringe un input para solo aceptar números (sin espacios, letras ni caracteres especiales).
 * Uso: cédula, teléfono, código escolar, tallas, pesos.
 */
function validarSoloNumeros(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener('input', function () {
    const cursor = this.selectionStart;
    const antes = this.value;
    this.value = this.value.replace(/[^0-9]/g, '');
    if (this.value !== antes) {
      this.setSelectionRange(cursor - 1, cursor - 1);
    }
    actualizarEstadoValidacion(this, true);
  });
}

/**
 * Valida que la fecha de nacimiento corresponda a un mayor de edad (≥ 18 años).
 * Muestra un mensaje de error debajo del campo si no cumple.
 */
function validarMayorDeEdad(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  function verificar() {
    if (!input.value) {
      actualizarEstadoValidacion(input, true);
      removerMensajeValidacion(input);
      return;
    }
    const fecha = new Date(input.value + 'T00:00:00');
    if (isNaN(fecha.getTime())) {
      actualizarEstadoValidacion(input, false);
      mostrarMensajeValidacion(input, 'Fecha inválida');
      return;
    }
    const hoy = new Date();
    let edad = hoy.getFullYear() - fecha.getFullYear();
    const m = hoy.getMonth() - fecha.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < fecha.getDate())) {
      edad--;
    }
    if (edad < 18) {
      actualizarEstadoValidacion(input, false);
      mostrarMensajeValidacion(input, 'Debe ser mayor de edad (mínimo 18 años)');
    } else {
      actualizarEstadoValidacion(input, true);
      removerMensajeValidacion(input);
    }
  }
  input.addEventListener('change', verificar);
  input.addEventListener('input', verificar);
}

/**
 * Configura el toggle de nacionalidad exacta: cuando se selecciona "E" (Extranjero),
 * muestra un campo de texto para escribir la nacionalidad exacta (solo letras).
 * @param {string} selectId - ID del select de nacionalidad (V/E)
 * @param {string} grupoId - ID del div contenedor del campo extra
 * @param {string} inputId - ID del input de texto para nacionalidad exacta
 */
function configurarNacionalidadExacta(selectId, grupoId, inputId) {
  const select = document.getElementById(selectId);
  const grupo = document.getElementById(grupoId);
  const input = document.getElementById(inputId);
  if (!select || !grupo || !input) return;

  function toggle() {
    if (select.value === 'E') {
      grupo.style.display = '';
      if (!input.value) input.focus();
    } else {
      grupo.style.display = 'none';
      input.value = '';
    }
  }

  select.addEventListener('change', toggle);
  // Validar que solo acepte letras
  validarSoloLetras(inputId);
  // Inicializar estado según valor actual
  toggle();
}

// --- Helpers de estilo visual para validación ---

function actualizarEstadoValidacion(input, esValido) {
  if (esValido) {
    input.classList.remove('campo-error');
  } else {
    input.classList.add('campo-error');
  }
}

function mostrarMensajeValidacion(input, mensaje) {
  let msgEl = input.parentNode.querySelector('.validacion-msg');
  if (!msgEl) {
    msgEl = document.createElement('small');
    msgEl.className = 'validacion-msg';
    msgEl.style.cssText = 'display:block;color:var(--error);font-size:var(--font-size-xs);margin-top:var(--space-1);';
    input.parentNode.appendChild(msgEl);
  }
  msgEl.textContent = mensaje;
}

function removerMensajeValidacion(input) {
  const msgEl = input.parentNode.querySelector('.validacion-msg');
  if (msgEl) msgEl.remove();
}

/**
 * Verifica si un campo de fecha contiene una fecha de mayor de edad (≥ 18 años).
 * Retorna true si es mayor de edad o si el campo está vacío.
 * Retorna false si es menor de edad (bloquea el registro).
 */
function esMayorDeEdad(inputId) {
  const input = document.getElementById(inputId);
  if (!input || !input.value) return true;
  const fecha = new Date(input.value + 'T00:00:00');
  if (isNaN(fecha.getTime())) return false;
  const hoy = new Date();
  let edad = hoy.getFullYear() - fecha.getFullYear();
  const m = hoy.getMonth() - fecha.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < fecha.getDate())) {
    edad--;
  }
  return edad >= 18;
}
