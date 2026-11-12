let busquedaActual = '';
let searchTimeout = null;
let wizStep = 1;
const WIZ_STEPS = 3;

document.addEventListener('DOMContentLoaded', () => {
  loadProfesores();

  // === Validaciones en tiempo real ===
  validarSoloLetras('prof_apellidos');
  validarSoloLetras('prof_nombres');
  validarSoloNumeros('prof_cedula');
  validarSoloNumeros('prof_telefono');
  validarMayorDeEdad('prof_fecha_nacimiento');
  configurarNacionalidadExacta('prof_nacionalidad', 'grupoNacExactaProfesor', 'prof_nacionalidad_texto');

  document.getElementById('formProfesor').addEventListener('submit', guardarProfesor);

  // Búsqueda en tiempo real
  const inputBuscar = document.getElementById('inputBuscar');
  if (inputBuscar) {
    inputBuscar.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') buscarProfesores();
    });
    inputBuscar.addEventListener('input', () => {
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => buscarProfesores(), 500);
    });
  }

  // Verificación de cédula en tiempo real (debounce 600ms)
  let cedulaTimeout = null;
  const inputCedula = document.getElementById('prof_cedula');
  inputCedula.addEventListener('input', () => {
    if (cedulaTimeout) clearTimeout(cedulaTimeout);
    cedulaTimeout = setTimeout(() => verificarCedula(), 600);
  });

  // Código de cargo: alfanumérico
  const codigoCargo = document.getElementById('prof_codigo_cargo');
  if (codigoCargo) {
    codigoCargo.addEventListener('input', function() {
      this.value = this.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    });
  }
});

function buscarProfesores() {
  busquedaActual = document.getElementById('inputBuscar').value.trim();
  loadProfesores();
}

async function loadProfesores() {
  try {
    const filtroTipo = document.getElementById('filtroTipo').value;
    let url = '/api/profesores?solo_activos=false';
    if (filtroTipo) url += '&es_docente=' + filtroTipo;
    if (busquedaActual) url += '&buscar=' + encodeURIComponent(busquedaActual);

    const res = await apiFetch(url);
    if (!res) return;
    const data = await res.json();

    // Obtener año activo para determinar grado/sección
    let anioActivoId = null;
    try {
      const aniosRes = await apiFetch('/api/anios-escolares');
      if (aniosRes) {
        const anios = await aniosRes.json();
        const activo = anios.find(a => a.activo);
        if (activo) anioActivoId = activo.id;
      }
    } catch (e) { /* ignorar */ }

    const tbody = document.getElementById('tbodyProfesores');
    tbody.innerHTML = '';

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8">' +
        '<div class="empty-state">' +
        '<img src="/icons/user-check.svg" alt="" class="empty-state-icon">' +
        '<h3>No se encontró personal</h3>' +
        '<p>No hay registros que coincidan con el filtro actual.</p>' +
        '</div>' +
        '</td></tr>';
      const rc = document.getElementById('resultsCount');
      if (rc) rc.textContent = '';
      return;
    }

    data.forEach(p => {
      const tr = document.createElement('tr');
      const nombreCompleto = p.apellidos + ', ' + p.nombres;
      const initials = avatarInitials(nombreCompleto);
      const avatarColor = nameToColor(nombreCompleto);

      const activoBadge = p.activo
        ? '<span class="badge badge-green no-dot">Activo</span>'
        : '<span class="badge badge-red no-dot">Inactivo</span>';

      const tipoBadge = p.es_docente
        ? '<span class="badge badge-blue no-dot">Docente</span>'
        : '<span class="badge badge-orange no-dot">Apoyo</span>';

      const cargoText = p.cargo || '—';

      // Grado/Sección del año activo
      let gradoSeccion = '—';
      if (p.es_docente && p.secciones && p.secciones.length > 0 && anioActivoId) {
        const asignaciones = p.secciones.filter(s => s.seccion && s.seccion.anio_escolar_id === anioActivoId);
        if (asignaciones.length > 0) {
          gradoSeccion = asignaciones.map(s => {
            const g = s.seccion.grado ? s.seccion.grado.nombre : '';
            const l = s.seccion.letra || '';
            return g + ' "' + l + '"';
          }).join(', ');
        }
      }

      // Botón de certificado
      const btnCertificado = '<button class="btn-icon" onclick="generarCertificado(' + p.id + ')" title="Certificación Laboral" aria-label="Certificado">' +
        '<img src="/icons/printer.svg" alt="Certificado"></button>';

      tr.innerHTML =
        '<td>' + p.nacionalidad + '-' + p.cedula + '</td>' +
        '<td><div class="flex-center gap-2">' +
        '<span class="avatar-initials" style="background:' + avatarColor + ';">' + initials + '</span>' +
        '<span><strong>' + p.apellidos + '</strong>, ' + p.nombres + '</span>' +
        '</div></td>' +
        '<td>' + cargoText + '</td>' +
        '<td><span class="badge badge-lblue no-dot">' + gradoSeccion + '</span></td>' +
        '<td>' + (p.telefono || '—') + '</td>' +
        '<td>' + tipoBadge + '</td>' +
        '<td>' + activoBadge + '</td>' +
        '<td><div class="actions-cell">' +
        '<button class="btn-icon" onclick="editarProfesor(' + p.id + ')" title="Editar" aria-label="Editar"><img src="/icons/pencil.svg" alt="Editar"></button>' +
        btnCertificado +
        '<button class="btn-icon ' + (p.activo ? 'danger' : '') + '" onclick="toggleEstadoProfesor(' + p.id + ', ' + !p.activo + ')" title="' + (p.activo ? 'Desactivar' : 'Activar') + '" aria-label="' + (p.activo ? 'Desactivar' : 'Activar') + '">' +
        '<img src="/icons/' + (p.activo ? 'x' : 'check') + '.svg" alt="' + (p.activo ? 'Desactivar' : 'Activar') + '"></button>' +
        '</div></td>';
      tbody.appendChild(tr);
    });

    const rc = document.getElementById('resultsCount');
    if (rc) rc.textContent = data.length + ' registro' + (data.length !== 1 ? 's' : '');
  } catch (error) {
    showAlert('alertProfesores', 'Error al cargar personal', 'error');
  }
}

