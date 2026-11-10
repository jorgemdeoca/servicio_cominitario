// Dashboard - Carga de estadísticas reales
document.addEventListener('DOMContentLoaded', function() {
  cargarDashboard().catch(() => {
    // Retry una vez si falla (ej. servidor recién iniciado)
    setTimeout(() => cargarDashboard(), 1500);
  });
});

async function cargarDashboard() {
  try {
    const res = await apiFetch('/api/dashboard/estadisticas');
    if (!res || !res.ok) return;
    const data = await res.json();

    // 1. Stat cards con animación count-up
    countUp(document.getElementById('statEstudiantes'), data.estudiantes);
    countUp(document.getElementById('statPersonas'), data.personas);
    countUp(document.getElementById('statInscripciones'), data.inscripciones);
    countUp(document.getElementById('statProfesores'), data.profesores);

    // 2. Gráfico de barras - Matrícula por Grado
    renderBarChart(data.matriculaPorGrado);

    // 3. Gráfico donut - Distribución por Sexo
    renderDonut(data.totalVarones, data.totalHembras);

    // 4. Lista sin inscribir
    renderSinInscribir(data.sinInscribir, data.totalSinInscribir);

    // 5. Lista sin colaboración
    /* COLAB OCULTO
    renderSinColaboracion(data.sinColaboracion, data.totalSinColab);
    COLAB OCULTO */

    // 6. Footer
    if (data.anio_activo) {
      document.getElementById('footerAnio').textContent = data.anio_activo;
      document.getElementById('dashFooter').style.display = 'flex';
    }

  } catch (error) {
    console.error('Error cargando dashboard:', error);
  }
}

function renderBarChart(grados) {
  var container = document.getElementById('chartGrados');
  if (!grados || grados.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div>No hay datos de matrícula</div>';
    return;
  }

  var maxTotal = Math.max.apply(null, grados.map(function(g) { return g.total; }));
  var html = '';

  grados.forEach(function(g, i) {
    var pct = maxTotal > 0 ? (g.total / maxTotal * 100) : 0;
    var colorClass = 'bar-colors-' + (i % 8);
    html += '<div class="bar-row">' +
      '<div class="bar-label">' + g.nombre + '</div>' +
      '<div class="bar-track">' +
        '<div class="bar-fill ' + colorClass + '" style="width:' + Math.max(pct, 8) + '%;">' +
          '<span>' + g.total + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  });

  var totalMatricula = grados.reduce(function(sum, g) { return sum + g.total; }, 0);
  html += '<div style="text-align:right;margin-top:12px;font-size:0.85rem;color:#64748b;">' +
    'Total matriculados: <strong style="color:#0f172a;">' + totalMatricula + '</strong></div>';

  container.innerHTML = html;
}

function renderDonut(varones, hembras) {
  var container = document.getElementById('chartSexo');
  var total = varones + hembras;

  if (total === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🥧</div>No hay datos de matrícula</div>';
    return;
  }

  var pctV = Math.round(varones / total * 100);
  var pctH = 100 - pctV;
  var degV = (pctV / 100) * 360;

  container.innerHTML =
    '<div class="donut-container">' +
      '<div class="donut-ring" style="background:conic-gradient(#1a73e8 0deg ' + degV + 'deg, #ec4899 ' + degV + 'deg 360deg);">' +
        '<div class="donut-center" style="width:90px;height:90px;background:#fff;border-radius:50%;">' +
          '<div class="donut-total">' + total + '</div>' +
          '<div class="donut-txt">Total</div>' +
        '</div>' +
      '</div>' +
      '<div class="donut-legend">' +
        '<div class="donut-legend-item">' +
          '<div class="donut-dot" style="background:#1a73e8;"></div>' +
          '<div>' +
            '<div class="donut-legend-label">Varones</div>' +
            '<div class="donut-legend-val">' + varones + ' (' + pctV + '%)</div>' +
          '</div>' +
        '</div>' +
        '<div class="donut-legend-item">' +
          '<div class="donut-dot" style="background:#ec4899;"></div>' +
          '<div>' +
            '<div class="donut-legend-label">Hembras</div>' +
            '<div class="donut-legend-val">' + hembras + ' (' + pctH + '%)</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
}

