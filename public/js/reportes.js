// reportes.js - Logica de la pagina de reportes

document.addEventListener('DOMContentLoaded', function() {
  cargarAniosEscolares();

  document.getElementById('selAnioMatricula').addEventListener('change', function(e) {
    cargarSecciones(e.target.value);
  });
});

async function cargarAniosEscolares() {
  try {
    var res = await apiFetch('/api/anios-escolares');
    if (!res) return;
    var anios = await res.json();

    var selAnio = document.getElementById('selAnioMatricula');
    var selAnioEst = document.getElementById('selAnioEstadisticas');

    selAnio.innerHTML = '<option value="">Seleccione...</option>';
    selAnioEst.innerHTML = '<option value="">Seleccione...</option>';

    anios.forEach(function(a) {
      var label = a.nombre + (a.activo ? ' (Activo)' : '');
      selAnio.insertAdjacentHTML('beforeend', '<option value="' + a.id + '">' + label + '</option>');
      selAnioEst.insertAdjacentHTML('beforeend', '<option value="' + a.id + '">' + label + '</option>');
    });

    var anioActivo = anios.find(function(a) { return a.activo; });
    if (anioActivo) {
      selAnio.value = anioActivo.id;
      selAnioEst.value = anioActivo.id;
      cargarSecciones(anioActivo.id);
    }
  } catch (error) {
    console.error(error);
    showAlert('alertReportes', 'Error al cargar los anos escolares', 'error');
  }
}

async function cargarSecciones(anio_escolar_id) {
  var selSeccion = document.getElementById('selSeccionMatricula');
  if (!anio_escolar_id) {
    selSeccion.innerHTML = '<option value="">Seleccione un ano escolar primero...</option>';
    return;
  }

  try {
    var res = await apiFetch('/api/secciones?anio_escolar_id=' + anio_escolar_id);
    if (!res) return;
    var secciones = await res.json();

    selSeccion.innerHTML = '<option value="">Seleccione...</option>';
    secciones.forEach(function(s) {
      selSeccion.insertAdjacentHTML('beforeend', '<option value="' + s.id + '">' + s.grado.nombre + ' - Seccion "' + s.letra + '"</option>');
    });
  } catch (error) {
    console.error(error);
    showAlert('alertReportes', 'Error al cargar secciones', 'error');
  }
}

async function generarMatricula() {
  var anio_escolar_id = document.getElementById('selAnioMatricula').value;
  var seccion_id = document.getElementById('selSeccionMatricula').value;

  if (!anio_escolar_id || !seccion_id) {
    showAlert('alertReportes', 'Seleccione un ano escolar y una seccion', 'error');
    return;
  }

  try {
    var res = await apiFetch('/api/reportes/matricula?anio_escolar_id=' + anio_escolar_id + '&seccion_id=' + seccion_id);
    if (!res) return;
    var datos = await res.json();

    if (datos.estudiantes.length === 0) {
      showAlert('alertReportes', 'No hay estudiantes inscritos en esta seccion', 'error');
      return;
    }

    await generarPDFMatriculaInicial(datos);
    showAlert('alertReportes', 'PDF de matricula generado con exito', 'success');
  } catch (error) {
    console.error(error);
    showAlert('alertReportes', 'Error al generar reporte de matricula', 'error');
  }
}

async function buscarInscripciones() {
  var buscar = document.getElementById('inputBuscarInscripcion').value.trim();
  if (!buscar) return;

  try {
    var res = await apiFetch('/api/inscripciones?buscar=' + encodeURIComponent(buscar) + '&limite=50');
    if (!res) return;
    var data = await res.json();

    var selInsc = document.getElementById('selInscripcionFicha');
    selInsc.innerHTML = '<option value="">Seleccione un resultado...</option>';

    if (data.datos.length === 0) {
      selInsc.innerHTML = '<option value="">No se encontraron resultados</option>';
      return;
    }

    data.datos.forEach(function(insc) {
      var e = insc.estudiante;
      var texto = e.primer_apellido + ' ' + e.primer_nombre + ' (' + (e.codigo_escolar || 'Sin ID') + ') - ' + insc.seccion.grado.nombre + ' "' + insc.seccion.letra + '" (' + insc.anio_escolar.nombre + ')';
      selInsc.insertAdjacentHTML('beforeend', '<option value="' + insc.id + '">' + texto + '</option>');
    });
  } catch (error) {
    console.error(error);
    showAlert('alertReportes', 'Error al buscar inscripciones', 'error');
  }
}

async function generarFicha(tipo) {
  var inscripcion_id = document.getElementById('selInscripcionFicha').value;
  if (!inscripcion_id) {
    showAlert('alertReportes', 'Seleccione una inscripcion de la lista', 'error');
    return;
  }

  try {
    var res = await apiFetch('/api/reportes/ficha-inscripcion?inscripcion_id=' + inscripcion_id);
    if (!res) return;
    var datos = await res.json();

    if (tipo === 'INICIAL') {
      await generarPDFFichaInicial(datos);
    } else {
      await generarPDFFichaPrimaria(datos);
    }
    showAlert('alertReportes', 'PDF de Ficha (' + tipo + ') generado con exito', 'success');
  } catch (error) {
    console.error(error);
    showAlert('alertReportes', 'Error al generar ficha', 'error');
  }
}

async function cargarEstadisticas() {
  var anio_escolar_id = document.getElementById('selAnioEstadisticas').value;
  if (!anio_escolar_id) {
    showAlert('alertReportes', 'Seleccione un ano escolar', 'error');
    return;
  }

  try {
    var res = await apiFetch('/api/reportes/estadisticas?anio_escolar_id=' + anio_escolar_id);
    if (!res) return;
    var datos = await res.json();

    var tbody = document.getElementById('tbodyEstadisticas');
    tbody.innerHTML = '';

    if (datos.por_grado.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">No hay datos para este ano escolar</td></tr>';
    } else {
      datos.por_grado.forEach(function(g) {
        tbody.insertAdjacentHTML('beforeend',
          '<tr class="grado-row"><td colspan="4">' + g.grado + '</td></tr>'
        );
        g.secciones.forEach(function(s) {
          tbody.insertAdjacentHTML('beforeend',
            '<tr><td>Seccion "' + s.letra + '"</td><td>' + s.varones + '</td><td>' + s.hembras + '</td><td><strong>' + s.total + '</strong></td></tr>'
          );
        });
        tbody.insertAdjacentHTML('beforeend',
          '<tr style="background:hsl(0,0%,98%);font-weight:600;"><td style="text-align:right;">Total ' + g.grado + ':</td><td>' + g.varonesGrado + '</td><td>' + g.hembraGrado + '</td><td>' + g.totalGrado + '</td></tr>'
        );
      });
    }

    document.getElementById('totVarones').textContent = datos.totales_globales.varones;
    document.getElementById('totHembras').textContent = datos.totales_globales.hembras;
    document.getElementById('totTotal').textContent = datos.totales_globales.total;

    document.getElementById('tablaEstadisticasContainer').style.display = 'block';
  } catch (error) {
    console.error(error);
    showAlert('alertReportes', 'Error al cargar estadisticas', 'error');
  }
}
