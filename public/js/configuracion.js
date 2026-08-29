document.addEventListener('DOMContentLoaded', () => {
  // Configuración de Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remover active
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      
      // Añadir active al clickeado
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });

  // Init Form Anio Escolar selects
  initAnioEscolarSelects();

  // Cargar datos iniciales
  loadAniosEscolares();
  loadGrados();
  loadConfiguracion();
  loadUsuarios();

  // Listeners de formularios
  document.getElementById('formAnioEscolar').addEventListener('submit', createAnioEscolar);
  document.getElementById('formGrado').addEventListener('submit', createGrado);
  document.getElementById('formSeccion').addEventListener('submit', createSeccion);
  document.getElementById('s_filtro_anio').addEventListener('change', loadSecciones);
  document.getElementById('formEscuela').addEventListener('submit', saveConfiguracion);
  if (document.getElementById('formUsuario')) {
    document.getElementById('formUsuario').addEventListener('submit', submitUsuario);
    document.getElementById('btnCancelUsuario').addEventListener('click', resetUsuarioForm);
  }

  // Búsqueda de profesores al escribir
  document.getElementById('s_prof_search').addEventListener('input', function() {
    cargarProfesoresDisponibles(this.value);
  });

  // Al cambiar el año en el formulario de sección, recargar profesores disponibles
  document.getElementById('s_anio').addEventListener('change', function() {
    limpiarProfesoresSeleccionados();
    cargarProfesoresDisponibles();
  });
});

function initAnioEscolarSelects() {
  const inicioSelect = document.getElementById('ae_nombre_inicio');
  const finSelect = document.getElementById('ae_nombre_fin');
  if (!inicioSelect || !finSelect) return;
  
  const currentYear = new Date().getFullYear();
  const startYear = currentYear;
  const endYear = currentYear + 5;
  
  inicioSelect.innerHTML = '<option value="">— Año —</option>';
  for (let y = startYear; y <= endYear; y++) {
    inicioSelect.appendChild(new Option(y.toString(), y));
  }
}

function actualizarAnioFin() {
  const inicioSelect = document.getElementById('ae_nombre_inicio');
  const finSelect = document.getElementById('ae_nombre_fin');
  const val = inicioSelect.value;
  
  finSelect.innerHTML = '';
  if (val) {
    const nextYear = parseInt(val) + 1;
    finSelect.appendChild(new Option(nextYear.toString(), nextYear));
    finSelect.value = nextYear;
  }
}

function mostrarOpcionesGrado() {
  const nivel = document.getElementById('g_nivel_select').value;
  const gradoContainer = document.getElementById('g_grado_container');
  const infoNivel = document.getElementById('g_info_nivel');
  const infoOrden = document.getElementById('g_info_orden');
  const selectNombre = document.getElementById('g_nombre');
  
  document.getElementById('g_nivel').value = nivel;
  
  if (nivel === 'INICIAL') {
    // Para inicial, el nombre se genera automaticamente en el backend
    gradoContainer.style.display = 'none';
    selectNombre.required = false;
    selectNombre.innerHTML = '<option value="Preescolar">Preescolar</option>';
    selectNombre.value = 'Preescolar';
    document.getElementById('g_orden').value = '0';
    document.getElementById('g_nivel_display').value = 'Educacion Inicial (Preescolar)';
    document.getElementById('g_orden_display').value = 'Automatico';
    infoNivel.style.display = '';
    infoOrden.style.display = '';
  } else if (nivel === 'PRIMARIA') {
    // Para primaria, mostrar la lista de grados
    gradoContainer.style.display = '';
    selectNombre.required = true;
    selectNombre.innerHTML = `
      <option value="">— Seleccionar Grado —</option>
      <option value="1er Grado">1er Grado</option>
      <option value="2do Grado">2do Grado</option>
      <option value="3er Grado">3er Grado</option>
      <option value="4to Grado">4to Grado</option>
      <option value="5to Grado">5to Grado</option>
      <option value="6to Grado">6to Grado</option>
      <option value="7mo Grado">7mo Grado</option>
      <option value="8vo Grado">8vo Grado</option>
      <option value="9no Grado">9no Grado</option>
    `;
    selectNombre.onchange = function() {
      const val = this.value;
      if (val) {
        const num = parseInt(val.charAt(0));
        const realOrden = num + 2; // 1er Grado -> 3, 2do -> 4...
        document.getElementById('g_orden').value = realOrden;
        document.getElementById('g_nivel_display').value = 'Educacion Primaria';
        document.getElementById('g_orden_display').value = realOrden;
        infoNivel.style.display = '';
        infoOrden.style.display = '';
      } else {
        document.getElementById('g_orden').value = '';
        infoNivel.style.display = 'none';
        infoOrden.style.display = 'none';
      }
    };
    document.getElementById('g_nivel_display').value = '';
    document.getElementById('g_orden_display').value = '';
    infoNivel.style.display = 'none';
    infoOrden.style.display = 'none';
  } else {
    gradoContainer.style.display = 'none';
    infoNivel.style.display = 'none';
    infoOrden.style.display = 'none';
    selectNombre.value = '';
    document.getElementById('g_nivel').value = '';
    document.getElementById('g_orden').value = '';
  }
}

