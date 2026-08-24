let paginaActual = 1;

document.addEventListener('DOMContentLoaded', async () => {
  await cargarDatosIniciales();
  loadInscripciones();
  document.getElementById('formInscripcion').addEventListener('submit', guardarInscripcion);

  // Fecha de hoy por defecto
  document.getElementById('insc_fecha').value = new Date().toISOString().substring(0, 10);

  // === BUSQUEDA EN TIEMPO REAL Y TECLA ENTER ===
  configurarBusquedaEnTiempoReal('insc_buscar_est', 3, buscarEstudianteInsc);
  configurarBusquedaEnTiempoReal('ni_m_cedula', 5, () => buscarPersonaInsc('madre'));
  configurarBusquedaEnTiempoReal('ni_p_cedula', 5, () => buscarPersonaInsc('padre'));
  configurarBusquedaEnTiempoReal('ni_r_cedula', 5, () => buscarPersonaInsc('rep'));
});

function configurarBusquedaEnTiempoReal(inputId, minLength, searchFn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  
  let debounceTimer;

  // Buscar al teclear (debounce de 500ms)
  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    if (input.value.trim().length === 0) {
      // Si se borra todo, ejecutar de inmediato para limpiar
      searchFn();
    } else if (input.value.trim().length >= minLength) {
      debounceTimer = setTimeout(() => {
        searchFn();
      }, 500);
    }
  });

  // Buscar al presionar Enter sin enviar el formulario general
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Evita que se haga un submit de formInscripcion
      clearTimeout(debounceTimer);
      if (input.value.trim().length > 0) {
        searchFn();
      }
    }
  });
}

// ==========================================
// CARGAR DATOS INICIALES (años, grados, profesores)
// ==========================================
async function cargarDatosIniciales() {
  try {
    const [aniosRes, gradosRes, profRes] = await Promise.all([
      apiFetch('/api/anios-escolares'),
      apiFetch('/api/grados'),
      apiFetch('/api/profesores'),
    ]);

    if (!aniosRes || !gradosRes || !profRes) return;

    const anios = await aniosRes.json();
    const grados = await gradosRes.json();
    const profesores = await profRes.json();

    // Llenar filtro de años
    const filtroAnio = document.getElementById('filtroAnio');
    const inscAnio = document.getElementById('insc_anio');
    filtroAnio.innerHTML = '';
    inscAnio.innerHTML = '';

    anios.forEach(a => {
      const opt1 = new Option(a.nombre + (a.activo ? ' (Activo)' : ''), a.id);
      const opt2 = new Option(a.nombre + (a.activo ? ' (Activo)' : ''), a.id);
      filtroAnio.appendChild(opt1);
      inscAnio.appendChild(opt2);
      if (a.activo) {
        opt1.selected = true;
        opt2.selected = true;
      }
    });

    // Llenar filtro de grados
    const filtroGrado = document.getElementById('filtroGrado');
    filtroGrado.innerHTML = '<option value="">Todos</option>';
    grados.forEach(g => {
      filtroGrado.appendChild(new Option(`${g.nombre} (${g.nivel})`, g.id));
    });



    // Cargar secciones iniciales
    await cargarSeccionesFiltro();
    await cargarSeccionesModal();

  } catch (error) {
    console.error('Error cargando datos iniciales:', error);
  }
}

async function cargarSeccionesFiltro() {
  const anioId = document.getElementById('filtroAnio').value;
  const gradoId = document.getElementById('filtroGrado').value;
  const filtroSeccion = document.getElementById('filtroSeccion');
  filtroSeccion.innerHTML = '<option value="">Todas</option>';

  if (!anioId) return;

  try {
    let url = `/api/secciones?anio_escolar_id=${anioId}`;
    if (gradoId) url += `&grado_id=${gradoId}`;
    const res = await apiFetch(url);
    if (!res) return;
    const secciones = await res.json();

    secciones.forEach(s => {
      const label = s.grado ? `${s.grado.nombre} "${s.letra}"` : s.letra;
      filtroSeccion.appendChild(new Option(label, s.id));
    });
  } catch (e) {}
}

