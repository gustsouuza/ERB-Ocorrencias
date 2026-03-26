/* ============================================
   ERB OCORRÊNCIAS — OCORRENCIAS.JS
   CRUD completo de ocorrências
   ============================================ */

// ============ FORMULÁRIO ============
function iniciarFormOcorrencia(ocEdicao) {
  ERB.fotosBases     = [];
  ERB.docsBases      = [];
  ERB.editandoOcorrencia = ocEdicao || null;

  var g = function(id) { return document.getElementById(id); };

  // Preencher selects com tipos e setores disponíveis
  popularSelectTipos('oc-tipo',   ocEdicao ? ocEdicao.tipo  : '');
  popularSelectSetores('oc-setor', ocEdicao ? ocEdicao.setor : '');

  if (ocEdicao) {
    // ---- MODO EDIÇÃO ----
    if (g('oc-numero'))      g('oc-numero').value      = ocEdicao.numero || '';
    if (g('oc-datahora'))    g('oc-datahora').value    = formatDateTimeLocal(ocEdicao.data_hora);
    if (g('oc-local'))       g('oc-local').value       = ocEdicao.local || '';
    if (g('oc-descricao'))   g('oc-descricao').value   = ocEdicao.descricao || '';
    if (g('oc-fiscal'))      g('oc-fiscal').value      = ocEdicao.fiscal_nome || (ERB.usuario ? ERB.usuario.nome : '');
    if (g('oc-status'))      g('oc-status').value      = ocEdicao.status || 'aberta';
    if (g('oc-observacoes')) g('oc-observacoes').value = ocEdicao.observacoes || '';
    if (g('btn-salvar-oc'))  g('btn-salvar-oc').innerHTML = '<i class="fas fa-floppy-disk"></i> Atualizar Ocorrência';

    // Fotos existentes
    if (Array.isArray(ocEdicao.fotos)) {
      ERB.fotosBases = ocEdicao.fotos.filter(Boolean);
      renderFotosPreview();
    }
  } else {
    // ---- MODO NOVO ----
    var form = g('form-ocorrencia');
    if (form) form.reset();
    // Repopular selects após reset
    popularSelectTipos('oc-tipo', '');
    popularSelectSetores('oc-setor', '');

    if (g('oc-numero'))   g('oc-numero').value   = gerarNumeroOcorrencia();
    if (g('oc-datahora')) g('oc-datahora').value = formatDateTimeLocal(new Date().toISOString());
    if (g('oc-fiscal'))   g('oc-fiscal').value   = ERB.usuario ? ERB.usuario.nome : '';
    if (g('oc-status'))   g('oc-status').value   = 'aberta';
    if (g('btn-salvar-oc')) g('btn-salvar-oc').innerHTML = '<i class="fas fa-floppy-disk"></i> Salvar Ocorrência';
  }

  if (g('fotos-preview')) g('fotos-preview').innerHTML = '';
  if (g('docs-list'))     g('docs-list').innerHTML     = '';

  // Drag & Drop
  configurarDragDrop('foto-upload-area', 'foto-input', handleFotos);
  configurarDragDrop('doc-upload-area',  'doc-input',  handleDocs);
}

// Alias de compatibilidade
function initFormOcorrencia(oc) { iniciarFormOcorrencia(oc); }

// ============ DRAG & DROP ============
function configurarDragDrop(areaId, inputId, handler) {
  var area = document.getElementById(areaId);
  if (!area) return;
  area.ondragover  = function(e) { e.preventDefault(); area.classList.add('dragover'); };
  area.ondragleave = function()  { area.classList.remove('dragover'); };
  area.ondrop      = function(e) {
    e.preventDefault();
    area.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      handler({ target: { files: e.dataTransfer.files } });
    }
  };
}

// ============ FOTOS ============
function handleFotos(event) {
  var files = Array.from(event.target.files || []);
  var max   = 5;
  var disponivel = max - ERB.fotosBases.length;
  if (disponivel <= 0) { showToast('Máximo de ' + max + ' fotos atingido', 'warning'); return; }

  files.slice(0, disponivel).forEach(function(file) {
    if (!file.type.startsWith('image/')) { showToast('Apenas imagens JPG/PNG permitidas', 'warning'); return; }
    var reader = new FileReader();
    reader.onload = function(e) {
      ERB.fotosBases.push(e.target.result);
      renderFotosPreview();
    };
    reader.readAsDataURL(file);
  });

  if (files.length > disponivel) showToast('Máximo de ' + max + ' fotos. Algumas ignoradas.', 'warning');
}