// ==========================================
// AÑOS ESCOLARES
// ==========================================
async function loadAniosEscolares() {
  try {
    const res = await apiFetch('/api/anios-escolares');
    if (!res) return;
    const anios = await res.json();
    
    const tbody = document.getElementById('tbodyAnios');
    const selects = [document.getElementById('s_filtro_anio'), document.getElementById('s_anio')];
    
    tbody.innerHTML = '';
    selects.forEach(s => s.innerHTML = '');

    anios.forEach(anio => {
      // Llenar tabla
      const tr = document.createElement('tr');
      const inicio = formatearFecha(anio.fecha_inicio);
      const fin = formatearFecha(anio.fecha_fin);
      
      let badge = anio.activo 
        ? '<span class="badge badge-success">Activo</span>' 
        : '<span class="badge badge-inactive">Inactivo</span>';
        
      let btnActivar = anio.activo 
        ? '' 
        : `<button class="btn btn-sm" onclick="activarAnio(${anio.id})">Activar</button>`;

      tr.innerHTML = `
        <td><strong>${anio.nombre}</strong></td>
        <td>${inicio} - ${fin}</td>
        <td>${badge}</td>
        <td class="actions-cell">
          ${btnActivar}
          ${anio.activo ? `<button class="btn btn-sm btn-logout" onclick="finalizarAnio(${anio.id})">Finalizar</button>` : ''}
        </td>
      `;
      tbody.appendChild(tr);

      // Llenar selects de la pestaña Secciones
      selects.forEach(s => {
        const option = document.createElement('option');
        option.value = anio.id;
        option.textContent = anio.nombre + (anio.activo ? ' (Activo)' : '');
        if (anio.activo) option.selected = true;
        s.appendChild(option);
      });
    });

    // Cargar secciones iniciales usando el año escolar seleccionado
    if (anios.length > 0) {
      loadSecciones();
      loadProfesoresList();
    }
  } catch (error) {
    showAlert('alertConfig', 'Error al cargar años escolares');
  }
}

