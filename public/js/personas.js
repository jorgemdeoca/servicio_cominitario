let paginaActual = 1;
let busquedaActual = '';
let busquedaEstudiante = '';
let searchTimeout = null;

// Wizard state
let wizardMode = 'create'; // 'create' | 'edit'
let wizardCurrentStep = 1;
let wizardSelectedEstudiante = null;
let wizardSelectedParentesco = null;
let wizardFoundPersona = null; // persona found by cedula

document.addEventListener('DOMContentLoaded', () => {
  loadPersonas();

  // === Validaciones en tiempo real ===
  validarSoloLetras('p_nombres');
  validarSoloLetras('p_apellidos');
  validarSoloNumeros('p_cedula');
  validarSoloNumeros('p_telefono');
  // Edit mode validations
  validarSoloLetras('pe_nombres');
  validarSoloLetras('pe_apellidos');
  validarSoloNumeros('pe_cedula');
  validarSoloNumeros('pe_telefono');
  validarMayorDeEdad('p_fecha_nacimiento');
  validarMayorDeEdad('pe_fecha_nacimiento');

  configurarNacionalidadExacta('p_nacionalidad', 'grupoNacExactaPersona', 'p_nacionalidad_texto');
  configurarNacionalidadExacta('pe_nacionalidad', 'grupoNacExactaPersonaEdit', 'pe_nacionalidad_texto');

  document.getElementById('formPersona').addEventListener('submit', guardarPersona);

  const inputBuscar = document.getElementById('inputBuscar');
  const inputBuscarEst = document.getElementById('inputBuscarEstudiante');
  
  inputBuscar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') buscarPersonas();
  });
  inputBuscar.addEventListener('input', () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => buscarPersonas(), 500);
  });

  if (inputBuscarEst) {
    inputBuscarEst.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') buscarPersonas();
    });
    inputBuscarEst.addEventListener('input', (e) => {
      if (searchTimeout) clearTimeout(searchTimeout);
      const val = e.target.value.trim();
      if (val.length === 0 || val.length >= 3) {
        searchTimeout = setTimeout(() => buscarPersonas(), 500);
      }
    });
  }

  // Wizard: buscar estudiante en Step 1
  const npBuscar = document.getElementById('np_buscarEstudiante');
  if (npBuscar) {
    let npTimeout = null;
    npBuscar.addEventListener('input', (e) => {
      if (npTimeout) clearTimeout(npTimeout);
      const val = e.target.value.trim();
      if (val.length < 2) {
        document.getElementById('np_resultadosEstudiante').classList.remove('show');
        return;
      }
      npTimeout = setTimeout(() => buscarEstudianteWizard(val), 400);
    });
  }

  // Wizard: cedula verification in Step 3
  const npCedula = document.getElementById('p_cedula');
  if (npCedula) {
    let cedulaTimeout = null;
    npCedula.addEventListener('input', (e) => {
      if (cedulaTimeout) clearTimeout(cedulaTimeout);
      const val = e.target.value.trim();
      // Reset states
      document.getElementById('np_feedbackCedula').classList.remove('show');
      document.getElementById('btnStep3Next').style.display = 'none';
      document.getElementById('btnAsociarExistente').style.display = 'none';
      wizardFoundPersona = null;

      if (val.length >= 6) {
        cedulaTimeout = setTimeout(() => verificarCedulaWizard(val), 500);
      }
    });
  }
});

function buscarPersonas() {
  busquedaActual = document.getElementById('inputBuscar').value.trim();
  busquedaEstudiante = document.getElementById('inputBuscarEstudiante')?.value.trim() || '';
  paginaActual = 1;
  loadPersonas();
}

