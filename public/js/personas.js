let paginaActual = 1;
let busquedaActual = '';
let busquedaEstudiante = '';
let searchTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
  loadPersonas();

  document.getElementById('formPersona').addEventListener('submit', guardarPersona);

  const inputBuscar = document.getElementById('inputBuscar');
  const inputBuscarEst = document.getElementById('inputBuscarEstudiante');
  
  // Buscar con Enter
  inputBuscar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') buscarPersonas();
  });

  // Busqueda en tiempo real (representante)
  inputBuscar.addEventListener('input', (e) => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      buscarPersonas();
    }, 500);
  });

  // Busqueda en tiempo real (por nombre estudiante)
  if (inputBuscarEst) {
    inputBuscarEst.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') buscarPersonas();
    });
    inputBuscarEst.addEventListener('input', (e) => {
      if (searchTimeout) clearTimeout(searchTimeout);
      const val = e.target.value.trim();
      if (val.length === 0 || val.length >= 3) {
        searchTimeout = setTimeout(() => {
          buscarPersonas();
        }, 500);
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
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:2rem;">No se encontraron personas.</td></tr>';
    }

    // Guardar datos para popup
    window._personasData = {};
    data.datos.forEach(p => {
      window._personasData[p.id] = p;
      const tr = document.createElement('tr');
      const cantEstudiantes = p._count?.estudiantes_como_representante || 0;
      let rolBadge = '—';
      if (cantEstudiantes > 0) {
        rolBadge = `<span style="background:hsl(145,50%,90%);color:hsl(145,60%,30%);padding:3px 10px;border-radius:12px;font-size:0.78rem;font-weight:600;cursor:pointer;" onclick="verEstudiantesRep(${p.id})">Representante (${cantEstudiantes})</span>`;
      }
      tr.innerHTML = `
        <td><span class="badge-nacionalidad">${p.nacionalidad}</span> ${p.cedula}</td>
        <td><strong>${p.apellidos}</strong>, ${p.nombres}</td>
        <td>${p.telefono || '—'}</td>
        <td>${p.profesion_oficio || '—'}</td>
        <td>${rolBadge}</td>
        <td class="actions-cell">
          <button class="btn btn-sm" onclick="editarPersona(${p.id})">Editar</button>
          <button class="btn btn-sm btn-logout" onclick="eliminarPersona(${p.id})">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Paginación
    renderPaginacion(data.pagina, data.totalPaginas, data.total);
  } catch (error) {
    showAlert('alertPersonas', 'Error al cargar personas', 'error');
  }
}

function renderPaginacion(pagina, totalPaginas, total) {
  const container = document.getElementById('paginacion');
  container.innerHTML = '';
  if (totalPaginas <= 1) return;

  const btnPrev = document.createElement('button');
  btnPrev.textContent = '← Anterior';
  btnPrev.disabled = pagina <= 1;
  btnPrev.onclick = () => { paginaActual--; loadPersonas(); };

  const info = document.createElement('span');
  info.textContent = `Página ${pagina} de ${totalPaginas} (${total} registros)`;

  const btnNext = document.createElement('button');
  btnNext.textContent = 'Siguiente →';
  btnNext.disabled = pagina >= totalPaginas;
  btnNext.onclick = () => { paginaActual++; loadPersonas(); };

  container.appendChild(btnPrev);
  container.appendChild(info);
  container.appendChild(btnNext);
}

// === MODAL ===
function abrirModal(persona = null) {
  const modal = document.getElementById('modalPersona');
  const titulo = document.getElementById('modalTitulo');
  const form = document.getElementById('formPersona');

  form.reset();
  document.getElementById('p_id').value = '';
  hideAlert('alertModal');

  if (persona) {
    titulo.textContent = 'Editar Persona';
    document.getElementById('p_id').value = persona.id;
    document.getElementById('p_nacionalidad').value = persona.nacionalidad;
    document.getElementById('p_cedula').value = persona.cedula;
    document.getElementById('p_apellidos').value = persona.apellidos;
    document.getElementById('p_nombres').value = persona.nombres;
    if (persona.fecha_nacimiento) {
      document.getElementById('p_fecha_nacimiento').value = persona.fecha_nacimiento.substring(0, 10);
    }
    document.getElementById('p_estado_civil').value = persona.estado_civil || '';
    document.getElementById('p_profesion').value = persona.profesion_oficio || '';
    document.getElementById('p_telefono').value = persona.telefono || '';
    document.getElementById('p_direccion').value = persona.direccion || '';
    document.getElementById('p_observaciones').value = persona.observaciones || '';
  } else {
    titulo.textContent = 'Nueva Persona';
  }

  modal.classList.add('active');
}

function cerrarModal() {
  document.getElementById('modalPersona').classList.remove('active');
}

async function editarPersona(id) {
  try {
    const res = await apiFetch(`/api/personas/${id}`);
    if (!res) return;
    const persona = await res.json();
    abrirModal(persona);
  } catch (error) {
    showAlert('alertPersonas', 'Error al cargar datos de la persona', 'error');
  }
}

async function guardarPersona(e) {
  e.preventDefault();

  const id = document.getElementById('p_id').value;
  const data = {
    nacionalidad: document.getElementById('p_nacionalidad').value,
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

  try {
    const url = id ? `/api/personas/${id}` : '/api/personas';
    const method = id ? 'PUT' : 'POST';

    const res = await apiFetch(url, {
      method,
      body: JSON.stringify(data)
    });

    if (res && res.ok) {
      cerrarModal();
      showAlert('alertPersonas', id ? 'Persona actualizada' : 'Persona registrada', 'success');
      loadPersonas();
    } else if (res) {
      const err = await res.json();
      showAlert('alertModal', err.error || 'Error al guardar', 'error');
    }
  } catch (error) {
    showAlert('alertModal', 'Error de conexión', 'error');
  }
}

async function eliminarPersona(id) {
  if (!confirm('¿Está seguro de eliminar esta persona?')) return;
  try {
    const res = await apiFetch(`/api/personas/${id}`, { method: 'DELETE' });
    if (res && res.ok) {
      showAlert('alertPersonas', 'Persona eliminada', 'success');
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
