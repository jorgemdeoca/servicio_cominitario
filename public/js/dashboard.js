// Dashboard - Carga de estadísticas reales
document.addEventListener('DOMContentLoaded', function() {
  cargarDashboard();
});

async function cargarDashboard() {
  try {
    const res = await apiFetch('/api/dashboard/estadisticas');
    if (!res || !res.ok) return;
    const data = await res.json();

    // 1. Stat cards
    document.getElementById('statEstudiantes').textContent = data.estudiantes;
    document.getElementById('statPersonas').textContent = data.personas;
    document.getElementById('statInscripciones').textContent = data.inscripciones;
    document.getElementById('statProfesores').textContent = data.profesores;

    // 2. Gráfico de barras - Matrícula por Grado
    renderBarChart(data.matriculaPorGrado);

    // 3. Gráfico donut - Distribución por Sexo
    renderDonut(data.totalVarones, data.totalHembras);

    // 4. Lista sin inscribir
    renderSinInscribir(data.sinInscribir, data.totalSinInscribir);

    // 5. Lista sin colaboración
    renderSinColaboracion(data.sinColaboracion, data.totalSinColab);

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