async function loadPersonas() {
  try {
    let url = `/api/personas?pagina=${paginaActual}&limite=15`;
    if (busquedaActual) url += `&buscar=${encodeURIComponent(busquedaActual)}`;
    if (busquedaEstudiante) url += `&buscar_estudiante=${encodeURIComponent(busquedaEstudiante)}`;

    const res = await apiFetch(url);
    if (!res) return;
    const data = await res.json();

    const tbody = document.getElementById('tbodyPersonas');
    tbody.innerHTML = '';

    if (data.datos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">
        <div class="empty-state">
          <img src="/icons/users.svg" alt="" class="empty-state-icon">
          <h3>No se encontraron representantes</h3>
          <p>Intenta con otro término de búsqueda o registra un nuevo representante.</p>
        </div>
      </td></tr>`;
    }

    window._personasData = {};
    data.datos.forEach(p => {
      window._personasData[p.id] = p;
      const tr = document.createElement('tr');
      const nombreCompleto = `${p.apellidos}, ${p.nombres}`;
      const initials = avatarInitials(nombreCompleto);
      const avatarColor = nameToColor(nombreCompleto);

      // Build role badges
      const roles = [];
      const cantMadre = p._count?.estudiantes_como_madre || (p.estudiantes_como_madre?.length) || 0;
      const cantPadre = p._count?.estudiantes_como_padre || (p.estudiantes_como_padre?.length) || 0;
      const cantRep = p._count?.estudiantes_como_representante || 0;

      if (cantMadre > 0) roles.push(`<span class="badge badge-pink" style="cursor:pointer;" onclick="verEstudiantesRep(${p.id})">Madre (${cantMadre})</span>`);
      if (cantPadre > 0) roles.push(`<span class="badge badge-blue" style="cursor:pointer;" onclick="verEstudiantesRep(${p.id})">Padre (${cantPadre})</span>`);
      if (cantRep > 0) roles.push(`<span class="badge badge-teal" style="cursor:pointer;" onclick="verEstudiantesRep(${p.id})">Representante (${cantRep})</span>`);

      const rolBadge = roles.length > 0 ? roles.join(' ') : '<span class="badge badge-gray no-dot">—</span>';

      tr.innerHTML = `
        <td><span class="badge badge-blue no-dot">${p.nacionalidad}</span> ${p.cedula}</td>
        <td>
          <div class="flex-center gap-2">
            <span class="avatar-initials" style="background:${avatarColor};">${initials}</span>
            <span><strong>${p.apellidos}</strong>, ${p.nombres}</span>
          </div>
        </td>
        <td>${p.telefono || '—'}</td>
        <td>${p.profesion_oficio || '—'}</td>
        <td>${rolBadge}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-icon" onclick="editarPersona(${p.id})" title="Editar representante" aria-label="Editar">
              <img src="/icons/pencil.svg" alt="Editar">
            </button>
            <button class="btn-icon danger" onclick="eliminarPersona(${p.id})" title="Eliminar representante" aria-label="Eliminar">
              <img src="/icons/trash-2.svg" alt="Eliminar">
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    renderPaginacion(data.pagina, data.totalPaginas, data.total);
  } catch (error) {
    showAlert('alertPersonas', 'Error al cargar representantes', 'error');
  }
}

function renderPaginacion(pagina, totalPaginas, total) {
  const container = document.getElementById('paginacion');
  container.innerHTML = '';
  if (totalPaginas <= 1 && total > 0) { renderResultsCount('resultsCount', pagina, 20, total); return; }
  if (totalPaginas <= 1) return;

  const btnPrev = document.createElement('button');
  btnPrev.innerHTML = `<img src="/icons/chevron-left.svg" class="pg-icon" alt="Anterior"> Anterior`;
  btnPrev.disabled = pagina <= 1;
  btnPrev.onclick = () => { paginaActual--; loadPersonas(); };
  container.appendChild(btnPrev);

  const delta = 2, range = [];
  for (let i = Math.max(1, pagina - delta); i <= Math.min(totalPaginas, pagina + delta); i++) range.push(i);
  if (range[0] > 1) { const e = document.createElement('button'); e.textContent = '1'; e.onclick = () => { paginaActual = 1; loadPersonas(); }; container.appendChild(e); if (range[0] > 2) { const d = document.createElement('span'); d.textContent = '…'; d.style.cssText = 'padding:0 4px;color:var(--text-muted);align-self:center;'; container.appendChild(d); } }
  range.forEach(n => { const b = document.createElement('button'); b.textContent = n; if (n === pagina) b.classList.add('active'); b.onclick = () => { paginaActual = n; loadPersonas(); }; container.appendChild(b); });
  if (range[range.length - 1] < totalPaginas) { if (range[range.length - 1] < totalPaginas - 1) { const d = document.createElement('span'); d.textContent = '…'; d.style.cssText = 'padding:0 4px;color:var(--text-muted);align-self:center;'; container.appendChild(d); } const e = document.createElement('button'); e.textContent = totalPaginas; e.onclick = () => { paginaActual = totalPaginas; loadPersonas(); }; container.appendChild(e); }

  const btnNext = document.createElement('button');
  btnNext.innerHTML = `Siguiente <img src="/icons/chevron-right.svg" class="pg-icon" alt="Siguiente">`;
  btnNext.disabled = pagina >= totalPaginas;
  btnNext.onclick = () => { paginaActual++; loadPersonas(); };
  container.appendChild(btnNext);
  renderResultsCount('resultsCount', pagina, 20, total);
}

// =============================================
// WIZARD: Open modal
// =============================================
function abrirModal(persona = null) {
  const modal = document.getElementById('modalPersona');
  const titulo = document.getElementById('modalTitulo');
  const form = document.getElementById('formPersona');

  form.reset();
  document.getElementById('p_id').value = '';
  document.getElementById('p_estudiante_id').value = '';
  document.getElementById('p_parentesco').value = '';
  hideAlert('alertModal');

  // Reset wizard state
  wizardSelectedEstudiante = null;
  wizardSelectedParentesco = null;
  wizardFoundPersona = null;

  if (persona) {
    // EDIT MODE: direct form, no wizard steps
    wizardMode = 'edit';
    titulo.textContent = 'Editar Representante';
    document.getElementById('wizardStepsBar').style.display = 'none';
    document.getElementById('p_id').value = persona.id;

    // Fill edit fields
    document.getElementById('pe_nacionalidad').value = persona.nacionalidad;
    if (persona.nacionalidad_texto) {
      document.getElementById('pe_nacionalidad_texto').value = persona.nacionalidad_texto;
    }
    document.getElementById('pe_nacionalidad').dispatchEvent(new Event('change'));
    document.getElementById('pe_cedula').value = persona.cedula;
    document.getElementById('pe_apellidos').value = persona.apellidos;
    document.getElementById('pe_nombres').value = persona.nombres;
    if (persona.fecha_nacimiento) {
      document.getElementById('pe_fecha_nacimiento').value = persona.fecha_nacimiento.substring(0, 10);
    }
    document.getElementById('pe_estado_civil').value = persona.estado_civil || '';
    document.getElementById('pe_profesion').value = persona.profesion_oficio || '';
    document.getElementById('pe_telefono').value = persona.telefono || '';
    document.getElementById('pe_direccion').value = persona.direccion || '';
    document.getElementById('pe_observaciones').value = persona.observaciones || '';

    showWizardPanel('wizStepEdit');
  } else {
    // CREATE MODE: wizard steps
    wizardMode = 'create';
    titulo.textContent = 'Nuevo Representante';
    document.getElementById('wizardStepsBar').style.display = 'flex';
    wizardCurrentStep = 1;
    updateWizardIndicators(1);
    showWizardPanel('wizStep1');

    // Reset step 1
    document.getElementById('np_buscarEstudiante').value = '';
    document.getElementById('np_resultadosEstudiante').classList.remove('show');
    document.getElementById('np_estudianteSeleccionado').classList.remove('show');
    document.getElementById('btnStep1Next').disabled = true;

    // Reset step 2
    document.querySelectorAll('.parentesco-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('np_avisoOcupado').classList.remove('show');
    document.getElementById('btnStep2Next').disabled = true;

    // Reset step 3
    document.getElementById('np_feedbackCedula').classList.remove('show');
    document.getElementById('btnStep3Next').style.display = 'none';
    document.getElementById('btnAsociarExistente').style.display = 'none';
  }

  modal.classList.add('active');
}

function cerrarModal() {
  document.getElementById('modalPersona').classList.remove('active');
}

function showWizardPanel(panelId) {
  document.querySelectorAll('.wizard-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(panelId).classList.add('active');
}

function updateWizardIndicators(activeStep) {
  document.querySelectorAll('.wizard-step-indicator').forEach(ind => {
    const step = parseInt(ind.getAttribute('data-step'));
    ind.classList.remove('active', 'done');
    if (step === activeStep) ind.classList.add('active');
    else if (step < activeStep) ind.classList.add('done');
  });
}

function wizardNext(step) {
  wizardCurrentStep = step;
  updateWizardIndicators(step);
  showWizardPanel('wizStep' + step);

  // Focus first input on step
  if (step === 3) {
    setTimeout(() => document.getElementById('p_cedula').focus(), 200);
  }
}

function wizardBack(step) {
  wizardCurrentStep = step;
  updateWizardIndicators(step);
  showWizardPanel('wizStep' + step);
}

// =============================================
// STEP 1: Buscar Estudiante
// =============================================
async function buscarEstudianteWizard(query) {
  try {
    const res = await apiFetch(`/api/estudiantes/buscar-simple?q=${encodeURIComponent(query)}`);
    if (!res) return;
    const estudiantes = await res.json();

    const container = document.getElementById('np_resultadosEstudiante');
    container.innerHTML = '';

    if (estudiantes.length === 0) {
      container.innerHTML = '<div class="np-result-item"><span style="color:var(--text-muted);">No se encontraron estudiantes</span></div>';
      container.classList.add('show');
      return;
    }

    estudiantes.forEach(est => {
      const nombre = [est.primer_apellido, est.segundo_apellido, est.primer_nombre, est.segundo_nombre].filter(Boolean).join(' ');
      const insc = est.inscripciones && est.inscripciones[0];
      let gradoInfo = 'Sin inscribir';
      if (insc && insc.seccion && insc.seccion.grado) {
        gradoInfo = `${insc.seccion.grado.nombre} "${insc.seccion.letra}" — ${insc.anio_escolar.nombre}`;
      }

      const item = document.createElement('div');
      item.className = 'np-result-item';
      item.innerHTML = `
        <div class="est-name">${nombre}</div>
        <div class="est-detail">${est.codigo_escolar ? `Código: ${est.codigo_escolar} · ` : ''}${gradoInfo}</div>
      `;
      item.onclick = () => seleccionarEstudiante(est);
      container.appendChild(item);
    });

    container.classList.add('show');
  } catch (error) {
    console.error('Error buscando estudiante:', error);
  }
}

function seleccionarEstudiante(est) {
  wizardSelectedEstudiante = est;
  document.getElementById('p_estudiante_id').value = est.id;

  // Hide results
  document.getElementById('np_resultadosEstudiante').classList.remove('show');

  // Show selected card
  const nombre = [est.primer_apellido, est.segundo_apellido, est.primer_nombre, est.segundo_nombre].filter(Boolean).join(' ');
  document.getElementById('np_estNombre').textContent = nombre;

  const insc = est.inscripciones && est.inscripciones[0];
  let gradoInfo = 'Sin inscripción activa';
  if (insc && insc.seccion && insc.seccion.grado) {
    gradoInfo = `${insc.seccion.grado.nombre} "${insc.seccion.letra}" — ${insc.anio_escolar.nombre}`;
  }
  document.getElementById('np_estInfo').textContent = (est.codigo_escolar ? `Código: ${est.codigo_escolar} · ` : '') + gradoInfo;

  // Family slots
  document.getElementById('np_slotMadre').innerHTML = est.madre
    ? `${est.madre.apellidos}, ${est.madre.nombres}<br><small style="color:var(--text-muted);">${est.madre.cedula}</small>`
    : '<span class="slot-empty">Disponible</span>';
  document.getElementById('np_slotPadre').innerHTML = est.padre
    ? `${est.padre.apellidos}, ${est.padre.nombres}<br><small style="color:var(--text-muted);">${est.padre.cedula}</small>`
    : '<span class="slot-empty">Disponible</span>';
  document.getElementById('np_slotRepresentante').innerHTML = est.representante
    ? `${est.representante.apellidos}, ${est.representante.nombres}<br><small style="color:var(--text-muted);">${est.representante.cedula}</small>`
    : '<span class="slot-empty">Disponible</span>';

  document.getElementById('np_estudianteSeleccionado').classList.add('show');
  document.getElementById('btnStep1Next').disabled = false;

  // Update search input
  document.getElementById('np_buscarEstudiante').value = nombre;
}

// =============================================
// STEP 2: Seleccionar Parentesco
// =============================================
function seleccionarParentesco(tipo, btn) {
  // Visual selection
  document.querySelectorAll('.parentesco-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  wizardSelectedParentesco = tipo;
  document.getElementById('p_parentesco').value = tipo;

  // Check if student already has someone for this parentesco
  const est = wizardSelectedEstudiante;
  const aviso = document.getElementById('np_avisoOcupado');

  let ocupado = false;
  let personaActual = null;

  if (tipo === 'madre' && est.madre) {
    ocupado = true;
    personaActual = est.madre;
  } else if (tipo === 'padre' && est.padre) {
    ocupado = true;
    personaActual = est.padre;
  } else if (tipo === 'representante' && est.representante) {
    ocupado = true;
    personaActual = est.representante;
  }

  if (ocupado && personaActual) {
    const tipoLabel = tipo === 'madre' ? 'una Madre' : tipo === 'padre' ? 'un Padre' : 'un Representante Legal';
    aviso.innerHTML = `⚠️ Este estudiante ya tiene <strong>${tipoLabel}</strong> registrado/a: <strong>${personaActual.apellidos}, ${personaActual.nombres}</strong> (${personaActual.cedula}).<br><br>Si continúa, el registro anterior será <strong>reemplazado</strong>. También puede editarlo directamente desde la tabla de representantes.`;
    aviso.classList.add('show');
  } else {
    aviso.classList.remove('show');
  }

  document.getElementById('btnStep2Next').disabled = false;
}

// =============================================
// STEP 3: Verificar Cédula
// =============================================
async function verificarCedulaWizard(cedula) {
  try {
    const res = await apiFetch(`/api/personas/buscar-cedula/${encodeURIComponent(cedula)}`);
    if (!res) return;
    const persona = await res.json();

    const feedback = document.getElementById('np_feedbackCedula');
    const btnNext = document.getElementById('btnStep3Next');
    const btnAsociar = document.getElementById('btnAsociarExistente');

    if (persona) {
      // Persona found
      wizardFoundPersona = persona;
      const estNombre = [wizardSelectedEstudiante.primer_nombre, wizardSelectedEstudiante.primer_apellido].filter(Boolean).join(' ');
      const tipoLabel = wizardSelectedParentesco === 'madre' ? 'Madre' : wizardSelectedParentesco === 'padre' ? 'Padre' : 'Representante Legal';

      feedback.className = 'np-cedula-feedback show found';
      feedback.innerHTML = `
        <strong>Persona encontrada:</strong> <span class="fb-name">${persona.apellidos}, ${persona.nombres}</span> (${persona.nacionalidad}-${persona.cedula})<br>
        <small style="color:var(--text-muted);">Teléfono: ${persona.telefono || '—'} · Profesión: ${persona.profesion_oficio || '—'}</small><br><br>
        ¿Desea asociar a esta persona como <strong>${tipoLabel}</strong> del estudiante <strong>${estNombre}</strong>?
      `;
      btnAsociar.style.display = 'inline-flex';
      btnNext.style.display = 'none';
    } else {
      // Not found
      wizardFoundPersona = null;
      feedback.className = 'np-cedula-feedback show not-found';
      feedback.innerHTML = `✅ Cédula disponible. Complete los datos del nuevo representante.`;
      btnNext.style.display = 'inline-flex';
      btnAsociar.style.display = 'none';
    }
  } catch (error) {
    console.error('Error verificando cédula:', error);
  }
}

// =============================================
// Associate existing persona
// =============================================
async function asociarPersonaExistente() {
  if (!wizardFoundPersona || !wizardSelectedEstudiante || !wizardSelectedParentesco) return;

  const estNombre = [wizardSelectedEstudiante.primer_nombre, wizardSelectedEstudiante.primer_apellido].filter(Boolean).join(' ');
  const tipoLabel = wizardSelectedParentesco === 'madre' ? 'Madre' : wizardSelectedParentesco === 'padre' ? 'Padre' : 'Representante Legal';

  if (!confirm(`¿Está seguro de asociar a "${wizardFoundPersona.apellidos}, ${wizardFoundPersona.nombres}" como ${tipoLabel} del estudiante "${estNombre}"?`)) {
    return;
  }

  try {
    const res = await apiFetch('/api/personas/asociar', {
      method: 'POST',
      body: JSON.stringify({
        persona_id: wizardFoundPersona.id,
        estudiante_id: wizardSelectedEstudiante.id,
        parentesco: wizardSelectedParentesco
      })
    });

    if (res && res.ok) {
      cerrarModal();
      showAlert('alertPersonas', `Representante asociado exitosamente como ${tipoLabel}.`, 'success');
      loadPersonas();
    } else if (res) {
      const err = await res.json();
      showAlert('alertModal', err.error || 'Error al asociar', 'error');
    }
  } catch (error) {
    showAlert('alertModal', 'Error de conexión', 'error');
  }
}

// =============================================
// EDIT
// =============================================
async function editarPersona(id) {
  try {
    const res = await apiFetch(`/api/personas/${id}`);
    if (!res) return;
    const persona = await res.json();
    abrirModal(persona);
  } catch (error) {
    showAlert('alertPersonas', 'Error al cargar datos del representante', 'error');
  }
}

// =============================================
// SAVE
// =============================================
async function guardarPersona(e) {
  e.preventDefault();

  if (wizardMode === 'edit') {
    // Edit mode: use pe_ fields
    if (!esMayorDeEdad('pe_fecha_nacimiento')) {
      showAlert('alertModal', 'No se puede registrar: la persona debe ser mayor de edad (mínimo 18 años).', 'error');
      document.getElementById('pe_fecha_nacimiento').focus();
      return;
    }

    const id = document.getElementById('p_id').value;
    // Validar campos obligatorios manualmente (no tienen required HTML para evitar conflicto con paneles ocultos)
    const cedula = document.getElementById('pe_cedula').value.trim();
    const apellidos = document.getElementById('pe_apellidos').value.trim();
    const nombres = document.getElementById('pe_nombres').value.trim();
    if (!cedula || !apellidos || !nombres) {
      showAlert('alertModal', 'Cédula, apellidos y nombres son obligatorios.', 'error');
      return;
    }

    const data = {
      nacionalidad: document.getElementById('pe_nacionalidad').value,
      nacionalidad_texto: document.getElementById('pe_nacionalidad').value === 'V' ? null : (document.getElementById('pe_nacionalidad_texto').value.trim() || null),
      cedula: document.getElementById('pe_cedula').value.trim(),
      apellidos: document.getElementById('pe_apellidos').value.trim(),
      nombres: document.getElementById('pe_nombres').value.trim(),
      fecha_nacimiento: document.getElementById('pe_fecha_nacimiento').value || null,
      estado_civil: document.getElementById('pe_estado_civil').value || null,
      profesion_oficio: document.getElementById('pe_profesion').value.trim() || null,
      telefono: document.getElementById('pe_telefono').value.trim() || null,
      direccion: document.getElementById('pe_direccion').value.trim() || null,
      observaciones: document.getElementById('pe_observaciones').value.trim() || null,
    };

    try {
      const res = await apiFetch(`/api/personas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });

      if (res && res.ok) {
        cerrarModal();
        showAlert('alertPersonas', 'Representante actualizado', 'success');
        loadPersonas();
      } else if (res) {
        const err = await res.json();
        showAlert('alertModal', err.error || 'Error al guardar', 'error');
      }
    } catch (error) {
      showAlert('alertModal', 'Error de conexión', 'error');
    }
  } else {
    // Create mode: use p_ fields + association
    if (!esMayorDeEdad('p_fecha_nacimiento')) {
      showAlert('alertModal', 'No se puede registrar: la persona debe ser mayor de edad (mínimo 18 años).', 'error');
      document.getElementById('p_fecha_nacimiento').focus();
      return;
    }

    const data = {
      nacionalidad: document.getElementById('p_nacionalidad').value,
      nacionalidad_texto: document.getElementById('p_nacionalidad').value === 'V' ? null : (document.getElementById('p_nacionalidad_texto').value.trim() || null),
      cedula: document.getElementById('p_cedula').value.trim(),
      apellidos: document.getElementById('p_apellidos').value.trim(),
      nombres: document.getElementById('p_nombres').value.trim(),
      fecha_nacimiento: document.getElementById('p_fecha_nacimiento').value || null,
      estado_civil: document.getElementById('p_estado_civil').value || null,
      profesion_oficio: document.getElementById('p_profesion').value.trim() || null,
      telefono: document.getElementById('p_telefono').value.trim() || null,
      direccion: document.getElementById('p_direccion').value.trim() || null,
      observaciones: document.getElementById('p_observaciones').value.trim() || null,
    };

    // Add association if wizard was used
    if (wizardSelectedEstudiante && wizardSelectedParentesco) {
      data.estudiante_id = wizardSelectedEstudiante.id;
      data.parentesco = wizardSelectedParentesco;
    }

    try {
      const res = await apiFetch('/api/personas', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      if (res && res.ok) {
        cerrarModal();
        const tipoLabel = wizardSelectedParentesco === 'madre' ? 'Madre' : wizardSelectedParentesco === 'padre' ? 'Padre' : 'Representante';
        showAlert('alertPersonas', `Representante registrado y asociado como ${tipoLabel}`, 'success');
        loadPersonas();
      } else if (res) {
        const err = await res.json();
        showAlert('alertModal', err.error || 'Error al guardar', 'error');
      }
    } catch (error) {
      showAlert('alertModal', 'Error de conexión', 'error');
    }
  }
}

async function eliminarPersona(id) {
  if (!confirm('¿Está seguro de eliminar este representante?')) return;
  try {
    const res = await apiFetch(`/api/personas/${id}`, { method: 'DELETE' });
    if (res && res.ok) {
      showAlert('alertPersonas', 'Representante eliminado', 'success');
      loadPersonas();
    } else if (res) {
      const err = await res.json();
      showAlert('alertPersonas', err.error || 'Error al eliminar', 'error');
    }
  } catch (error) {
    showAlert('alertPersonas', 'Error de conexión', 'error');
  }
}

// Ver estudiantes representados por una persona
function verEstudiantesRep(personaId) {
  const persona = window._personasData[personaId];
  if (!persona || !persona.estudiantes_como_representante) return;

  const estudiantes = persona.estudiantes_como_representante;
  let html = '<table style="width:100%;"><thead><tr><th>Estudiante</th><th>Grado/Sección</th></tr></thead><tbody>';

  estudiantes.forEach(est => {
    const nombre = [est.primer_apellido, est.segundo_apellido, est.primer_nombre, est.segundo_nombre].filter(Boolean).join(' ');
    const insc = est.inscripciones && est.inscripciones[0];
    let gradoSeccion = '<span style="color:hsl(210,60%,38%);">Sin inscribir</span>';
    if (insc && insc.seccion && insc.seccion.grado) {
      gradoSeccion = `${insc.seccion.grado.nombre} "${insc.seccion.letra}"`;
    }
    html += `<tr><td><strong>${nombre}</strong></td><td>${gradoSeccion}</td></tr>`;
  });

  html += '</tbody></table>';
  if (estudiantes.length === 0) {
    html = '<p style="text-align:center;color:var(--text-muted);">No tiene estudiantes registrados.</p>';
  }

  document.getElementById('listaEstudiantesRep').innerHTML = html;
  document.getElementById('modalEstudiantesRep').style.display = 'flex';
}