function renderFotosPreview() {
  var preview = document.getElementById('fotos-preview');
  if (!preview) return;
  preview.innerHTML = ERB.fotosBases.map(function(b, i) {
    return '<div class="foto-thumb">' +
      '<img src="' + b + '" alt="Foto ' + (i+1) + '" />' +
      '<button type="button" class="foto-thumb-remove" onclick="removerFoto(' + i + ')">' +
        '<i class="fas fa-xmark"></i>' +
      '</button>' +
      '</div>';
  }).join('');
}

function removerFoto(idx) {
  ERB.fotosBases.splice(idx, 1);
  renderFotosPreview();
}

// ============ DOCUMENTOS ============
function handleDocs(event) {
  var files = Array.from(event.target.files || []);
  var max   = 5;
  files.slice(0, max - ERB.docsBases.length).forEach(function(file) {
    if (file.size > 10 * 1024 * 1024) { showToast(file.name + ' excede 10MB', 'warning'); return; }
    ERB.docsBases.push({ name: file.name, size: (file.size / 1024).toFixed(1) + ' KB' });
    renderDocsList();
  });
}

function renderDocsList() {
  var list = document.getElementById('docs-list');
  if (!list) return;
  list.innerHTML = ERB.docsBases.map(function(d, i) {
    var ext = d.name.split('.').pop().toLowerCase();
    var icon = ext === 'pdf' ? 'fa-file-pdf' : (ext.startsWith('doc') ? 'fa-file-word' : 'fa-file');
    return '<div class="doc-item">' +
      '<i class="fas ' + icon + '"></i>' +
      '<span class="doc-name">' + d.name + ' <small>(' + d.size + ')</small></span>' +
      '<button type="button" class="doc-remove" onclick="removerDoc(' + i + ')"><i class="fas fa-xmark"></i></button>' +
      '</div>';
  }).join('');
}

function removerDoc(idx) {
  ERB.docsBases.splice(idx, 1);
  renderDocsList();
}

// ============ SALVAR OCORRÊNCIA ============
function salvarOcorrencia(event) {
  if (event) event.preventDefault();

  var g = function(id) { return document.getElementById(id); };

  var numero    = g('oc-numero')     ? g('oc-numero').value.trim()     : '';
  var datahora  = g('oc-datahora')   ? g('oc-datahora').value          : '';
  var tipo      = g('oc-tipo')       ? g('oc-tipo').value              : '';
  var setor     = g('oc-setor')      ? g('oc-setor').value             : '';
  var local     = g('oc-local')      ? g('oc-local').value.trim()      : '';
  var descricao = g('oc-descricao')  ? g('oc-descricao').value.trim()  : '';
  var fiscal    = g('oc-fiscal')     ? g('oc-fiscal').value.trim()     : '';
  var status    = g('oc-status')     ? g('oc-status').value            : 'aberta';
  var observ    = g('oc-observacoes')? g('oc-observacoes').value.trim(): '';

  // Validações
  var erros = [];
  if (!tipo)      erros.push('Selecione o tipo de ocorrência');
  if (!setor)     erros.push('Selecione o setor');
  if (!local)     erros.push('Informe o local da ocorrência');
  if (!descricao) erros.push('Descreva a ocorrência');

  if (erros.length > 0) {
    showToast(erros[0], 'error');
    // Focar no primeiro campo inválido
    if (!tipo)      { g('oc-tipo').focus(); }
    else if (!setor){ g('oc-setor').focus(); }
    else if (!local){ g('oc-local').focus(); }
    else            { g('oc-descricao').focus(); }
    return;
  }

  // Bloquear botão
  var btn = g('btn-salvar-oc');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Salvando...';
  }

  // Histórico
  var historico = [];
  if (ERB.editandoOcorrencia && Array.isArray(ERB.editandoOcorrencia.historico)) {
    historico = ERB.editandoOcorrencia.historico.slice();
  }
  historico.push({
    acao:    (ERB.editandoOcorrencia ? 'Editado' : 'Criado') + ' por ' + (ERB.usuario ? ERB.usuario.nome : 'usuário'),
    data:    new Date().toISOString(),
    usuario: ERB.usuario ? ERB.usuario.nome : ''
  });

  var payload = {
    numero:       numero || gerarNumeroOcorrencia(),
    data_hora:    datahora ? new Date(datahora).toISOString() : new Date().toISOString(),
    tipo:         tipo,
    setor:        setor,
    local:        local,
    descricao:    descricao,
    fiscal_nome:  fiscal || (ERB.usuario ? ERB.usuario.nome : ''),
    fiscal_id:    ERB.usuario ? ERB.usuario.id : '',
    status:       status,
    observacoes:  observ,
    fotos:        ERB.fotosBases.slice(),
    documentos:   ERB.docsBases.map(function(d) { return d.name; }),
    historico:    historico
  };

  var url, method;
  if (ERB.editandoOcorrencia) {
    url    = 'tables/ocorrencias/' + ERB.editandoOcorrencia.id;
    method = 'PUT';
  } else {
    url    = 'tables/ocorrencias';
    method = 'POST';
  }

  fetch(url, {
    method:  method,
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  })
  .then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  })
  .then(function(result) {
    var isEdicao = !!ERB.editandoOcorrencia;
    if (isEdicao) {
      var idx = ERB.ocorrencias.findIndex(function(o) { return o.id === ERB.editandoOcorrencia.id; });
      var merged = Object.assign({}, ERB.editandoOcorrencia, payload, { id: ERB.editandoOcorrencia.id });
      if (idx >= 0) ERB.ocorrencias[idx] = merged;
      showToast('Ocorrência ' + payload.numero + ' atualizada!', 'success');
      registrarLog('EDITAR', 'Ocorrência ' + payload.numero + ' editada — Status: ' + status);
    } else {
      var nova = result && result.id ? result : Object.assign({}, payload, { id: Date.now() + '' });
      ERB.ocorrencias.unshift(nova);
      showToast('Ocorrência ' + payload.numero + ' registrada com sucesso!', 'success');
      addNotificacao('Nova ocorrência ' + payload.numero + ': ' + tipo, 'info', nova.id);
      registrarLog('CRIAR', 'Nova ocorrência ' + payload.numero + ' — Tipo: ' + tipo + ' — Setor: ' + setor);
    }
    ERB.editandoOcorrencia = null;
    limparFormularioOcorrencia();
    setTimeout(function() { navegar('ocorrencias'); }, 1000);
  })
  .catch(function(err) {
    console.error('[ERB] Erro ao salvar ocorrência:', err);
    // Salvar na fila offline
    ERB.offlineQueue = ERB.offlineQueue || [];
    ERB.offlineQueue.push({ id: Date.now() + '', url: url, method: method, data: payload });
    saveOfflineQueue();
    showToast('Salvo localmente! Será sincronizado ao conectar.', 'warning');
    ERB.editandoOcorrencia = null;
    limparFormularioOcorrencia();
    setTimeout(function() { navegar('ocorrencias'); }, 1000);
  })
  .finally(function() {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-floppy-disk"></i> ' +
        (ERB.editandoOcorrencia ? 'Atualizar Ocorrência' : 'Salvar Ocorrência');
    }
  });
}

