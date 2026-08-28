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

  // Cargar logo
  var logoMppe = await loadImageDataUrl('/img/logo_MPPE.png');
  if (logoMppe) {
    doc.addImage(logoMppe, 'PNG', 40, 25, 35, 35); // Reducido a 35x35
  }

  // Líneas verticales del membrete
  doc.setLineWidth(0.5);
  doc.line(85, 25, 85, 60);
  doc.line(235, 25, 235, 60);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Despacho del', 95, 38);
  doc.text('Viceministerio de Educación', 95, 52);
  
  doc.text('Dirección general de', 245, 38);
  doc.text('Registro y Control Académico', 245, 52);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  var anioEscolar = datos.anio_escolar ? datos.anio_escolar.nombre : '';
  var titulo = 'INSCRIPCIÓN INICIAL AÑO ESCOLAR ' + anioEscolar;
  doc.text(titulo, pageW / 2, 85, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  var textTotales = 'Total Matrícula: V=' + datos.totales.varones + ' H=' + datos.totales.hembras + ' T=' + datos.totales.total;
  doc.text(textTotales, pageW - 40, 85, { align: 'right' });

  var config = datos.config || {};
  var nombreInst = config.nombre_escuela || 'U.E.E. "General Aquilino Juáres"';
  doc.setFont('helvetica', 'normal');
  doc.text('INSTITUCIÓN: ' + nombreInst, 40, 110);

  var gradoNombre = datos.grado ? datos.grado.nombre : '';
  var seccionLetra = datos.seccion ? datos.seccion.letra : '';
  doc.text('Grado: ' + gradoNombre, 40, 125);
  doc.text('Sección: "' + seccionLetra + '"', 180, 125);
  doc.text('Parroquia: ' + (config.parroquia || ''), 350, 125);

  var prof1 = datos.profesores && datos.profesores.length > 0 ? datos.profesores[0] : null;
  var prof2 = datos.profesores && datos.profesores.length > 1 ? datos.profesores[1] : null;
  
  if (prof1) {
    doc.text('Docente: ' + prof1.nombre, 40, 140);
    doc.text('C.I: ' + prof1.cedula, 180, 140);
  } else {
    doc.text('Docente: NO ASIGNADO', 40, 140);
  }
  doc.text('Municipio: ' + (config.municipio || ''), 350, 140);
  
  if (prof2) {
    doc.text('Docente: ' + prof2.nombre, 40, 155);
    doc.text('C.I: ' + prof2.cedula, 180, 155);
  }
  doc.text('Dirección: ' + (config.direccion || ''), 350, 155);

  var head = [
    [
      { content: 'N°', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Código Escolar', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Apellidos y Nombres', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Lugar de Nacimiento', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Fecha de Nacimiento', colSpan: 3, styles: { halign: 'center' } },
      { content: 'E\nd\na\nd', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'S\ne\nx\no', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Representante', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Cédula de Identidad', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
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

  doc.autoTable({
    startY: 170,
    head: head,
    body: data,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0,0,0] },
    bodyStyles: { lineWidth: 0.1, lineColor: [0,0,0] }
  });

  var filename = 'Matricula_' + (datos.grado ? datos.grado.nombre.replace(/\s+/g, '_') : 'X') + '_Sec_' + (datos.seccion ? datos.seccion.letra : 'X') + '_' + anioEscolar + '.pdf';
  doc.save(filename);
}

async function generarPDFFichaInscripcion(datos, tipo) {
  var doc = inicializarPDF(false);
  var pageW = doc.internal.pageSize.getWidth();
  
  // Cargar logo escuela
  var logoEscuela = await loadImageDataUrl('/img/logo_escuela.png');
  if (logoEscuela) {
    doc.addImage(logoEscuela, 'PNG', 40, 25, 50, 50); // x, y, width, height
  }

  var config = datos.config || {};
  var insc = datos.inscripcion;
  var est = insc.estudiante;
  var anio = insc.anio_escolar.nombre;
  var grado = insc.seccion.grado.nombre;
  var seccion = insc.seccion.letra;

  doc.setFontSize(9);
  var textX = logoEscuela ? 100 : 40;
  doc.text('REPUBLICA BOLIVARIANA DE VENEZUELA', textX, 40);
  doc.text('MINISTERIO DEL PODER POPULAR PARA LA EDUCACION', textX, 52);
  doc.text(config.nombre_escuela || 'U.E.E. "GENERAL AQUILINO JUARES"', textX, 64);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  var tituloFicha = tipo === 'INICIAL' ? 'FICHA DE INSCRIPCION - EDUCACION INICIAL' : 'FICHA DE INSCRIPCION - EDUCACION PRIMARIA';
  doc.text(tituloFicha, pageW / 2, 90, { align: 'center' });

  doc.setFontSize(10);
  doc.text('Ano Escolar: ' + anio, pageW / 2, 105, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  var fechaInsc = insc.fecha_inscripcion ? new Date(insc.fecha_inscripcion).toLocaleDateString('es-VE') : '';
  doc.text('Grado: ' + grado + '      Seccion: "' + seccion + '"      Fecha: ' + fechaInsc, 40, 130);

  var currentY = 150;

  var primerNombre = (est.primer_nombre || '') + ' ' + (est.segundo_nombre || '');
  var primerApellido = (est.primer_apellido || '') + ' ' + (est.segundo_apellido || '');
  var fechaNacEst = est.fecha_nacimiento ? new Date(est.fecha_nacimiento).toLocaleDateString('es-VE') : '';

  function addSection(title, fields, startY) {
    if (startY > 680) {
      doc.addPage();
      startY = 40;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(230, 230, 230);
    doc.rect(40, startY, pageW - 80, 15, 'F');
    doc.text(title, 45, startY + 11);
    doc.setFont('helvetica', 'normal');
    var y = startY + 30;

    fields.forEach(function(row) {
      var x = 40;
      var colWidth = (pageW - 80) / row.length;
      row.forEach(function(field) {
        doc.setFont('helvetica', 'bold');
        doc.text(field.label + ':', x, y);
        doc.setFont('helvetica', 'normal');
        var tw = doc.getTextWidth(field.label + ': ');
        doc.text(field.value ? String(field.value) : '', x + tw, y);
        x += colWidth;
      });
      y += 18;
    });
    return y + 5;
  }

  currentY = addSection('I. DATOS DEL ESTUDIANTE', [
    [{label: 'Nombres', value: primerNombre.trim()}, {label: 'Apellidos', value: primerApellido.trim()}],
    [{label: 'Cod. Escolar', value: est.codigo_escolar}, {label: 'Fecha Nac.', value: fechaNacEst}, {label: 'Lugar Nac.', value: est.lugar_nacimiento}],
    [{label: 'Estado Nac.', value: est.estado_nacimiento}, {label: 'Sexo', value: est.sexo}, {label: 'Sangre', value: est.tipo_sangre}],
    [{label: 'Lateralidad', value: est.lateralidad}, {label: 'Talla', value: insc.talla}, {label: 'Peso', value: insc.peso}],
    [{label: 'Camisa', value: insc.talla_camisa}, {label: 'Pantalon', value: insc.talla_pantalon}, {label: 'Zapato', value: insc.talla_zapato}],
    [{label: 'Direccion', value: insc.direccion}],
    [{label: 'Telefono', value: insc.telefono}, {label: 'Correo', value: insc.correo_electronico}]
  ], currentY);

  var madre = est.madre;
  if (madre) {
    var madreFn = madre.fecha_nacimiento ? new Date(madre.fecha_nacimiento).toLocaleDateString('es-VE') : '';
    currentY = addSection('II. DATOS DE LA MADRE', [
      [{label: 'Nombres', value: madre.nombres}, {label: 'Apellidos', value: madre.apellidos}],
      [{label: 'C.I.', value: madre.nacionalidad + '-' + madre.cedula}, {label: 'F. Nac.', value: madreFn}],
      [{label: 'Telefono', value: madre.telefono}, {label: 'Profesion', value: madre.profesion_oficio}],
      [{label: 'Direccion', value: madre.direccion}, {label: 'Estado Civil', value: madre.estado_civil}]
    ], currentY);
  }

  var padre = est.padre;
  if (padre) {
    var padreFn = padre.fecha_nacimiento ? new Date(padre.fecha_nacimiento).toLocaleDateString('es-VE') : '';
    currentY = addSection('III. DATOS DEL PADRE', [
      [{label: 'Nombres', value: padre.nombres}, {label: 'Apellidos', value: padre.apellidos}],
      [{label: 'C.I.', value: padre.nacionalidad + '-' + padre.cedula}, {label: 'F. Nac.', value: padreFn}],
      [{label: 'Telefono', value: padre.telefono}, {label: 'Profesion', value: padre.profesion_oficio}],
      [{label: 'Direccion', value: padre.direccion}, {label: 'Estado Civil', value: padre.estado_civil}]
    ], currentY);
  }

  var rep = est.representante;
  if (rep) {
    var repFn = rep.fecha_nacimiento ? new Date(rep.fecha_nacimiento).toLocaleDateString('es-VE') : '';
    currentY = addSection('IV. DATOS DEL REPRESENTANTE', [
      [{label: 'Nombres', value: rep.nombres}, {label: 'Apellidos', value: rep.apellidos}],
      [{label: 'C.I.', value: rep.nacionalidad + '-' + rep.cedula}, {label: 'F. Nac.', value: repFn}],
      [{label: 'Telefono', value: rep.telefono}, {label: 'Profesion', value: rep.profesion_oficio}],
      [{label: 'Direccion', value: rep.direccion}, {label: 'Estado Civil', value: rep.estado_civil}]
    ], currentY);
  }

  currentY = addSection('V. PROCEDENCIA Y SOCIOECONOMICO', [
    [{label: 'Misma Institucion', value: insc.misma_institucion ? 'Si' : 'No'}, {label: 'Inst. Procedencia', value: insc.institucion_procedencia}],
    [{label: 'Vive con', value: insc.con_quien_vive}, {label: 'Hermanos en inst.', value: insc.tiene_hermanos_institucion ? 'Si (' + insc.cantidad_hermanos + ')' : 'No'}],
    [{label: 'Tipo Vivienda', value: insc.tipo_vivienda}, {label: 'Condicion', value: insc.condicion_infraestructura}]
  ], currentY);

  if (tipo === 'INICIAL') {
    currentY = addSection('VI. DATOS MEDICOS E INTEGRACION (Solo Inicial)', [
      [{label: 'Tipo Parto', value: est.tipo_parto}, {label: 'Meses Prematuro', value: est.meses_prematuro}],
      [{label: 'Apreciacion Med.', value: est.apreciacion_medico}, {label: 'Alergico', value: est.alergico ? 'Si' : 'No'}],
      [{label: 'Detalle Alergia', value: est.alergico_detalle}],
      [{label: 'Enfermedades', value: est.enfermedades_padecidas}],
      [{label: 'Vacunas Completas', value: est.vacunas_completas ? 'Si' : 'No'}, {label: 'Faltantes', value: est.vacunas_faltantes}],
      [{label: 'Tierno', value: insc.integracion_tierno ? 'Si' : 'No'}, {label: 'Inquieto', value: insc.integracion_inquieto ? 'Si' : 'No'}],
      [{label: 'Pasivo', value: insc.integracion_pasivo ? 'Si' : 'No'}, {label: 'Sensible', value: insc.integracion_sensible ? 'Si' : 'No'}],
      [{label: 'Habilidades', value: insc.habilidades}]
    ], currentY);
  }

  if (currentY > 650) { doc.addPage(); currentY = 40; }
  
  var titleDocs = tipo === 'INICIAL' ? 'VII. DOCUMENTOS CONSIGNADOS' : 'VI. DOCUMENTOS CONSIGNADOS';
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(230, 230, 230);
  doc.rect(40, currentY, pageW - 80, 15, 'F');
  doc.text(titleDocs, 45, currentY + 11);
  doc.setFont('helvetica', 'normal');
  currentY += 30;

  var docs = [
    {lbl: 'Partida Nac.', val: insc.doc_partida_nacimiento},
    {lbl: 'Boleta Promocion', val: insc.doc_boleta_promocion},
    {lbl: 'C.I. Madre', val: insc.doc_ci_madre},
    {lbl: 'C.I. Padre', val: insc.doc_ci_padre},
    {lbl: 'Foto Estudiante', val: insc.doc_foto_estudiante},
    {lbl: 'Foto Rep.', val: insc.doc_foto_representante},
    {lbl: 'Carpeta Marron', val: insc.doc_carpeta_marron},
    {lbl: 'Acta Compromiso', val: insc.doc_acta_compromiso}
  ];
  var cx = 40;
  docs.forEach(function(d, i) {
    doc.text('[ ' + (d.val ? 'X' : '  ') + ' ] ' + d.lbl, cx, currentY);
    cx += 130;
    if ((i + 1) % 4 === 0) { cx = 40; currentY += 20; }
  });

  currentY += 40;
  if (currentY > 700) { doc.addPage(); currentY = 40; }
  
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
