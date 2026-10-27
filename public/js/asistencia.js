// asistencia.js - Lógica del módulo de asistencia diaria
var datosAsistencia = [];
var diasNoLaborables = [];
var anioEscolarActivo = null;
var diaEsLaborable = true;
var profesoresLista = [];

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', function() {
  cargarAniosEscolares();
  cargarProfesores();

  document.getElementById('filtroFecha').addEventListener('change', function() {
    cargarAsistenciaDiaria();
  });

  document.getElementById('filtroAnio').addEventListener('change', function() {
    anioEscolarActivo = parseInt(this.value);
    cargarAsistenciaDiaria();
  });

  // Fecha por defecto: hoy
  var hoy = new Date();
  var yyyy = hoy.getFullYear();
  var mm = String(hoy.getMonth() + 1).padStart(2, '0');
  var dd = String(hoy.getDate()).padStart(2, '0');
  document.getElementById('filtroFecha').value = yyyy + '-' + mm + '-' + dd;
});

// ============================================
// CARGAR AÑOS ESCOLARES
// ============================================
async function cargarAniosEscolares() {
  try {
    var resp = await apiFetch('/api/anios-escolares');
    if (!resp) return;
    var anios = await resp.json();
    var select = document.getElementById('filtroAnio');
    select.innerHTML = '';

    anios.forEach(function(a) {
      var opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.nombre + (a.activo ? ' (Activo)' : '');
      if (a.activo) {
        opt.selected = true;
        anioEscolarActivo = a.id;
      }
      select.appendChild(opt);
    });

    if (anioEscolarActivo) {
      cargarAsistenciaDiaria();
    }
  } catch (e) {
    console.error('Error cargando años escolares:', e);
  }
}

// ============================================
// CARGAR PROFESORES (para select de docente de guardia)
// ============================================
async function cargarProfesores() {
  try {
    var resp = await apiFetch('/api/asistencias/profesores-activos');
    if (!resp || !resp.ok) return;
    profesoresLista = await resp.json();

    var selects = document.querySelectorAll('.select-docente');
    selects.forEach(function(select) {
      var firstOpt = select.querySelector('option');
      select.innerHTML = '';
      select.appendChild(firstOpt || crearOption('', 'Seleccione un docente...'));
      profesoresLista.forEach(function(p) {
        var opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.apellidos + ', ' + p.nombres + ' — C.I: ' + p.nacionalidad + '-' + p.cedula;
        select.appendChild(opt);
      });
    });
  } catch (e) {
    console.error('Error cargando profesores:', e);
  }
}

function crearOption(value, text) {
  var opt = document.createElement('option');
  opt.value = value;
  opt.textContent = text;
  return opt;
}

