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