function renderSinInscribir(lista, total) {
  var container = document.getElementById('listaSinInscribir');
  var badge = document.getElementById('badgeSinInscribir');
  var link = document.getElementById('linkSinInscribir');

  badge.textContent = total + ' pendientes';

  if (!lista || lista.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:var(--space-4);"><div class="empty-state-icon">✅</div>Todos los estudiantes están inscritos</div>';
    return;
  }

  var colors = ['#1a73e8', '#0d9488', '#7c3aed', '#16a34a', '#ea580c'];
  var html = '';

  lista.forEach(function(est, i) {
    var nombre = [est.primer_apellido, est.segundo_apellido].filter(Boolean).join(' ') + ', ' +
                 [est.primer_nombre, est.segundo_nombre].filter(Boolean).join(' ');
    var iniciales = (est.primer_nombre ? est.primer_nombre[0] : '') + (est.primer_apellido ? est.primer_apellido[0] : '');
    var color = colors[i % colors.length];

    html += '<div class="alert-item">' +
      '<div class="alert-item-info">' +
        '<div class="alert-avatar" style="background:' + color + ';">' + iniciales + '</div>' +
        '<div>' +
          '<div class="alert-name">' + nombre + '</div>' +
          '<div class="alert-sub">' + (est.codigo_escolar || 'Sin código escolar') + '</div>' +
        '</div>' +
      '</div>' +
      '<a href="/inscripciones.html" class="alert-btn blue">Inscribir</a>' +
    '</div>';
  });

  container.innerHTML = html;

  if (total > lista.length) {
    link.textContent = 'Ver todos (' + total + ' estudiantes) →';
    link.style.display = 'block';
  }
}

/* COLAB OCULTO
function renderSinColaboracion(lista, total) {
  var container = document.getElementById('listaSinColab');
  var badge = document.getElementById('badgeSinColab');
  var link = document.getElementById('linkSinColab');

  badge.textContent = total + ' casos';

  if (!lista || lista.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:var(--space-4);"><div class="empty-state-icon">✅</div>Todos los inscritos tienen colaboración</div>';
    return;
  }

  var colors = ['#ea580c', '#dc2626', '#d97706', '#b91c1c', '#c2410c'];
  var html = '';

  lista.forEach(function(insc, i) {
    var est = insc.estudiante;
    var nombre = [est.primer_apellido, est.segundo_apellido].filter(Boolean).join(' ') + ', ' +
                 [est.primer_nombre, est.segundo_nombre].filter(Boolean).join(' ');
    var iniciales = (est.primer_nombre ? est.primer_nombre[0] : '') + (est.primer_apellido ? est.primer_apellido[0] : '');
    var gradoSec = insc.seccion && insc.seccion.grado
      ? insc.seccion.grado.nombre + ' "' + insc.seccion.letra + '"'
      : '—';
    var color = colors[i % colors.length];

    html += '<div class="alert-item">' +
      '<div class="alert-item-info">' +
        '<div class="alert-avatar" style="background:' + color + ';">' + iniciales + '</div>' +
        '<div>' +
          '<div class="alert-name">' + nombre + '</div>' +
          '<div class="alert-sub">' + gradoSec + '</div>' +
        '</div>' +
      '</div>' +
      '<a href="/inscripciones.html" class="alert-btn orange">Gestionar</a>' +
    '</div>';
  });

  container.innerHTML = html;

  if (total > lista.length) {
    link.textContent = 'Ver todos los casos pendientes (' + total + ') →';
    link.style.display = 'block';
  }
}
COLAB OCULTO */

// D2: Animación count-up para stat cards (JS puro, sin librería)
function countUp(el, target, duration) {
  if (!el) return;
  target = parseInt(target) || 0;
  duration = duration || 900;
  if (target === 0) { el.textContent = '0'; return; }
  const start = performance.now();
  function update(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Easing: ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target).toLocaleString('es-VE');
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target.toLocaleString('es-VE');
  }
  requestAnimationFrame(update);
}