// ============================================
// CARGAR ASISTENCIA DIARIA
// ============================================
async function cargarAsistenciaDiaria() {
  var anioId = document.getElementById('filtroAnio').value;
  var fecha = document.getElementById('filtroFecha').value;
  if (!anioId || !fecha) return;

  // Mostrar fecha formateada
  var fechaObj = new Date(fecha + 'T00:00:00');
  var dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  var diaTexto = dias[fechaObj.getDay()];
  var partes = fecha.split('-');
  var fechaFormateada = partes[2] + '/' + partes[1] + '/' + partes[0];
  document.getElementById('asistFechaLabel').textContent = diaTexto + ' ' + fechaFormateada;

  // Verificar si es día laborable
  diaEsLaborable = true;
  var aviso = document.getElementById('avisoNoLaborable');
  aviso.style.display = 'none';

  var diaSemana = fechaObj.getDay();
  if (diaSemana === 0 || diaSemana === 6) {
    diaEsLaborable = false;
    aviso.className = 'asist-aviso warn';
    aviso.innerHTML = '⚠️ <strong>' + diaTexto + '</strong> no es un día laborable (fin de semana). No se puede registrar asistencia.';
    aviso.style.display = 'block';
  }

  // Verificar días no laborables
  if (diaEsLaborable) {
    try {
      var respDnl = await apiFetch('/api/asistencias/dias-no-laborables?anio_escolar_id=' + anioId);
      if (respDnl && respDnl.ok) {
        diasNoLaborables = await respDnl.json();
        if (Array.isArray(diasNoLaborables)) {
          var diaNoLab = diasNoLaborables.find(function(d) {
            return d.fecha.substring(0, 10) === fecha;
          });
          if (diaNoLab) {
            diaEsLaborable = false;
            aviso.className = 'asist-aviso warn';
            var motivo = diaNoLab.motivo ? ': ' + diaNoLab.motivo : '';
            aviso.innerHTML = '⚠️ Este día fue marcado como <strong>no laborable</strong>' + motivo + '. No se puede registrar asistencia.';
            aviso.style.display = 'block';
          }
        }
      }
    } catch (e) {
      console.error('Error verificando días no laborables:', e);
    }
  }

  // Cargar datos de asistencia
  try {
    var resp = await apiFetch('/api/asistencias/diaria?anio_escolar_id=' + anioId + '&fecha=' + fecha);
    if (!resp) return;
    var data = await resp.json();

    if (resp.ok && data.filas && Array.isArray(data.filas)) {
      datosAsistencia = data.filas;
      renderTabla(datosAsistencia);
      calcularResumen();

      // Cargar docente de guardia guardado
      var guardiaInfo = document.getElementById('guardiaInfo');
      var selectDocente = document.getElementById('selectDocente');
      if (data.guardia) {
        selectDocente.value = data.guardia.profesor_id;
        guardiaInfo.innerHTML = '✅ Docente de guardia registrado: <strong>' + data.guardia.nombre_completo + '</strong> (C.I: ' + data.guardia.ci + ')';
        guardiaInfo.style.display = 'block';
      } else {
        selectDocente.value = '';
        guardiaInfo.style.display = 'none';
      }
    } else {
      datosAsistencia = [];
      renderTabla([]);
    }
  } catch (e) {
    console.error('Error cargando asistencia:', e);
    datosAsistencia = [];
    renderTabla([]);
  }

  // Habilitar/deshabilitar
  document.getElementById('btnGuardarAsistencia').disabled = !diaEsLaborable;
  document.getElementById('selectDocente').disabled = !diaEsLaborable;
}

// ============================================
// RENDERIZAR TABLA
// ============================================
function renderTabla(datos) {
  var tbody = document.getElementById('asistTableBody');

  if (!datos || datos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" style="padding:30px;color:var(--text-muted);">No hay secciones registradas para este año escolar.</td></tr>';
    return;
  }

  var html = '';
  var nivelActual = '';

  datos.forEach(function(fila, idx) {
    if (fila.grado_nivel !== nivelActual) {
      nivelActual = fila.grado_nivel;
      var nivelNombre = fila.grado_nivel === 'INICIAL' ? '📘 PREESCOLAR' : '📗 EDUCACIÓN BÁSICA';
      html += '<tr class="fila-separador"><td colspan="11">' + nivelNombre + '</td></tr>';
    }

    var gradoLabel = fila.grado_nombre + ' "' + fila.seccion_letra + '"';
    var asistV = fila.asistencia_v !== null ? fila.asistencia_v : '';
    var asistH = fila.asistencia_h !== null ? fila.asistencia_h : '';
    var asistT = (asistV !== '' && asistH !== '') ? (parseInt(asistV) + parseInt(asistH)) : '';
    var inasistV = (asistV !== '' && fila.matricula_v >= 0) ? (fila.matricula_v - parseInt(asistV)) : '';
    var inasistH = (asistH !== '' && fila.matricula_h >= 0) ? (fila.matricula_h - parseInt(asistH)) : '';
    var inasistT = (inasistV !== '' && inasistH !== '') ? (parseInt(inasistV) + parseInt(inasistH)) : '';

    var disabledAttr = diaEsLaborable ? '' : ' disabled';

    html += '<tr data-seccion-id="' + fila.seccion_id + '" data-idx="' + idx + '">';
    html += '<td class="td-grado">' + gradoLabel + '</td>';
    html += '<td class="td-readonly">' + fila.matricula_v + '</td>';
    html += '<td class="td-readonly">' + fila.matricula_h + '</td>';
    html += '<td class="td-readonly" style="font-weight:700;">' + fila.matricula_t + '</td>';
    html += '<td><input type="number" class="asist-input" min="0" max="' + fila.matricula_v + '" value="' + asistV + '"'
      + ' data-tipo="v" data-max="' + fila.matricula_v + '"'
      + ' oninput="onInputAsistencia(this, ' + idx + ')"' + disabledAttr + '></td>';
    html += '<td><input type="number" class="asist-input" min="0" max="' + fila.matricula_h + '" value="' + asistH + '"'
      + ' data-tipo="h" data-max="' + fila.matricula_h + '"'
      + ' oninput="onInputAsistencia(this, ' + idx + ')"' + disabledAttr + '></td>';
    html += '<td class="td-readonly" id="asistT_' + idx + '">' + asistT + '</td>';
    html += '<td class="td-inasist" id="inasistV_' + idx + '">' + inasistV + '</td>';
    html += '<td class="td-inasist" id="inasistH_' + idx + '">' + inasistH + '</td>';
    html += '<td class="td-inasist" id="inasistT_' + idx + '">' + inasistT + '</td>';
    html += '<td class="td-firma"></td>';
    html += '</tr>';
  });

  tbody.innerHTML = html;
}

