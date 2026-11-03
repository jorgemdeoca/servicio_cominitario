let paginaActual = 1;
let busquedaActual = '';

document.addEventListener('DOMContentLoaded', () => {
  loadEstudiantes();

  // === Validaciones en tiempo real — Datos del estudiante ===
  validarSoloLetras('e_primer_apellido');
  validarSoloLetras('e_segundo_apellido');
  validarSoloLetras('e_primer_nombre');
  validarSoloLetras('e_segundo_nombre');
  validarSoloNumeros('e_codigo_escolar');
  validarSoloLetras('e_lugar_nacimiento');
  validarSoloLetras('e_estado_nacimiento');
  // Fecha de nacimiento del estudiante: NO se valida mayor de edad (es niño)
  // Nacionalidad exacta del estudiante
  configurarNacionalidadExacta('e_nacionalidad', 'grupoNacExactaEstudiante', 'e_nacionalidad_texto');

  // === Validaciones — Datos de la Madre ===
  validarSoloNumeros('m_cedula');
  validarSoloLetras('m_apellidos');
  validarSoloLetras('m_nombres');
  validarSoloNumeros('m_telefono');
  validarMayorDeEdad('m_fecha_nacimiento');
  configurarNacionalidadExacta('m_nacionalidad', 'grupoNacExactaMadre', 'm_nacionalidad_texto');
  // Dirección: permite todos los caracteres

  // === Validaciones — Datos del Padre ===
  validarSoloNumeros('p_cedula');
  validarSoloLetras('p_apellidos');
  validarSoloLetras('p_nombres');
  validarSoloNumeros('p_telefono');
  validarMayorDeEdad('p_fecha_nacimiento');
  configurarNacionalidadExacta('p_nacionalidad', 'grupoNacExactaPadre', 'p_nacionalidad_texto');

  // === Validaciones — Representante Legal (Otra Persona) ===
  validarSoloNumeros('r_cedula');
  validarSoloLetras('r_apellidos');
  validarSoloLetras('r_nombres');
  validarSoloNumeros('r_telefono');
  validarMayorDeEdad('r_fecha_nacimiento');
  configurarNacionalidadExacta('r_nacionalidad', 'grupoNacExactaRep', 'r_nacionalidad_texto');

  // === Validaciones — Datos Variables ===
  validarSoloNumeros('dv_talla');
  validarSoloNumeros('dv_peso');
  validarSoloNumeros('dv_talla_camisa');
  validarSoloNumeros('dv_talla_pantalon');
  validarSoloNumeros('dv_talla_zapato');

  document.getElementById('formPlanilla').addEventListener('submit', guardarEstudiante);
  document.getElementById('inputBuscar').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') buscarEstudiantes();
  });
  
  let mainSearchTimer;
  document.getElementById('inputBuscar').addEventListener('input', (e) => {
    clearTimeout(mainSearchTimer);
    const val = e.target.value.trim();
    if (val.length === 0 || val.length >= 3) {
      mainSearchTimer = setTimeout(buscarEstudiantes, 500);
    }
  });

  // Toggle sección "Otra Persona" del representante
  document.querySelectorAll('input[name="representante_es"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const seccion = document.getElementById('seccionRepOtro');
      if (e.target.value === 'OTRO') {
        seccion.classList.add('visible');
      } else {
        seccion.classList.remove('visible');
      }
    });
  });

  // Búsqueda en tiempo real (debounce) y Enter para las cédulas en la planilla
  configurarBusquedaEnTiempoReal('m_cedula', 5, () => buscarPersona('madre'));
  configurarBusquedaEnTiempoReal('p_cedula', 5, () => buscarPersona('padre'));
  configurarBusquedaEnTiempoReal('r_cedula', 5, () => buscarPersona('rep'));
});

function configurarBusquedaEnTiempoReal(inputId, minLength, searchFn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  let debounceTimer;

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    if (input.value.trim().length === 0) {
      searchFn();
    } else if (input.value.trim().length >= minLength) {
      debounceTimer = setTimeout(() => {
        searchFn();
      }, 500);
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(debounceTimer);
      if (input.value.trim().length > 0) {
        searchFn();
      }
    }
  });
}

function buscarEstudiantes() {
  busquedaActual = document.getElementById('inputBuscar').value.trim();
  paginaActual = 1;
  loadEstudiantes();
}

