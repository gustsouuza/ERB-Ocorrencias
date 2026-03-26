/* ============================================
   ERB OCORRÊNCIAS — RELATORIOS.JS
   Exportação PDF e Excel funcional
   ============================================ */

function iniciarRelatorios() {
  // Popular select de tipos
  popularSelectTipos('rel-tipo', '');

  // Definir mês/ano atual
  var now = new Date();
  var mesEl = document.getElementById('rel-mes');
  var anoEl = document.getElementById('rel-ano');
  if (mesEl) mesEl.value = now.getMonth();
  if (anoEl) anoEl.value = now.getFullYear();

  // Datas padrão período (mês atual)
  var inicioEl = document.getElementById('rel-inicio');
  var fimEl    = document.getElementById('rel-fim');
  if (inicioEl && !inicioEl.value) {
    var pad = function(n) { return String(n).padStart(2,'0'); };
    inicioEl.value = now.getFullYear() + '-' + pad(now.getMonth()+1) + '-01';
    if (fimEl) {
      var ultimo = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
      fimEl.value = now.getFullYear() + '-' + pad(now.getMonth()+1) + '-' + pad(ultimo);
    }
  }
}

// ============ BUSCAR OCORRÊNCIAS ============
function buscarTodasOcorrencias(callback) {
  // Se já temos dados em cache, usar
  if (ERB.ocorrencias && ERB.ocorrencias.length > 0) {
    // Mesmo assim, tentar atualizar do servidor
    fetch('tables/ocorrencias?limit=2000')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var lista = data.data || ERB.ocorrencias;
        if (lista.length > 0) ERB.ocorrencias = lista;
        callback(null, ERB.ocorrencias);
      })
      .catch(function() {
        callback(null, ERB.ocorrencias);
      });
  } else {
    fetch('tables/ocorrencias?limit=2000')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        ERB.ocorrencias = data.data || [];
        callback(null, ERB.ocorrencias);
      })
      .catch(function(err) {
        callback(err, []);
      });
  }
}

// ============ RELATÓRIO MENSAL ============
function gerarRelatorioMensal(formato) {
  var mes = parseInt((document.getElementById('rel-mes') || {}).value || new Date().getMonth());
  var ano = parseInt((document.getElementById('rel-ano') || {}).value || new Date().getFullYear());
  var meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  showToast('Buscando dados...', 'info', 2000);

  buscarTodasOcorrencias(function(err, todas) {
    var filtradas = todas.filter(function(o) {
      if (!o.data_hora) return false;
      var d = new Date(o.data_hora);
      return d.getMonth() === mes && d.getFullYear() === ano;
    });

    var titulo = 'Relatório Mensal — ' + meses[mes] + '/' + ano;
    var meta   = { Mês: meses[mes], Ano: ano.toString(), Total: filtradas.length };

    if (formato === 'pdf') {
      gerarPDFRelatorio(titulo, filtradas, meta);
    } else {
      exportarExcel(titulo, filtradas, 'relatorio_' + meses[mes].toLowerCase() + '_' + ano + '.xlsx');
    }
  });
}

// ============ RELATÓRIO POR PERÍODO ============
function gerarRelatorioPeriodo(formato) {
  var inicio = (document.getElementById('rel-inicio') || {}).value || '';
  var fim    = (document.getElementById('rel-fim')    || {}).value || '';

  if (!inicio || !fim) { showToast('Selecione as datas de início e fim', 'error'); return; }
  if (new Date(inicio) > new Date(fim)) { showToast('Data inicial é maior que a data final', 'error'); return; }

  showToast('Buscando dados...', 'info', 2000);

  buscarTodasOcorrencias(function(err, todas) {
    var dtInicio = new Date(inicio + 'T00:00:00');
    var dtFim    = new Date(fim    + 'T23:59:59');

    var filtradas = todas.filter(function(o) {
      if (!o.data_hora) return false;
      var d = new Date(o.data_hora);
      return d >= dtInicio && d <= dtFim;
    });

    var titulo = 'Relatório — ' + formatDate(inicio) + ' a ' + formatDate(fim);
    var meta   = { 'Período': formatDate(inicio) + ' a ' + formatDate(fim), Total: filtradas.length };

    if (formato === 'pdf') {
      gerarPDFRelatorio(titulo, filtradas, meta);
    } else {
      exportarExcel(titulo, filtradas, 'relatorio_periodo_' + inicio + '_' + fim + '.xlsx');
    }
  });
}