async function cargarSeccionesModal() {
  const anioId = document.getElementById('insc_anio').value;
  const select = document.getElementById('insc_seccion');
  select.innerHTML = '<option value="">— Seleccionar —</option>';

  if (!anioId) return;

  try {
    const res = await apiFetch(`/api/secciones?anio_escolar_id=${anioId}`);
    if (!res) return;
    const secciones = await res.json();

    secciones.forEach(s => {
      const label = s.grado ? `${s.grado.nombre} "${s.letra}"` : s.letra;
      const opt = new Option(label, s.id);
      if (s.grado && s.grado.nombre.toLowerCase().includes('inicial')) {
        opt.dataset.nivel = 'inicial';
      } else {
        opt.dataset.nivel = 'primaria';
      }
      select.appendChild(opt);
    });
  } catch (e) {}
}

document.getElementById('insc_seccion').addEventListener('change', (e) => {
  const opt = e.target.options[e.target.selectedIndex];
  const seccionInicial = document.getElementById('seccion_solo_inicial');
  if (seccionInicial) {
    if (opt && opt.dataset.nivel === 'inicial') {
      seccionInicial.style.display = 'block';
    } else {
      seccionInicial.style.display = 'none';
    }
  }
});

// ==========================================
// TABLA DE INSCRIPCIONES
// ==========================================
async function loadInscripciones() {
  try {
    const anioId = document.getElementById('filtroAnio').value;
    const seccionId = document.getElementById('filtroSeccion').value;
    const gradoId = document.getElementById('filtroGrado').value;
    const estado = document.getElementById('filtroEstado').value;
    const buscar = document.getElementById('filtroBuscar').value.trim();

    let url = `/api/inscripciones?pagina=${paginaActual}&limite=20`;
    if (anioId) url += `&anio_escolar_id=${anioId}`;
    if (seccionId) url += `&seccion_id=${seccionId}`;
    if (gradoId) url += `&grado_id=${gradoId}`;
    if (estado) url += `&estado=${estado}`;
    if (buscar) url += `&buscar=${encodeURIComponent(buscar)}`;

    const res = await apiFetch(url);
    if (!res) return;
    const data = await res.json();

    const tbody = document.getElementById('tbodyInscripciones');
    tbody.innerHTML = '';

    if (data.datos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem;">No se encontraron inscripciones.</td></tr>';
      document.getElementById('paginacion').innerHTML = '';
      return;
    }

    data.datos.forEach((insc, i) => {
      const tr = document.createElement('tr');
      const est = insc.estudiante;
      const nombre = [est.primer_apellido, est.segundo_apellido, est.primer_nombre, est.segundo_nombre].filter(Boolean).join(' ');
      const gradoSec = insc.seccion && insc.seccion.grado
        ? `${insc.seccion.grado.nombre} "${insc.seccion.letra}"`
        : '—';
      const fecha = formatearFecha(insc.fecha_inscripcion);

      tr.innerHTML = `
        <td>${(paginaActual - 1) * 20 + i + 1}</td>
        <td><strong>${nombre}</strong></td>
        <td>${gradoSec}</td>
        <td><span class="badge-modalidad">${insc.modalidad}</span></td>
        <td>${fecha}</td>
        <td><span class="badge-estado badge-${insc.estado}">${insc.estado}</span></td>
        <td class="actions-cell">
          <button class="btn btn-sm" onclick="verInscripcion(${insc.id})">Ver</button>
          ${insc.estado === 'ACTIVO' ? `<button class="btn btn-sm btn-logout" onclick="retirarEstudiante(${insc.id})">Retirar</button>` : ''}
        </td>
      `;
      tbody.appendChild(tr);
    });

    renderPaginacion(data.pagina, data.totalPaginas, data.total);
  } catch (error) {
    showAlert('alertInscripciones', 'Error al cargar inscripciones', 'error');
  }
}

function renderPaginacion(pagina, totalPaginas, total) {
  const container = document.getElementById('paginacion');
  container.innerHTML = '';
  if (totalPaginas <= 1) return;

  const btnPrev = document.createElement('button');
  btnPrev.textContent = '← Anterior';
  btnPrev.disabled = pagina <= 1;
  btnPrev.onclick = () => { paginaActual--; loadInscripciones(); };

  const info = document.createElement('span');
  info.textContent = `Página ${pagina} de ${totalPaginas} (${total} inscripciones)`;

  const btnNext = document.createElement('button');
  btnNext.textContent = 'Siguiente →';
  btnNext.disabled = pagina >= totalPaginas;
  btnNext.onclick = () => { paginaActual++; loadInscripciones(); };

  container.appendChild(btnPrev);
  container.appendChild(info);
  container.appendChild(btnNext);
}