// ==========================================
// TABLA PRINCIPAL
// ==========================================
async function loadEstudiantes() {
  try {
    let url = `/api/estudiantes?pagina=${paginaActual}&limite=15`;
    if (busquedaActual) url += `&buscar=${encodeURIComponent(busquedaActual)}`;

    const res = await apiFetch(url);
    if (!res) return;
    const data = await res.json();

    const tbody = document.getElementById('tbodyEstudiantes');
    tbody.innerHTML = '';

    if (data.datos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8">
        <div class="empty-state">
          <img src="/icons/graduation-cap.svg" alt="" class="empty-state-icon">
          <h3>No se encontraron estudiantes</h3>
          <p>Intenta con otro término de búsqueda o agrega un nuevo estudiante.</p>
          <button class="btn btn-primary btn-sm" onclick="abrirPlanilla()">
            <img src="/icons/plus.svg" alt="" style="width:14px;height:14px;filter:invert(1);vertical-align:middle;margin-right:4px;">
            Nuevo Estudiante
          </button>
        </div>
      </td></tr>`;
      document.getElementById('paginacion').innerHTML = '';
      return;
    }

    data.datos.forEach(e => {
      const tr = document.createElement('tr');
      const nombre = [e.primer_apellido, e.segundo_apellido, e.primer_nombre, e.segundo_nombre]
        .filter(Boolean).join(' ');
      const fechaNac = formatearFecha(e.fecha_nacimiento);
      const sexoClass = e.sexo === 'M' ? 'badge-sexo-m' : 'badge-sexo-f';
      const sexoText = e.sexo === 'M' ? 'M' : 'F';
      const rep = e.representante ? `${e.representante.apellidos}, ${e.representante.nombres}` : '—';
      const telRep = e.representante && e.representante.telefono ? e.representante.telefono : '—';

      // T6: Avatar con iniciales
      const initials = avatarInitials(nombre);
      const avatarColor = nameToColor(nombre);

      // Estado de inscripción
      let estadoBadge = '';
      const inscActiva = e.inscripciones && e.inscripciones[0];
      if (inscActiva && inscActiva.estado === 'ACTIVO') {
        const gs = `${inscActiva.seccion.grado.nombre} "${inscActiva.seccion.letra}"`;
        estadoBadge = `<span class="badge badge-green no-dot" title="Inscrito en año activo">${gs}</span>`;
      } else if (inscActiva && inscActiva.estado === 'RETIRADO') {
        estadoBadge = `<span class="badge badge-red no-dot" title="Retirado">Retirado</span>`;
      } else {
        estadoBadge = `<span class="badge badge-gray no-dot" title="No inscrito en año activo">Sin inscribir</span>`;
      }

      tr.innerHTML = `
        <td>
          <div class="flex-center gap-2">
            <span class="avatar-initials" style="background:${avatarColor};">${initials}</span>
            <strong>${nombre}</strong>
          </div>
        </td>
        <td>${e.codigo_escolar || '—'}</td>
        <td><span class="badge ${e.sexo === 'M' ? 'badge-lblue' : 'badge-orange'} no-dot">${sexoText}</span></td>
        <td>${fechaNac}</td>
        <td>${rep}</td>
        <td>${telRep}</td>
        <td>${estadoBadge}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-icon" onclick="editarEstudiante(${e.id})" title="Editar estudiante" aria-label="Editar">
              <img src="/icons/pencil.svg" alt="Editar">
            </button>
            <button class="btn-icon danger" onclick="eliminarEstudiante(${e.id})" title="Eliminar estudiante" aria-label="Eliminar">
              <img src="/icons/trash-2.svg" alt="Eliminar">
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    renderPaginacion(data.pagina, data.totalPaginas, data.total);
  } catch (error) {
    showAlert('alertEstudiantes', 'Error al cargar estudiantes', 'error');
  }
}

function renderPaginacion(pagina, totalPaginas, total) {
  const container = document.getElementById('paginacion');
  container.innerHTML = '';
  if (totalPaginas <= 1 && total > 0) {
    // Solo contador, sin botones
    renderResultsCount('resultsCount', pagina, 20, total);
    return;
  }
  if (totalPaginas <= 1) return;

  const btnPrev = document.createElement('button');
  btnPrev.innerHTML = `<img src="/icons/chevron-left.svg" class="pg-icon" alt="Anterior"> Anterior`;
  btnPrev.disabled = pagina <= 1;
  btnPrev.onclick = () => { paginaActual--; loadEstudiantes(); };

  container.appendChild(btnPrev);

  // Páginas numeradas (máx 5 visibles)
  const delta = 2;
  const range = [];
  for (let i = Math.max(1, pagina - delta); i <= Math.min(totalPaginas, pagina + delta); i++) range.push(i);
  if (range[0] > 1) { const e = document.createElement('button'); e.textContent = '1'; e.onclick = () => { paginaActual = 1; loadEstudiantes(); }; container.appendChild(e); if (range[0] > 2) { const d = document.createElement('span'); d.textContent = '…'; d.style.cssText = 'padding:0 4px;color:var(--text-muted);align-self:center;'; container.appendChild(d); } }
  range.forEach(n => { const b = document.createElement('button'); b.textContent = n; if (n === pagina) b.classList.add('active'); b.onclick = () => { paginaActual = n; loadEstudiantes(); }; container.appendChild(b); });
  if (range[range.length - 1] < totalPaginas) { if (range[range.length - 1] < totalPaginas - 1) { const d = document.createElement('span'); d.textContent = '…'; d.style.cssText = 'padding:0 4px;color:var(--text-muted);align-self:center;'; container.appendChild(d); } const e = document.createElement('button'); e.textContent = totalPaginas; e.onclick = () => { paginaActual = totalPaginas; loadEstudiantes(); }; container.appendChild(e); }

  const btnNext = document.createElement('button');
  btnNext.innerHTML = `Siguiente <img src="/icons/chevron-right.svg" class="pg-icon" alt="Siguiente">`;
  btnNext.disabled = pagina >= totalPaginas;
  btnNext.onclick = () => { paginaActual++; loadEstudiantes(); };

  container.appendChild(btnNext);
  renderResultsCount('resultsCount', pagina, 20, total);
}

// ==========================================
// BUSCAR PERSONA POR CÉDULA (inline)
// ==========================================
function limpiarCamposPersona(prefix) {
  document.getElementById(`${prefix}_apellidos`).value = '';
  document.getElementById(`${prefix}_nombres`).value = '';
  document.getElementById(`${prefix}_nacionalidad`).value = 'V';
  // Limpiar y ocultar campo de nacionalidad exacta
  const nacTexto = document.getElementById(`${prefix}_nacionalidad_texto`);
  if (nacTexto) nacTexto.value = '';
  document.getElementById(`${prefix}_nacionalidad`).dispatchEvent(new Event('change'));
  document.getElementById(`${prefix}_fecha_nacimiento`).value = '';
  document.getElementById(`${prefix}_profesion`).value = '';
  document.getElementById(`${prefix}_telefono`).value = '';
  if (document.getElementById(`${prefix}_estado_civil`)) {
    document.getElementById(`${prefix}_estado_civil`).value = '';
  }
  if (document.getElementById(`${prefix}_direccion`)) {
    document.getElementById(`${prefix}_direccion`).value = '';
  }
}

async function buscarPersona(tipo) {
  // tipo: 'madre', 'padre', 'rep'
  const prefix = tipo === 'madre' ? 'm' : tipo === 'padre' ? 'p' : 'r';
  const cedula = document.getElementById(`${prefix}_cedula`).value.trim();
  const statusDiv = document.getElementById(`${prefix}_status`);

  if (!cedula) {
    limpiarCamposPersona(prefix);
    statusDiv.innerHTML = '';
    return;
  }

  try {
    const res = await apiFetch(`/api/personas/buscar-cedula/${cedula}`);
    if (res && res.ok) {
      const persona = await res.json();
      // Autocompletar campos
      document.getElementById(`${prefix}_apellidos`).value = persona.apellidos;
      document.getElementById(`${prefix}_nombres`).value = persona.nombres;
      document.getElementById(`${prefix}_nacionalidad`).value = persona.nacionalidad;
      // Trigger nationality toggle para mostrar/ocultar campo extra
      document.getElementById(`${prefix}_nacionalidad`).dispatchEvent(new Event('change'));
      if (persona.fecha_nacimiento) {
        document.getElementById(`${prefix}_fecha_nacimiento`).value = persona.fecha_nacimiento.substring(0, 10);
      }
      document.getElementById(`${prefix}_profesion`).value = persona.profesion_oficio || '';
      document.getElementById(`${prefix}_telefono`).value = persona.telefono || '';
      if (document.getElementById(`${prefix}_estado_civil`)) {
        document.getElementById(`${prefix}_estado_civil`).value = persona.estado_civil || '';
      }
      if (document.getElementById(`${prefix}_direccion`)) {
        document.getElementById(`${prefix}_direccion`).value = persona.direccion || '';
      }

      statusDiv.innerHTML = `<div class="persona-found">✓ Persona encontrada: ${persona.apellidos}, ${persona.nombres}. Datos precargados.</div>`;
    } else {
      // No encontrada — limpiar campos para que los llenen
      limpiarCamposPersona(prefix);
      statusDiv.innerHTML = '<div class="persona-not-found">Persona no encontrada. Complete los datos para registrarla.</div>';
    }
  } catch (error) {
    limpiarCamposPersona(prefix);
    statusDiv.innerHTML = '<div class="persona-not-found">Error al buscar</div>';
  }
}

// ==========================================
// ABRIR PLANILLA (crear nuevo o editar)
// ==========================================
function abrirPlanilla(estudiante = null) {
  const modal = document.getElementById('modalPlanilla');
  const titulo = document.getElementById('planillaTitulo');
  const form = document.getElementById('formPlanilla');

  form.reset();
  document.getElementById('e_id').value = '';
  document.getElementById('seccionRepOtro').classList.remove('visible');
  document.querySelectorAll('[id$="_status"]').forEach(el => el.innerHTML = '');
  hideAlert('alertPlanilla');

  // Ocultar sección de datos variables por defecto
  const seccionDV = document.getElementById('seccionDatosVariables');
  if (seccionDV) seccionDV.style.display = 'none';

  if (estudiante) {
    titulo.textContent = '📋 Editar Estudiante';
    document.getElementById('e_id').value = estudiante.id;

    // Inicializar wizard en modo edición (6 pasos)
    initEstWizardForEdit();

    // Datos del estudiante
    document.getElementById('e_primer_apellido').value = estudiante.primer_apellido || '';
    document.getElementById('e_segundo_apellido').value = estudiante.segundo_apellido || '';
    document.getElementById('e_primer_nombre').value = estudiante.primer_nombre || '';
    document.getElementById('e_segundo_nombre').value = estudiante.segundo_nombre || '';
    document.getElementById('e_nacionalidad').value = estudiante.nacionalidad || 'V';
    document.getElementById('e_sexo').value = estudiante.sexo || 'M';
    if (estudiante.fecha_nacimiento) {
      document.getElementById('e_fecha_nacimiento').value = estudiante.fecha_nacimiento.substring(0, 10);
    }
    document.getElementById('e_codigo_escolar').value = estudiante.codigo_escolar || '';
    document.getElementById('e_lugar_nacimiento').value = estudiante.lugar_nacimiento || '';
    document.getElementById('e_estado_nacimiento').value = estudiante.estado_nacimiento || '';
    document.getElementById('e_lateralidad').value = estudiante.lateralidad || '';
    document.getElementById('e_tipo_sangre').value = estudiante.tipo_sangre || '';

    // Datos variables de la última inscripción
    if (estudiante.inscripciones && estudiante.inscripciones.length > 0) {
      const ultimaInsc = estudiante.inscripciones[0]; // Ya viene ordenada desc
      if (seccionDV) seccionDV.style.display = '';
      
      const gradoSeccion = ultimaInsc.seccion 
        ? `${ultimaInsc.seccion.grado?.nombre || ''} "${ultimaInsc.seccion.letra || ''}"` 
        : '';
      const anioNombre = ultimaInsc.anio_escolar?.nombre || '';
      document.getElementById('infoDatosVariables').innerHTML = 
        `📌 Datos de la inscripción: <strong>${gradoSeccion}</strong> — Año escolar: <strong>${anioNombre}</strong>`;
      
      document.getElementById('dv_inscripcion_id').value = ultimaInsc.id;
      document.getElementById('dv_direccion').value = ultimaInsc.direccion || '';
      document.getElementById('dv_correo').value = ultimaInsc.correo_electronico || '';
      document.getElementById('dv_talla').value = ultimaInsc.talla || '';
      document.getElementById('dv_peso').value = ultimaInsc.peso || '';
      document.getElementById('dv_talla_camisa').value = ultimaInsc.talla_camisa || '';
      document.getElementById('dv_talla_pantalon').value = ultimaInsc.talla_pantalon || '';
      document.getElementById('dv_talla_zapato').value = ultimaInsc.talla_zapato || '';

      // Precargar datos avanzados (UPE, procedencia, médica, social)
      precargarDatosInscripcion(estudiante, ultimaInsc);
    }

    // Datos de la madre
    if (estudiante.madre) {
      llenarPersona('m', estudiante.madre);
    }

    // Datos del padre
    if (estudiante.padre) {
      llenarPersona('p', estudiante.padre);
    }

    // Representante
    if (estudiante.representante) {
      if (estudiante.madre && estudiante.representante.id === estudiante.madre.id) {
        document.querySelector('input[name="representante_es"][value="MADRE"]').checked = true;
      } else if (estudiante.padre && estudiante.representante.id === estudiante.padre.id) {
        document.querySelector('input[name="representante_es"][value="PADRE"]').checked = true;
      } else {
        document.querySelector('input[name="representante_es"][value="OTRO"]').checked = true;
        document.getElementById('seccionRepOtro').classList.add('visible');
        llenarPersona('r', estudiante.representante);
      }
    }
  } else {
    titulo.textContent = '📋 Planilla de Registro de Estudiante';
    // Inicializar modo crear (3 paneles sin wizard)
    initEstWizardForCreate();
  }

  modal.classList.add('active');
}

function llenarPersona(prefix, persona) {
  document.getElementById(`${prefix}_cedula`).value = persona.cedula || '';
  document.getElementById(`${prefix}_apellidos`).value = persona.apellidos || '';
  document.getElementById(`${prefix}_nombres`).value = persona.nombres || '';
  document.getElementById(`${prefix}_nacionalidad`).value = persona.nacionalidad || 'V';
  if (persona.fecha_nacimiento) {
    document.getElementById(`${prefix}_fecha_nacimiento`).value = persona.fecha_nacimiento.substring(0, 10);
  }
  document.getElementById(`${prefix}_profesion`).value = persona.profesion_oficio || '';
  document.getElementById(`${prefix}_telefono`).value = persona.telefono || '';
  if (document.getElementById(`${prefix}_estado_civil`)) {
    document.getElementById(`${prefix}_estado_civil`).value = persona.estado_civil || '';
  }
  if (document.getElementById(`${prefix}_direccion`)) {
    document.getElementById(`${prefix}_direccion`).value = persona.direccion || '';
  }
}

function cerrarPlanilla() {
  document.getElementById('modalPlanilla').classList.remove('active');
}

// ==========================================
// EDITAR ESTUDIANTE
// ==========================================
async function editarEstudiante(id) {
  try {
    const res = await apiFetch(`/api/estudiantes/${id}`);
    if (!res) return;
    const estudiante = await res.json();
    abrirPlanilla(estudiante);
  } catch (error) {
    showAlert('alertEstudiantes', 'Error al cargar datos del estudiante', 'error');
  }
}

// ==========================================
// GUARDAR ESTUDIANTE (crear o actualizar)
// ==========================================
async function guardarEstudiante(e) {
  e.preventDefault();
  hideAlert('alertPlanilla');

  const id = document.getElementById('e_id').value;
  const representante_es = document.querySelector('input[name="representante_es"]:checked').value;

  // Validar mayoría de edad para adultos (el estudiante SÍ puede ser menor de edad)
  if (!esMayorDeEdad('m_fecha_nacimiento')) {
    showAlert('alertPlanilla', 'No se puede registrar: la madre debe ser mayor de edad (mínimo 18 años).', 'error');
    const campo = document.getElementById('m_fecha_nacimiento');
    campo.focus();
    campo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if (!esMayorDeEdad('p_fecha_nacimiento')) {
    showAlert('alertPlanilla', 'No se puede registrar: el padre debe ser mayor de edad (mínimo 18 años).', 'error');
    const campo = document.getElementById('p_fecha_nacimiento');
    campo.focus();
    campo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if (representante_es === 'OTRO' && !esMayorDeEdad('r_fecha_nacimiento')) {
    showAlert('alertPlanilla', 'No se puede registrar: el representante legal debe ser mayor de edad (mínimo 18 años).', 'error');
    const campo = document.getElementById('r_fecha_nacimiento');
    campo.focus();
    campo.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Construir el objeto completo
  const body = {
    estudiante: {
      primer_apellido: document.getElementById('e_primer_apellido').value.trim(),
      segundo_apellido: document.getElementById('e_segundo_apellido').value.trim() || null,
      primer_nombre: document.getElementById('e_primer_nombre').value.trim(),
      segundo_nombre: document.getElementById('e_segundo_nombre').value.trim() || null,
      nacionalidad: document.getElementById('e_nacionalidad').value,
      sexo: document.getElementById('e_sexo').value,
      fecha_nacimiento: document.getElementById('e_fecha_nacimiento').value,
      codigo_escolar: document.getElementById('e_codigo_escolar').value.trim() || null,
      lugar_nacimiento: document.getElementById('e_lugar_nacimiento').value.trim() || null,
      estado_nacimiento: document.getElementById('e_estado_nacimiento').value.trim() || null,
      lateralidad: document.getElementById('e_lateralidad').value || null,
      tipo_sangre: document.getElementById('e_tipo_sangre').value || null,
    },
    madre: {
      cedula: document.getElementById('m_cedula').value.trim(),
      apellidos: document.getElementById('m_apellidos').value.trim(),
      nombres: document.getElementById('m_nombres').value.trim(),
      nacionalidad: document.getElementById('m_nacionalidad').value,
      fecha_nacimiento: document.getElementById('m_fecha_nacimiento').value || null,
      profesion_oficio: document.getElementById('m_profesion').value.trim() || null,
      estado_civil: document.getElementById('m_estado_civil').value || null,
      telefono: document.getElementById('m_telefono').value.trim() || null,
      direccion: document.getElementById('m_direccion').value.trim() || null,
    },
    padre: {
      cedula: document.getElementById('p_cedula').value.trim(),
      apellidos: document.getElementById('p_apellidos').value.trim(),
      nombres: document.getElementById('p_nombres').value.trim(),
      nacionalidad: document.getElementById('p_nacionalidad').value,
      fecha_nacimiento: document.getElementById('p_fecha_nacimiento').value || null,
      profesion_oficio: document.getElementById('p_profesion').value.trim() || null,
      estado_civil: document.getElementById('p_estado_civil').value || null,
      telefono: document.getElementById('p_telefono').value.trim() || null,
      direccion: document.getElementById('p_direccion').value.trim() || null,
    },
    representante_es: representante_es,
  };

  // Si el representante es otra persona
  if (representante_es === 'OTRO') {
    body.representante = {
      cedula: document.getElementById('r_cedula').value.trim(),
      apellidos: document.getElementById('r_apellidos').value.trim(),
      nombres: document.getElementById('r_nombres').value.trim(),
      nacionalidad: document.getElementById('r_nacionalidad').value,
      fecha_nacimiento: document.getElementById('r_fecha_nacimiento').value || null,
      profesion_oficio: document.getElementById('r_profesion').value.trim() || null,
      telefono: document.getElementById('r_telefono').value.trim() || null,
      direccion: document.getElementById('r_direccion').value.trim() || null,
    };
  }

  // Datos variables de la inscripción (solo al editar)
  const dvInscId = document.getElementById('dv_inscripcion_id')?.value;
  if (id && dvInscId) {
    body.datos_variables = {
      inscripcion_id: parseInt(dvInscId),
      direccion: document.getElementById('dv_direccion').value.trim() || null,
      correo_electronico: document.getElementById('dv_correo').value.trim() || null,
      talla: document.getElementById('dv_talla').value.trim() || null,
      peso: document.getElementById('dv_peso').value.trim() || null,
      talla_camisa: document.getElementById('dv_talla_camisa').value.trim() || null,
      talla_pantalon: document.getElementById('dv_talla_pantalon').value.trim() || null,
      talla_zapato: document.getElementById('dv_talla_zapato').value.trim() || null,
      // Integración UPE
      integracion_upe: document.getElementById('dv_integracion_upe')?.checked || false,
      // Procedencia
      misma_institucion: document.getElementById('dv_misma_institucion')?.value === 'SI',
      institucion_procedencia: document.getElementById('dv_institucion_procedencia')?.value.trim() || null,
      motivo_retiro_procedencia: document.getElementById('dv_motivo_retiro_proc')?.value.trim() || null,
      // Socioeconómicos
      con_quien_vive: document.getElementById('dv_con_quien_vive')?.value || null,
      tiene_hermanos_institucion: document.getElementById('dv_tiene_hermanos')?.checked || false,
      cantidad_hermanos: parseInt(document.getElementById('dv_cantidad_hermanos')?.value) || null,
      tipo_vivienda: document.getElementById('dv_tipo_vivienda')?.value || null,
      condicion_infraestructura: document.getElementById('dv_condicion_infra')?.value || null,
      // Integración social
      integracion_pasivo: document.getElementById('dv_int_pasivo')?.checked || false,
      integracion_inquieto: document.getElementById('dv_int_inquieto')?.checked || false,
      integracion_tierno: document.getElementById('dv_int_tierno')?.checked || false,
      integracion_sensible: document.getElementById('dv_int_sensible')?.checked || false,
      habilidades: document.getElementById('dv_habilidades')?.value.trim() || null,
    };

    // Datos médicos (van en la tabla estudiantes, no inscripciones)
    body.datos_medicos = {
      vacunas_completas: document.getElementById('dv_vacunas_completas')?.value === 'true',
      vacunas_faltantes: document.getElementById('dv_vacunas_faltantes')?.value.trim() || null,
      alergico: document.getElementById('dv_alergico')?.value === 'true',
      alergico_detalle: document.getElementById('dv_alergico_detalle')?.value.trim() || null,
      tratamiento_medico: document.getElementById('dv_tratamiento')?.value === 'true',
      tratamiento_detalle: document.getElementById('dv_tratamiento_detalle')?.value.trim() || null,
      hospitalizado: document.getElementById('dv_hospitalizado')?.value === 'true',
      hospitalizado_detalle: document.getElementById('dv_hospitalizado_detalle')?.value.trim() || null,
      enfermedades_padecidas: document.getElementById('dv_enfermedades')?.value.trim() || null,
    };
  }

  try {
    const url = id ? `/api/estudiantes/${id}` : '/api/estudiantes';
    const method = id ? 'PUT' : 'POST';

    const res = await apiFetch(url, {
      method,
      body: JSON.stringify(body)
    });

    if (res && res.ok) {
      cerrarPlanilla();
      showAlert('alertEstudiantes', id ? 'Estudiante actualizado exitosamente' : 'Estudiante registrado exitosamente', 'success');
      loadEstudiantes();
    } else if (res) {
      const err = await res.json();
      showAlert('alertPlanilla', err.error || 'Error al guardar', 'error');
    }
  } catch (error) {
    showAlert('alertPlanilla', 'Error de conexión', 'error');
  }
}

// ==========================================
// ELIMINAR ESTUDIANTE
// ==========================================
async function eliminarEstudiante(id) {
  if (!confirm('¿Está seguro de eliminar este estudiante?')) return;
  try {
    const res = await apiFetch(`/api/estudiantes/${id}`, { method: 'DELETE' });
    if (res && res.ok) {
      showAlert('alertEstudiantes', 'Estudiante eliminado', 'success');
      loadEstudiantes();
    } else if (res) {
      const err = await res.json();
      showAlert('alertEstudiantes', err.error || 'Error al eliminar', 'error');
    }
  } catch (error) {
    showAlert('alertEstudiantes', 'Error de conexión', 'error');
  }
}


// ==========================================
// WIZARD DE EDICIÓN — Navegación
// ==========================================
let estWizardCurrentStep = 1;
let estWizardIsEditMode = false;
let estWizardMaxSteps = 3; // 3 para crear, 6 para editar

function estWizardGoTo(step) {
  if (step < 1 || step > estWizardMaxSteps) return;
  estWizardCurrentStep = step;
  showEstWizardPanel(step);
  updateEstWizardIndicators(step);
  scrollEstModalTop();
}

function estWizardNext(toStep) {
  estWizardGoTo(toStep);
}

function estWizardBack(toStep) {
  estWizardGoTo(toStep);
}

function showEstWizardPanel(step) {
  for (let i = 1; i <= 6; i++) {
    const panel = document.getElementById('estWizStep' + i);
    if (panel) {
      panel.classList.toggle('active', i === step);
    }
  }
}

function updateEstWizardIndicators(currentStep) {
  const bar = document.getElementById('estWizardBar');
  if (!bar) return;
  const indicators = bar.querySelectorAll('.est-wizard-step-indicator');
  const connectors = bar.querySelectorAll('.est-wizard-step-connector');

  indicators.forEach((ind, idx) => {
    const stepNum = idx + 1;
    ind.classList.remove('active', 'completed');
    if (stepNum === currentStep) {
      ind.classList.add('active');
    } else if (stepNum < currentStep) {
      ind.classList.add('completed');
    }
  });

  connectors.forEach((conn, idx) => {
    conn.classList.toggle('completed', idx + 1 < currentStep);
  });
}

function scrollEstModalTop() {
  const modal = document.getElementById('modalPlanilla');
  if (modal) modal.scrollTop = 0;
}

function initEstWizardForEdit() {
  estWizardIsEditMode = true;
  estWizardMaxSteps = 6;
  estWizardCurrentStep = 1;

  const bar = document.getElementById('estWizardBar');
  if (bar) bar.style.display = '';

  // Mostrar todos los indicadores
  const indicators = bar.querySelectorAll('.est-wizard-step-indicator');
  const connectors = bar.querySelectorAll('.est-wizard-step-connector');
  indicators.forEach(i => i.style.display = '');
  connectors.forEach(c => c.style.display = '');

  // Mostrar panel 1 y ocultar el resto
  showEstWizardPanel(1);
  updateEstWizardIndicators(1);

  // Mostrar secciones de datos avanzados
  const secDV = document.getElementById('seccionDatosVariables');
  const secProcedencia = document.getElementById('seccionProcedencia');
  const secMedica = document.getElementById('seccionMedica');
  if (secDV) secDV.style.display = '';
  if (secProcedencia) secProcedencia.style.display = '';
  if (secMedica) secMedica.style.display = '';

  // Ocultar el footer original y agregar navegación wizard
  const footer = document.querySelector('.modal-planilla-footer');
  if (footer) footer.style.display = 'none';

  addEstWizardNavButtons();
}

function initEstWizardForCreate() {
  estWizardIsEditMode = false;
  estWizardMaxSteps = 3;
  estWizardCurrentStep = 1;

  const bar = document.getElementById('estWizardBar');
  if (bar) bar.style.display = 'none';

  // En modo crear, mostramos todos los paneles (sin wizard)
  for (let i = 1; i <= 6; i++) {
    const panel = document.getElementById('estWizStep' + i);
    if (panel) {
      if (i <= 3) {
        panel.classList.add('active');
        panel.style.display = '';
      } else {
        panel.classList.remove('active');
        panel.style.display = 'none';
      }
    }
  }

  // Mostrar footer original
  const footer = document.querySelector('.modal-planilla-footer');
  if (footer) footer.style.display = '';

  // Ocultar secciones avanzadas
  const secDV = document.getElementById('seccionDatosVariables');
  const secProcedencia = document.getElementById('seccionProcedencia');
  const secMedica = document.getElementById('seccionMedica');
  if (secDV) secDV.style.display = 'none';
  if (secProcedencia) secProcedencia.style.display = 'none';
  if (secMedica) secMedica.style.display = 'none';

  removeEstWizardNavButtons();
}

function addEstWizardNavButtons() {
  removeEstWizardNavButtons(); // Limpiar previos

  const panels = [
    { id: 'estWizStep1', back: null, next: 2 },
    { id: 'estWizStep2', back: 1, next: 3 },
    { id: 'estWizStep3', back: 2, next: 4 },
    { id: 'estWizStep4', back: 3, next: 5 },
    { id: 'estWizStep5', back: 4, next: 6 },
    { id: 'estWizStep6', back: 5, next: null } // Último: botón guardar
  ];

  panels.forEach(p => {
    const panel = document.getElementById(p.id);
    if (!panel) return;

    const nav = document.createElement('div');
    nav.className = 'wizard-nav est-wizard-nav-dynamic';

    if (p.back !== null) {
      const btnBack = document.createElement('button');
      btnBack.type = 'button';
      btnBack.className = 'btn btn-secondary';
      btnBack.innerHTML = '&larr; Anterior';
      btnBack.onclick = () => estWizardBack(p.back);
      nav.appendChild(btnBack);
    }

    const spacer = document.createElement('div');
    spacer.className = 'wizard-nav-spacer';
    nav.appendChild(spacer);

    if (p.next !== null) {
      const btnNext = document.createElement('button');
      btnNext.type = 'button';
      btnNext.className = 'btn btn-primary';
      btnNext.innerHTML = 'Siguiente &rarr;';
      btnNext.onclick = () => estWizardNext(p.next);
      nav.appendChild(btnNext);
    } else {
      // Último paso: botón guardar
      const btnSave = document.createElement('button');
      btnSave.type = 'submit';
      btnSave.className = 'btn btn-primary';
      btnSave.innerHTML = '💾 Guardar Cambios';
      nav.appendChild(btnSave);
    }

    panel.appendChild(nav);
  });
}

function removeEstWizardNavButtons() {
  document.querySelectorAll('.est-wizard-nav-dynamic').forEach(n => n.remove());
}

// ==========================================
// PRECARGA DE DATOS AVANZADOS (editar)
// ==========================================
function precargarDatosInscripcion(estudiante, ultimaInsc) {
  if (!ultimaInsc) return;

  // Integración UPE
  const upeCheck = document.getElementById('dv_integracion_upe');
  if (upeCheck) upeCheck.checked = ultimaInsc.integracion_upe || false;

  // Procedencia
  const mismaInst = document.getElementById('dv_misma_institucion');
  if (mismaInst) mismaInst.value = ultimaInsc.misma_institucion === false ? 'NO' : 'SI';

  const instProc = document.getElementById('dv_institucion_procedencia');
  if (instProc) instProc.value = ultimaInsc.institucion_procedencia || '';

  const motivoRetiro = document.getElementById('dv_motivo_retiro_proc');
  if (motivoRetiro) motivoRetiro.value = ultimaInsc.motivo_retiro_procedencia || '';

  const conQuien = document.getElementById('dv_con_quien_vive');
  if (conQuien) conQuien.value = ultimaInsc.con_quien_vive || '';

  const tieneHermanos = document.getElementById('dv_tiene_hermanos');
  if (tieneHermanos) tieneHermanos.checked = ultimaInsc.tiene_hermanos_institucion || false;

  const cantHermanos = document.getElementById('dv_cantidad_hermanos');
  if (cantHermanos) cantHermanos.value = ultimaInsc.cantidad_hermanos || '';

  // Socioeconómicos
  const tipoViv = document.getElementById('dv_tipo_vivienda');
  if (tipoViv) tipoViv.value = ultimaInsc.tipo_vivienda || '';

  const condInfra = document.getElementById('dv_condicion_infra');
  if (condInfra) condInfra.value = ultimaInsc.condicion_infraestructura || '';

  // Médica (del estudiante)
  const vacCompl = document.getElementById('dv_vacunas_completas');
  if (vacCompl) vacCompl.value = estudiante.vacunas_completas === false ? 'false' : 'true';

  const vacFalt = document.getElementById('dv_vacunas_faltantes');
  if (vacFalt) vacFalt.value = estudiante.vacunas_faltantes || '';

  const alerg = document.getElementById('dv_alergico');
  if (alerg) alerg.value = estudiante.alergico ? 'true' : 'false';

  const alergDet = document.getElementById('dv_alergico_detalle');
  if (alergDet) alergDet.value = estudiante.alergico_detalle || '';

  const trat = document.getElementById('dv_tratamiento');
  if (trat) trat.value = estudiante.tratamiento_medico ? 'true' : 'false';

  const tratDet = document.getElementById('dv_tratamiento_detalle');
  if (tratDet) tratDet.value = estudiante.tratamiento_detalle || '';

  const hosp = document.getElementById('dv_hospitalizado');
  if (hosp) hosp.value = estudiante.hospitalizado ? 'true' : 'false';

  const hospDet = document.getElementById('dv_hospitalizado_detalle');
  if (hospDet) hospDet.value = estudiante.hospitalizado_detalle || '';

  const enf = document.getElementById('dv_enfermedades');
  if (enf) enf.value = estudiante.enfermedades_padecidas || '';

  // Integración social (de la inscripción)
  const intPasivo = document.getElementById('dv_int_pasivo');
  if (intPasivo) intPasivo.checked = ultimaInsc.integracion_pasivo || false;

  const intInquieto = document.getElementById('dv_int_inquieto');
  if (intInquieto) intInquieto.checked = ultimaInsc.integracion_inquieto || false;

  const intTierno = document.getElementById('dv_int_tierno');
  if (intTierno) intTierno.checked = ultimaInsc.integracion_tierno || false;

  const intSensible = document.getElementById('dv_int_sensible');
  if (intSensible) intSensible.checked = ultimaInsc.integracion_sensible || false;

  const habil = document.getElementById('dv_habilidades');
  if (habil) habil.value = ultimaInsc.habilidades || '';
}