// ==========================================
// WIZARD — Navegación
// ==========================================
function wizGoTo(step) {
  wizStep = step;
  // Actualizar paneles
  for (let i = 1; i <= WIZ_STEPS; i++) {
    const panel = document.getElementById('wizStep' + i);
    if (panel) panel.classList.toggle('active', i === step);
  }
  // Actualizar barra
  document.querySelectorAll('#wizBarPersonal .wiz-step').forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.remove('active', 'done');
    if (s === step) el.classList.add('active');
    else if (s < step) el.classList.add('done');
  });
}

function wizNext() {
  if (wizStep === 1) {
    // Validar cédula
    const cedula = document.getElementById('prof_cedula').value.trim();
    if (!cedula) {
      showAlert('alertModal', 'La cédula es obligatoria.', 'error');
      document.getElementById('prof_cedula').focus();
      return;
    }
  }
  if (wizStep === 2) {
    // Validar nombre y apellido
    if (!document.getElementById('prof_apellidos').value.trim()) {
      showAlert('alertModal', 'Los apellidos son obligatorios.', 'error');
      document.getElementById('prof_apellidos').focus();
      return;
    }
    if (!document.getElementById('prof_nombres').value.trim()) {
      showAlert('alertModal', 'Los nombres son obligatorios.', 'error');
      document.getElementById('prof_nombres').focus();
      return;
    }
    // Validar mayor de edad
    if (!esMayorDeEdad('prof_fecha_nacimiento')) {
      showAlert('alertModal', 'El trabajador debe ser mayor de edad (mínimo 18 años).', 'error');
      document.getElementById('prof_fecha_nacimiento').focus();
      return;
    }
  }
  hideAlert('alertModal');
  if (wizStep < WIZ_STEPS) wizGoTo(wizStep + 1);
}

function wizPrev() {
  hideAlert('alertModal');
  if (wizStep > 1) wizGoTo(wizStep - 1);
}

// ==========================================
// VERIFICAR CÉDULA EN TIEMPO REAL
// ==========================================
async function verificarCedula() {
  const cedula = document.getElementById('prof_cedula').value.trim();
  const feedback = document.getElementById('cedulaFeedback');
  const idField = document.getElementById('prof_id');

  if (!cedula || cedula.length < 5) {
    feedback.style.display = 'none';
    return;
  }

  // No verificar si estamos editando y la cédula no cambió
  if (idField.value) return;

  try {
    const res = await apiFetch('/api/profesores/verificar-cedula/' + cedula);
    if (!res) return;
    const data = await res.json();

    if (data.existe && data.profesor) {
      feedback.style.display = 'block';
      feedback.style.color = 'var(--warning, #e67e22)';
      feedback.innerHTML = '⚠️ Ya existe un registro con esta cédula: <strong>' + data.profesor.apellidos + ', ' + data.profesor.nombres + '</strong>. Se cargarán sus datos para edición.';

      // Precargar datos
      idField.value = data.profesor.id;
      precargarDatos(data.profesor);
    } else {
      feedback.style.display = 'block';
      feedback.style.color = 'var(--success, green)';
      feedback.textContent = '✓ Cédula disponible — nuevo registro.';
    }
  } catch (e) {
    feedback.style.display = 'none';
  }
}

