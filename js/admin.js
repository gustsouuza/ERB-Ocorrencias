/* ============================================
   ERB OCORRÊNCIAS — ADMIN.JS
   CRUD completo de Usuários, Tipos e Setores
   ============================================ */

function carregarAdmin() {
  var perfil = ERB.usuario ? ERB.usuario.perfil : '';
  var isAdmin = perfil === 'administrador';
  if (!isAdmin) {
    navegar('dashboard');
    showToast('Acesso restrito a administradores', 'error');
    return;
  }
  // Aba de usuários visível só para administrador
  var tabUsuarios = document.getElementById('atab-usuarios');
  var contentUsuarios = document.getElementById('tab-usuarios');
  if (tabUsuarios)    tabUsuarios.style.display    = isAdmin ? '' : 'none';
  if (contentUsuarios) contentUsuarios.style.display = isAdmin ? '' : 'none';

  // Ativar a primeira aba
  switchAdminTab('usuarios', document.getElementById('atab-usuarios'));

  // Carregar dados de todas as abas
  carregarUsuariosAdmin();
  renderTiposAdmin();
  renderSetoresAdmin();
}

// ============ TABS ============
function switchAdminTab(tab, btnEl) {
  // Desativar todas as abas
  document.querySelectorAll('.admin-tab').forEach(function(t) {
    t.classList.remove('active');
  });
  document.querySelectorAll('.admin-tab-content').forEach(function(c) {
    c.classList.remove('active');
    c.style.display = 'none';
  });

  // Ativar a selecionada
  var el = document.getElementById('tab-' + tab);
  if (el) { el.classList.add('active'); el.style.display = 'block'; }
  if (btnEl) btnEl.classList.add('active');
}

// ============ USUÁRIOS ============
function carregarUsuariosAdmin() {
  var tbody = document.getElementById('tbody-usuarios');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="loading-cell"><i class="fas fa-circle-notch fa-spin"></i> Carregando...</td></tr>';

  fetch('tables/usuarios?limit=300')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      ERB.usuarios = data.data || [];
      // Mesclar com usuários locais
      try {
        var local = JSON.parse(localStorage.getItem('erb_usuarios_local') || '[]');
        var ids   = {};
        ERB.usuarios.forEach(function(u) { if (u.id) ids[u.id] = true; });
        local.forEach(function(u) { if (!ids[u.id]) ERB.usuarios.push(u); });
      } catch(e) {}
      renderTabelaUsuarios(ERB.usuarios);
    })
    .catch(function() {
      // Fallback com demos
      ERB.usuarios = [
        { id:'demo_admin',  nome:'Administrador ERB', email:'admin@erb.gov.br',      perfil:'administrador', setor:'Administração', ativo:true },
        { id:'demo_sup',    nome:'Carlos Supervisor',  email:'supervisor@erb.gov.br', perfil:'supervisor',    setor:'Operações',     ativo:true },
        { id:'demo_fiscal', nome:'Ana Fiscal',          email:'fiscal@erb.gov.br',     perfil:'fiscal',        setor:'Plataforma A',  ativo:true }
      ];
      renderTabelaUsuarios(ERB.usuarios);
    });
}

function renderTabelaUsuarios(usuarios) {
  var tbody = document.getElementById('tbody-usuarios');
  if (!tbody) return;

  if (!usuarios || !usuarios.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">Nenhum usuário encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = usuarios.map(function(u) {
    var ativo   = u.ativo !== false;
    var inicial = (u.nome || 'U')[0].toUpperCase();
    return '<tr>' +
      '<td>' +
        '<div style="display:flex;align-items:center;gap:10px">' +
          '<div class="user-avatar" style="width:32px;height:32px;font-size:.8rem;flex-shrink:0">' + inicial + '</div>' +
          '<strong>' + (u.nome || '--') + '</strong>' +
        '</div>' +
      '</td>' +
      '<td>' + (u.email || '--') + '</td>' +
      '<td><span class="perfil-badge perfil-' + (u.perfil || 'fiscal') + '">' + (u.perfil || 'fiscal') + '</span></td>' +
      '<td>' + (u.setor || '--') + '</td>' +
      '<td><span class="status-badge ' + (ativo ? 'status-encerrada' : 'status-aberta') + '">' + (ativo ? 'Ativo' : 'Inativo') + '</span></td>' +
      '<td>' +
        '<div style="display:flex;gap:6px">' +
          '<button class="btn btn-secondary btn-sm" title="Editar" onclick="editarUsuario(\'' + u.id + '\')">' +
            '<i class="fas fa-pen"></i>' +
          '</button>' +
          '<button class="btn ' + (ativo ? 'btn-warning' : 'btn-success') + ' btn-sm" title="' + (ativo ? 'Desativar' : 'Ativar') + '" onclick="toggleUsuario(\'' + u.id + '\',' + (!ativo) + ')">' +
            '<i class="fas fa-' + (ativo ? 'ban' : 'check') + '"></i>' +
          '</button>' +
        '</div>' +
      '</td>' +
      '</tr>';
  }).join('');
}

