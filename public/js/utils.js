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

/**
 * Muestra un modal de confirmación estilizado (reemplaza confirm() del navegador).
 * @param {Object} opts - Opciones del diálogo
 * @param {string} opts.title - Título del diálogo
 * @param {string} opts.message - Mensaje descriptivo
 * @param {string} opts.type - Tipo visual: 'info' | 'warning' | 'danger' | 'success'
 * @param {string} opts.icon - Ruta al icono SVG (por defecto según type)
 * @param {string} opts.confirmText - Texto del botón de confirmar (default: 'Aceptar')
 * @param {string} opts.cancelText - Texto del botón de cancelar (default: 'Cancelar')
 * @param {string} opts.confirmClass - Clase CSS del botón confirmar (default según type)
 * @returns {Promise<boolean>} - true si confirma, false si cancela
 */
function confirmDialog(opts = {}) {
  return new Promise(function(resolve) {
    var overlay = document.getElementById('confirmDialog');
    if (!overlay) { resolve(confirm(opts.message || '¿Está seguro?')); return; }

    var type = opts.type || 'warning';
    var defaultIcons = {
      info: '/icons/alert-circle.svg',
      warning: '/icons/alert-triangle.svg',
      danger: '/icons/alert-triangle.svg',
      success: '/icons/circle-check.svg'
    };

    // Configurar contenido
    document.getElementById('confirmTitle').textContent = opts.title || '¿Está seguro?';
    document.getElementById('confirmMessage').innerHTML = opts.message || 'Esta acción no se puede deshacer.';

    var iconDiv = document.getElementById('confirmIcon');
    iconDiv.className = 'confirm-icon ' + type;
    document.getElementById('confirmIconImg').src = opts.icon || defaultIcons[type] || defaultIcons.warning;

    var btnOk = document.getElementById('confirmBtnOk');
    var btnCancel = document.getElementById('confirmBtnCancel');
    btnOk.textContent = opts.confirmText || 'Aceptar';
    btnCancel.textContent = opts.cancelText || 'Cancelar';

    // Estilo del botón según tipo
    btnOk.className = 'btn';
    if (opts.confirmClass) {
      btnOk.className += ' ' + opts.confirmClass;
    } else if (type === 'danger') {
      btnOk.style.cssText = 'background:var(--error);color:white;border:none;';
    } else if (type === 'warning') {
      btnOk.style.cssText = 'background:var(--warning);color:white;border:none;';
    } else {
      btnOk.className += ' btn-primary';
      btnOk.style.cssText = '';
    }

    // Mostrar
    overlay.classList.add('active');

    function cleanup() {
      overlay.classList.remove('active');
      btnOk.removeEventListener('click', onConfirm);
      btnCancel.removeEventListener('click', onCancel);
      overlay.removeEventListener('click', onOverlay);
      btnOk.style.cssText = '';
    }
    function onConfirm() { cleanup(); resolve(true); }
    function onCancel()  { cleanup(); resolve(false); }
    function onOverlay(e) { if (e.target === overlay) { cleanup(); resolve(false); } }

    btnOk.addEventListener('click', onConfirm);
    btnCancel.addEventListener('click', onCancel);
    overlay.addEventListener('click', onOverlay);
  });
}

/**
 * Muestra un modal de alerta (sin botón cancelar) — reemplaza alert() del navegador.
 * @param {Object} opts - Mismas opciones que confirmDialog pero sin cancelar
 * @returns {Promise<void>}
 */
function alertDialog(opts = {}) {
  return new Promise(function(resolve) {
    var overlay = document.getElementById('confirmDialog');
    if (!overlay) { alert(opts.message || 'Aviso'); resolve(); return; }

    var type = opts.type || 'info';
    var defaultIcons = {
      info: '/icons/alert-circle.svg',
      warning: '/icons/alert-triangle.svg',
      danger: '/icons/alert-triangle.svg',
      success: '/icons/circle-check.svg'
    };

    document.getElementById('confirmTitle').textContent = opts.title || 'Aviso';
    document.getElementById('confirmMessage').innerHTML = opts.message || '';

    var iconDiv = document.getElementById('confirmIcon');
    iconDiv.className = 'confirm-icon ' + type;
    document.getElementById('confirmIconImg').src = opts.icon || defaultIcons[type] || defaultIcons.info;

    var btnOk = document.getElementById('confirmBtnOk');
    var btnCancel = document.getElementById('confirmBtnCancel');
    btnOk.textContent = opts.confirmText || 'Entendido';
    btnCancel.style.display = 'none';
    btnOk.className = 'btn btn-primary';
    btnOk.style.cssText = '';

    overlay.classList.add('active');

    function cleanup() {
      overlay.classList.remove('active');
      btnOk.removeEventListener('click', onOk);
      overlay.removeEventListener('click', onOverlay);
      btnCancel.style.display = '';
    }
    function onOk() { cleanup(); resolve(); }
    function onOverlay(e) { if (e.target === overlay) { cleanup(); resolve(); } }

    btnOk.addEventListener('click', onOk);
    overlay.addEventListener('click', onOverlay);
  });
}