// ============ RELATÓRIO POR TIPO ============
function gerarRelatorioTipo(formato) {
  var tipo = (document.getElementById('rel-tipo')     || {}).value || '';
  var ano  = parseInt((document.getElementById('rel-tipo-ano') || {}).value || new Date().getFullYear());

  showToast('Buscando dados...', 'info', 2000);

  buscarTodasOcorrencias(function(err, todas) {
    var filtradas = todas.filter(function(o) {
      if (!o.data_hora) return false;
      var anoOk  = !ano  || new Date(o.data_hora).getFullYear() === ano;
      var tipoOk = !tipo || o.tipo === tipo;
      return anoOk && tipoOk;
    });

    var titulo = 'Relatório por Tipo — ' + (tipo || 'Todos') + ' (' + ano + ')';
    var meta   = { Tipo: tipo || 'Todos', Ano: ano.toString(), Total: filtradas.length };

    if (formato === 'pdf') {
      gerarPDFRelatorio(titulo, filtradas, meta);
    } else {
      exportarExcel(titulo, filtradas,
        'relatorio_tipo_' + (tipo || 'todos').replace(/\s+/g, '_') + '_' + ano + '.xlsx');
    }
  });
}

// ============ EXPORTAR TUDO ============
function exportarTudo(formato) {
  showToast('Buscando todos os dados...', 'info', 2000);

  buscarTodasOcorrencias(function(err, todas) {
    var titulo = 'Relatório Completo — ERB Ocorrências';
    var meta   = { Total: todas.length, 'Gerado em': formatDateTime(new Date().toISOString()) };

    if (formato === 'pdf') {
      gerarPDFRelatorio(titulo, todas, meta);
    } else {
      exportarExcel(titulo, todas, 'relatorio_completo_' + new Date().toISOString().split('T')[0] + '.xlsx');
    }
  });
}

