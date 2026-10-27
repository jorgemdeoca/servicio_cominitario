// pdf-asistencia.js - Generador de PDF de asistencia diaria con formato institucional

function generarPDFAsistenciaDiaria(datos, fechaISO) {
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF('p', 'pt', 'letter');
  var pageW = doc.internal.pageSize.getWidth();
  var marginL = 36;
  var marginR = 36;

  // Parsear fecha
  var fechaObj = new Date(fechaISO + 'T00:00:00');
  var diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  var diaTexto = diasNombres[fechaObj.getDay()];
  var partes = fechaISO.split('-');
  var fechaFormateada = partes[2] + '/' + partes[1] + '/' + partes[0];

  // Datos del membrete
  var nombreEscuela = datos.config.nombre_escuela || 'U.E.E. "General Aquilino Juáres"';
  var localidad = datos.config.localidad || '';
  var estado = datos.config.estado || '';
  var localidadEstado = localidad + (localidad && estado ? ' - ' : '') + (estado ? 'Estado ' + estado : '');

  var y = 40;

  // ── MEMBRETE ──
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('República Bolivariana de Venezuela', pageW / 2, y, { align: 'center' });
  y += 16;

  doc.setFontSize(12);
  doc.text(nombreEscuela, pageW / 2, y, { align: 'center' });
  y += 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(localidadEstado, pageW / 2, y, { align: 'center' });
  y += 28;

  // ── DATOS DEL DOCENTE Y FECHA (tamaño 12) ──
  var colIzq = marginL;
  var colDer = pageW / 2 + 30;
  var lineY;

  // Docente de guardia
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Docente de guardia:', colIzq, y);
  var docenteX = colIzq + doc.getTextWidth('Docente de guardia: ') + 5;
  doc.setFont('helvetica', 'bold');
  doc.text(datos.profesor.nombre_completo, docenteX, y);
  lineY = y + 2;
  doc.setLineWidth(0.5);
  doc.line(docenteX, lineY, docenteX + doc.getTextWidth(datos.profesor.nombre_completo), lineY);

  // Día
  doc.setFont('helvetica', 'normal');
  doc.text('Día:', colDer, y);
  var diaX = colDer + doc.getTextWidth('Día: ') + 5;
  doc.setFont('helvetica', 'bold');
  doc.text(diaTexto, diaX, y);
  doc.line(diaX, lineY, diaX + doc.getTextWidth(diaTexto), lineY);

  y += 18;

  // C.I.
  doc.setFont('helvetica', 'normal');
  doc.text('C.I:', colIzq, y);
  var ciX = colIzq + doc.getTextWidth('C.I: ') + 5;
  doc.setFont('helvetica', 'bold');
  doc.text(datos.profesor.ci, ciX, y);
  lineY = y + 2;
  doc.line(ciX, lineY, ciX + doc.getTextWidth(datos.profesor.ci), lineY);

  // Fecha
  doc.setFont('helvetica', 'normal');
  doc.text('Fecha:', colDer, y);
  var fechaX = colDer + doc.getTextWidth('Fecha: ') + 5;
  doc.setFont('helvetica', 'bold');
  doc.text(fechaFormateada, fechaX, y);
  lineY = y + 2;
  doc.line(fechaX, lineY, fechaX + doc.getTextWidth(fechaFormateada), lineY);

  y += 18;

  // Año Escolar
  doc.setFont('helvetica', 'normal');
  doc.text('Año Escolar:', colDer, y);
  var aeX = colDer + doc.getTextWidth('Año Escolar: ') + 5;
  doc.setFont('helvetica', 'bold');
  doc.text(datos.anio_escolar, aeX, y);
  lineY = y + 2;
  doc.line(aeX, lineY, aeX + doc.getTextWidth(datos.anio_escolar), lineY);

  y += 28;

  // ── TÍTULO ──
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Asistencia Diaria a los Alumnos', pageW / 2, y, { align: 'center' });
  y += 20;

  // ── TABLA PRINCIPAL ──
  var headers = [
    [
      { content: 'GRADO Y\nSECCIÓN', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'MATRÍCULA', colSpan: 3, styles: { halign: 'center' } },
      { content: 'ASISTENCIA', colSpan: 3, styles: { halign: 'center' } },
      { content: 'INASISTENCIA', colSpan: 3, styles: { halign: 'center' } },
      { content: 'FIRMA', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
    ],
    [
      { content: 'V', styles: { halign: 'center' } },
      { content: 'H', styles: { halign: 'center' } },
      { content: 'T', styles: { halign: 'center' } },
      { content: 'V', styles: { halign: 'center' } },
      { content: 'H', styles: { halign: 'center' } },
      { content: 'T', styles: { halign: 'center' } },
      { content: 'V', styles: { halign: 'center' } },
      { content: 'H', styles: { halign: 'center' } },
      { content: 'T', styles: { halign: 'center' } }
    ]
  ];

  var bodyRows = [];
  datos.filas.forEach(function(f) {
    var gradoLabel = f.grado_nombre + ' "' + f.seccion_letra + '"';
    bodyRows.push([
      gradoLabel,
      f.matricula_v, f.matricula_h, f.matricula_t,
      f.asistencia_v, f.asistencia_h, f.asistencia_t,
      f.inasistencia_v, f.inasistencia_h, f.inasistencia_t,
      ''
    ]);
  });

  doc.autoTable({
    startY: y,
    head: headers,
    body: bodyRows,
    theme: 'grid',
    styles: {
      fontSize: 12,
      cellPadding: 5,
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      textColor: [0, 0, 0],
      halign: 'center',
      valign: 'middle'
    },
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 14
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 'auto' },
      10: { cellWidth: 70 }
    },
    margin: { left: marginL, right: marginR },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index >= 7 && data.column.index <= 9) {
        if (data.cell.raw > 0) {
          data.cell.styles.textColor = [220, 38, 38];
        }
      }
    }
  });

  var finalY = doc.lastAutoTable.finalY + 20;

  // ── TABLA RESUMEN ──
  var resumenHeaders = [
    [
      { content: '', styles: { halign: 'center' } },
      { content: 'V', styles: { halign: 'center' } },
      { content: 'H', styles: { halign: 'center' } },
      { content: 'T', styles: { halign: 'center' } }
    ]
  ];

  var resumenBody = [
    [
      { content: 'PREESCOLAR', styles: { fontStyle: 'bold', halign: 'left' } },
      datos.resumen.INICIAL.asist_v,
      datos.resumen.INICIAL.asist_h,
      datos.resumen.INICIAL.asist_t
    ],
    [
      { content: 'BÁSICA', styles: { fontStyle: 'bold', halign: 'left' } },
      datos.resumen.PRIMARIA.asist_v,
      datos.resumen.PRIMARIA.asist_h,
      datos.resumen.PRIMARIA.asist_t
    ]
  ];

  doc.autoTable({
    startY: finalY,
    head: resumenHeaders,
    body: resumenBody,
    theme: 'grid',
    styles: {
      fontSize: 12,
      cellPadding: 6,
      lineColor: [0, 0, 0],
      lineWidth: 0.5,
      textColor: [0, 0, 0],
      halign: 'center',
      valign: 'middle'
    },
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 14
    },
    columnStyles: {
      0: { cellWidth: 120, halign: 'left' },
      1: { cellWidth: 60 },
      2: { cellWidth: 60 },
      3: { cellWidth: 60 }
    },
    margin: { left: marginL, right: marginR },
    tableWidth: 300
  });

  var nombreArchivo = 'Asistencia_Diaria_' + fechaISO + '.pdf';
  doc.save(nombreArchivo);
}