async function createAnioEscolar(e) {
  e.preventDefault();
  const inicioVal = document.getElementById('ae_nombre_inicio').value;
  const finVal = document.getElementById('ae_nombre_fin').value;
  
  if (!inicioVal || !finVal) {
    showAlert('alertConfig', 'Seleccione el año de inicio', 'error');
    return;
  }
  
  const data = {
    nombre: `${inicioVal}-${finVal}`,
    fecha_inicio: document.getElementById('ae_inicio').value || null,
    fecha_fin: document.getElementById('ae_fin').value || null
  };

  try {
    const res = await apiFetch('/api/anios-escolares', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (res && res.ok) {
      showAlert('alertConfig', 'Año escolar creado exitosamente', 'success');
      document.getElementById('formAnioEscolar').reset();
      actualizarAnioFin();
      loadAniosEscolares();
    } else if (res) {
      const err = await res.json();
      showAlert('alertConfig', err.error || 'Error al crear', 'error');
    }
  } catch (error) {
    showAlert('alertConfig', 'Error de conexión', 'error');
  }
}

async function activarAnio(id) {
  try {
    const res = await apiFetch(`/api/anios-escolares/${id}/activar`, { method: 'PUT' });
    if (res && res.ok) {
      showAlert('alertConfig', 'Año escolar activado', 'success');
      loadAniosEscolares();
    }
  } catch (error) {
    showAlert('alertConfig', 'Error al activar', 'error');
  }
}

async function finalizarAnio(id) {
  if (!confirm('¿Está seguro de finalizar este año escolar? Se mantendrá en el historial pero quedará inactivo.')) return;
  try {
    const res = await apiFetch(`/api/anios-escolares/${id}/finalizar`, { method: 'PUT' });
    if (res && res.ok) {
      showAlert('alertConfig', 'Año escolar finalizado', 'success');
      loadAniosEscolares();
    } else if (res) {
      const err = await res.json();
      showAlert('alertConfig', err.error || 'Error al finalizar', 'error');
    }
  } catch (error) {
    showAlert('alertConfig', 'Error de conexión', 'error');
  }
}

// ==========================================
// GRADOS
// ==========================================
async function loadGrados() {
  try {
    const res = await apiFetch('/api/grados');
    if (!res) return;
    const grados = await res.json();
    
    const tbody = document.getElementById('tbodyGrados');
    const selectGrado = document.getElementById('s_grado');
    
    tbody.innerHTML = '';
    selectGrado.innerHTML = '';

    grados.forEach(grado => {
      const tr = document.createElement('tr');
      const badgeClass = grado.nivel === 'INICIAL' ? 'badge-primary' : 'badge-success';
      
      tr.innerHTML = `
        <td>${grado.orden}</td>
        <td><strong>${grado.nombre}</strong></td>
        <td><span class="badge ${badgeClass}">${grado.nivel}</span></td>
        <td class="actions-cell">
          <button class="btn btn-sm btn-logout" onclick="deleteGrado(${grado.id})">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);

      // Llenar select de secciones
      const option = document.createElement('option');
      option.value = grado.id;
      option.textContent = grado.nombre;
      selectGrado.appendChild(option);
    });
  } catch (error) {
    showAlert('alertConfig', 'Error al cargar grados');
  }
}

async function createGrado(e) {
  e.preventDefault();
  
  const nivel = document.getElementById('g_nivel').value;
  const nombre = document.getElementById('g_nombre').value;
  const orden = document.getElementById('g_orden').value;
  
  if (!nivel) {
    showAlert('alertConfig', 'Seleccione el nivel de educacion', 'error');
    return;
  }
  
  if (nivel === 'PRIMARIA' && !nombre) {
    showAlert('alertConfig', 'Seleccione el grado', 'error');
    return;
  }
  
  const data = { nombre, nivel, orden };

  try {
    const res = await apiFetch('/api/grados', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (res && res.ok) {
      showAlert('alertConfig', 'Grado creado exitosamente', 'success');
      // Reset form
      document.getElementById('formGrado').reset();
      document.getElementById('g_grado_container').style.display = 'none';
      document.getElementById('g_info_nivel').style.display = 'none';
      document.getElementById('g_info_orden').style.display = 'none';
      document.getElementById('g_nivel').value = '';
      document.getElementById('g_orden').value = '';
      loadGrados();
    } else if (res) {
      const err = await res.json();
      showAlert('alertConfig', err.error || 'Error al crear', 'error');
    }
  } catch (error) {
    showAlert('alertConfig', 'Error de conexion', 'error');
  }
}

async function deleteGrado(id) {
  if (!confirm('¿Está seguro de eliminar este grado?')) return;
  try {
    const res = await apiFetch(`/api/grados/${id}`, { method: 'DELETE' });
    if (res && res.ok) {
      showAlert('alertConfig', 'Grado eliminado', 'success');
      loadGrados();
    } else if (res) {
      const err = await res.json();
      showAlert('alertConfig', err.error || 'Error al eliminar', 'error');
    }
  } catch (error) {
    showAlert('alertConfig', 'Error de conexión', 'error');
  }
}

// ==========================================
// SECCIONES
// ==========================================
async function loadSecciones() {
  const anioId = document.getElementById('s_filtro_anio').value;
  if (!anioId) return;

  try {
    const res = await apiFetch(`/api/secciones?anio_escolar_id=${anioId}`);
    if (!res) return;
    const secciones = await res.json();
    
    const tbody = document.getElementById('tbodySecciones');
    tbody.innerHTML = '';

    // Agrupar secciones por grado
    const agrupadas = {};
    secciones.forEach(sec => {
      if (!agrupadas[sec.grado_id]) {
        agrupadas[sec.grado_id] = {
          grado: sec.grado,
          secciones: []
        };
      }
      agrupadas[sec.grado_id].secciones.push(sec);
    });

    Object.values(agrupadas).forEach(grupo => {
      const tr = document.createElement('tr');
      const badgeClass = grupo.grado.nivel === 'INICIAL' ? 'badge-primary' : 'badge-success';
      
      let pillsHTML = `<div style="display:flex; flex-direction:column; gap:0.5rem; width:100%;">`;
      
      grupo.secciones.forEach(s => {
        let profsHTML = '';
        if (s.profesores && s.profesores.length > 0) {
          profsHTML = s.profesores.map(p => `
            <span class="badge badge-info" style="display:inline-flex; align-items:center; gap:0.25rem;">
              ${p.profesor.nombres} ${p.profesor.apellidos}
              <button onclick="removerProfesorDeSeccion(${s.id}, ${p.profesor.id})" style="background:none; border:none; cursor:pointer; color:inherit; font-weight:bold; font-size:1rem; padding:0; line-height:1;" title="Quitar profesor">&times;</button>
            </span>
          `).join('');
        }

        pillsHTML += `
          <div style="display:flex; align-items:center; gap:0.5rem; background: var(--bg-color); padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; justify-content: space-between;">
            <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
              <strong>Sección "${s.letra}"</strong>
              ${profsHTML}
              <button class="btn btn-sm" onclick="abrirModalAddProfesor(${s.id}, ${s.anio_escolar_id})" style="padding: 0.1rem 0.5rem; font-size:0.75rem;">+ Añadir profesor</button>
            </div>
            <button class="btn-delete-seccion" onclick="deleteSeccion(${s.id})" title="Eliminar Sección" style="position:static; margin-left:1rem;">×</button>
          </div>
        `;
      });
      pillsHTML += `</div>`;

      tr.innerHTML = `
        <td><strong>${grupo.grado.nombre}</strong></td>
        <td><span class="badge ${badgeClass}">${grupo.grado.nivel}</span></td>
        <td>${pillsHTML}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    showAlert('alertConfig', 'Error al cargar secciones');
  }
}

async function createSeccion(e) {
  e.preventDefault();
  const data = {
    anio_escolar_id: document.getElementById('s_anio').value,
    grado_id: document.getElementById('s_grado').value,
    profesores_ids: profesoresSeleccionados.map(p => p.id)
  };

  try {
    const res = await apiFetch('/api/secciones', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (res && res.ok) {
      showAlert('alertConfig', 'Sección agregada exitosamente', 'success');
      document.getElementById('s_prof_search').value = '';
      limpiarProfesoresSeleccionados();
      cargarProfesoresDisponibles();
      
      // Actualizar tabla si el filtro coincide
      if (document.getElementById('s_filtro_anio').value === data.anio_escolar_id) {
        loadSecciones();
      }
    } else if (res) {
      const err = await res.json();
      showAlert('alertConfig', err.error || 'Error al crear', 'error');
    }
  } catch (error) {
    showAlert('alertConfig', 'Error de conexión', 'error');
  }
}

async function deleteSeccion(id) {
  if (!confirm('¿Está seguro de eliminar esta sección?')) return;
  try {
    const res = await apiFetch(`/api/secciones/${id}`, { method: 'DELETE' });
    if (res && res.ok) {
      showAlert('alertConfig', 'Sección eliminada', 'success');
      loadSecciones();
    } else if (res) {
      const err = await res.json();
      showAlert('alertConfig', err.error || 'Error al eliminar', 'error');
    }
  } catch (error) {
    showAlert('alertConfig', 'Error de conexión', 'error');
  }
}

// ==========================================
// CONFIGURACIÓN ESCUELA
// ==========================================
async function loadConfiguracion() {
  try {
    const res = await apiFetch('/api/configuracion');
    if (!res) return;
    const conf = await res.json();
    
    // Asignar valores a inputs si existen en DB
    if (conf.nombre_escuela) document.getElementById('cfg_nombre_escuela').value = conf.nombre_escuela;
    if (conf.codigo_plantel) document.getElementById('cfg_codigo_plantel').value = conf.codigo_plantel;
    if (conf.telefono) document.getElementById('cfg_telefono').value = conf.telefono;
    if (conf.estado) document.getElementById('cfg_estado').value = conf.estado;
    if (conf.municipio) document.getElementById('cfg_municipio').value = conf.municipio;
    if (conf.parroquia) document.getElementById('cfg_parroquia').value = conf.parroquia;
    if (conf.director) document.getElementById('cfg_director').value = conf.director;
    if (conf.direccion) document.getElementById('cfg_direccion').value = conf.direccion;
    if (conf.membrete) document.getElementById('cfg_membrete').value = conf.membrete;
    
  } catch (error) {
    console.error('Error al cargar config de escuela');
  }
}

async function saveConfiguracion(e) {
  e.preventDefault();
  const data = {
    nombre_escuela: document.getElementById('cfg_nombre_escuela').value,
    codigo_plantel: document.getElementById('cfg_codigo_plantel').value,
    telefono: document.getElementById('cfg_telefono').value,
    estado: document.getElementById('cfg_estado').value,
    municipio: document.getElementById('cfg_municipio').value,
    parroquia: document.getElementById('cfg_parroquia').value,
    director: document.getElementById('cfg_director').value,
    direccion: document.getElementById('cfg_direccion').value,
    membrete: document.getElementById('cfg_membrete').value
  };

  const fileInput = document.getElementById('cfg_logo');
  if (fileInput && fileInput.files && fileInput.files[0]) {
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = async function(e) {
      data.logo_institucion_base64 = e.target.result;
      await sendConfigData(data);
    };
    reader.readAsDataURL(file);
  } else {
    await sendConfigData(data);
  }
}

async function sendConfigData(data) {
  try {
    const res = await apiFetch('/api/configuracion', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    
    if (res && res.ok) {
      showAlert('alertConfig', 'Datos de la escuela guardados exitosamente', 'success');
    } else if (res) {
      const err = await res.json();
      showAlert('alertConfig', err.error || 'Error al guardar', 'error');
    }
  } catch (error) {
    showAlert('alertConfig', 'Error de conexión', 'error');
  }
}

// ==========================================
// PROFESORES PARA SECCIONES
// ==========================================
let profesoresSeleccionados = []; // Array de {id, nombre}

async function loadProfesoresList() {
  await cargarProfesoresDisponibles();
}

async function cargarProfesoresDisponibles(buscar) {
  const anioId = document.getElementById('s_anio').value;
  if (!anioId) return;

  try {
    let url = `/api/profesores?anio_escolar_libre_id=${anioId}`;
    if (buscar && buscar.trim()) {
      url += `&buscar=${encodeURIComponent(buscar.trim())}`;
    }

    const res = await apiFetch(url);
    if (!res) return;
    const profesores = await res.json();

    const select = document.getElementById('s_prof_results');
    select.innerHTML = '';

    // Filtrar los que ya están seleccionados en la lista de tags
    const idsSeleccionados = profesoresSeleccionados.map(p => p.id);
    const disponibles = profesores.filter(p => !idsSeleccionados.includes(p.id));

    if (disponibles.length === 0) {
      select.appendChild(new Option('— No hay profesores disponibles —', ''));
    } else {
      select.appendChild(new Option('— Seleccionar profesor —', ''));
      disponibles.forEach(p => {
        select.appendChild(new Option(`${p.apellidos}, ${p.nombres} — C.I: ${p.cedula}`, p.id));
      });
    }
  } catch (error) {
    console.error('Error cargando profesores disponibles', error);
  }
}

function addProfesorSeccion() {
  const select = document.getElementById('s_prof_results');
  const id = parseInt(select.value);
  if (!id) return;

  const texto = select.options[select.selectedIndex].text;
  profesoresSeleccionados.push({ id, nombre: texto });

  renderProfesoresTags();
  cargarProfesoresDisponibles(document.getElementById('s_prof_search').value);
}

function removeProfesorSeccion(id) {
  profesoresSeleccionados = profesoresSeleccionados.filter(p => p.id !== id);
  renderProfesoresTags();
  cargarProfesoresDisponibles(document.getElementById('s_prof_search').value);
}

function renderProfesoresTags() {
  const container = document.getElementById('s_profesores_list');
  if (profesoresSeleccionados.length === 0) {
    container.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">Sin profesores asignados</span>';
    return;
  }
  container.innerHTML = profesoresSeleccionados.map(p => `
    <span class="seccion-pill" style="font-size: 0.85rem; padding: 0.3rem 0.6rem;">
      ${p.nombre}
      <button type="button" class="btn-delete-seccion" onclick="removeProfesorSeccion(${p.id})" title="Quitar profesor">×</button>
    </span>
  `).join('');
}

function limpiarProfesoresSeleccionados() {
  profesoresSeleccionados = [];
  renderProfesoresTags();
}

// ==========================================
// MODAL AÑADIR PROFESOR A SECCIÓN EXISTENTE
// ==========================================
function abrirModalAddProfesor(seccionId, anioId) {
  document.getElementById('modal_seccion_id').value = seccionId;
  document.getElementById('modal_anio_id').value = anioId;
  document.getElementById('modal_prof_search').value = '';
  cargarProfesoresParaModal();
  document.getElementById('modalAddProfesorSeccion').classList.add('active');
}

function cerrarModalAddProfesorSeccion() {
  document.getElementById('modalAddProfesorSeccion').classList.remove('active');
}

async function cargarProfesoresParaModal(buscar) {
  const anioId = document.getElementById('modal_anio_id').value;
  if (!anioId) return;

  try {
    let url = `/api/profesores?anio_escolar_libre_id=${anioId}`;
    if (buscar && buscar.trim()) {
      url += `&buscar=${encodeURIComponent(buscar.trim())}`;
    }

    const res = await apiFetch(url);
    if (!res) return;
    const profesores = await res.json();

    const select = document.getElementById('modal_prof_results');
    select.innerHTML = '';

    if (profesores.length === 0) {
      select.appendChild(new Option('— No hay profesores disponibles —', ''));
    } else {
      select.appendChild(new Option('— Seleccionar profesor —', ''));
      profesores.forEach(p => {
        select.appendChild(new Option(`${p.apellidos}, ${p.nombres} — C.I: ${p.cedula}`, p.id));
      });
    }
  } catch (error) {
    console.error('Error cargando profesores disponibles', error);
  }
}

// Listeners para el modal
document.getElementById('modal_prof_search').addEventListener('input', function() {
  cargarProfesoresParaModal(this.value);
});

document.getElementById('formAddProfesorSeccion').addEventListener('submit', async (e) => {
  e.preventDefault();
  const seccionId = document.getElementById('modal_seccion_id').value;
  const profesorId = document.getElementById('modal_prof_results').value;

  if (!profesorId) {
    showAlert('alertConfig', 'Debe seleccionar un profesor', 'error');
    return;
  }

  try {
    // Para añadir, simplemente hacemos un POST al endpoint de profesores_secciones que debemos crear o actualizar vía secciones
    const res = await apiFetch(`/api/secciones/${seccionId}/profesor`, {
      method: 'POST',
      body: JSON.stringify({ profesor_id: parseInt(profesorId) })
    });
    
    if (res && res.ok) {
      cerrarModalAddProfesorSeccion();
      loadSecciones(); // recargar tabla
      cargarProfesoresDisponibles(document.getElementById('s_prof_search').value);
    } else {
      const err = await res.json();
      showAlert('alertConfig', err.error || 'Error al añadir profesor', 'error');
    }
  } catch (error) {
    console.error(error);
  }
});

async function removerProfesorDeSeccion(seccionId, profesorId) {
  if (!confirm('¿Seguro que desea remover a este profesor de la sección?')) return;
  try {
    const res = await apiFetch(`/api/secciones/${seccionId}/profesor/${profesorId}`, {
      method: 'DELETE'
    });
    if (res && res.ok) {
      loadSecciones();
      cargarProfesoresDisponibles(document.getElementById('s_prof_search').value);
    }
  } catch (error) {
    console.error(error);
  }
}

// === GESTIÓN DE USUARIOS ===
async function loadUsuarios() {
  try {
    const res = await apiFetch('/api/usuarios');
    const usuarios = await res.json();
    const tbody = document.getElementById('tbodyUsuarios');
    tbody.innerHTML = '';
    if (usuarios.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No hay usuarios</td></tr>';
      return;
    }

    usuarios.forEach(u => {
      const tr = document.createElement('tr');
      const d = new Date(u.creado_en).toLocaleDateString('es-VE');
      
      const roleBadge = u.rol === 'SUPER_ADMIN' 
        ? '<span class="status-badge" style="background:#4f46e5;color:white;">Super Admin</span>' 
        : '<span class="status-badge" style="background:#10b981;color:white;">Admin</span>';

      tr.innerHTML = `
        <td>${u.nombre_usuario}</td>
        <td>${roleBadge}</td>
        <td>${d}</td>
        <td>
          <button class="btn-icon" title="Editar" onclick="editUsuario(${u.id}, '${u.nombre_usuario}', '${u.rol}')">✏️</button>
          <button class="btn-icon text-danger" title="Eliminar" onclick="deleteUsuario(${u.id})">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Error cargando usuarios:', error);
  }
}

async function submitUsuario(e) {
  e.preventDefault();
  const id = document.getElementById('usuario_id').value;
  const nombre_usuario = document.getElementById('usu_nombre').value.trim();
  const rol = document.getElementById('usu_rol').value;
  const password = document.getElementById('usu_password').value;

  const payload = { nombre_usuario, rol };
  if (password) payload.password = password;

  if (!id && !password) {
    showAlert('alertConfig', 'La contraseña es obligatoria para usuarios nuevos', 'error');
    return;
  }

  try {
    const url = id ? `/api/usuarios/${id}` : '/api/usuarios';
    const method = id ? 'PUT' : 'POST';
    
    const res = await apiFetch(url, {
      method,
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok) {
      showAlert('alertConfig', data.mensaje, 'success');
      resetUsuarioForm();
      loadUsuarios();
    } else {
      showAlert('alertConfig', data.error || 'Error al guardar', 'error');
    }
  } catch (error) {
    showAlert('alertConfig', 'Error de conexión', 'error');
  }
}

function editUsuario(id, nombre, rol) {
  document.getElementById('formUsuarioTitle').textContent = 'Editar Usuario';
  document.getElementById('usuario_id').value = id;
  document.getElementById('usu_nombre').value = nombre;
  document.getElementById('usu_nombre').disabled = true; // No permitir cambiar username
  document.getElementById('usu_rol').value = rol;
  
  const pwdInput = document.getElementById('usu_password');
  pwdInput.required = false;
  pwdInput.value = '';
  document.getElementById('usu_pwd_hint').style.display = 'block';
  
  document.getElementById('btnCancelUsuario').style.display = 'inline-block';
  document.getElementById('btnSubmitUsuario').textContent = 'Actualizar Usuario';
}

function resetUsuarioForm() {
  document.getElementById('formUsuario').reset();
  document.getElementById('formUsuarioTitle').textContent = 'Nuevo Usuario';
  document.getElementById('usuario_id').value = '';
  document.getElementById('usu_nombre').disabled = false;
  document.getElementById('usu_password').required = true;
  document.getElementById('usu_pwd_hint').style.display = 'none';
  document.getElementById('btnCancelUsuario').style.display = 'none';
  document.getElementById('btnSubmitUsuario').textContent = 'Guardar Usuario';
}

async function deleteUsuario(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;
  try {
    const res = await apiFetch(`/api/usuarios/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      showAlert('alertConfig', data.mensaje, 'success');
      loadUsuarios();
    } else {
      showAlert('alertConfig', data.error || 'Error al eliminar', 'error');
    }
  } catch (error) {
    showAlert('alertConfig', 'Error de conexión', 'error');
  }
}