function limparFormularioOcorrencia() {
  var form = document.getElementById('form-ocorrencia');
  if (form) form.reset();

  var g = function(id) { return document.getElementById(id); };
  if (g('oc-numero'))      g('oc-numero').value      = gerarNumeroOcorrencia();
  if (g('oc-datahora'))    g('oc-datahora').value    = formatDateTimeLocal(new Date().toISOString());
  if (g('oc-fiscal'))      g('oc-fiscal').value      = ERB.usuario ? ERB.usuario.nome : '';
  if (g('fotos-preview'))  g('fotos-preview').innerHTML = '';
  if (g('docs-list'))      g('docs-list').innerHTML      = '';

  // Repopular selects
  popularSelectTipos('oc-tipo', '');
  popularSelectSetores('oc-setor', '');

  ERB.fotosBases     = [];
  ERB.docsBases      = [];
  ERB.editandoOcorrencia = null;
}

// Alias para o HTML
function limparFormulario() { limparFormularioOcorrencia(); }

// ============ LISTA DE OCORRÊNCIAS ============
function carregarListaOcorrencias() {
  var listEl = document.getElementById('ocorrencias-list');
  if (listEl) listEl.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> Carregando...</div>';

  // Popular filtros
  popularSelectTipos('filtro-tipo', '');
  popularSelectSetores('filtro-setor', '');

  fetch('tables/ocorrencias?limit=500')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      ERB.ocorrencias = (data.data || []).sort(function(a, b) {
        return new Date(b.data_hora) - new Date(a.data_hora);
      });
      filtrarOcorrencias();
    })
    .catch(function(err) {
      console.error('[ERB] Erro ao carregar lista:', err);
      // Usar dados em cache
      if (ERB.ocorrencias.length > 0) {
        filtrarOcorrencias();
      } else if (listEl) {
        listEl.innerHTML = '<div class="empty-state"><i class="fas fa-wifi-slash"></i>' +
          '<p>Sem conexão</p><small>Verifique sua internet</small></div>';
      }
    });
}