// ============ GERAR PDF ============
function gerarPDFRelatorio(titulo, ocorrencias, meta) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    showToast('Biblioteca jsPDF não carregada. Tente novamente.', 'error');
    return;
  }

  showToast('Gerando PDF...', 'info', 2000);

  try {
    var doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    var W = 297, H = 210, M = 15;

    // Cabeçalho
    doc.setFillColor(22, 101, 52);
    doc.rect(0, 0, W, 33, 'F');
    doc.setFillColor(34, 197, 94);
    doc.roundedRect(M, 6, 20, 20, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('ERB', M + 10, 19, { align: 'center' });
    doc.setFontSize(14);
    doc.text('ERB OCORRÊNCIAS', M + 25, 15);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text('Rodoviária do Plano Piloto — Brasília, DF', M + 25, 22);
    doc.setFontSize(7);
    doc.text('Gerado: ' + formatDateTime(new Date().toISOString()) + ' | Por: ' + (ERB.usuario ? ERB.usuario.nome : 'Sistema'), W - M, 15, { align: 'right' });
    doc.text('Total: ' + ocorrencias.length + ' ocorrência(s)', W - M, 22, { align: 'right' });

    // Título
    var y = 43;
    doc.setTextColor(22, 101, 52); doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text(titulo, W / 2, y, { align: 'center' });
    y += 6;

    // Meta info
    if (meta) {
      var metaStr = Object.keys(meta).map(function(k) { return k + ': ' + meta[k]; }).join('  |  ');
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(107, 114, 128);
      doc.text(metaStr, W / 2, y, { align: 'center' });
      y += 6;
    }

    // Cards de stats
    y += 2;
    var stats = calcularStats(ocorrencias);
    var boxes = [
      { label: 'Total',        value: stats.total,        cor: [37,99,235]  },
      { label: 'Abertas',      value: stats.abertas,       cor: [202,138,4]  },
      { label: 'Em Andamento', value: stats.em_andamento,  cor: [234,88,12]  },
      { label: 'Encerradas',   value: stats.encerradas,    cor: [22,163,74]  }
    ];
    var bw = 36, bh = 18, bgap = 5, bx = M;
    boxes.forEach(function(b) {
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(bx, y, bw, bh, 3, 3, 'F');
      doc.setDrawColor(b.cor[0], b.cor[1], b.cor[2]);
      doc.setLineWidth(0.5);
      doc.roundedRect(bx, y, bw, bh, 3, 3, 'S');
      doc.setTextColor(b.cor[0], b.cor[1], b.cor[2]);
      doc.setFontSize(15); doc.setFont('helvetica', 'bold');
      doc.text(String(b.value), bx + bw / 2, y + 9, { align: 'center' });
      doc.setTextColor(107, 114, 128); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      doc.text(b.label, bx + bw / 2, y + 14, { align: 'center' });
      bx += bw + bgap;
    });

    // Top tipos
    var tx = M + (bw + bgap) * 4 + 8;
    doc.setTextColor(22, 101, 52); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text('TOP TIPOS:', tx, y + 4);
    var topTipos = Object.keys(stats.porTipo)
      .sort(function(a, b) { return stats.porTipo[b] - stats.porTipo[a]; })
      .slice(0, 5);
    topTipos.forEach(function(tipo, i) {
      doc.setFont('helvetica', 'normal'); doc.setTextColor(17, 24, 39); doc.setFontSize(7.5);
      doc.text((i+1) + '. ' + tipo + ': ' + stats.porTipo[tipo], tx, y + 10 + i * 5);
    });

    y += bh + 8;

    // Tabela
    if (ocorrencias.length === 0) {
      doc.setTextColor(107, 114, 128); doc.setFontSize(11); doc.setFont('helvetica', 'normal');
      doc.text('Nenhuma ocorrência encontrada para os critérios selecionados.', W / 2, y + 20, { align: 'center' });
    } else {
      var rows = ocorrencias.map(function(o) {
        var local = o.local || '--';
        return [
          o.numero || '--',
          formatDateTime(o.data_hora),
          o.tipo    || '--',
          local.length > 30 ? local.substring(0, 30) + '...' : local,
          o.setor   || '--',
          o.fiscal_nome || '--',
          { aberta: 'Aberta', em_andamento: 'Em And.', encerrada: 'Encerrada' }[o.status] || o.status || '--'
        ];
      });

      doc.autoTable({
        startY: y,
        head: [['Nº', 'Data/Hora', 'Tipo', 'Local', 'Setor', 'Fiscal', 'Status']],
        body: rows,
        margin: { left: M, right: M },
        styles: { fontSize: 7.5, cellPadding: 3 },
        headStyles: { fillColor: [22, 101, 52], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 34 },
          2: { cellWidth: 32 },
          3: { cellWidth: 55 },
          4: { cellWidth: 28 },
          5: { cellWidth: 38 },
          6: { cellWidth: 24 }
        },
        didParseCell: function(data) {
          if (data.column.index === 6 && data.section === 'body') {
            var v = data.cell.raw;
            if (v === 'Encerrada') data.cell.styles.textColor = [22, 163, 74];
            else if (v === 'Aberta')   data.cell.styles.textColor = [202, 138, 4];
            else if (v === 'Em And.')  data.cell.styles.textColor = [234, 88, 12];
          }
        }
      });
    }

    // Rodapé em todas as páginas
    var totalPags = doc.internal.getNumberOfPages();
    for (var i = 1; i <= totalPags; i++) {
      doc.setPage(i);
      doc.setFillColor(22, 101, 52);
      doc.rect(0, H - 12, W, 12, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      doc.text('ERB Ocorrências — Documento gerado automaticamente', M, H - 4);
      doc.text('Página ' + i + ' de ' + totalPags, W - M, H - 4, { align: 'right' });
    }

    var filename = titulo.replace(/[^a-zA-Z0-9_\-çãõáéíóúàâê ]/g, '_').replace(/\s+/g, '_') +
      '_' + new Date().toISOString().split('T')[0] + '.pdf';
    doc.save(filename);
    showToast('Relatório PDF gerado com sucesso!', 'success');
    registrarLog('CRIAR', 'Relatório PDF: ' + titulo);

  } catch(e) {
    console.error('[ERB] Erro ao gerar PDF:', e);
    showToast('Erro ao gerar PDF: ' + e.message, 'error');
  }
}

