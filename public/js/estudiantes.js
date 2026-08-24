let paginaActual = 1;
let busquedaActual = '';

document.addEventListener('DOMContentLoaded', () => {
  loadEstudiantes();
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
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;">No se encontraron estudiantes.</td></tr>';
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

      tr.innerHTML = `
        <td><strong>${nombre}</strong></td>
        <td><span class="badge-sexo ${sexoClass}">${sexoText}</span></td>
        <td>${fechaNac}</td>
        <td>${rep}</td>
        <td>${telRep}</td>
        <td class="actions-cell">
          <button class="btn btn-sm" onclick="editarEstudiante(${e.id})">Editar</button>
          <button class="btn btn-sm btn-logout" onclick="eliminarEstudiante(${e.id})">Eliminar</button>
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
  if (totalPaginas <= 1) return;

  const btnPrev = document.createElement('button');
  btnPrev.textContent = '← Anterior';
  btnPrev.disabled = pagina <= 1;
  btnPrev.onclick = () => { paginaActual--; loadEstudiantes(); };

  const info = document.createElement('span');
  info.textContent = `Página ${pagina} de ${totalPaginas} (${total} registros)`;

  const btnNext = document.createElement('button');
  btnNext.textContent = 'Siguiente →';
  btnNext.disabled = pagina >= totalPaginas;
  btnNext.onclick = () => { paginaActual++; loadEstudiantes(); };

  container.appendChild(btnPrev);
  container.appendChild(info);
  container.appendChild(btnNext);
}

// ==========================================
// BUSCAR PERSONA POR CÉDULA (inline)
// ==========================================
function limpiarCamposPersona(prefix) {
  document.getElementById(`${prefix}_apellidos`).value = '';
  document.getElementById(`${prefix}_nombres`).value = '';
  document.getElementById(`${prefix}_nacionalidad`).value = 'V';
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

  if (estudiante) {
    titulo.textContent = '📋 Editar Estudiante';
    document.getElementById('e_id').value = estudiante.id;

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

  const id = document.getElementById('e_id').value;
  const representante_es = document.querySelector('input[name="representante_es"]:checked').value;

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
