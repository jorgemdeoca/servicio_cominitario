// pdf-certificado.js - Generador de Certificación Laboral

// Convierte texto a Title Case: primera letra de cada palabra en mayúscula, resto minúscula
function toTitleCase(str) {
  if (!str) return str;
  return str.toLowerCase().replace(/(?:^|\s)\S/g, function(c) { return c.toUpperCase(); });
}

async function generarPDFCertificado(datos) {
  var doc = inicializarPDF(false); // portrait, carta
  var pageW = doc.internal.pageSize.getWidth();
  var pageH = doc.internal.pageSize.getHeight();
  var marginL = 72;
  var marginR = 72;
  var usableW = pageW - marginL - marginR;
  var centerX = pageW / 2;
  var lineHeight = 24; // Interlineado doble

  var config = datos.config;
  var prof = datos.profesor;

  // Cargar logos
  var logoMppe = await loadImageDataUrl('/img/logo_MPPE_sin_letras.png');
  var logoEscuela = null;
  if (config.logo_url) {
    logoEscuela = await loadImageDataUrl(config.logo_url + '?v=' + Date.now());
  }

  // ==========================================
  // MEMBRETE SUPERIOR
  // ==========================================
  var logoSize = 50;
  var yMembrete = 40;

  if (logoEscuela) {
    doc.addImage(logoEscuela, 'PNG', marginL, yMembrete - 10, logoSize, logoSize);
  }
  if (logoMppe) {
    doc.addImage(logoMppe, 'PNG', pageW - marginR - logoSize, yMembrete - 10, logoSize, logoSize);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('República Bolivariana de Venezuela', centerX, yMembrete + 2, { align: 'center' });

  var nombreEscuela = toTitleCase(config.nombre_escuela || '');
  doc.text(nombreEscuela, centerX, yMembrete + 2 + lineHeight, { align: 'center' });

  var localidad = toTitleCase(config.localidad || '');
  var municipio = toTitleCase(config.municipio || '');
  var localidadMunicipio = '';
  if (localidad && municipio) {
    localidadMunicipio = localidad + '- Municipio ' + municipio;
  } else if (municipio) {
    localidadMunicipio = 'Municipio ' + municipio;
  } else if (localidad) {
    localidadMunicipio = localidad;
  }
  doc.text(localidadMunicipio, centerX, yMembrete + 2 + lineHeight * 2, { align: 'center' });

  // ==========================================
  // TÍTULO
  // ==========================================
  var yTitulo = yMembrete + 2 + lineHeight * 2 + lineHeight * 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Certificación Laboral', centerX, yTitulo, { align: 'center' });

  // ==========================================
  // CUERPO DEL DOCUMENTO
  // ==========================================
  var yCuerpo = yTitulo + lineHeight * 2;
  doc.setFontSize(12);

  var directorNombre = toTitleCase(config.director || '[Director/a]');
  var cedulaDirector = config.cedula_director || '[Cédula]';
  var telefonoDirector = config.telefono_director || '[Teléfono]';
  var nombreInstitucion = toTitleCase(config.nombre_escuela || '[Nombre de la Institución]');
  var codigoDependencia = config.codigo_dependencia || '[Código]';
  var codigoEstadistico = config.codigo_estadistico || '[Código]';
  var codigoDEA = config.codigo_plantel || '[Código]';
  var direccionInst = toTitleCase(config.direccion || '[Dirección]');
  var localidadDoc = toTitleCase(config.localidad || '[Localidad]');
  var parroquia = toTitleCase(config.parroquia || '[Parroquia]');
  var municipioDoc = toTitleCase(config.municipio || '[Municipio]');
  var estadoDoc = toTitleCase(config.estado || '[Estado]');
  var rif = config.rif || '';

  // Datos del trabajador
  var nombreTrabajador = toTitleCase(((prof.nombres || '') + ' ' + (prof.apellidos || '')).trim()) || '[Nombre del Trabajador]';
  var cedulaTrabajador = prof.cedula || '[Cédula]';
  var cargoTrabajador = toTitleCase(prof.cargo || '[Cargo]');
  var codigoCargo = prof.codigo_cargo || '';
  var turno = toTitleCase(prof.turno || 'Mañana');

  // Género para "el ciudadano" / "la ciudadana"
  var esFemenino = prof.sexo === 'F';
  var ciudadano = esFemenino ? 'la ciudadana' : 'el ciudadano';

  // Fecha de ingreso
  var fechaIngreso = '';
  if (prof.fecha_ingreso_institucion) {
    var fi = new Date(prof.fecha_ingreso_institucion);
    var mesesEs = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    fechaIngreso = fi.getDate().toString().padStart(2, '0') + ' de ' + mesesEs[fi.getMonth()] + ' de ' + fi.getFullYear();
  } else {
    fechaIngreso = '[Fecha de Ingreso]';
  }

  // Texto de lo que atiende según tipo
  var atencion = prof.es_docente
    ? 'la educación de los estudiantes'
    : 'el mantenimiento de la institución';

  // ====== PÁRRAFO 1: Quien suscribe ======
  var partes1 = [
    { text: 'Quien suscribe ', bold: false },
    { text: directorNombre, bold: true, underline: true },
    { text: ', titular de la cédula de identidad N°', bold: false },
    { text: cedulaDirector, bold: true, underline: true },
    { text: ' en su condición de Director (E), hace constar por medio de la presente que ' + ciudadano + ': ', bold: false },
    { text: nombreTrabajador, bold: true, underline: true },
    { text: ', titular de la cédula N° V. ', bold: false },
    { text: cedulaTrabajador, bold: true, underline: true },
    { text: ' en la actualidad trabaja en esta institución ', bold: false },
    { text: nombreInstitucion, bold: true, underline: true },
    { text: ', Código de Dependencia: ', bold: false },
    { text: codigoDependencia, bold: true, underline: true },
    { text: ', Código Estadístico: ', bold: false },
    { text: codigoEstadistico, bold: true, underline: true },
    { text: ', Código DEA: ', bold: false },
    { text: codigoDEA, bold: true, underline: true },
    { text: ', Ubicada en ', bold: false },
    { text: direccionInst, bold: true, underline: true },
    { text: ', ', bold: false },
    { text: localidadDoc, bold: true, underline: true },
    { text: ', Parroquia ', bold: false },
    { text: parroquia, bold: true, underline: true },
    { text: ', Municipio ', bold: false },
    { text: municipioDoc, bold: true, underline: true },
    { text: ' Estado ', bold: false },
    { text: estadoDoc, bold: true, underline: true },
    { text: ', con el cargo de ', bold: false },
    { text: cargoTrabajador, bold: true, underline: true }
  ];

  // Agregar código de cargo solo si existe
  if (codigoCargo) {
    partes1.push({ text: ' Código de Cargo: ', bold: false });
    partes1.push({ text: codigoCargo, bold: true, underline: true });
  }

  partes1.push({ text: ', atendiendo ' + atencion + ' desde el ', bold: false });
  partes1.push({ text: fechaIngreso, bold: true, underline: true });
  partes1.push({ text: ' hasta la presente fecha, en el turno de ', bold: false });
  partes1.push({ text: 'la ' + turno.toLowerCase(), bold: true, underline: true });
  partes1.push({ text: '.', bold: false });

  // Función renderParrafoMixto (igual que en pdf-constancia.js)
  function renderParrafoMixto(doc, partes, x, y, maxWidth, lineH) {
    var words = [];
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

      if (currentX + wordWidth > x + maxWidth && word.text.trim().length > 0) {
        currentX = x;
        currentY += lineH;
      }

      doc.text(word.text, currentX, currentY);

      if (word.underline && word.text.trim().length > 0) {
        doc.setLineWidth(0.5);
        doc.line(currentX, currentY + 1.5, currentX + wordWidth, currentY + 1.5);
      }

      currentX += wordWidth;
    });

    return currentY + lineH;
  }

  // Renderizar párrafo principal
  var yActual = yCuerpo;
  yActual = renderParrafoMixto(doc, partes1, marginL, yActual, usableW, lineHeight);

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

  var partesFecha = [
    { text: 'Certificación que se expide a petición de las partes interesadas en ', bold: false },
    { text: localidadDoc, bold: true, underline: true },
    { text: ' a los ', bold: false },
    { text: dia.toString(), bold: true, underline: true },
    { text: ' días del mes de ', bold: false },
    { text: mes, bold: true, underline: true },
    { text: ' de ', bold: false },
    { text: anio.toString(), bold: true, underline: true },
    { text: '.', bold: false }
  ];

  yActual = renderParrafoMixto(doc, partesFecha, marginL, yActual, usableW, lineHeight);

  // ==========================================
  // ATENTAMENTE
  // ==========================================
  yActual += lineHeight * 1;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.text('Atentamente', centerX, yActual, { align: 'center' });

  // ==========================================
  // LÍNEA DE FIRMA
  // ==========================================
  yActual += lineHeight * 4;
  var firmaWidth = 200;
  var firmaX = centerX - firmaWidth / 2;
  doc.setLineWidth(0.5);
  doc.line(firmaX, yActual, firmaX + firmaWidth, yActual);

  // ==========================================
  // DATOS DEL DIRECTOR (debajo de la firma)
  // ==========================================
  yActual += lineHeight * 0.7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Msc. ' + directorNombre, centerX, yActual, { align: 'center' });

  yActual += lineHeight * 0.7;
  doc.setFont('helvetica', 'normal');
  doc.text('C.I ' + cedulaDirector, centerX, yActual, { align: 'center' });

  yActual += lineHeight * 0.7;
  doc.text('Telf. ' + telefonoDirector, centerX, yActual, { align: 'center' });

  // Sexo del director para título (si hay campo sexo_director en config, si no asumimos según nombre)
  var sexoDirector = config.sexo_director || '';
  var tituloDirector = sexoDirector === 'F' ? 'Directora (E)' : 'Director (E)';

  yActual += lineHeight * 0.7;
  doc.setFont('helvetica', 'bold');
  doc.text(tituloDirector, centerX, yActual, { align: 'center' });

  // ==========================================
  // MARCA DE AGUA / PIE DE PÁGINA
  // ==========================================
  var yPie = pageH - 40;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);

  // Línea 1: RIF
  if (rif) {
    doc.text('Rif. J-' + rif, centerX, yPie - 12, { align: 'center' });
  }

  // Línea 2: Dirección completa
  var pieDir = direccionInst + '. ' + localidadDoc + ' Municipio ' + municipioDoc + ', Estado ' + estadoDoc;
  doc.text(pieDir, centerX, yPie, { align: 'center' });

  // Restaurar color
  doc.setTextColor(0, 0, 0);

  // Guardar
  var nombreArchivo = 'Certificado_' + nombreTrabajador.replace(/\s+/g, '_') + '.pdf';
  doc.save(nombreArchivo);
}