// ============================================
// INPUT: Validar y recalcular
// ============================================
function onInputAsistencia(input, idx) {
  var valor = parseInt(input.value);
  var max = parseInt(input.dataset.max);

  if (!isNaN(valor) && valor > max) {
    input.value = max;
    input.classList.add('error');
    setTimeout(function() { input.classList.remove('error'); }, 1000);
  } else {
    input.classList.remove('error');
  }

  if (!isNaN(valor) && valor < 0) {
    input.value = 0;
  }

  calcularFila(idx);
  calcularResumen();
}

function calcularFila(idx) {
  var tr = document.querySelector('tr[data-idx="' + idx + '"]');
  if (!tr) return;
  var fila = datosAsistencia[idx];
  var inputs = tr.querySelectorAll('.asist-input');
  var valV = inputs[0].value !== '' ? parseInt(inputs[0].value) : null;
  var valH = inputs[1].value !== '' ? parseInt(inputs[1].value) : null;

  document.getElementById('asistT_' + idx).textContent = (valV !== null && valH !== null) ? (valV + valH) : '';
  document.getElementById('inasistV_' + idx).textContent = (valV !== null) ? (fila.matricula_v - valV) : '';
  document.getElementById('inasistH_' + idx).textContent = (valH !== null) ? (fila.matricula_h - valH) : '';

  var inV = (valV !== null) ? (fila.matricula_v - valV) : null;
  var inH = (valH !== null) ? (fila.matricula_h - valH) : null;
  document.getElementById('inasistT_' + idx).textContent = (inV !== null && inH !== null) ? (inV + inH) : '';
}

function calcularResumen() {
  var preV = 0, preH = 0;
  var basV = 0, basH = 0;

  datosAsistencia.forEach(function(fila, idx) {
    var tr = document.querySelector('tr[data-idx="' + idx + '"]');
    if (!tr) return;
    var inputs = tr.querySelectorAll('.asist-input');
    var v = inputs[0] && inputs[0].value !== '' ? parseInt(inputs[0].value) : 0;
    var h = inputs[1] && inputs[1].value !== '' ? parseInt(inputs[1].value) : 0;

    if (fila.grado_nivel === 'INICIAL') { preV += v; preH += h; }
    else { basV += v; basH += h; }
  });

  document.getElementById('resPreV').textContent = preV;
  document.getElementById('resPreH').textContent = preH;
  document.getElementById('resPreT').textContent = preV + preH;
  document.getElementById('resBasV').textContent = basV;
  document.getElementById('resBasH').textContent = basH;
  document.getElementById('resBasT').textContent = basV + basH;
}

