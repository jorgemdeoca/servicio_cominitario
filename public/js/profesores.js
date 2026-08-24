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
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem;">No se encontraron profesores.</td></tr>';
      return;
    }

    data.forEach(p => {
      const tr = document.createElement('tr');
      const activoBadge = p.activo 
        ? '<span class="badge-activo badge-activo-si">Activo</span>'
        : '<span class="badge-activo badge-activo-no">Inactivo</span>';
      
      let sexoBadge = '—';
      if (p.sexo === 'M') sexoBadge = '<span class="badge-sexo badge-sexo-m">M</span>';
      if (p.sexo === 'F') sexoBadge = '<span class="badge-sexo badge-sexo-f">F</span>';

      tr.innerHTML = `
        <td>${p.nacionalidad}-${p.cedula}</td>
        <td><strong>${p.apellidos}</strong>, ${p.nombres}</td>
        <td>${sexoBadge}</td>
        <td>${p.telefono || '—'}</td>
        <td>${p.email || '—'}</td>
        <td>${activoBadge}</td>
        <td class="actions-cell">
          <button class="btn btn-sm" onclick="editarProfesor(${p.id})">Editar</button>
          <button class="btn btn-sm btn-logout" onclick="toggleEstadoProfesor(${p.id}, ${!p.activo})">
            ${p.activo ? 'Desactivar' : 'Activar'}
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
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