function abrirModalUsuario(uid) {
  var u = uid ? ERB.usuarios.find(function(x) { return x.id === uid; }) : null;

  var setoresOpts = ERB.setores.map(function(s) {
    var sel = u && u.setor === s.nome ? ' selected' : '';
    return '<option value="' + s.nome + '"' + sel + '>' + s.nome + '</option>';
  }).join('');

  var html =
    '<div class="form-group">' +
      '<label class="form-label required">Nome Completo</label>' +
      '<input type="text" id="mu-nome" class="form-input" value="' + (u ? u.nome || '' : '') + '" placeholder="Nome completo do usuário" />' +
    '</div>' +
    '<div class="form-group">' +
      '<label class="form-label required">Email</label>' +
      '<input type="email" id="mu-email" class="form-input" value="' + (u ? u.email || '' : '') + '" placeholder="email@erb.gov.br" ' + (u ? 'readonly' : '') + ' />' +
    '</div>' +
    (!u
      ? '<div class="form-group"><label class="form-label required">Senha Inicial</label>' +
        '<input type="text" id="mu-senha" class="form-input" placeholder="Mínimo 6 caracteres" /></div>'
      : '') +
    '<div class="form-row">' +
      '<div class="form-group">' +
        '<label class="form-label required">Perfil</label>' +
        '<select id="mu-perfil" class="form-input">' +
          '<option value="fiscal"'        + (u && u.perfil === 'fiscal'         ? ' selected' : '') + '>Fiscal</option>' +
          '<option value="cco"'           + (u && u.perfil === 'cco'            ? ' selected' : '') + '>CCO</option>' +
          '<option value="supervisor"'    + (u && u.perfil === 'supervisor'     ? ' selected' : '') + '>Supervisor</option>' +
          '<option value="administrador"' + (u && u.perfil === 'administrador'  ? ' selected' : '') + '>Administrador</option>' +
        '</select>' +
      '</div>' +
      '<div class="form-group">' +
        '<label class="form-label">Setor</label>' +
        '<select id="mu-setor" class="form-input"><option value="">Selecione...</option>' + setoresOpts + '</select>' +
      '</div>' +
    '</div>';

  var footer =
    '<button class="btn btn-secondary" onclick="fecharModalDireto()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="salvarUsuario(\'' + (uid || '') + '\')">' +
      '<i class="fas fa-floppy-disk"></i> ' + (u ? 'Atualizar' : 'Criar Usuário') + '</button>';

  abrirModal(u ? 'Editar Usuário' : 'Novo Usuário', html, footer);
}

function editarUsuario(id) { abrirModalUsuario(id); }