// ============ EXPORTAR EXCEL ============
function exportarExcel(titulo, ocorrencias, filename) {
  if (!window.XLSX) {
    showToast('Biblioteca Excel não carregada. Tente novamente.', 'error');
    return;
  }

  showToast('Gerando Excel...', 'info', 2000);

  try {
    var wb = XLSX.utils.book_new();

    // Aba Ocorrências
    var rows = [
      ['ERB OCORRÊNCIAS — ' + titulo],
      ['Gerado em: ' + formatDateTime(new Date().toISOString())],
      ['Total: ' + ocorrencias.length + ' ocorrência(s)'],
      [],
      ['Número', 'Data/Hora', 'Tipo', 'Local', 'Setor', 'Fiscal', 'Status', 'Descrição', 'Observações']
    ];

    ocorrencias.forEach(function(o) {
      rows.push([
        o.numero     || '',
        formatDateTime(o.data_hora),
        o.tipo       || '',
        o.local      || '',
        o.setor      || '',
        o.fiscal_nome || '',
        o.status     || '',
        o.descricao  || '',
        o.observacoes || ''
      ]);
    });

    var ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [
      { wch: 16 }, { wch: 20 }, { wch: 24 },
      { wch: 35 }, { wch: 20 }, { wch: 24 },
      { wch: 15 }, { wch: 50 }, { wch: 35 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Ocorrências');

    // Aba Estatísticas
    var stats = calcularStats(ocorrencias);
    var statsRows = [
      ['ESTATÍSTICAS — ' + titulo],
      [],
      ['Indicador', 'Valor'],
      ['Total', stats.total],
      ['Abertas', stats.abertas],
      ['Em Andamento', stats.em_andamento],
      ['Encerradas', stats.encerradas],
      [],
      ['POR TIPO', '']
    ];

    Object.keys(stats.porTipo)
      .sort(function(a, b) { return stats.porTipo[b] - stats.porTipo[a]; })
      .forEach(function(tipo) {
        statsRows.push([tipo, stats.porTipo[tipo]]);
      });

    statsRows.push([], ['POR SETOR', '']);
    Object.keys(stats.porSetor)
      .sort(function(a, b) { return stats.porSetor[b] - stats.porSetor[a]; })
      .forEach(function(setor) {
        statsRows.push([setor, stats.porSetor[setor]]);
      });

    var wsStats = XLSX.utils.aoa_to_sheet(statsRows);
    wsStats['!cols'] = [{ wch: 30 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsStats, 'Estatísticas');

    XLSX.writeFile(wb, filename || 'relatorio_erb.xlsx');
    showToast('Excel gerado com sucesso!', 'success');
    registrarLog('CRIAR', 'Relatório Excel: ' + titulo);

  } catch(e) {
    console.error('[ERB] Erro ao gerar Excel:', e);
    showToast('Erro ao gerar Excel: ' + e.message, 'error');
  }
}

// ============ ESTATÍSTICAS ============
function calcularStats(ocs) {
  var s = {
    total: ocs.length,
    abertas: 0,
    em_andamento: 0,
    encerradas: 0,
    porTipo:  {},
    porSetor: {}
  };
  ocs.forEach(function(o) {
    if      (o.status === 'aberta')       s.abertas++;
    else if (o.status === 'em_andamento') s.em_andamento++;
    else if (o.status === 'encerrada')    s.encerradas++;
    if (o.tipo)  s.porTipo[o.tipo]   = (s.porTipo[o.tipo]   || 0) + 1;
    if (o.setor) s.porSetor[o.setor] = (s.porSetor[o.setor] || 0) + 1;
  });
  return s;
}

// Alias
function calcularEstatisticas(ocs) { return calcularStats(ocs); }
