let busquedaActual = '';
let searchTimeout = null;

document.addEventListener('DOMContentLoaded', () => {
  loadProfesores();

  document.getElementById('formProfesor').addEventListener('submit', guardarProfesor);

  const inputBuscar = document.getElementById('inputBuscar');
  
  if (inputBuscar) {
    inputBuscar.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') buscarProfesores();
    });

    inputBuscar.addEventListener('input', (e) => {
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        buscarProfesores();
      }, 500);
    });
  }
});

function buscarProfesores() {
  busquedaActual = document.getElementById('inputBuscar').value.trim();
  loadProfesores();
}

async function loadProfesores() {
  try {
    let url = '/api/profesores?solo_activos=false';
    if (busquedaActual) url += `&buscar=${encodeURIComponent(busquedaActual)}`;

    const res = await apiFetch(url);
    if (!res) return;
    const data = await res.json();

    const tbody = document.getElementById('tbodyProfesores');
    tbody.innerHTML = '';

    if (data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7">
        <div class="empty-state">
          <img src="/icons/user-check.svg" alt="" class="empty-state-icon">
          <h3>No se encontraron profesores</h3>
          <p>No hay profesores registrados o ninguno coincide con el filtro actual.</p>
        </div>
      </td></tr>`;
      return;
    }

    data.forEach(p => {
      const tr = document.createElement('tr');
      const nombreCompleto = `${p.apellidos}, ${p.nombres}`;
      const initials = avatarInitials(nombreCompleto);
      const avatarColor = nameToColor(nombreCompleto);

      const activoBadge = p.activo
        ? '<span class="badge badge-green no-dot">Activo</span>'
        : '<span class="badge badge-red no-dot">Inactivo</span>';

      let sexoBadge = '<span class="badge badge-gray no-dot">—</span>';
      if (p.sexo === 'M') sexoBadge = '<span class="badge badge-lblue no-dot">M</span>';
      if (p.sexo === 'F') sexoBadge = '<span class="badge badge-orange no-dot">F</span>';

      tr.innerHTML = `
        <td>${p.nacionalidad}-${p.cedula}</td>
        <td>
          <div class="flex-center gap-2">
            <span class="avatar-initials" style="background:${avatarColor};">${initials}</span>
            <span><strong>${p.apellidos}</strong>, ${p.nombres}</span>
          </div>
        </td>
        <td>${sexoBadge}</td>
        <td>${p.telefono || '—'}</td>
        <td>${p.email || '—'}</td>
        <td>${activoBadge}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-icon" onclick="editarProfesor(${p.id})" title="Editar profesor" aria-label="Editar">
              <img src="/icons/pencil.svg" alt="Editar">
            </button>
            <button class="btn-icon ${p.activo ? 'danger' : ''}" onclick="toggleEstadoProfesor(${p.id}, ${!p.activo})"
              title="${p.activo ? 'Desactivar' : 'Activar'}" aria-label="${p.activo ? 'Desactivar' : 'Activar'}">
              <img src="/icons/${p.activo ? 'x' : 'check'}.svg" alt="${p.activo ? 'Desactivar' : 'Activar'}">
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
    // T8: Contador de resultados
    const rc = document.getElementById('resultsCount');
    if (rc) rc.textContent = `${data.length} profesor${data.length !== 1 ? 'es' : ''} registrado${data.length !== 1 ? 's' : ''}`;
  } catch (error) {
    showAlert('alertProfesores', 'Error al cargar profesores', 'error');
  }
}

function abrirModal(profesor = null) {
  const modal = document.getElementById('modalProfesor');
  const titulo = document.getElementById('modalTitulo');
  const form = document.getElementById('formProfesor');

  form.reset();
  document.getElementById('prof_id').value = '';
  hideAlert('alertModal');

  if (profesor) {
    titulo.textContent = 'Editar Profesor';
    document.getElementById('prof_id').value = profesor.id;
    document.getElementById('prof_nacionalidad').value = profesor.nacionalidad || 'V';
    document.getElementById('prof_cedula').value = profesor.cedula;
    document.getElementById('prof_apellidos').value = profesor.apellidos;
    document.getElementById('prof_nombres').value = profesor.nombres;
    document.getElementById('prof_sexo').value = profesor.sexo || '';
    if (profesor.fecha_nacimiento) {
      document.getElementById('prof_fecha_nacimiento').value = profesor.fecha_nacimiento.substring(0, 10);
    }
    document.getElementById('prof_telefono').value = profesor.telefono || '';
    document.getElementById('prof_email').value = profesor.email || '';
    
    document.getElementById('prof_direccion').value = profesor.direccion || '';
    document.getElementById('prof_titulo').value = profesor.titulo || '';
    document.getElementById('prof_nivel_instruccion').value = profesor.nivel_instruccion || '';
    document.getElementById('prof_grado_academico').value = profesor.grado_academico || '';
    document.getElementById('prof_tipo_cargo').value = profesor.tipo_cargo || '';
    document.getElementById('prof_condicion_trabajo').value = profesor.condicion_trabajo || '';
    document.getElementById('prof_anos_servicio').value = profesor.anos_servicio || '';
    document.getElementById('prof_lugar_nacimiento').value = profesor.lugar_nacimiento || '';
    document.getElementById('prof_estado_nacimiento').value = profesor.estado_nacimiento || '';
  } else {
    titulo.textContent = 'Nuevo Profesor';
  }

  modal.classList.add('active');
}

function cerrarModal() {
  document.getElementById('modalProfesor').classList.remove('active');
}

async function editarProfesor(id) {
  try {
    const res = await apiFetch(`/api/profesores/${id}`);
    if (!res) return;
    if (!res.ok) {
      const err = await res.json();
      showAlert('alertProfesores', err.error || 'Error al cargar datos del profesor', 'error');
      return;
    }
    const profesor = await res.json();
    abrirModal(profesor);
  } catch (error) {
    showAlert('alertProfesores', 'Error al cargar datos del profesor', 'error');
  }
}

async function guardarProfesor(e) {
  e.preventDefault();

  const id = document.getElementById('prof_id').value;
  const data = {
    nacionalidad: document.getElementById('prof_nacionalidad').value,
    cedula: document.getElementById('prof_cedula').value.trim(),
    apellidos: document.getElementById('prof_apellidos').value.trim(),
    nombres: document.getElementById('prof_nombres').value.trim(),
    sexo: document.getElementById('prof_sexo').value || null,
    fecha_nacimiento: document.getElementById('prof_fecha_nacimiento').value || null,
    telefono: document.getElementById('prof_telefono').value.trim() || null,
    email: document.getElementById('prof_email').value.trim() || null,
    direccion: document.getElementById('prof_direccion').value.trim() || null,
    titulo: document.getElementById('prof_titulo').value.trim() || null,
    nivel_instruccion: document.getElementById('prof_nivel_instruccion').value || null,
    grado_academico: document.getElementById('prof_grado_academico').value.trim() || null,
    tipo_cargo: document.getElementById('prof_tipo_cargo').value || null,
    condicion_trabajo: document.getElementById('prof_condicion_trabajo').value || null,
    anos_servicio: document.getElementById('prof_anos_servicio').value || null,
    lugar_nacimiento: document.getElementById('prof_lugar_nacimiento').value.trim() || null,
    estado_nacimiento: document.getElementById('prof_estado_nacimiento').value.trim() || null,
  };

  try {
    const url = id ? `/api/profesores/${id}` : '/api/profesores';
    const method = id ? 'PUT' : 'POST';

    const res = await apiFetch(url, {
      method,
      body: JSON.stringify(data)
    });

    if (res && res.ok) {
      cerrarModal();
      showAlert('alertProfesores', id ? 'Profesor actualizado' : 'Profesor registrado', 'success');
      loadProfesores();
    } else if (res) {
      const err = await res.json();
      showAlert('alertModal', err.error || 'Error al guardar', 'error');
    }
  } catch (error) {
    showAlert('alertModal', 'Error de conexión', 'error');
  }
}

async function toggleEstadoProfesor(id, nuevoEstado) {
  const msg = nuevoEstado ? 'activar' : 'desactivar';
  if (!confirm(`¿Está seguro de ${msg} este profesor?`)) return;
  try {
    const res = await apiFetch(`/api/profesores/${id}`, { 
      method: 'PUT',
      body: JSON.stringify({ activo: nuevoEstado })
    });
    if (res && res.ok) {
      showAlert('alertProfesores', `Profesor ${nuevoEstado ? 'activado' : 'desactivado'}`, 'success');
      loadProfesores();
    } else if (res) {
      const err = await res.json();
      showAlert('alertProfesores', err.error || 'Error al cambiar estado', 'error');
    }
  } catch (error) {
    showAlert('alertProfesores', 'Error de conexión', 'error');
  }
}