// ==========================================
// BUSCAR ESTUDIANTE PARA INSCRIBIR
// ==========================================
async function buscarEstudianteInsc() {
  const termino = document.getElementById('insc_buscar_est').value.trim();
  const container = document.getElementById('resultadoEstudiantes');
  
  if (!termino) {
    container.innerHTML = '';
    return;
  }

  try {
    const res = await apiFetch(`/api/estudiantes?buscar=${encodeURIComponent(termino)}&limite=10`);
    if (!res) return;
    const data = await res.json();

    const container = document.getElementById('resultadoEstudiantes');

    if (data.datos.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:var(--font-size-sm);">No se encontraron estudiantes. Regístrelo primero en la sección Estudiantes.</p>';
      return;
    }

    let html = '<table><thead><tr><th>Nombre</th><th>Código</th><th></th></tr></thead><tbody>';
    data.datos.forEach(e => {
      const nombre = [e.primer_apellido, e.segundo_apellido, e.primer_nombre, e.segundo_nombre].filter(Boolean).join(' ');
      html += `<tr onclick="seleccionarEstudiante(${e.id}, '${nombre.replace(/'/g, "\\'")}')">
        <td>${nombre}</td>
        <td>${e.codigo_escolar || '—'}</td>
        <td><button type="button" class="btn btn-sm btn-primary">Seleccionar</button></td>
      </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  } catch (error) {
    console.error('Error buscando estudiante:', error);
  }
}

function seleccionarEstudiante(id, nombre) {
  document.getElementById('insc_estudiante_id').value = id;
  document.getElementById('resultadoEstudiantes').innerHTML = '';
  const selected = document.getElementById('estudianteSeleccionado');
  selected.style.display = 'block';
  selected.textContent = `✓ Estudiante seleccionado: ${nombre}`;
}

// ==========================================
// MODAL
// ==========================================
function abrirModalInscripcion() {
  const modal = document.getElementById('modalInscripcion');
  document.getElementById('formInscripcion').reset();
  document.getElementById('insc_id').value = '';
  document.getElementById('insc_estudiante_id').value = '';
  document.getElementById('resultadoEstudiantes').innerHTML = '';
  document.getElementById('estudianteSeleccionado').style.display = 'none';
  document.getElementById('insc_fecha').value = new Date().toISOString().substring(0, 10);
  hideAlert('alertModal');

  document.getElementById('modalInscTitulo').textContent = '📝 Nueva Inscripción';
  
  if(document.getElementById('containerEstudiante').classList.contains('modo-registro-activo')) {
    volverBusquedaEstudiante();
  }
  
  modal.classList.add('active');
}

function cerrarModalInscripcion() {
  document.getElementById('modalInscripcion').classList.remove('active');
}

function mostrarFormNuevoEstudiante() {
  document.getElementById('containerEstudiante').classList.add('modo-registro-activo');
  document.getElementById('insc_estudiante_id').value = '';
  document.getElementById('estudianteSeleccionado').style.display = 'none';
  document.getElementById('resultadoEstudiantes').innerHTML = '';
}

function volverBusquedaEstudiante() {
  document.getElementById('containerEstudiante').classList.remove('modo-registro-activo');
}

// Mostrar/ocultar sección "Otra persona" para representante
document.querySelectorAll('input[name="ni_representante_es"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    const seccionOtro = document.getElementById('seccionRepOtro');
    if (e.target.value === 'OTRO') {
      seccionOtro.classList.add('visible');
    } else {
      seccionOtro.classList.remove('visible');
    }
  });
});

function limpiarCamposPersonaInsc(prefix) {
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

async function buscarPersonaInsc(tipo) {
  // tipo: 'madre', 'padre', 'rep'
  const prefix = tipo === 'madre' ? 'ni_m' : tipo === 'padre' ? 'ni_p' : 'ni_r';
  const cedula = document.getElementById(`${prefix}_cedula`).value.trim();
  const statusDiv = document.getElementById(`${prefix}_status`);

  if (!cedula) {
    limpiarCamposPersonaInsc(prefix);
    statusDiv.innerHTML = '';
    return;
  }

  try {
    const res = await apiFetch(`/api/personas/buscar-cedula/${cedula}`);
    if (res && res.ok) {
      const persona = await res.json();
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
      statusDiv.innerHTML = `<div class="persona-found">✓ Persona encontrada: ${persona.apellidos}, ${persona.nombres}.</div>`;
    } else {
      limpiarCamposPersonaInsc(prefix);
      statusDiv.innerHTML = '<div class="persona-not-found">No encontrada. Complete los datos.</div>';
    }
  } catch (error) {
    limpiarCamposPersonaInsc(prefix);
    statusDiv.innerHTML = '<div class="persona-not-found">Error al buscar</div>';
  }
}

async function guardarInscripcion(e) {
  e.preventDefault();
  hideAlert('alertModal');

  const esModoRegistro = document.getElementById('containerEstudiante').classList.contains('modo-registro-activo');
  let estudianteId = document.getElementById('insc_estudiante_id').value;

  if (esModoRegistro) {
    // === PASO 1: CREAR EL ESTUDIANTE PRIMERO ===
    const representante_es = document.querySelector('input[name="ni_representante_es"]:checked').value;

    const bodyEstudiante = {
      estudiante: {
        primer_apellido: document.getElementById('ni_e_primer_apellido').value.trim(),
        segundo_apellido: document.getElementById('ni_e_segundo_apellido').value.trim() || null,
        primer_nombre: document.getElementById('ni_e_primer_nombre').value.trim(),
        segundo_nombre: document.getElementById('ni_e_segundo_nombre').value.trim() || null,
        nacionalidad: document.getElementById('ni_e_nacionalidad').value,
        sexo: document.getElementById('ni_e_sexo').value,
        fecha_nacimiento: document.getElementById('ni_e_fecha_nacimiento').value,
        codigo_escolar: document.getElementById('ni_e_codigo_escolar').value.trim() || null,
        lugar_nacimiento: document.getElementById('ni_e_lugar_nacimiento').value.trim() || null,
        estado_nacimiento: document.getElementById('ni_e_estado_nacimiento').value.trim() || null,
        lateralidad: document.getElementById('ni_e_lateralidad').value || null,
        tipo_sangre: document.getElementById('ni_e_tipo_sangre').value || null
      },
      madre: {
        cedula: document.getElementById('ni_m_cedula').value.trim(),
        nacionalidad: document.getElementById('ni_m_nacionalidad').value,
        apellidos: document.getElementById('ni_m_apellidos').value.trim(),
        nombres: document.getElementById('ni_m_nombres').value.trim(),
        fecha_nacimiento: document.getElementById('ni_m_fecha_nacimiento').value || null,
        profesion_oficio: document.getElementById('ni_m_profesion').value.trim() || null,
        telefono: document.getElementById('ni_m_telefono').value.trim() || null,
        estado_civil: document.getElementById('ni_m_estado_civil').value || null,
        direccion: document.getElementById('ni_m_direccion').value.trim() || null
      },
      padre: {
        cedula: document.getElementById('ni_p_cedula').value.trim(),
        nacionalidad: document.getElementById('ni_p_nacionalidad').value,
        apellidos: document.getElementById('ni_p_apellidos').value.trim(),
        nombres: document.getElementById('ni_p_nombres').value.trim(),
        fecha_nacimiento: document.getElementById('ni_p_fecha_nacimiento').value || null,
        profesion_oficio: document.getElementById('ni_p_profesion').value.trim() || null,
        telefono: document.getElementById('ni_p_telefono').value.trim() || null,
        estado_civil: document.getElementById('ni_p_estado_civil').value || null,
        direccion: document.getElementById('ni_p_direccion').value.trim() || null
      },
      representante_es
    };

    if (representante_es === 'OTRO') {
      bodyEstudiante.representante = {
        cedula: document.getElementById('ni_r_cedula').value.trim(),
        nacionalidad: document.getElementById('ni_r_nacionalidad').value,
        apellidos: document.getElementById('ni_r_apellidos').value.trim(),
        nombres: document.getElementById('ni_r_nombres').value.trim(),
        fecha_nacimiento: document.getElementById('ni_r_fecha_nacimiento').value || null,
        profesion_oficio: document.getElementById('ni_r_profesion').value.trim() || null,
        telefono: document.getElementById('ni_r_telefono').value.trim() || null,
        direccion: document.getElementById('ni_r_direccion').value.trim() || null
        // Parentesco es un campo que podríamos guardar si estuviera en el schema de personas
      };
    }

    try {
      const resEst = await apiFetch('/api/estudiantes', {
        method: 'POST',
        body: JSON.stringify(bodyEstudiante)
      });

      if (!resEst || !resEst.ok) {
        const err = await resEst.json();
        showAlert('alertModal', err.error || 'Error al crear estudiante', 'error');
        return; // detener la inscripción si falla la creación del estudiante
      }

      const nuevoEst = await resEst.json();
      estudianteId = nuevoEst.id;

    } catch (error) {
      showAlert('alertModal', 'Error de conexión al crear estudiante', 'error');
      return;
    }
  }

  // === PASO 2: CREAR/ACTUALIZAR LA INSCRIPCIÓN ===
  if (!estudianteId) {
    showAlert('alertModal', 'Debe buscar o registrar un estudiante.', 'error');
    return;
  }

  const bodyInsc = {
    estudiante_id: parseInt(estudianteId),
    seccion_id: parseInt(document.getElementById('insc_seccion').value),
    anio_escolar_id: parseInt(document.getElementById('insc_anio').value),
    fecha_inscripcion: document.getElementById('insc_fecha').value,
    modalidad: document.getElementById('insc_modalidad').value,
    literal: document.getElementById('insc_literal').value || null,
    // Documentos
    doc_partida_nacimiento: document.getElementById('doc_partida').checked,
    doc_boleta_promocion: document.getElementById('doc_boleta').checked,
    doc_ci_madre: document.getElementById('doc_ci_madre').checked,
    doc_ci_padre: document.getElementById('doc_ci_padre').checked,
    doc_foto_estudiante: document.getElementById('doc_foto_est').checked,
    doc_foto_representante: document.getElementById('doc_foto_rep').checked,
    doc_carpeta_marron: document.getElementById('doc_carpeta').checked,
    doc_acta_compromiso: document.getElementById('doc_acta').checked,
    // Datos Variables (Sección 4)
    telefono: document.getElementById('insc_telefono')?.value.trim() || null,
    correo_electronico: document.getElementById('insc_correo_electronico')?.value.trim() || null,
    direccion: document.getElementById('insc_direccion')?.value.trim() || null,
    talla: document.getElementById('insc_talla')?.value.trim() || null,
    peso: document.getElementById('insc_peso')?.value.trim() || null,
    talla_camisa: document.getElementById('insc_talla_camisa')?.value.trim() || null,
    talla_pantalon: document.getElementById('insc_talla_pantalon')?.value.trim() || null,
    talla_zapato: document.getElementById('insc_talla_zapato')?.value.trim() || null,
    // Procedencia (Sección 5)
    misma_institucion: document.getElementById('insc_misma_institucion')?.value === 'true',
    institucion_procedencia: document.getElementById('insc_institucion_procedencia')?.value.trim() || null,
    motivo_retiro_procedencia: document.getElementById('insc_motivo_retiro_procedencia')?.value.trim() || null,
    con_quien_vive: document.getElementById('insc_con_quien_vive')?.value || null,
    tiene_hermanos_institucion: document.getElementById('insc_tiene_hermanos')?.value === 'true',
    cantidad_hermanos: document.getElementById('insc_cantidad_hermanos')?.value ? parseInt(document.getElementById('insc_cantidad_hermanos').value) : null,
    // Socioeconómico (Sección 6)
    tipo_vivienda: document.getElementById('insc_tipo_vivienda')?.value || null,
    condicion_infraestructura: document.getElementById('insc_condicion_infraestructura')?.value || null,
    // EXTRA MÉDICO Y SOCIAL
    medico: {
      tipo_parto: document.getElementById('insc_tipo_parto')?.value || null,
      meses_prematuro: document.getElementById('insc_meses_prematuro')?.value ? parseInt(document.getElementById('insc_meses_prematuro').value) : null,
      apreciacion_medico: document.getElementById('insc_apreciacion_medico')?.value || null,
      apreciacion_detalle: document.getElementById('insc_apreciacion_detalle')?.value.trim() || null,
      vacunas_completas: document.getElementById('insc_vacunas_completas')?.value === 'true',
      vacunas_faltantes: document.getElementById('insc_vacunas_faltantes')?.value.trim() || null,
      alergico: document.getElementById('insc_alergico')?.value === 'true',
      alergico_detalle: document.getElementById('insc_alergico_detalle')?.value.trim() || null,
      tratamiento: document.getElementById('insc_tratamiento')?.value === 'true',
      tratamiento_detalle: document.getElementById('insc_tratamiento_detalle')?.value.trim() || null,
      enfermedades: document.getElementById('insc_enfermedades')?.value.trim() || null,
    },
    social: {
      pasivo: document.getElementById('insc_int_pasivo')?.checked || false,
      inquieto: document.getElementById('insc_int_inquieto')?.checked || false,
      tierno: document.getElementById('insc_int_tierno')?.checked || false,
      sensible: document.getElementById('insc_int_sensible')?.checked || false,
      habilidades: document.getElementById('insc_habilidades')?.value.trim() || null,
    }
  };

  try {
    const id = document.getElementById('insc_id').value;
    const url = id ? `/api/inscripciones/${id}` : '/api/inscripciones';
    const method = id ? 'PUT' : 'POST';

    const res = await apiFetch(url, { method, body: JSON.stringify(bodyInsc) });

    if (res && res.ok) {
      cerrarModalInscripcion();
      showAlert('alertInscripciones', 'Inscripción registrada exitosamente', 'success');
      loadInscripciones();
    } else if (res) {
      const err = await res.json();
      showAlert('alertModal', err.error || 'Error al inscribir', 'error');
    }
  } catch (error) {
    showAlert('alertModal', 'Error de conexión', 'error');
  }
}

// ==========================================
// VER Y RETIRAR
// ==========================================
async function verInscripcion(id) {
  try {
    const res = await apiFetch(`/api/inscripciones/${id}`);
    if (!res) return;
    const insc = await res.json();

    const est = insc.estudiante;
    const nombre = [est.primer_apellido, est.segundo_apellido, est.primer_nombre, est.segundo_nombre].filter(Boolean).join(' ');
    const gradoSec = insc.seccion && insc.seccion.grado
      ? `${insc.seccion.grado.nombre} "${insc.seccion.letra}"`
      : '—';
    const rep = est.representante ? `${est.representante.apellidos}, ${est.representante.nombres} (${est.representante.cedula})` : '—';

    alert(
      `DATOS DE LA INSCRIPCIÓN\n\n` +
      `Estudiante: ${nombre}\n` +
      `Grado/Sección: ${gradoSec}\n` +
      `Año Escolar: ${insc.anio_escolar.nombre}\n` +
      `Modalidad: ${insc.modalidad}\n` +
      `Estado: ${insc.estado}\n` +
      `Fecha: ${formatearFecha(insc.fecha_inscripcion)}\n` +
      `Representante: ${rep}\n`
    );
  } catch (error) {
    showAlert('alertInscripciones', 'Error al ver inscripción', 'error');
  }
}

async function retirarEstudiante(id) {
  const motivo = prompt('Motivo del retiro (ej: Traslado a otra institución):');
  if (motivo === null) return;

  try {
    const res = await apiFetch(`/api/inscripciones/${id}/retirar`, {
      method: 'PUT',
      body: JSON.stringify({
        motivo_retiro_saliente: motivo,
        fecha_retiro: new Date().toISOString().substring(0, 10)
      })
    });
    if (res && res.ok) {
      showAlert('alertInscripciones', 'Estudiante retirado correctamente', 'success');
      loadInscripciones();
    } else if (res) {
      const err = await res.json();
      showAlert('alertInscripciones', err.error || 'Error al retirar', 'error');
    }
  } catch (error) {
    showAlert('alertInscripciones', 'Error de conexión', 'error');
  }
}