function salvarUsuario(uid) {
  var nome   = ((document.getElementById('mu-nome')  || {}).value || '').trim();
  var email  = ((document.getElementById('mu-email') || {}).value || '').trim();
  var perfil = (document.getElementById('mu-perfil') || {}).value || 'fiscal';
  var setor  = (document.getElementById('mu-setor')  || {}).value || '';
  var senhaEl = document.getElementById('mu-senha');
  var senha   = senhaEl ? (senhaEl.value || '') : '';

  if (!nome)  { showToast('Nome é obrigatório', 'error');  return; }
  if (!email) { showToast('Email é obrigatório', 'error'); return; }
  if (!uid && senha.length < 6) { showToast('Senha deve ter mínimo 6 caracteres', 'error'); return; }

  var payload = { nome: nome, email: email, perfil: perfil, setor: setor, ativo: true };
  if (senha) payload.senha = senha;

  var url    = uid ? 'tables/usuarios/' + uid : 'tables/usuarios';
  var method = uid ? 'PATCH' : 'POST';

  fetch(url, {
    method:  method,
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  })
  .then(function(r) { return r.json(); })
  .then(function(result) {
    // Salvar localmente para login offline
    if (!uid && senha) {
      try {
        var local = JSON.parse(localStorage.getItem('erb_usuarios_local') || '[]');
        local.push(Object.assign({}, payload, { id: result.id || Date.now() + '', senha: senha }));
        localStorage.setItem('erb_usuarios_local', JSON.stringify(local));
      } catch(e) {}
    }
    showToast(uid ? 'Usuário atualizado!' : 'Usuário criado!', 'success');
    registrarLog(uid ? 'EDITAR' : 'CRIAR', 'Usuário ' + nome + ' ' + (uid ? 'editado' : 'criado') + ' — Perfil: ' + perfil);
    fecharModalDireto();
    carregarUsuariosAdmin();
  })
  .catch(function() {
    // Salvar local mesmo sem API
    if (!uid) {
      try {
        var local2 = JSON.parse(localStorage.getItem('erb_usuarios_local') || '[]');
        var newId  = 'local_' + Date.now();
        var novo   = Object.assign({}, payload, { id: newId, senha: senha });
        local2.push(novo);
        localStorage.setItem('erb_usuarios_local', JSON.stringify(local2));
        ERB.usuarios.push(Object.assign({}, payload, { id: newId }));
        renderTabelaUsuarios(ERB.usuarios);
      } catch(e) {}
    }
    showToast(uid ? 'Usuário atualizado!' : 'Usuário criado!', 'success');
    fecharModalDireto();
  });
}

function toggleUsuario(id, ativar) {
  fetch('tables/usuarios/' + id, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ativo: ativar })
  })
  .then(function() {
    showToast('Usuário ' + (ativar ? 'ativado' : 'desativado') + '!', 'success');
    registrarLog('EDITAR', 'Usuário ID:' + id + ' ' + (ativar ? 'ativado' : 'desativado'));
    carregarUsuariosAdmin();
  })
  .catch(function() {
    // Alterar local
    var u = ERB.usuarios.find(function(x) { return x.id === id; });
    if (u) { u.ativo = ativar; renderTabelaUsuarios(ERB.usuarios); }
    showToast('Status do usuário alterado!', 'success');
  });
}

// ============ TIPOS DE OCORRÊNCIA ============
function renderTiposAdmin() {
  var grid = document.getElementById('tipos-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i></div>';

  fetch('tables/tipos_ocorrencia?limit=200')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.data && data.data.length > 0) ERB.tipos = data.data;
      renderGridTipos();
    })
    .catch(function() {
      renderGridTipos();
    });
}

function renderGridTipos() {
  var grid = document.getElementById('tipos-grid');
  if (!grid) return;

  if (!ERB.tipos || !ERB.tipos.length) {
    grid.innerHTML = '<div class="empty-state"><i class="fas fa-tags"></i><p>Nenhum tipo cadastrado</p></div>';
    return;
  }

  grid.innerHTML = ERB.tipos.map(function(t) {
    var ativo = t.ativo !== false;
    return '<div class="tipo-card">' +
      '<div class="tipo-card-header">' +
        '<div class="tipo-icon" style="background:' + (t.cor || '#6b7280') + ';color:#fff">' +
          '<i class="fas ' + (t.icone || 'fa-circle-dot') + '"></i>' +
        '</div>' +
        '<div style="flex:1">' +
          '<div class="tipo-nome">' + (t.nome || '--') + '</div>' +
          '<span class="status-badge ' + (ativo ? 'status-encerrada' : 'status-aberta') + '" style="font-size:.72rem">' +
            (ativo ? 'Ativo' : 'Inativo') +
          '</span>' +
        '</div>' +
      '</div>' +
      '<div class="tipo-actions">' +
        '<button class="btn btn-secondary btn-sm" onclick="editarTipo(\'' + t.id + '\')">' +
          '<i class="fas fa-pen"></i> Editar</button>' +
        '<button class="btn ' + (ativo ? 'btn-warning' : 'btn-success') + ' btn-sm" onclick="toggleTipo(\'' + t.id + '\',' + (!ativo) + ')">' +
          '<i class="fas fa-' + (ativo ? 'ban' : 'check') + '"></i></button>' +
      '</div>' +
      '</div>';
  }).join('');
}