function filtrarOcorrencias() {
  var g = function(id) { return document.getElementById(id); };
  var busca   = (g('busca-texto')        || {}).value || '';
  var fTipo   = (g('filtro-tipo')        || {}).value || '';
  var fSetor  = (g('filtro-setor')       || {}).value || '';
  var fStatus = (g('filtro-status')      || {}).value || '';
  var fInicio = (g('filtro-data-inicio') || {}).value || '';
  var fFim    = (g('filtro-data-fim')    || {}).value || '';
  var ordem   = (g('filtro-ordem')       || {}).value || 'desc';

  busca = busca.toLowerCase();

  var filtrados = ERB.ocorrencias.filter(function(o) {
    if (busca) {
      var texto = ((o.numero||'')+(o.tipo||'')+(o.local||'')+(o.descricao||'')+(o.fiscal_nome||'')+(o.setor||'')).toLowerCase();
      if (!texto.includes(busca)) return false;
    }
    if (fTipo   && o.tipo   !== fTipo)   return false;
    if (fSetor  && o.setor  !== fSetor)  return false;
    if (fStatus && o.status !== fStatus) return false;
    if (fInicio) {
      var inicio = new Date(fInicio + 'T00:00:00');
      if (new Date(o.data_hora) < inicio) return false;
    }
    if (fFim) {
      var fim = new Date(fFim + 'T23:59:59');
      if (new Date(o.data_hora) > fim) return false;
    }
    return true;
  });

  filtrados.sort(function(a, b) {
    return ordem === 'asc'
      ? new Date(a.data_hora) - new Date(b.data_hora)
      : new Date(b.data_hora) - new Date(a.data_hora);
  });

  var countEl = document.getElementById('lista-count');
  if (countEl) countEl.textContent = filtrados.length + ' ocorrência(s) encontrada(s)';

  ERB.paginaLista = 1;
  renderLista(filtrados);
  renderPaginacao(filtrados);
}

function renderLista(ocs) {
  var listEl = document.getElementById('ocorrencias-list');
  if (!listEl) return;

  listEl._filtrados = ocs;

  if (ocs.length === 0) {
    listEl.innerHTML = '<div class="empty-state">' +
      '<i class="fas fa-clipboard-list"></i>' +
      '<p>Nenhuma ocorrência encontrada</p>' +
      '<small>Ajuste os filtros ou registre uma nova ocorrência</small>' +
      '</div>';
    return;
  }

  var inicio = (ERB.paginaLista - 1) * ERB.itensPorPagina;
  var paginaOcs = ocs.slice(inicio, inicio + ERB.itensPorPagina);

  listEl.innerHTML = paginaOcs.map(function(o) {
    var cor   = getTipoCor(o.tipo);
    var icone = getTipoIcone(o.tipo);
    return '<div class="oc-card" onclick="verDetalhes(\'' + o.id + '\')">' +
      '<div class="oc-card-left">' +
        '<div class="oc-tipo-icon" style="background:' + cor + '20;color:' + cor + '">' +
          '<i class="fas ' + icone + '"></i>' +
        '</div>' +
        '<div class="oc-info">' +
          '<div class="oc-numero">' + (o.numero || '--') + '</div>' +
          '<div class="oc-tipo-nome">' + (o.tipo || '--') + '</div>' +
          '<div class="oc-local"><i class="fas fa-location-dot" style="color:' + cor + ';margin-right:4px"></i>' + (o.local || '--') + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="oc-card-right">' +
        '<div class="oc-data"><i class="fas fa-clock" style="margin-right:4px;color:var(--gray-400)"></i>' + formatDateTime(o.data_hora) + '</div>' +
        statusBadge(o.status) +
        '<span class="oc-setor"><i class="fas fa-map-marker-alt" style="margin-right:3px;color:var(--gray-400)"></i>' + (o.setor || '--') + '</span>' +
      '</div>' +
      '</div>';
  }).join('');
}

function renderPaginacao(ocs) {
  var el = document.getElementById('pagination');
  if (!el) return;
  var total    = ocs.length;
  var totalPag = Math.ceil(total / ERB.itensPorPagina);
  if (totalPag <= 1) { el.innerHTML = ''; return; }

  var html = '';
  html += '<button class="page-btn" onclick="irPagina(' + (ERB.paginaLista - 1) + ')" ' + (ERB.paginaLista <= 1 ? 'disabled' : '') + '>' +
    '<i class="fas fa-chevron-left"></i></button>';

  for (var i = 1; i <= totalPag; i++) {
    if (i === 1 || i === totalPag || Math.abs(i - ERB.paginaLista) <= 1) {
      html += '<button class="page-btn ' + (i === ERB.paginaLista ? 'active' : '') + '" onclick="irPagina(' + i + ')">' + i + '</button>';
    } else if (Math.abs(i - ERB.paginaLista) === 2) {
      html += '<span class="page-ellipsis">...</span>';
    }
  }

  html += '<button class="page-btn" onclick="irPagina(' + (ERB.paginaLista + 1) + ')" ' + (ERB.paginaLista >= totalPag ? 'disabled' : '') + '>' +
    '<i class="fas fa-chevron-right"></i></button>';
  el.innerHTML = html;
}