function precargarDatos(p) {
  document.getElementById('prof_nacionalidad').value = p.nacionalidad || 'V';
  if (p.nacionalidad_texto) {
    document.getElementById('prof_nacionalidad_texto').value = p.nacionalidad_texto;
  }
  document.getElementById('prof_nacionalidad').dispatchEvent(new Event('change'));
  document.getElementById('prof_apellidos').value = p.apellidos || '';
  document.getElementById('prof_nombres').value = p.nombres || '';
  document.getElementById('prof_sexo').value = p.sexo || '';
  if (p.fecha_nacimiento) {
    document.getElementById('prof_fecha_nacimiento').value = p.fecha_nacimiento.substring(0, 10);
  }
  document.getElementById('prof_telefono').value = p.telefono || '';
  document.getElementById('prof_email').value = p.email || '';
  document.getElementById('prof_direccion').value = p.direccion || '';
  document.getElementById('prof_lugar_nacimiento').value = p.lugar_nacimiento || '';
  document.getElementById('prof_estado_nacimiento').value = p.estado_nacimiento || '';
  document.getElementById('prof_es_docente').checked = p.es_docente !== false;
  document.getElementById('prof_cargo').value = p.cargo || '';
  document.getElementById('prof_codigo_cargo').value = p.codigo_cargo || '';
  document.getElementById('prof_titulo').value = p.titulo || '';
  document.getElementById('prof_nivel_instruccion').value = p.nivel_instruccion || '';
  document.getElementById('prof_grado_academico').value = p.grado_academico || '';
  document.getElementById('prof_tipo_cargo').value = p.tipo_cargo || '';
  document.getElementById('prof_condicion_trabajo').value = p.condicion_trabajo || '';
  document.getElementById('prof_turno').value = p.turno || 'Mañana';
  document.getElementById('prof_anos_servicio').value = p.anos_servicio || '';
  if (p.fecha_ingreso_institucion) {
    document.getElementById('prof_fecha_ingreso').value = p.fecha_ingreso_institucion.substring(0, 10);
  }
  toggleCamposDocente();
}

// ==========================================
// TOGGLE CAMPOS DOCENTE
// ==========================================
function toggleCamposDocente() {
  // No hay campos a ocultar/mostrar — cargo y código de cargo siempre visibles
  // Solo se usa el toggle para la lógica de guardado y filtro de secciones
}

// ==========================================
// MODAL
// ==========================================
function abrirModal(profesor) {
  const modal = document.getElementById('modalProfesor');
  const titulo = document.getElementById('modalTitulo');
  const form = document.getElementById('formProfesor');

  form.reset();
  document.getElementById('prof_id').value = '';
  document.getElementById('cedulaFeedback').style.display = 'none';
  document.getElementById('prof_es_docente').checked = true;
  document.getElementById('prof_turno').value = 'Mañana';
  hideAlert('alertModal');
  wizGoTo(1);

  if (profesor) {
    titulo.textContent = 'Editar Personal';
    document.getElementById('prof_id').value = profesor.id;
    document.getElementById('prof_cedula').value = profesor.cedula;
    precargarDatos(profesor);
  } else {
    titulo.textContent = 'Nuevo Personal';
    setTimeout(() => document.getElementById('prof_nacionalidad').dispatchEvent(new Event('change')), 0);
  }

  modal.classList.add('active');
}

function cerrarModal() {
  document.getElementById('modalProfesor').classList.remove('active');
}

async function editarProfesor(id) {
  try {
    const res = await apiFetch('/api/profesores/' + id);
    if (!res) return;
    if (!res.ok) {
      const err = await res.json();
      showAlert('alertProfesores', err.error || 'Error al cargar datos', 'error');
      return;
    }
    const profesor = await res.json();
    abrirModal(profesor);
  } catch (error) {
    showAlert('alertProfesores', 'Error al cargar datos del trabajador', 'error');
  }
}