// ── RECORDATORIO DE BACKUP ──────────────────────────
async function verificarRecordatorioBackup() {
  try {
    // Solo para SUPER_ADMIN
    const meRes = await apiFetch('/api/me');
    const meData = await meRes.json();
    if (!meData.usuario || meData.usuario.rol !== 'SUPER_ADMIN') return;

    const res = await apiFetch('/api/backup/recordatorio');
    if (!res.ok) return;
    const data = await res.json();

    if (data.frecuencia === 'DESACTIVADO') return;

    // Calcular si ya pasó el intervalo desde el último backup
    var ahora = new Date();
    var ultimo = data.ultimo_backup ? new Date(data.ultimo_backup) : null;

    var diasIntervalo = { 'SEMANAL': 7, 'QUINCENAL': 15, 'MENSUAL': 30 }[data.frecuencia] || 30;

    var mostrar = false;
    if (!ultimo) {
      mostrar = true;
    } else if ((ahora - ultimo) > diasIntervalo * 24 * 60 * 60 * 1000) {
      mostrar = true;
    }

    if (!mostrar) return;

    // Verificar si el usuario descartó hoy (por sesión de navegador)
    var hoy = ahora.toISOString().slice(0, 10);
    if (sessionStorage.getItem('backupReminderDismissed') === hoy) return;

    // Mostrar banner
    var banner = document.getElementById('backupReminder');
    if (banner) {
      banner.style.display = 'block';

      // Texto contextual
      var textoEl = document.getElementById('backupReminderText');
      if (textoEl) {
        if (ultimo) {
          var diasPasados = Math.floor((ahora - ultimo) / (24 * 60 * 60 * 1000));
          textoEl.textContent = 'Último backup: ' +
            ultimo.toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' }) +
            '. Han pasado ' + diasPasados + ' días.';
        } else {
          textoEl.textContent = 'No se ha registrado ningún backup. Se recomienda crear uno ahora.';
        }
      }
    }
  } catch (e) {
    // Silencioso — no bloquear el dashboard si falla
  }
}

function descartarRecordatorioBackup() {
  var banner = document.getElementById('backupReminder');
  if (banner) banner.style.display = 'none';
  sessionStorage.setItem('backupReminderDismissed', new Date().toISOString().slice(0, 10));
}

// Ejecutar al cargar
verificarRecordatorioBackup();


// =========================================================
// BUSCADOR GLOBAL DE ESTUDIANTES INSCRITOS
// =========================================================