function abrirModalTipo(tid) {
  var t = tid ? ERB.tipos.find(function(x) { return x.id === tid; }) : null;
  var coresPreset = ['#dc2626','#ea580c','#d97706','#16a34a','#0891b2','#2563eb','#7c3aed','#db2777','#64748b','#ca8a04'];

  var html =
    '<div class="form-group">' +
      '<label class="form-label required">Nome do Tipo</label>' +
      '<input type="text" id="mt-nome" class="form-input" value="' + (t ? t.nome || '' : '') + '" placeholder="Ex: Furto, Briga..." />' +
    '</div>' +
    '<div class="form-group">' +
      '<label class="form-label">Ícone (Font Awesome)</label>' +
      '<input type="text" id="mt-icone" class="form-input" value="' + (t ? t.icone || 'fa-circle-dot' : 'fa-circle-dot') + '" placeholder="fa-circle-dot" />' +
      '<small style="color:var(--gray-400);display:block;margin-top:4px">Classe Font Awesome. Ex: fa-shield-halved, fa-car-crash</small>' +
    '</div>' +
    '<div class="form-group">' +
      '<label class="form-label">Cor</label>' +
      '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px">' +
        coresPreset.map(function(c) {
          var selecionada = t && t.cor === c;
          return '<div onclick="selecionarCorTipo(\'' + c + '\')" ' +
            'style="width:28px;height:28px;border-radius:50%;background:' + c + ';cursor:pointer;' +
            'border:3px solid ' + (selecionada ? '#000' : 'transparent') + ';transition:border .15s" ' +
            'data-cor="' + c + '" title="' + c + '"></div>';
        }).join('') +
      '</div>' +
      '<input type="color" id="mt-cor" class="form-input" value="' + (t ? t.cor || '#16a34a' : '#16a34a') + '" style="height:42px;padding:4px;cursor:pointer" />' +
    '</div>';

  var footer =
    '<button class="btn btn-secondary" onclick="fecharModalDireto()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="salvarTipo(\'' + (tid || '') + '\')">' +
      '<i class="fas fa-floppy-disk"></i> ' + (t ? 'Atualizar' : 'Criar Tipo') + '</button>';

  abrirModal(t ? 'Editar Tipo' : 'Novo Tipo de Ocorrência', html, footer);
}

function selecionarCorTipo(cor) {
  var input = document.getElementById('mt-cor');
  if (input) input.value = cor;
  document.querySelectorAll('[data-cor]').forEach(function(el) {
    el.style.border = '3px solid ' + (el.dataset.cor === cor ? '#000' : 'transparent');
  });
}

function editarTipo(id) { abrirModalTipo(id); }

function salvarTipo(tid) {
  var nome  = ((document.getElementById('mt-nome')  || {}).value || '').trim();
  var icone = ((document.getElementById('mt-icone') || {}).value || '').trim() || 'fa-circle-dot';
  var cor   = (document.getElementById('mt-cor')    || {}).value || '#16a34a';

  if (!nome) { showToast('Nome é obrigatório', 'error'); return; }

  var payload = { nome: nome, icone: icone, cor: cor, ativo: true };
  var url    = tid ? 'tables/tipos_ocorrencia/' + tid : 'tables/tipos_ocorrencia';
  var method = tid ? 'PATCH' : 'POST';
  if (!tid) payload.ordem = ERB.tipos.length + 1;

  fetch(url, {
    method:  method,
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  })
  .then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  })
  .then(function() {
    showToast(tid ? 'Tipo atualizado!' : 'Tipo criado!', 'success');
    registrarLog(tid ? 'EDITAR' : 'CRIAR', 'Tipo "' + nome + '" ' + (tid ? 'editado' : 'criado'));
    fecharModalDireto();
    // Recarregar tipos
    carregarTipos();
    setTimeout(renderTiposAdmin, 600);
  })
  .catch(function(err) {
    console.error('[ERB] Erro ao salvar tipo:', err);
    showToast('Erro ao salvar tipo', 'error');
  });
}

function toggleTipo(id, ativar) {
  fetch('tables/tipos_ocorrencia/' + id, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ativo: ativar })
  })
  .then(function() {
    showToast('Tipo ' + (ativar ? 'ativado' : 'desativado') + '!', 'success');
    carregarTipos();
    setTimeout(renderTiposAdmin, 600);
  })
  .catch(function() {
    showToast('Erro ao alterar tipo', 'error');
  });
}