// ==========================================
// GUARDAR
// ==========================================
async function guardarProfesor(e) {
  e.preventDefault();

  // Validar mayor de edad
  if (!esMayorDeEdad('prof_fecha_nacimiento')) {
    showAlert('alertModal', 'El trabajador debe ser mayor de edad (mínimo 18 años).', 'error');
    document.getElementById('prof_fecha_nacimiento').focus();
    return;
  }

  const id = document.getElementById('prof_id').value;
  const data = {
    nacionalidad: document.getElementById('prof_nacionalidad').value,
    nacionalidad_texto: document.getElementById('prof_nacionalidad').value === 'V' ? null : (document.getElementById('prof_nacionalidad_texto').value.trim() || null),
    cedula: document.getElementById('prof_cedula').value.trim(),
    apellidos: document.getElementById('prof_apellidos').value.trim(),
    nombres: document.getElementById('prof_nombres').value.trim(),
    sexo: document.getElementById('prof_sexo').value || null,
    fecha_nacimiento: document.getElementById('prof_fecha_nacimiento').value || null,
    telefono: document.getElementById('prof_telefono').value.trim() || null,
    email: document.getElementById('prof_email').value.trim() || null,
    direccion: document.getElementById('prof_direccion').value.trim() || null,
    lugar_nacimiento: document.getElementById('prof_lugar_nacimiento').value.trim() || null,
    estado_nacimiento: document.getElementById('prof_estado_nacimiento').value.trim() || null,
    es_docente: document.getElementById('prof_es_docente').checked,
    cargo: document.getElementById('prof_cargo').value.trim() || null,
    codigo_cargo: document.getElementById('prof_codigo_cargo').value.trim() || null,
    titulo: document.getElementById('prof_titulo').value.trim() || null,
    nivel_instruccion: document.getElementById('prof_nivel_instruccion').value || null,
    grado_academico: document.getElementById('prof_grado_academico').value.trim() || null,
    tipo_cargo: document.getElementById('prof_tipo_cargo').value || null,
    condicion_trabajo: document.getElementById('prof_condicion_trabajo').value || null,
    turno: document.getElementById('prof_turno').value || 'Mañana',
    anos_servicio: document.getElementById('prof_anos_servicio').value || null,
    fecha_ingreso_institucion: document.getElementById('prof_fecha_ingreso').value || null,
  };

  try {
    const url = id ? '/api/profesores/' + id : '/api/profesores';
    const method = id ? 'PUT' : 'POST';

    const res = await apiFetch(url, {
      method,
      body: JSON.stringify(data)
    });

    if (res && res.ok) {
      cerrarModal();
      showAlert('alertProfesores', id ? 'Personal actualizado' : 'Personal registrado', 'success');
      loadProfesores();
    } else if (res) {
      const err = await res.json();
      showAlert('alertModal', err.error || 'Error al guardar', 'error');
    }
  } catch (error) {
    showAlert('alertModal', 'Error de conexión', 'error');
  }
}

// ==========================================
// TOGGLE ESTADO
// ==========================================
async function toggleEstadoProfesor(id, nuevoEstado) {
  const msg = nuevoEstado ? 'activar' : 'desactivar';
  var aceptar = await confirmDialog({
    title: (nuevoEstado ? 'Activar' : 'Desactivar') + ' Trabajador',
    message: '¿Está seguro de ' + msg + ' este trabajador?',
    type: nuevoEstado ? 'info' : 'warning',
    confirmText: 'Sí, ' + msg,
    cancelText: 'Cancelar'
  });
  if (!aceptar) return;
  try {
    const res = await apiFetch('/api/profesores/' + id, {
      method: 'PUT',
      body: JSON.stringify({ activo: nuevoEstado })
    });
    if (res && res.ok) {
      showAlert('alertProfesores', 'Trabajador ' + (nuevoEstado ? 'activado' : 'desactivado'), 'success');
      loadProfesores();
    } else if (res) {
      const err = await res.json();
      showAlert('alertProfesores', err.error || 'Error al cambiar estado', 'error');
    }
  } catch (error) {
    showAlert('alertProfesores', 'Error de conexión', 'error');
  }
}

// ==========================================
// GENERAR CERTIFICADO LABORAL
// ==========================================
async function generarCertificado(id) {
  try {
    const res = await apiFetch('/api/profesores/' + id + '/datos-certificado');
    if (!res || !res.ok) {
      showAlert('alertProfesores', 'Error al obtener datos para el certificado', 'error');
      return;
    }
    const datos = await res.json();

    // Validar datos mínimos
    if (!datos.profesor.cargo) {
      var continuar = await confirmDialog({
        title: 'Cargo no registrado',
        message: 'Este trabajador no tiene un <strong>cargo</strong> registrado. El certificado se generará con "[Cargo]" como marcador.<br><br>¿Desea continuar de todos modos?',
        type: 'warning',
        confirmText: 'Generar igual',
        cancelText: 'Cancelar'
      });
      if (!continuar) return;
    }

    if (!datos.profesor.fecha_ingreso_institucion) {
      var continuar2 = await confirmDialog({
        title: 'Fecha de ingreso no registrada',
        message: 'Este trabajador no tiene <strong>fecha de ingreso a la institución</strong>. El certificado se generará con "[Fecha de Ingreso]" como marcador.<br><br>¿Desea continuar?',
        type: 'warning',
        confirmText: 'Generar igual',
        cancelText: 'Cancelar'
      });
      if (!continuar2) return;
    }

    await generarPDFCertificado(datos);
    showAlert('alertProfesores', 'Certificación Laboral generada exitosamente', 'success');
  } catch (error) {
    showAlert('alertProfesores', 'Error al generar certificado: ' + error.message, 'error');
  }
}
