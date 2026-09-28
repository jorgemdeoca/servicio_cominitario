// pdf-generator.js - Funciones para generar PDFs con jsPDF

function inicializarPDF(landscape) {
  var jsPDF = window.jspdf.jsPDF;
  return new jsPDF(landscape ? 'l' : 'p', 'pt', 'letter');
}

function loadImageDataUrl(url) {
  return new Promise(function(resolve, reject) {
    var img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function() {
      var canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = function() { resolve(null); }; // Resolve to null if not found
    img.src = url;
  });
}

async function generarPDFMatriculaInicial(datos) {
  var doc = inicializarPDF(true);
  var pageW = doc.internal.pageSize.getWidth();
  var marginL = 28;
  var marginR = 28;
  var usableW = pageW - marginL - marginR;

  // Cargar logo
  var logoMppe = await loadImageDataUrl('/img/logo_MPPE.png');
  if (logoMppe) {
    doc.addImage(logoMppe, 'PNG', marginL, 18, 28, 28);
  }

  // Líneas verticales del membrete
  doc.setLineWidth(0.5);
  doc.line(marginL + 35, 18, marginL + 35, 46);
  doc.line(marginL + 152, 18, marginL + 152, 46);

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Despacho del', marginL + 42, 30);
  doc.text('Viceministerio de Educación', marginL + 42, 40);
  
  doc.text('Dirección general de', marginL + 159, 30);
  doc.text('Registro y Control Académico', marginL + 159, 40);

  // Título principal
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  var anioEscolar = datos.anio_escolar ? datos.anio_escolar.nombre : '';
  var titulo = 'INSCRIPCIÓN INICIAL AÑO ESCOLAR ' + anioEscolar;
  doc.text(titulo, pageW / 2, 58, { align: 'center' });

  // Total matrícula
  doc.setFontSize(8);
  var textTotales = 'Total Matrícula: V=' + datos.totales.varones + ' H=' + datos.totales.hembras + ' T=' + datos.totales.total;
  doc.text(textTotales, pageW - marginR, 58, { align: 'right' });

  // Info institución
  var config = datos.config || {};
  var nombreInst = config.nombre_escuela || 'U.E.E. "General Aquilino Juáres"';
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text('INSTITUCIÓN: ' + nombreInst, marginL, 72);

  var gradoNombre = datos.grado ? datos.grado.nombre : '';
  var seccionLetra = datos.seccion ? datos.seccion.letra : '';
  doc.text('Grado: ' + gradoNombre, marginL, 84);
  doc.text('Sección: "' + seccionLetra + '"', marginL + 120, 84);
  doc.text('Parroquia: ' + (config.parroquia || ''), 310, 84);

  var prof1 = datos.profesores && datos.profesores.length > 0 ? datos.profesores[0] : null;
  var prof2 = datos.profesores && datos.profesores.length > 1 ? datos.profesores[1] : null;
  
  if (prof1) {
    doc.text('Docente: ' + prof1.nombre, marginL, 95);
    doc.text('C.I: ' + prof1.cedula, marginL + 120, 95);
  } else {
    doc.text('Docente: NO ASIGNADO', marginL, 95);
  }
  doc.text('Municipio: ' + (config.municipio || ''), 310, 95);
  
  if (prof2) {
    doc.text('Docente: ' + prof2.nombre, marginL, 106);
    doc.text('C.I: ' + prof2.cedula, marginL + 120, 106);
  }
  doc.text('Dirección: ' + (config.direccion || ''), 310, 106);

  var head = [
    [
      { content: 'N°', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Código\nEscolar', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Apellidos y Nombres', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Lugar de\nNacimiento', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Fecha de Nacimiento', colSpan: 3, styles: { halign: 'center' } },
      { content: 'E\nd\na\nd', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'S\ne\nx\no', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Representante', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Cédula de\nIdentidad', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Dirección', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Teléfono', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
    ],
    [
      { content: 'Día', styles: { halign: 'center' } },
      { content: 'Mes', styles: { halign: 'center' } },
      { content: 'Año', styles: { halign: 'center' } }
    ]
  ];

  var data = datos.estudiantes.map(function(e) {
    var fn = (e.fecha_nacimiento || '//').split('/');
    var d = fn[0] || '';
    var m = fn[1] || '';
    var a = fn[2] || '';
    return [
      e.numero, 
      e.codigo_escolar, 
      e.apellidos_nombres, 
      e.lugar_nacimiento, 
      d, m, a, 
      e.edad, 
      e.sexo, 
      e.representante, 
      e.ci_representante, 
      e.direccion, 
      e.telefono
    ];
  });

  // Anchos de columna proporcionales para que quepa todo
  // N° | Código | Apellidos&Nombres | Lugar | Día | Mes | Año | Edad | Sexo | Representante | CI | Dirección | Teléfono
  var colWidths = {
    0: { cellWidth: 18 },    // N°
    1: { cellWidth: 52 },    // Código Escolar
    2: { cellWidth: 120 },   // Apellidos y Nombres (ancho)
    3: { cellWidth: 58 },    // Lugar Nacimiento
    4: { cellWidth: 18 },    // Día
    5: { cellWidth: 18 },    // Mes
    6: { cellWidth: 24 },    // Año
    7: { cellWidth: 16 },    // Edad
    8: { cellWidth: 14 },    // Sexo
    9: { cellWidth: 100 },   // Representante (ancho)
    10: { cellWidth: 52 },   // Cédula
    11: { cellWidth: 165 },  // Dirección (muy ancho)
    12: { cellWidth: 56 }    // Teléfono
  };

  doc.autoTable({
    startY: 115,
    head: head,
    body: data,
    theme: 'grid',
    margin: { left: marginL, right: marginR },
    styles: { fontSize: 6.5, cellPadding: 1.5, overflow: 'linebreak', lineWidth: 0.1, lineColor: [0,0,0] },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontSize: 6, cellPadding: 1.5 },
    bodyStyles: { valign: 'middle' },
    columnStyles: colWidths
  });

  var filename = 'Matricula_' + (datos.grado ? datos.grado.nombre.replace(/\s+/g, '_') : 'X') + '_Sec_' + (datos.seccion ? datos.seccion.letra : 'X') + '_' + anioEscolar + '.pdf';
  doc.save(filename);
}

async function generarPDFFichaInscripcion(datos, tipo) {
  var doc = inicializarPDF(false);
  var pageW = doc.internal.pageSize.getWidth();
  
  var config = datos.config || {};
  var insc = datos.inscripcion;
  var est = insc.estudiante;
  var anio = insc.anio_escolar.nombre;
  var grado = insc.seccion.grado.nombre;
  var seccion = insc.seccion.letra;

  // Cargar logos
  var logoMppe = await loadImageDataUrl('/img/logo_MPPE_circulo.png');
  if (logoMppe) doc.addImage(logoMppe, 'PNG', 40, 25, 45, 45); // Izquierda

  var logoEscuela = await loadImageDataUrl('/img/logo_escuela.png');
  if (logoEscuela) doc.addImage(logoEscuela, 'PNG', pageW - 85, 25, 45, 45); // Derecha

  // Membrete Centrado
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('República Bolivariana de Venezuela', pageW / 2, 40, { align: 'center' });
  doc.text(config.nombre_escuela || 'U.E.E. "General Aquilino Juáres"', pageW / 2, 52, { align: 'center' });

  // Título
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('FIRMA DE INSCRIPCIÓN', pageW / 2, 80, { align: 'center' });
  var subtitulo = tipo === 'INICIAL' ? '(EDUCACIÓN INICIAL)' : '(EDUCACIÓN PRIMARIA)';
  doc.text(subtitulo, pageW / 2, 94, { align: 'center' });

  // Cuadro Código Escolar
  doc.setFontSize(10);
  var codW = 150;
  var codX = pageW - 40 - codW;
  var codY = 75;
  doc.setLineWidth(1);
  doc.rect(codX, codY, codW, 20); // Caja
  doc.setFont('helvetica', 'bold');
  doc.text('Cod. Escolar:', codX + 5, codY + 14);
  doc.setFont('helvetica', 'normal');
  doc.text(est.codigo_escolar || '', codX + 75, codY + 14);

  // Info: Grado, Seccion, Fecha
  var fechaInsc = insc.fecha_inscripcion ? new Date(insc.fecha_inscripcion).toLocaleDateString('es-VE', {day:'2-digit', month:'2-digit', year:'numeric'}) : '';
  doc.text('Grado: ' + grado + '      Sección: "' + seccion + '"      Fecha: ' + fechaInsc, 40, 115);

  var currentY = 135;

  function addSection(title, fields, startY) {
    if (startY > 740) { doc.addPage(); startY = 40; }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(230, 230, 230);
    doc.rect(40, startY, pageW - 80, 15, 'F');
    doc.text(title, 45, startY + 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    var y = startY + 28; // Increased gap to prevent text overlap

    fields.forEach(function(row) {
      if (y > 780) { doc.addPage(); y = 40; }
      var x = 40;
      var colWidth = (pageW - 80) / row.length;
      row.forEach(function(field) {
        if (!field || !field.label) { x += colWidth; return; }
        doc.setFont('helvetica', 'bold');
        doc.text(field.label + ':', x, y);
        var tw = doc.getTextWidth(field.label + ': '); // Calc width with bold font
        doc.setFont('helvetica', 'normal');
        doc.text(field.value ? String(field.value) : '', x + tw, y); // Removed fallback line
        x += colWidth;
      });
      y += 16; // Reduced row height
    });
    return y + 2; // Reduced gap after section
  }

  // 1) Documentos Consignados
  if (currentY > 740) { doc.addPage(); currentY = 40; }
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(230, 230, 230);
  doc.rect(40, currentY, pageW - 80, 15, 'F');
  doc.text('1) Documentos consignados al inscribirse (Copias)', 45, currentY + 11);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  currentY += 28; // Increased gap

  var docs = [
    {lbl: 'Partida Nac.', val: insc.doc_partida_nacimiento},
    {lbl: 'Boleta Promoción', val: insc.doc_boleta_promocion},
    {lbl: 'C.I. Madre', val: insc.doc_ci_madre},
    {lbl: 'C.I. Padre', val: insc.doc_ci_padre},
    {lbl: 'Foto Estudiante', val: insc.doc_foto_estudiante},
    {lbl: 'Foto Rep.', val: insc.doc_foto_representante},
    {lbl: 'Carpeta Marrón', val: insc.doc_carpeta_marron},
    {lbl: 'Acta Compromiso', val: insc.doc_acta_compromiso}
  ];
  var cx = 40;
  docs.forEach(function(d, i) {
    doc.text('[ ' + (d.val ? 'X' : '  ') + ' ] ' + d.lbl, cx, currentY);
    cx += 130;
    if ((i + 1) % 4 === 0) { cx = 40; currentY += 16; } // Reduced row height
  });
  currentY += 5; // Reduced gap

  // 2) Datos Personales del Estudiante
  var primerNombre = (est.primer_nombre || '') + ' ' + (est.segundo_nombre || '');
  var primerApellido = (est.primer_apellido || '') + ' ' + (est.segundo_apellido || '');
  var fechaNacEst = est.fecha_nacimiento ? new Date(est.fecha_nacimiento).toLocaleDateString('es-VE') : '';

  currentY = addSection('2) Datos personales del estudiante', [
    [{label: 'Apellidos', value: primerApellido.trim()}, {label: 'Lugar Nac.', value: est.lugar_nacimiento}, {label: 'Talla', value: insc.talla}],
    [{label: 'Nombres', value: primerNombre.trim()}, {label: 'Estado Nac.', value: est.estado_nacimiento}, {label: 'Peso', value: insc.peso}],
    [{label: 'Cod. Escolar', value: est.codigo_escolar}, {label: 'Dirección', value: insc.direccion}, {label: 'Camisa', value: insc.talla_camisa}],
    [{label: 'Fecha Nac.', value: fechaNacEst}, {label: 'Lateralidad', value: est.lateralidad}, {label: 'Pantalón', value: insc.talla_pantalon}],
    [{label: 'Sexo', value: est.sexo}, {label: 'Sangre', value: est.tipo_sangre}, {label: 'Zapato', value: insc.talla_zapato}],
    [{label: 'Teléfono', value: insc.telefono}],
    [{label: 'Correo', value: insc.correo_electronico}]
  ], currentY);

  // 3) Datos de Procedencia y 5) Datos Socioeconómicos
  currentY = addSection('3) Datos de Procedencia y 5) Datos Socioeconómicos', [
    [{label: 'Misma Institución', value: insc.misma_institucion ? 'Sí' : 'No'}, {label: 'Hermanos en la inst.', value: insc.tiene_hermanos_institucion ? 'Sí' : 'No'}],
    [{label: 'Inst. Procedencia', value: insc.institucion_procedencia}, {label: 'Cuántos hermanos', value: insc.cantidad_hermanos}],
    [{label: 'Motivo de retiro', value: insc.motivo_retiro_procedencia}],
    [{label: 'Con quién vive', value: insc.con_quien_vive}],
    [{label: 'Tipo de vivienda', value: insc.tipo_vivienda}, {label: 'Condición', value: insc.condicion_infraestructura}]
  ], currentY);

  // 4) Datos Familiares
  var camposFamiliares = [];
  function addFamiliar(tituloFamiliar, persona) {
    if (!persona) return;
    camposFamiliares.push([{label: '------ ' + tituloFamiliar + ' ------', value: ' '}]);
    var nombres = (persona.apellidos || '') + ' ' + (persona.nombres || '');
    var ci = persona.cedula || '';
    var nac = persona.nacionalidad || 'V';
    var fn = persona.fecha_nacimiento ? new Date(persona.fecha_nacimiento).toLocaleDateString('es-VE') : '';
    camposFamiliares.push([{label: 'Apellidos y nombres', value: nombres}, {label: 'Teléfono', value: persona.telefono}]);
    camposFamiliares.push([{label: 'C.I.', value: ci}, {label: 'Dirección', value: persona.direccion}]);
    camposFamiliares.push([{label: 'Nacionalidad', value: nac === 'V' ? 'Venezolana' : 'Extranjera'}, {label: 'Profesión u oficio', value: persona.profesion_oficio}]);
    camposFamiliares.push([{label: 'Fecha Nac.', value: fn}, {label: 'Estado civil', value: persona.estado_civil}]);
  }
  addFamiliar('MADRE', est.madre);
  addFamiliar('PADRE', est.padre);
  addFamiliar('REPRESENTANTE', est.representante);
  currentY = addSection('4) Datos Familiares', camposFamiliares, currentY);

  if (tipo === 'INICIAL') {
    doc.addPage();
    currentY = 40;
    currentY = addSection('6) Información Importante del niño y 7) Integración Social', [
      [{label: 'Tipo Parto', value: est.tipo_parto}, {label: 'Meses Prematuro', value: est.meses_prematuro}],
      [{label: 'Apreciación Méd.', value: est.apreciacion_medico}, {label: 'Alergias', value: est.alergico ? 'Sí' : 'No'}],
      [{label: 'Detalle Alergia', value: est.alergico_detalle}],
      [{label: 'Enfermedades', value: est.enfermedades_padecidas}],
      [{label: 'Vacunas Completas', value: est.vacunas_completas ? 'Sí' : 'No'}, {label: 'Faltantes', value: est.vacunas_faltantes}],
      [{label: 'Tierno', value: insc.integracion_tierno ? 'Sí' : 'No'}, {label: 'Inquieto', value: insc.integracion_inquieto ? 'Sí' : 'No'}],
      [{label: 'Pasivo', value: insc.integracion_pasivo ? 'Sí' : 'No'}, {label: 'Sensible', value: insc.integracion_sensible ? 'Sí' : 'No'}],
      [{label: 'Habilidades', value: insc.habilidades}],
      [{label: 'Observaciones', value: insc.observaciones_generales}]
    ], currentY);
  }

  // Firmas
  if (currentY > 750) { doc.addPage(); currentY = 40; }
  currentY += 40;
  doc.text('_____________________________', pageW / 4, currentY, { align: 'center' });
  doc.text('_____________________________', (pageW / 4) * 3, currentY, { align: 'center' });
  currentY += 15;
  doc.text('Firma del Representante', pageW / 4, currentY, { align: 'center' });
  doc.text('Firma del Docente', (pageW / 4) * 3, currentY, { align: 'center' });

  doc.save('Ficha_' + est.primer_nombre + '_' + est.primer_apellido + '.pdf');
}

async function generarPDFFichaInicial(datos) {
  await generarPDFFichaInscripcion(datos, 'INICIAL');
}

async function generarPDFFichaPrimaria(datos) {
  await generarPDFFichaInscripcion(datos, 'PRIMARIA');
}