function irPagina(pag) {
  var listEl = document.getElementById('ocorrencias-list');
  var filtrados = (listEl && listEl._filtrados) ? listEl._filtrados : ERB.ocorrencias;
  var totalPag  = Math.ceil(filtrados.length / ERB.itensPorPagina);
  if (pag < 1 || pag > totalPag) return;
  ERB.paginaLista = pag;
  renderLista(filtrados);
  renderPaginacao(filtrados);
}

function irParaPagina(p) { irPagina(p); }

function limparFiltros() {
  ['busca-texto','filtro-tipo','filtro-setor','filtro-status','filtro-data-inicio','filtro-data-fim'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  var ordem = document.getElementById('filtro-ordem');
  if (ordem) ordem.value = 'desc';
  filtrarOcorrencias();
}

// ============ DETALHES ============
function verDetalhes(id) {
  navegar('detalhes');
  ERB.ocorrenciaDetalhe = null;

  var contentEl = document.getElementById('detalhe-content');
  if (contentEl) contentEl.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> Carregando...</div>';

  // Buscar no cache local primeiro
  var oc = ERB.ocorrencias.find(function(o) { return o.id === id; });
  if (oc) {
    mostrarDetalhes(oc);
    return;
  }

  // Buscar na API
  fetch('tables/ocorrencias/' + id)
    .then(function(r) { return r.json(); })
    .then(function(oc) {
      if (!oc || !oc.id) throw new Error('Não encontrado');
      mostrarDetalhes(oc);
    })
    .catch(function() {
      if (contentEl) contentEl.innerHTML = '<div class="empty-state">' +
        '<i class="fas fa-exclamation-triangle"></i><p>Ocorrência não encontrada</p></div>';
    });
}

function verDetalhe(id) { verDetalhes(id); }

function mostrarDetalhes(oc) {
  ERB.ocorrenciaDetalhe = oc;

  var tituloEl = document.getElementById('detalhe-titulo');
  var numEl    = document.getElementById('detalhe-numero');
  if (tituloEl) tituloEl.textContent = oc.tipo || 'Ocorrência';
  if (numEl)    numEl.textContent    = oc.numero || '--';

  // Botões de ação
  var actionsEl = document.getElementById('detalhe-actions');
  if (actionsEl) {
    var podeEditar = ERB.usuario && (
      ERB.usuario.perfil === 'administrador' ||
      ERB.usuario.perfil === 'supervisor'    ||
      oc.fiscal_id       === ERB.usuario.id
    );
    var isAdmin = ERB.usuario && ERB.usuario.perfil === 'administrador';
    actionsEl.innerHTML =
      (podeEditar ? '<button class="btn btn-secondary" onclick="editarOcorrencia()"><i class="fas fa-pen"></i> Editar</button>' : '') +
      '<button class="btn btn-primary" onclick="gerarPDFOcorrencia()"><i class="fas fa-file-pdf"></i> PDF</button>' +
      (isAdmin ? '<button class="btn btn-danger" onclick="excluirOcorrencia(\'' + oc.id + '\')"><i class="fas fa-trash"></i></button>' : '');
  }

  var cor      = getTipoCor(oc.tipo);
  var icone    = getTipoIcone(oc.tipo);
  var fotos    = Array.isArray(oc.fotos)    ? oc.fotos.filter(Boolean)    : [];
  var historico= Array.isArray(oc.historico)? oc.historico                : [];

  var contentEl = document.getElementById('detalhe-content');
  if (!contentEl) return;

  contentEl.innerHTML =
    '<div class="detalhe-grid">' +

    // COLUNA ESQUERDA
    '<div class="detalhe-col">' +

    // Card tipo
    '<div class="detalhe-card" style="background:linear-gradient(135deg,' + cor + '12,' + cor + '04);border-left:4px solid ' + cor + '">' +
      '<div style="display:flex;align-items:center;gap:16px">' +
        '<div style="width:56px;height:56px;border-radius:16px;background:' + cor + ';display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.5rem;flex-shrink:0">' +
          '<i class="fas ' + icone + '"></i>' +
        '</div>' +
        '<div>' +
          '<div style="font-size:1.25rem;font-weight:800;color:var(--gray-900)">' + (oc.tipo || '--') + '</div>' +
          '<div style="display:flex;align-items:center;gap:8px;margin-top:6px">' + statusBadge(oc.status) + '<span style="font-size:.82rem;color:var(--gray-400)">' + (oc.numero || '') + '</span></div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // Informações
    '<div class="detalhe-card">' +
      '<h4 class="detalhe-section-title"><i class="fas fa-info-circle"></i> Informações</h4>' +
      detalheRow('Data e Hora', '<i class="fas fa-clock" style="color:var(--green-600);margin-right:6px"></i>' + formatDateTime(oc.data_hora)) +
      detalheRow('Local', '<i class="fas fa-location-dot" style="color:' + cor + ';margin-right:6px"></i>' + (oc.local || '--')) +
      detalheRow('Setor', oc.setor || '--') +
      detalheRow('Fiscal', oc.fiscal_nome || '--') +
      detalheRow('Registrado em', formatDateTime(oc.created_at || oc.data_hora)) +
    '</div>' +

    // Descrição
    '<div class="detalhe-card">' +
      '<h4 class="detalhe-section-title"><i class="fas fa-align-left"></i> Descrição</h4>' +
      '<p class="detalhe-descricao">' + (oc.descricao || 'Sem descrição.') + '</p>' +
    '</div>' +

    // Observações (se houver)
    (oc.observacoes
      ? '<div class="detalhe-card"><h4 class="detalhe-section-title"><i class="fas fa-note-sticky"></i> Observações</h4>' +
        '<p class="detalhe-descricao">' + oc.observacoes + '</p></div>'
      : '') +

    // Fotos (se houver)
    (fotos.length > 0
      ? '<div class="detalhe-card">' +
          '<h4 class="detalhe-section-title"><i class="fas fa-images"></i> Fotos (' + fotos.length + ')</h4>' +
          '<div class="fotos-grid">' +
            fotos.map(function(f, i) {
              return '<div class="foto-item" onclick="abrirFotoModal(\'' + oc.id + '\',' + i + ')" title="Ampliar">' +
                '<img src="' + f + '" alt="Foto ' + (i+1) + '" loading="lazy" />' +
                '</div>';
            }).join('') +
          '</div>' +
        '</div>'
      : '') +

    '</div>' + // fim col esquerda

    // COLUNA DIREITA
    '<div class="detalhe-col">' +

    // Alterar Status
    '<div class="detalhe-card">' +
      '<h4 class="detalhe-section-title"><i class="fas fa-tags"></i> Alterar Status</h4>' +
      '<div style="display:flex;flex-direction:column;gap:8px">' +
        ['aberta','em_andamento','encerrada'].map(function(s) {
          var ativo = oc.status === s;
          return '<button onclick="alterarStatus(\'' + oc.id + '\',\'' + s + '\')" ' +
            'class="btn ' + (ativo ? 'btn-primary' : 'btn-secondary') + '" ' +
            'style="justify-content:flex-start;gap:10px">' +
            statusBadge(s) +
            (ativo ? '<i class="fas fa-check" style="margin-left:auto;color:var(--green-600)"></i>' : '') +
            '</button>';
        }).join('') +
      '</div>' +
    '</div>' +

    // Histórico
    '<div class="detalhe-card">' +
      '<h4 class="detalhe-section-title"><i class="fas fa-clock-rotate-left"></i> Histórico</h4>' +
      '<div class="historico-list">' +
        (historico.length === 0
          ? '<p style="color:var(--gray-400);font-size:.88rem;padding:8px 0">Sem histórico</p>'
          : historico.slice().reverse().map(function(h) {
              return '<div class="historico-item">' +
                '<div class="historico-dot"></div>' +
                '<div class="historico-content">' +
                  '<div class="historico-acao">' + (h.acao || '--') + '</div>' +
                  '<div class="historico-meta">' + formatDateTime(h.data) + '</div>' +
                '</div>' +
                '</div>';
            }).join('')
        ) +
      '</div>' +
    '</div>' +

    '</div>' + // fim col direita
    '</div>'; // fim detalhe-grid
}

function detalheRow(label, value) {
  return '<div class="detail-row">' +
    '<span class="detail-label">' + label + '</span>' +
    '<span class="detail-value">' + value + '</span>' +
    '</div>';
}

// ============ AÇÕES ============
function editarOcorrencia() {
  if (!ERB.ocorrenciaDetalhe) return;
  var oc = ERB.ocorrenciaDetalhe;
  iniciarFormOcorrencia(oc);
  navegar('nova-ocorrencia', oc);
}

function alterarStatus(id, novoStatus) {
  var oc = ERB.ocorrencias.find(function(o) { return o.id === id; }) || ERB.ocorrenciaDetalhe;
  if (!oc) { showToast('Ocorrência não encontrada', 'error'); return; }

  var historico = Array.isArray(oc.historico) ? oc.historico.slice() : [];
  historico.push({
    acao:    'Status alterado para "' + novoStatus + '" por ' + (ERB.usuario ? ERB.usuario.nome : 'usuário'),
    data:    new Date().toISOString(),
    usuario: ERB.usuario ? ERB.usuario.nome : ''
  });

  fetch('tables/ocorrencias/' + id, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ status: novoStatus, historico: historico })
  })
  .then(function() {
    // Atualizar cache local
    var idx = ERB.ocorrencias.findIndex(function(o) { return o.id === id; });
    if (idx >= 0) {
      ERB.ocorrencias[idx].status   = novoStatus;
      ERB.ocorrencias[idx].historico = historico;
    }
    if (ERB.ocorrenciaDetalhe && ERB.ocorrenciaDetalhe.id === id) {
      ERB.ocorrenciaDetalhe.status   = novoStatus;
      ERB.ocorrenciaDetalhe.historico = historico;
    }
    showToast('Status alterado para "' + novoStatus + '"', 'success');
    registrarLog('EDITAR', 'Status da ocorrência ' + (oc.numero || id) + ' → ' + novoStatus);
    verDetalhes(id);
  })
  .catch(function() {
    showToast('Erro ao alterar status', 'error');
  });
}