// ============ SETORES ============
function renderSetoresAdmin() {
  var tbody = document.getElementById('tbody-setores');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" class="loading-cell"><i class="fas fa-circle-notch fa-spin"></i> Carregando...</td></tr>';

  fetch('tables/setores?limit=200')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var setores = data.data || [];
      if (setores.length > 0) ERB.setores = setores;
      renderTabelaSetores(ERB.setores);
    })
    .catch(function() {
      renderTabelaSetores(ERB.setores);
    });
}

function renderTabelaSetores(setores) {
  var tbody = document.getElementById('tbody-setores');
  if (!tbody) return;

  if (!setores || !setores.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="loading-cell">Nenhum setor encontrado</td></tr>';
    return;
  }

  tbody.innerHTML = setores.map(function(s) {
    var ativo = s.ativo !== false;
    return '<tr>' +
      '<td><strong>' + (s.nome || '--') + '</strong></td>' +
      '<td>' + (s.descricao || '--') + '</td>' +
      '<td><span class="status-badge ' + (ativo ? 'status-encerrada' : 'status-aberta') + '">' + (ativo ? 'Ativo' : 'Inativo') + '</span></td>' +
      '<td>' +
        '<div style="display:flex;gap:6px">' +
          '<button class="btn btn-secondary btn-sm" onclick="editarSetor(\'' + s.id + '\')">' +
            '<i class="fas fa-pen"></i>' +
          '</button>' +
          '<button class="btn ' + (ativo ? 'btn-warning' : 'btn-success') + ' btn-sm" onclick="toggleSetor(\'' + s.id + '\',' + (!ativo) + ')">' +
            '<i class="fas fa-' + (ativo ? 'ban' : 'check') + '"></i>' +
          '</button>' +
        '</div>' +
      '</td>' +
      '</tr>';
  }).join('');
}

function abrirModalSetor(sid) {
  var s = sid ? (ERB.setores.find(function(x) { return x.id === sid; }) || null) : null;

  var html =
    '<div class="form-group">' +
      '<label class="form-label required">Nome do Setor</label>' +
      '<input type="text" id="ms-nome" class="form-input" value="' + (s ? s.nome || '' : '') + '" placeholder="Ex: Plataforma A, Mezanino..." />' +
    '</div>' +
    '<div class="form-group">' +
      '<label class="form-label">Descrição</label>' +
      '<input type="text" id="ms-desc" class="form-input" value="' + (s ? s.descricao || '' : '') + '" placeholder="Descrição opcional" />' +
    '</div>';

  var footer =
    '<button class="btn btn-secondary" onclick="fecharModalDireto()">Cancelar</button>' +
    '<button class="btn btn-primary" onclick="salvarSetor(\'' + (sid || '') + '\')">' +
      '<i class="fas fa-floppy-disk"></i> ' + (s ? 'Atualizar' : 'Criar Setor') + '</button>';

  abrirModal(s ? 'Editar Setor' : 'Novo Setor', html, footer);
}

function editarSetor(id) { abrirModalSetor(id); }

function salvarSetor(sid) {
  var nome = ((document.getElementById('ms-nome') || {}).value || '').trim();
  var desc = ((document.getElementById('ms-desc') || {}).value || '').trim();

  if (!nome) { showToast('Nome do setor é obrigatório', 'error'); return; }

  var payload = { nome: nome, descricao: desc, ativo: true };
  var url    = sid ? 'tables/setores/' + sid : 'tables/setores';
  var method = sid ? 'PATCH' : 'POST';

  fetch(url, {
    method:  method,
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  })
  .then(function(r) {
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  })
  .then(function() {
    showToast(sid ? 'Setor atualizado!' : 'Setor criado!', 'success');
    registrarLog(sid ? 'EDITAR' : 'CRIAR', 'Setor "' + nome + '" ' + (sid ? 'editado' : 'criado'));
    fecharModalDireto();
    carregarSetores();
    setTimeout(renderSetoresAdmin, 600);
  })
  .catch(function(err) {
    console.error('[ERB] Erro ao salvar setor:', err);
    showToast('Erro ao salvar setor', 'error');
  });
}

function toggleSetor(id, ativar) {
  fetch('tables/setores/' + id, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ativo: ativar })
  })
  .then(function() {
    showToast('Setor ' + (ativar ? 'ativado' : 'desativado') + '!', 'success');
    carregarSetores();
    setTimeout(renderSetoresAdmin, 600);
  })
  .catch(function() {
    showToast('Erro ao alterar setor', 'error');
  });
}