// ============================================
// GUARDAR TODAS LAS ASISTENCIAS + DOCENTE
// ============================================
async function guardarTodas() {
  var fecha = document.getElementById('filtroFecha').value;
  var anioId = document.getElementById('filtroAnio').value;
  var profId = document.getElementById('selectDocente').value;

  if (!profId) {
    await alertDialog({
      title: 'Docente requerido',
      message: 'Debe seleccionar el <strong>docente de guardia</strong> antes de guardar la asistencia.',
      type: 'warning'
    });
    document.getElementById('selectDocente').focus();
    return;
  }

  var registros = [];
  datosAsistencia.forEach(function(fila, idx) {
    var tr = document.querySelector('tr[data-idx="' + idx + '"]');
    if (!tr) return;
    var inputs = tr.querySelectorAll('.asist-input');
    var v = inputs[0].value;
    var h = inputs[1].value;

    if (v !== '' || h !== '') {
      registros.push({
        seccion_id: fila.seccion_id,
        varones_asistentes: v !== '' ? parseInt(v) : 0,
        hembras_asistentes: h !== '' ? parseInt(h) : 0
      });
    }
  });

  if (registros.length === 0) {
    await alertDialog({
      title: 'Sin datos',
      message: 'No hay asistencia registrada para guardar. Ingrese al menos los datos de una sección.',
      type: 'warning'
    });
    return;
  }

  try {
    var resp = await apiFetch('/api/asistencias/diaria/masivo', {
      method: 'POST',
      body: JSON.stringify({
        fecha: fecha,
        anio_escolar_id: parseInt(anioId),
        profesor_id: parseInt(profId),
        registros: registros
      })
    });

    if (!resp) return;
    var data = await resp.json();

    if (data.ok) {
      var msg = document.getElementById('asistGuardadoMsg');
      msg.style.display = 'inline';
      setTimeout(function() { msg.style.display = 'none'; }, 3000);
      // Recargar para mostrar info del docente guardado
      cargarAsistenciaDiaria();
    } else {
      await alertDialog({ title: 'Error', message: data.error || 'Error al guardar.', type: 'danger' });
    }
  } catch (e) {
    console.error('Error guardando asistencia:', e);
    await alertDialog({ title: 'Error', message: 'Error de conexión al guardar.', type: 'danger' });
  }
}

// ============================================
// MODAL: DÍAS NO LABORABLES
// ============================================
function abrirModalDiasNoLaborables() {
  document.getElementById('modalDiasNoLab').classList.add('active');
  cargarDiasNoLaborables();
}

function cerrarModalDiasNoLab() {
  document.getElementById('modalDiasNoLab').classList.remove('active');
}

async function cargarDiasNoLaborables() {
  var anioId = document.getElementById('filtroAnio').value;
  if (!anioId) return;
  try {
    var resp = await apiFetch('/api/asistencias/dias-no-laborables?anio_escolar_id=' + anioId);
    if (!resp || !resp.ok) return;
    diasNoLaborables = await resp.json();
    renderDiasNoLaborables();
  } catch (e) {
    console.error('Error cargando días no laborables:', e);
  }
}

function renderDiasNoLaborables() {
  var lista = document.getElementById('dnlLista');
  if (!Array.isArray(diasNoLaborables) || diasNoLaborables.length === 0) {
    lista.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">No hay días no laborables registrados.</p>';
    return;
  }
  var html = '';
  diasNoLaborables.forEach(function(d) {
    var fechaStr = formatearFecha(d.fecha);
    var fechaObj = new Date(d.fecha.substring(0, 10) + 'T00:00:00');
    var dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    html += '<div class="dnl-item">';
    html += '<span class="dnl-fecha">' + dias[fechaObj.getDay()] + ' ' + fechaStr + '</span>';
    html += '<span class="dnl-motivo">' + (d.motivo || '<em>Sin motivo</em>') + '</span>';
    html += '<button class="btn btn-sm" style="background:var(--error);color:white;border:none;font-size:0.72rem;padding:3px 8px;" onclick="eliminarDiaNoLaborable(' + d.id + ')">Eliminar</button>';
    html += '</div>';
  });
  lista.innerHTML = html;
}