function excluirOcorrencia(id) {
  var oc = ERB.ocorrencias.find(function(o) { return o.id === id; }) || ERB.ocorrenciaDetalhe;
  abrirModal(
    'Excluir Ocorrência',
    '<p>Tem certeza que deseja excluir a ocorrência <strong>' + (oc ? oc.numero : id) + '</strong>?</p>' +
    '<p style="color:var(--red-600);font-size:.9rem;margin-top:8px"><i class="fas fa-triangle-exclamation"></i> Esta ação não pode ser desfeita.</p>',
    '<button class="btn btn-secondary" onclick="fecharModalDireto()">Cancelar</button>' +
    '<button class="btn btn-danger" onclick="confirmarExclusao(\'' + id + '\')"><i class="fas fa-trash"></i> Excluir</button>'
  );
}

function confirmarExclusao(id) {
  var oc = ERB.ocorrencias.find(function(o) { return o.id === id; });
  fetch('tables/ocorrencias/' + id, { method: 'DELETE' })
    .then(function() {
      ERB.ocorrencias = ERB.ocorrencias.filter(function(o) { return o.id !== id; });
      fecharModalDireto();
      showToast('Ocorrência excluída!', 'success');
      registrarLog('EXCLUIR', 'Ocorrência ' + (oc ? oc.numero : id) + ' excluída');
      navegar('ocorrencias');
    })
    .catch(function() {
      showToast('Erro ao excluir ocorrência', 'error');
    });
}