(function() {
  var searchInput = document.getElementById('globalSearch');
  var resultsBox = document.getElementById('globalSearchResults');
  if (!searchInput || !resultsBox) return;

  var debounceTimer = null;
  var expandedId = null;

  // Cerrar resultados al hacer clic fuera
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.global-search-wrapper')) {
      resultsBox.classList.remove('active');
      expandedId = null;
    }
  });

  // Listener de búsqueda con debounce
  searchInput.addEventListener('input', function() {
    var q = this.value.trim();
    clearTimeout(debounceTimer);
    expandedId = null;

    if (q.length < 2) {
      resultsBox.classList.remove('active');
      resultsBox.innerHTML = '';
      return;
    }

    debounceTimer = setTimeout(function() {
      buscarEstudiantes(q);
    }, 400);
  });

  // Focus → mostrar resultados si hay
  searchInput.addEventListener('focus', function() {
    if (resultsBox.innerHTML && this.value.trim().length >= 2) {
      resultsBox.classList.add('active');
    }
  });

  // ESC → cerrar
  searchInput.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      resultsBox.classList.remove('active');
      this.blur();
    }
  });

  async function buscarEstudiantes(q) {
    try {
      var res = await apiFetch('/api/busqueda-global?q=' + encodeURIComponent(q));
      if (!res) return;
      var data = await res.json();

      if (!data || data.length === 0) {
        resultsBox.innerHTML = '<div class="search-empty">' +
          '<div style="font-size:1.5rem;margin-bottom:6px">🔍</div>' +
          'No se encontraron estudiantes inscritos con ese criterio' +
          '</div>';
        resultsBox.classList.add('active');
        return;
      }

      var html = '';
      for (var i = 0; i < data.length; i++) {
        var insc = data[i];
        var est = insc.estudiante;
        var sec = insc.seccion;
        var nombre = est.primer_apellido + ' ' + (est.segundo_apellido || '') + ', ' + est.primer_nombre + ' ' + (est.segundo_nombre || '');
        nombre = nombre.replace(/\s+/g, ' ').trim();
        var gradoSeccion = sec.grado.nombre + ' "' + sec.letra + '"';

        html += '<div class="search-result-item" data-insc-id="' + insc.id + '" onclick="window._expandResult(' + insc.id + ', this)">';
        html += '  <div class="sr-header">';
        html += '    <span class="sr-name">' + escHtml(nombre) + '</span>';
        html += '    <span class="sr-badge">' + escHtml(gradoSeccion) + '</span>';
        html += '  </div>';
        html += '  <div class="sr-sub">';
        html += '    Cód: ' + (est.codigo_escolar || '—') + ' &bull; ';
        html += '    ' + (est.sexo === 'F' ? 'Femenino' : 'Masculino');
        html += '  </div>';
        html += '</div>';
      }

      resultsBox.innerHTML = html;
      resultsBox.classList.add('active');

      // Guardar datos para acceso rápido
      window._searchData = {};
      for (var j = 0; j < data.length; j++) {
        window._searchData[data[j].id] = data[j];
      }

    } catch (error) {
      console.error('Error en búsqueda global:', error);
    }
  }

  // Escapar HTML
  function escHtml(s) {
    if (!s) return '';
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Formatear fecha DD/MM/YYYY
  function fmtFecha(iso) {
    if (!iso) return '—';
    var d = iso.substring(0, 10).split('-');
    return d[2] + '/' + d[1] + '/' + d[0];
  }

  // Calcular edad
  function calcEdad(iso) {
    if (!iso) return '—';
    var nac = new Date(iso);
    var hoy = new Date();
    var edad = hoy.getFullYear() - nac.getFullYear();
    var m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad + ' años';
  }

  // Expandir un resultado para mostrar todos los datos
  window._expandResult = function(inscId, el) {
    // Si ya está expandido, colapsar
    if (expandedId === inscId) {
      var detailEl = el.querySelector('.sr-detail');
      if (detailEl) detailEl.remove();
      el.classList.remove('expanded');
      expandedId = null;
      return;
    }

    // Colapsar el anterior
    var prevExpanded = resultsBox.querySelector('.search-result-item.expanded');
    if (prevExpanded) {
      var prevDetail = prevExpanded.querySelector('.sr-detail');
      if (prevDetail) prevDetail.remove();
      prevExpanded.classList.remove('expanded');
    }

    expandedId = inscId;
    el.classList.add('expanded');

    var insc = window._searchData[inscId];
    if (!insc) return;

    var est = insc.estudiante;
    var rep = est.representante;
    var madre = est.madre;
    var padre = est.padre;
    var sec = insc.seccion;

    var nombreEst = [est.primer_nombre, est.segundo_nombre, est.primer_apellido, est.segundo_apellido].filter(Boolean).join(' ');

    var detail = '<div class="sr-detail">';

    // Datos del estudiante
    detail += '<div class="sr-section-title">📋 Datos del Estudiante</div>';
    detail += '<div class="sr-detail-grid">';
    detail += '<dt>Nombre completo</dt><dd>' + escHtml(nombreEst) + '</dd>';
    detail += '<dt>Cédula escolar</dt><dd>' + (est.codigo_escolar || '—') + '</dd>';
    detail += '<dt>Fecha nacimiento</dt><dd>' + fmtFecha(est.fecha_nacimiento) + '</dd>';
    detail += '<dt>Edad</dt><dd>' + calcEdad(est.fecha_nacimiento) + '</dd>';
    detail += '<dt>Sexo</dt><dd>' + (est.sexo === 'F' ? 'Femenino' : 'Masculino') + '</dd>';
    detail += '<dt>Grado / Sección</dt><dd>' + escHtml(sec.grado.nombre) + ' "' + escHtml(sec.letra) + '"</dd>';
    detail += '</div>';

    // Representante
    if (rep) {
      detail += '<div class="sr-section-title">👤 Representante</div>';
      detail += '<div class="sr-detail-grid">';
      detail += '<dt>Nombre</dt><dd>' + escHtml(rep.nombres) + ' ' + escHtml(rep.apellidos) + '</dd>';
      detail += '<dt>Cédula</dt><dd>' + (rep.nacionalidad || 'V') + '-' + (rep.cedula || '—') + '</dd>';
      detail += '<dt>Teléfono</dt><dd>' + (rep.telefono || '—') + '</dd>';
      detail += '</div>';
    }

    // Madre
    if (madre && madre.id !== (rep && rep.id)) {
      detail += '<div class="sr-section-title">👩 Madre</div>';
      detail += '<div class="sr-detail-grid">';
      detail += '<dt>Nombre</dt><dd>' + escHtml(madre.nombres) + ' ' + escHtml(madre.apellidos) + '</dd>';
      detail += '<dt>Cédula</dt><dd>' + (madre.nacionalidad || 'V') + '-' + (madre.cedula || '—') + '</dd>';
      detail += '</div>';
    }

    // Padre
    if (padre && padre.id !== (rep && rep.id)) {
      detail += '<div class="sr-section-title">👨 Padre</div>';
      detail += '<div class="sr-detail-grid">';
      detail += '<dt>Nombre</dt><dd>' + escHtml(padre.nombres) + ' ' + escHtml(padre.apellidos) + '</dd>';
      detail += '<dt>Cédula</dt><dd>' + (padre.nacionalidad || 'V') + '-' + (padre.cedula || '—') + '</dd>';
      detail += '</div>';
    }

    // Dirección
    if (insc.direccion) {
      detail += '<div class="sr-section-title">📍 Dirección Actual</div>';
      detail += '<div style="font-size:12px;color:var(--text)">' + escHtml(insc.direccion) + '</div>';
    }

    // Botones de acción
    detail += '<div class="sr-actions">';
    detail += '<button class="btn-primary-sm" onclick="event.stopPropagation(); window._generarConstanciaBG(' + insc.id + ')">📄 Constancia de Estudio</button>';
    detail += '<button onclick="event.stopPropagation(); window._generarFichaBG(' + insc.id + ', \'INICIAL\')">📋 Ficha Inicial (7p)</button>';
    detail += '<button onclick="event.stopPropagation(); window._generarFichaBG(' + insc.id + ', \'PRIMARIA\')">📋 Ficha Primaria (5p)</button>';
    detail += '</div>';

    detail += '</div>';

    el.insertAdjacentHTML('beforeend', detail);
  };

  // Generar Constancia de Estudio desde el buscador
  window._generarConstanciaBG = async function(inscripcionId) {
    try {
      var res = await apiFetch('/api/reportes/constancia?inscripcion_id=' + inscripcionId);
      if (!res) return;
      if (!res.ok) {
        var err = await res.json();
        await alertDialog({ title: 'Error', message: err.error || 'No se pudo obtener los datos.', type: 'error' });
        return;
      }
      var datos = await res.json();
      if (!datos.config.director || !datos.config.cedula_director) {
        await alertDialog({
          title: 'Datos incompletos',
          message: 'Debe configurar el <strong>Nombre</strong> y la <strong>Cédula del Director/a</strong> en Configuración.',
          type: 'warning'
        });
        return;
      }
      await generarPDFConstancia(datos);
    } catch (error) {
      console.error('Error constancia:', error);
      await alertDialog({ title: 'Error', message: 'Error al generar la constancia.', type: 'error' });
    }
  };

  // Generar Ficha de Inscripción desde el buscador
  window._generarFichaBG = async function(inscripcionId, tipo) {
    try {
      var res = await apiFetch('/api/reportes/ficha-inscripcion?inscripcion_id=' + inscripcionId);
      if (!res) return;
      if (!res.ok) {
        var err = await res.json();
        await alertDialog({ title: 'Error', message: err.error || 'No se pudo obtener los datos.', type: 'error' });
        return;
      }
      var datos = await res.json();
      if (tipo === 'INICIAL') {
        await generarPDFFichaInicial(datos);
      } else {
        await generarPDFFichaPrimaria(datos);
      }
    } catch (error) {
      console.error('Error ficha:', error);
      await alertDialog({ title: 'Error', message: 'Error al generar la ficha.', type: 'error' });
    }
  };

})();