async function agregarDiaNoLaborable() {
  var fecha = document.getElementById('dnlFecha').value;
  var motivo = document.getElementById('dnlMotivo').value.trim();
  var anioId = document.getElementById('filtroAnio').value;
  if (!fecha) { await alertDialog({ title: 'Fecha requerida', message: 'Seleccione una fecha.', type: 'warning' }); return; }
  try {
    var resp = await apiFetch('/api/asistencias/dias-no-laborables', {
      method: 'POST',
      body: JSON.stringify({ fecha: fecha, motivo: motivo || null, anio_escolar_id: parseInt(anioId) })
    });
    if (!resp) return;
    var data = await resp.json();
    if (data.ok) {
      document.getElementById('dnlFecha').value = '';
      document.getElementById('dnlMotivo').value = '';
      cargarDiasNoLaborables();
      cargarAsistenciaDiaria();
    } else {
      await alertDialog({ title: 'Error', message: data.error || 'Error al agregar.', type: 'danger' });
    }
  } catch (e) { console.error(e); }
}

async function eliminarDiaNoLaborable(id) {
  var ok = await confirmDialog({
    title: 'Eliminar día no laborable',
    message: '¿Está seguro de eliminar este día no laborable?',
    type: 'warning', confirmText: 'Eliminar'
  });
  if (!ok) return;
  try {
    var resp = await apiFetch('/api/asistencias/dias-no-laborables/' + id, { method: 'DELETE' });
    if (!resp) return;
    var data = await resp.json();
    if (data.ok) { cargarDiasNoLaborables(); cargarAsistenciaDiaria(); }
  } catch (e) { console.error(e); }
}

// ============================================
// MODAL: GENERAR PDF
// ============================================
function abrirModalPDF() {
  var fecha = document.getElementById('filtroFecha').value;
  if (!fecha) { alertDialog({ title: 'Fecha requerida', message: 'Seleccione una fecha.', type: 'warning' }); return; }

  var fechaObj = new Date(fecha + 'T00:00:00');
  var diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  var partes = fecha.split('-');
  document.getElementById('pdfFechaLabel').textContent = diasNombres[fechaObj.getDay()] + ' ' + partes[2] + '/' + partes[1] + '/' + partes[0];

  // Auto-fill docente from main select
  var mainDocente = document.getElementById('selectDocente').value;
  var pdfDocente = document.getElementById('pdfDocente');
  // Copiar opciones del select principal al modal
  pdfDocente.innerHTML = document.getElementById('selectDocente').innerHTML;
  if (mainDocente) pdfDocente.value = mainDocente;

  document.getElementById('modalPDF').classList.add('active');
}

function cerrarModalPDF() {
  document.getElementById('modalPDF').classList.remove('active');
}

async function generarPDFAsistencia() {
  var profId = document.getElementById('pdfDocente').value;
  if (!profId) {
    await alertDialog({ title: 'Docente requerido', message: 'Seleccione el docente de guardia.', type: 'warning' });
    return;
  }

  var anioId = document.getElementById('filtroAnio').value;
  var fecha = document.getElementById('filtroFecha').value;

  try {
    var resp = await apiFetch('/api/asistencias/reporte-pdf?anio_escolar_id=' + anioId + '&fecha=' + fecha + '&profesor_id=' + profId);
    if (!resp) return;
    var datos = await resp.json();
    if (datos.error) { await alertDialog({ title: 'Error', message: datos.error, type: 'danger' }); return; }
    generarPDFAsistenciaDiaria(datos, fecha);
    cerrarModalPDF();
  } catch (e) {
    console.error('Error generando PDF:', e);
    await alertDialog({ title: 'Error', message: 'Error al generar el PDF.', type: 'danger' });
  }
}