// ============ VISUALIZAR FOTO ============
function abrirFotoModal(ocId, fotoIdx) {
  var oc    = ERB.ocorrencias.find(function(o) { return o.id === ocId; }) || ERB.ocorrenciaDetalhe;
  var fotos = Array.isArray(oc && oc.fotos) ? oc.fotos.filter(Boolean) : [];
  if (!fotos[fotoIdx]) return;

  var nav = '<div style="display:flex;gap:8px">';
  if (fotoIdx > 0) {
    nav += '<button class="btn btn-secondary" onclick="fecharModalDireto();abrirFotoModal(\'' + ocId + '\',' + (fotoIdx - 1) + ')">' +
      '<i class="fas fa-arrow-left"></i> Anterior</button>';
  }
  if (fotoIdx < fotos.length - 1) {
    nav += '<button class="btn btn-secondary" onclick="fecharModalDireto();abrirFotoModal(\'' + ocId + '\',' + (fotoIdx + 1) + ')">' +
      'Próxima <i class="fas fa-arrow-right"></i></button>';
  }
  nav += '</div>';

  abrirModal(
    'Foto ' + (fotoIdx + 1) + ' de ' + fotos.length,
    '<img src="' + fotos[fotoIdx] + '" alt="Foto" style="width:100%;border-radius:8px;max-height:60vh;object-fit:contain" />',
    nav
  );
}

// Alias legado
function abrirFoto(ocId, idx) { abrirFotoModal(ocId, idx); }

