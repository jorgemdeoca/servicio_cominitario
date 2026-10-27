// pdf-constancia.js - Generador de Constancias de Estudio

async function generarPDFConstancia(datos) {
  var doc = inicializarPDF(false); // portrait
  var pageW = doc.internal.pageSize.getWidth();
  var marginL = 72;
  var marginR = 72;
  var usableW = pageW - marginL - marginR;
  var centerX = pageW / 2;
  var lineHeight = 24; // Interlineado doble para tamaño 12 en TODO el documento

  // Cargar logos (MPPE = solo el círculo de colores, sin letras)
  var logoMppe = await loadImageDataUrl('/img/logo_MPPE_sin_letras.png');
  var logoEscuela = null;
  if (datos.config.logo_url) {
    logoEscuela = await loadImageDataUrl(datos.config.logo_url + '?v=' + Date.now());
  }

  // ==========================================
  // MEMBRETE SUPERIOR (con interlineado doble)
  // ==========================================
  var logoSize = 50;
  var yMembrete = 40;

  // Logo Institución a la IZQUIERDA
  if (logoEscuela) {
    doc.addImage(logoEscuela, 'PNG', marginL, yMembrete - 10, logoSize, logoSize);
  }

  // Logo MPPE a la DERECHA
  if (logoMppe) {
    doc.addImage(logoMppe, 'PNG', pageW - marginR - logoSize, yMembrete - 10, logoSize, logoSize);
  }

  // Texto del membrete centrado con interlineado doble
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('REPÚBLICA BOLIVARIANA DE VENEZUELA', centerX, yMembrete + 2, { align: 'center' });

  var nombreEscuela = (datos.config.nombre_escuela || '').toUpperCase();
  doc.text(nombreEscuela, centerX, yMembrete + 2 + lineHeight, { align: 'center' });

  // Localidad y Estado en negrita con interlineado doble
  var localidad = datos.config.localidad || '';
  var estado = datos.config.estado || '';
  var localidadEstado = '';
  if (localidad && estado) {
    localidadEstado = localidad.toUpperCase() + ' – ESTADO ' + estado.toUpperCase();
  } else if (estado) {
    localidadEstado = 'ESTADO ' + estado.toUpperCase();
  } else if (localidad) {
    localidadEstado = localidad.toUpperCase();
  }
  doc.text(localidadEstado, centerX, yMembrete + 2 + lineHeight * 2, { align: 'center' });

  // ==========================================
  // TÍTULO (con espacio de interlineado doble)
  // ==========================================
  var yTitulo = yMembrete + 2 + lineHeight * 2 + lineHeight * 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Constancia de Estudio', centerX, yTitulo, { align: 'center' });

  // ==========================================
  // CUERPO DEL DOCUMENTO
  // ==========================================
  var yCuerpo = yTitulo + lineHeight * 2;
  doc.setFontSize(12);

  var config = datos.config;
  var est = datos.estudiante;

  var directorNombre = config.director || '[Director/a]';
  var cedulaDirector = config.cedula_director || '[Cédula]';
  var nombreEscuelaDoc = config.nombre_escuela || '[Nombre de la Institución]';
  var municipio = config.municipio || '[Municipio]';
  var parroquia = config.parroquia || '[Parroquia]';
  var estadoDoc = config.estado || '[Estado]';

  var nombreEstudiante = est.nombre_completo || '[Nombre del Estudiante]';
  var codigoEscolar = est.codigo_escolar || '[Código Escolar]';
  var estadoNacimiento = est.estado_nacimiento || '[Estado]';
  var lugarNacimiento = est.lugar_nacimiento || '[Lugar]';
  var fechaNacimiento = est.fecha_nacimiento || '[Fecha]';
  var gradoSeccion = datos.grado_seccion || '[Grado Sección]';
  var nivelEducacion = datos.nivel_educacion || '[Nivel]';
  var genero = est.genero || 'niño';
  var nacido = est.nacido || 'nacido';
  var portador = est.portador || 'portador';

  // ====== PÁRRAFO 1: Quien suscribe ======
  var partes1 = [
    { text: 'Quien suscribe: ', bold: false },
    { text: directorNombre, bold: true, underline: true },
    { text: ', titular de la Cédula de Identidad N° V.- ', bold: false },
    { text: cedulaDirector, bold: true, underline: true },
    { text: '. Director (a) de la Institución Educativa ', bold: false },
    { text: nombreEscuelaDoc, bold: true, underline: true },
    { text: ', ubicada en el Municipio ', bold: false },
    { text: municipio, bold: true, underline: true },
    { text: ', de la Parroquia ', bold: false },
    { text: parroquia, bold: true, underline: true },
    { text: ', adscrita al Centro de Desarrollo de la Calidad Educativa Estadal ESTADO ', bold: false },
    { text: estadoDoc, bold: true, underline: true },
    { text: '.', bold: false }
  ];

  // ====== PÁRRAFO 2: Hace constar ======
  var partes2 = [
    { text: 'Por la presente hace constar que el ' + genero + ' ', bold: false },
    { text: nombreEstudiante, bold: true, underline: true },
    { text: ', ' + portador + ' de la Cédula Escolar N° ', bold: false },
    { text: codigoEscolar, bold: true, underline: true },
    { text: ', ' + nacido + ' (a) en el Estado ', bold: false },
    { text: estadoNacimiento, bold: true, underline: true },
    { text: ', Municipio ', bold: false },
    { text: lugarNacimiento, bold: true, underline: true },
    { text: ', en fecha ', bold: false },
    { text: fechaNacimiento, bold: true, underline: true },
    { text: ', cursa el estudio en este plantel en ', bold: false },
    { text: gradoSeccion, bold: true, underline: true },
    { text: ', del Nivel de ', bold: false },
    { text: nivelEducacion, bold: true, underline: true },
    { text: '.', bold: false }
  ];

  // Función para renderizar párrafos con formato mixto y word-wrap
  function renderParrafoMixto(doc, partes, x, y, maxWidth, lineH) {
    var words = [];
    // Descomponer cada parte en palabras manteniendo su formato
    partes.forEach(function(parte) {
      var tokens = parte.text.split(/(\s+)/);
      tokens.forEach(function(token) {
        if (token.length > 0) {
          words.push({
            text: token,
            bold: parte.bold || false,
            underline: parte.underline || false
          });
        }
      });
    });

    var currentX = x;
    var currentY = y;

    words.forEach(function(word) {
      doc.setFont('helvetica', word.bold ? 'bold' : 'normal');
      var wordWidth = doc.getTextWidth(word.text);

      // Si no cabe en la línea actual, saltar a la siguiente
      if (currentX + wordWidth > x + maxWidth && word.text.trim().length > 0) {
        currentX = x;
        currentY += lineH;
      }

      doc.text(word.text, currentX, currentY);

      // Subrayado solo para texto que no sea espacio
      if (word.underline && word.text.trim().length > 0) {
        doc.setLineWidth(0.5);
        doc.line(currentX, currentY + 1.5, currentX + wordWidth, currentY + 1.5);
      }

      currentX += wordWidth;
    });

    return currentY + lineH;
  }

  // Renderizar párrafo 1
  var yActual = yCuerpo;
  yActual = renderParrafoMixto(doc, partes1, marginL, yActual, usableW, lineHeight);

  // Espacio entre párrafos (una línea doble)
  yActual += lineHeight * 0.5;

  // Renderizar párrafo 2
  yActual = renderParrafoMixto(doc, partes2, marginL, yActual, usableW, lineHeight);

  // ==========================================
  // FECHA DE EXPEDICIÓN
  // ==========================================
  yActual += lineHeight * 1.5;

  var hoy = new Date();
  var dia = hoy.getDate();
  var meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var mes = meses[hoy.getMonth()];
  var anio = hoy.getFullYear();
  var localidadFecha = config.localidad || '[Localidad]';

  var partesFecha = [
    { text: 'Constancia que se expide en ', bold: false },
    { text: localidadFecha, bold: true, underline: true },
    { text: ', a los ', bold: false },
    { text: dia.toString(), bold: true, underline: true },
    { text: ' días del mes de ', bold: false },
    { text: mes, bold: true, underline: true },
    { text: ' de ', bold: false },
    { text: anio.toString(), bold: true, underline: true },
    { text: '.', bold: false }
  ];

  yActual = renderParrafoMixto(doc, partesFecha, marginL, yActual, usableW, lineHeight);

  // ==========================================
  // DATOS DEL DIRECTOR — todo en una misma línea
  // ==========================================
  yActual += lineHeight * 1.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);

  // DIRECTOR (A).    Nombre y Apellido: [nombre].    Número de C.I: [cédula].
  var lineaDirector = 'DIRECTOR (A).     Nombre y Apellido: ' + directorNombre + '.     Número de C.I: ' + cedulaDirector + '.';

  // Si cabe en una línea, centrar; si no, usar el renderizado con wrap
  var anchoLinea = doc.getTextWidth(lineaDirector);
  if (anchoLinea <= usableW) {
    doc.text(lineaDirector, centerX, yActual, { align: 'center' });
  } else {
    // Renderizar con wrap si es muy largo
    var partesDir = [
      { text: 'DIRECTOR (A).   Nombre y Apellido: ', bold: false },
      { text: directorNombre, bold: false },
      { text: '.   Número de C.I: ', bold: false },
      { text: cedulaDirector, bold: false },
      { text: '.', bold: false }
    ];
    yActual = renderParrafoMixto(doc, partesDir, marginL, yActual, usableW, lineHeight) - lineHeight;
  }

  // ==========================================
  // FIRMA Y SELLO — línea horizontal + texto
  // ==========================================
  // Espacio amplio para que la directora pueda firmar y sellar
  yActual += lineHeight * 5;

  // Línea horizontal para la firma
  var firmaWidth = 250;
  var firmaX = centerX - firmaWidth / 2;
  doc.setLineWidth(0.5);
  doc.line(firmaX, yActual, firmaX + firmaWidth, yActual);

  // Texto "Firma y Sello" debajo de la línea
  yActual += lineHeight * 0.8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text('Firma y Sello', centerX, yActual, { align: 'center' });

  // Guardar
  var nombreArchivo = 'Constancia_' + (est.nombre_completo || 'estudiante').replace(/\s+/g, '_') + '.pdf';
  doc.save(nombreArchivo);
}