// ============ PDF DA OCORRÊNCIA ============
function gerarPDFOcorrencia() {
  var oc = ERB.ocorrenciaDetalhe;
  if (!oc) { showToast('Nenhuma ocorrência selecionada', 'error'); return; }
  if (!window.jspdf || !window.jspdf.jsPDF) { showToast('jsPDF não disponível', 'error'); return; }

  var doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  var W = 210, H = 297, M = 20;

  // Cabeçalho verde
  doc.setFillColor(22, 101, 52);
  doc.rect(0, 0, W, 40, 'F');
  doc.setFillColor(34, 197, 94);
  doc.roundedRect(M, 8, 22, 22, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('ERB', M + 11, 22, { align: 'center' });
  doc.setFontSize(15);
  doc.text('ERB OCORRÊNCIAS', M + 28, 18);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text('Rodoviária do Plano Piloto — Brasília, DF', M + 28, 25);
  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text('Nº ' + (oc.numero || '--'), W - M, 18, { align: 'right' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text('RELATÓRIO DE OCORRÊNCIA', W - M, 25, { align: 'right' });

  // Faixa de status
  var sc = { aberta: [202, 138, 4], em_andamento: [234, 88, 12], encerrada: [22, 163, 74] }[oc.status] || [107, 114, 128];
  doc.setFillColor(sc[0], sc[1], sc[2]);
  doc.rect(0, 40, W, 10, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  var statusLabel = { aberta: 'ABERTA', em_andamento: 'EM ANDAMENTO', encerrada: 'ENCERRADA' };
  doc.text('STATUS: ' + (statusLabel[oc.status] || oc.status || '').toUpperCase(), W / 2, 47, { align: 'center' });

  var y = 62;

  function secaoPDF(titulo) {
    if (y > H - 40) { doc.addPage(); y = 20; }
    doc.setFillColor(243, 244, 246);
    doc.rect(M, y - 4, W - M * 2, 8, 'F');
    doc.setTextColor(22, 101, 52); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text(titulo, M + 2, y + 1);
    y += 10;
  }

  function campoPDF(label, valor) {
    if (y > H - 30) { doc.addPage(); y = 20; }
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(75, 85, 99);
    doc.text(label + ':', M, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(17, 24, 39);
    var linhas = doc.splitTextToSize(String(valor || '--'), W - M * 2 - 46);
    doc.text(linhas, M + 44, y);
    y += Math.max(7, linhas.length * 5);
  }

  secaoPDF('IDENTIFICAÇÃO');
  campoPDF('Número', oc.numero);
  campoPDF('Tipo', oc.tipo);
  campoPDF('Data e Hora', formatDateTime(oc.data_hora));
  campoPDF('Local', oc.local);
  campoPDF('Setor', oc.setor);
  campoPDF('Fiscal Responsável', oc.fiscal_nome);
  campoPDF('Status', oc.status);
  y += 4;

  secaoPDF('DESCRIÇÃO DA OCORRÊNCIA');
  doc.setFont('helvetica', 'normal'); doc.setTextColor(17, 24, 39); doc.setFontSize(9);
  var linhasDesc = doc.splitTextToSize(oc.descricao || 'Sem descrição.', W - M * 2);
  doc.text(linhasDesc, M, y);
  y += linhasDesc.length * 5 + 8;

  if (oc.observacoes) {
    secaoPDF('OBSERVAÇÕES');
    var linhasObs = doc.splitTextToSize(oc.observacoes, W - M * 2);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(17, 24, 39); doc.setFontSize(9);
    doc.text(linhasObs, M, y);
    y += linhasObs.length * 5 + 8;
  }

  if (Array.isArray(oc.historico) && oc.historico.length > 0) {
    secaoPDF('HISTÓRICO DE ALTERAÇÕES');
    oc.historico.forEach(function(h) {
      if (y > H - 20) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'normal'); doc.setTextColor(17, 24, 39); doc.setFontSize(8.5);
      doc.text('• ' + (h.acao || '') + '  —  ' + formatDateTime(h.data), M + 2, y);
      y += 6;
    });
    y += 4;
  }

  // Fotos (base64)
  var fotos = Array.isArray(oc.fotos)
    ? oc.fotos.filter(function(f) { return f && f.startsWith('data:image'); })
    : [];
  if (fotos.length > 0) {
    if (y > H - 60) { doc.addPage(); y = 20; }
    secaoPDF('FOTOGRAFIAS (' + fotos.length + ')');
    var fw = 50, fh = 40, gap = 4, fx = M;
    fotos.slice(0, 6).forEach(function(foto) {
      if (fx + fw > W - M) { fx = M; y += fh + gap; }
      if (y + fh > H - 25) { doc.addPage(); y = 20; fx = M; }
      try { doc.addImage(foto, 'JPEG', fx, y, fw, fh); } catch(e) {}
      fx += fw + gap;
    });
    y += fh + 10;
  }

  // Rodapé
  var totalPags = doc.internal.getNumberOfPages();
  for (var pg = 1; pg <= totalPags; pg++) {
    doc.setPage(pg);
    doc.setFillColor(22, 101, 52);
    doc.rect(0, H - 16, W, 16, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.text('Gerado em ' + formatDateTime(new Date().toISOString()) + ' | ' + (ERB.usuario ? ERB.usuario.nome : 'Sistema'), M, H - 5);
    doc.text('ERB Ocorrências — Rodoviária do Plano Piloto', W - M, H - 5, { align: 'right' });
  }

  doc.save('Ocorrencia_' + (oc.numero || 'oc') + '_' + new Date().toISOString().split('T')[0] + '.pdf');
  showToast('PDF gerado com sucesso!', 'success');
  registrarLog('CRIAR', 'PDF da ocorrência ' + (oc.numero || '') + ' gerado');
}
