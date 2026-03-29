/* ============================================
   ERB OCORRÊNCIAS — APP.JS (Core)
   Versão corrigida e funcional
   ============================================ */

// ============ ESTADO GLOBAL ============
var ERB = {
  usuario: null,
  paginaAtual: 'dashboard',
  ocorrencias: [],
  tipos: [],
  setores: [],
  usuarios: [],
  logs: [],
  notificacoes: [],
  charts: {},
  paginaLista: 1,
  itensPorPagina: 10,
  ocorrenciaDetalhe: null,
  editandoOcorrencia: null,
  fotosBases: [],
  docsBases: [],
  offline: false,
  offlineQueue: [],
  tiposCarregados: false,
  setoresCarregados: false
};

// ============ INICIALIZAÇÃO ============
document.addEventListener('DOMContentLoaded', function() {
  // Splash 2s
  setTimeout(function() {
    var splash = document.getElementById('splash-screen');
    if (splash) {
      splash.style.opacity = '0';
      splash.style.transition = 'opacity 0.5s';
      setTimeout(function() { splash.style.display = 'none'; }, 500);
    }
    var usuario = getSession();
    if (usuario) {
      ERB.usuario = usuario;
      iniciarApp();
    } else {
      mostrarTela('login-screen');
    }
  }, 2000);

  // Conectividade
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  if (!navigator.onLine) onOffline();
});

function mostrarTela(id) {
  ['login-screen','app'].forEach(function(tid) {
    var el = document.getElementById(tid);
    if (el) el.style.display = 'none';
  });
  var el = document.getElementById(id);
  if (el) el.style.display = '';
}

function iniciarApp() {
  mostrarTela('app');
  // Carregar tipos e setores e depois iniciar UI
  Promise.all([carregarTipos(), carregarSetores()]).then(function() {
    atualizarUIUsuario();
    navegar('dashboard');
    setTimeout(checkNotificacoes, 3000);
  }).catch(function() {
    atualizarUIUsuario();
    navegar('dashboard');
    setTimeout(checkNotificacoes, 3000);
  });
}

// ============ CARREGAR TIPOS E SETORES ============
function carregarTipos() {
  return fetch('tables/tipos_ocorrencia?limit=100')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var lista = (data.data || []).filter(function(t) { return t.ativo !== false; });
      if (lista.length > 0) ERB.tipos = lista;
      else setTiposFallback();
      ERB.tiposCarregados = true;
    })
    .catch(function() {
      setTiposFallback();
      ERB.tiposCarregados = true;
    });
}

function setTiposFallback() {
  ERB.tipos = [
    {id:'t1',nome:'Furto',icone:'fa-user-minus',cor:'#dc2626',ativo:true},
    {id:'t2',nome:'Briga',icone:'fa-hand-fist',cor:'#ea580c',ativo:true},
    {id:'t3',nome:'Pessoa Passando Mal',icone:'fa-heart-pulse',cor:'#db2777',ativo:true},
    {id:'t4',nome:'Acidente',icone:'fa-car-crash',cor:'#d97706',ativo:true},
    {id:'t5',nome:'Ônibus Irregular',icone:'fa-bus',cor:'#7c3aed',ativo:true},
    {id:'t6',nome:'Vandalismo',icone:'fa-spray-can',cor:'#b45309',ativo:true},
    {id:'t7',nome:'Ambulante Irregular',icone:'fa-cart-shopping',cor:'#0891b2',ativo:true},
    {id:'t8',nome:'Problemas Estruturais',icone:'fa-building-circle-exclamation',cor:'#64748b',ativo:true},
    {id:'t9',nome:'Limpeza',icone:'fa-broom',cor:'#16a34a',ativo:true},
    {id:'t10',nome:'Escada Rolante Parada',icone:'fa-stairs',cor:'#ca8a04',ativo:true},
    {id:'t11',nome:'Elevador Parado',icone:'fa-elevator',cor:'#ca8a04',ativo:true},
    {id:'t12',nome:'Apoio Policial',icone:'fa-shield-halved',cor:'#1d4ed8',ativo:true},
    {id:'t13',nome:'Apoio Médico',icone:'fa-kit-medical',cor:'#dc2626',ativo:true},
    {id:'t14',nome:'Outros',icone:'fa-circle-dot',cor:'#6b7280',ativo:true}
  ];
}

function carregarSetores() {
  return fetch('tables/setores?limit=100')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var lista = (data.data || []).filter(function(s) { return s.ativo !== false; });
      if (lista.length > 0) ERB.setores = lista;
      else setSetoresFallback();
      ERB.setoresCarregados = true;
    })
    .catch(function() {
      setSetoresFallback();
      ERB.setoresCarregados = true;
    });
}

function setSetoresFallback() {
  ERB.setores = [
    {id:'s1',nome:'Plataforma A',ativo:true},
    {id:'s2',nome:'Plataforma B',ativo:true},
    {id:'s3',nome:'Plataforma C',ativo:true},
    {id:'s4',nome:'Plataforma D',ativo:true},
    {id:'s5',nome:'Plataforma E',ativo:true},
    {id:'s6',nome:'Mezanino',ativo:true},
    {id:'s7',nome:'Térreo',ativo:true},
    {id:'s8',nome:'Bilheteria',ativo:true},
    {id:'s9',nome:'Lojão',ativo:true},
    {id:'s10',nome:'Estacionamento',ativo:true},
    {id:'s11',nome:'Banheiros',ativo:true},
    {id:'s12',nome:'Administração',ativo:true}
  ];
}

// ============ POPULAR SELECTS ============
function popularSelectTipos(selectId, selecionado) {
  var sel = document.getElementById(selectId);
  if (!sel) return;
  var primeiro = sel.options[0] ? sel.options[0].text : 'Selecione...';
  sel.innerHTML = '<option value="">' + primeiro + '</option>';
  ERB.tipos.forEach(function(t) {
    var opt = document.createElement('option');
    opt.value = t.nome;
    opt.textContent = t.nome;
    if (selecionado && t.nome === selecionado) opt.selected = true;
    sel.appendChild(opt);
  });
}

function popularSelectSetores(selectId, selecionado) {
  var sel = document.getElementById(selectId);
  if (!sel) return;
  var primeiro = sel.options[0] ? sel.options[0].text : 'Selecione...';
  sel.innerHTML = '<option value="">' + primeiro + '</option>';
  ERB.setores.forEach(function(s) {
    var opt = document.createElement('option');
    opt.value = s.nome;
    opt.textContent = s.nome;
    if (selecionado && s.nome === selecionado) opt.selected = true;
    sel.appendChild(opt);
  });
}

// ============ NAVEGAÇÃO ============
function navegar(pagina, dados) {
  ERB.paginaAtual = pagina;

  // Atualizar nav
  document.querySelectorAll('.nav-item').forEach(function(item) {
    item.classList.toggle('active', item.dataset.page === pagina);
  });

  // Esconder todas as páginas
  document.querySelectorAll('.page').forEach(function(p) {
    p.style.display = 'none';
    p.classList.remove('active');
  });

  // Mostrar a página correta
  var pageEl = document.getElementById('page-' + pagina);
  if (pageEl) {
    pageEl.style.display = 'block';
    pageEl.classList.add('active');
  }

  // Título topbar
  var titulos = {
    'dashboard': 'Dashboard',
    'nova-ocorrencia': 'Registrar Ocorrência',
    'ocorrencias': 'Lista de Ocorrências',
    'detalhes': 'Detalhes da Ocorrência',
    'relatorios': 'Relatórios',
    'admin': 'Administração',
    'configuracoes': 'Configurações',
    'logs': 'Logs do Sistema'
  };
  var tEl = document.getElementById('topbar-title');
  if (tEl) tEl.textContent = titulos[pagina] || pagina;

  fecharSidebar();

  // Carregar conteúdo
  if (pagina === 'dashboard') carregarDashboard();
  else if (pagina === 'nova-ocorrencia') iniciarFormOcorrencia(dados || null);
  else if (pagina === 'ocorrencias') carregarListaOcorrencias();
  else if (pagina === 'relatorios') iniciarRelatorios();
  else if (pagina === 'admin') carregarAdmin();
  else if (pagina === 'configuracoes') carregarConfiguracoes();
  else if (pagina === 'logs') carregarLogs();
}

// Alias para o HTML
function navigate(p, d) { navegar(p, d); }

// ============ SIDEBAR ============
function openSidebar() {
  var s = document.getElementById('sidebar');
  var o = document.getElementById('sidebar-overlay');
  if (s) s.classList.add('open');
  if (o) o.classList.add('active');
}

function closeSidebar() { fecharSidebar(); }

function fecharSidebar() {
  var s = document.getElementById('sidebar');
  var o = document.getElementById('sidebar-overlay');
  if (s) s.classList.remove('open');
  if (o) o.classList.remove('active');
}

// ============ USUÁRIO UI ============
function atualizarUIUsuario() {
  if (!ERB.usuario) return;
  var u = ERB.usuario;
  var inicial = (u.nome || 'U')[0].toUpperCase();

  var sAvatar = document.getElementById('sidebar-avatar');
  var sNome   = document.getElementById('sidebar-user-name');
  var sRole   = document.getElementById('sidebar-user-role');
  var tAvatar = document.getElementById('topbar-avatar');

  if (sAvatar) sAvatar.textContent = inicial;
  if (sNome)   sNome.textContent   = u.nome   || 'Usuário';
  if (sRole)   sRole.textContent   = u.perfil || 'Fiscal';
  if (tAvatar) tAvatar.textContent = inicial;

  var navAdmin = document.getElementById('nav-admin');
  var navLogs  = document.getElementById('nav-logs');
  var isAdmin  = u.perfil === 'administrador';
  var isSuper  = isAdmin || u.perfil === 'supervisor';
  if (navAdmin) navAdmin.style.display = isAdmin ? '' : 'none';
  if (navLogs)  navLogs.style.display  = isSuper ? '' : 'none';
}

// ============ HELPERS ============
function gerarNumeroOcorrencia() {
  var ano = new Date().getFullYear();
  var seq = String(Date.now()).slice(-5);
  return 'OC-' + ano + '-' + seq;
}

function getTipoCor(nome) {
  var t = ERB.tipos.find(function(x) { return x.nome === nome; });
  return t ? (t.cor || '#6b7280') : '#6b7280';
}

function getTipoIcone(nome) {
  var t = ERB.tipos.find(function(x) { return x.nome === nome; });
  return t ? (t.icone || 'fa-circle-dot') : 'fa-circle-dot';
}

function statusBadge(status) {
  var map = {
    aberta:       '<span class="status-badge status-aberta"><i class="fas fa-circle-dot"></i> Aberta</span>',
    em_andamento: '<span class="status-badge status-em_andamento"><i class="fas fa-circle-half-stroke"></i> Em Andamento</span>',
    encerrada:    '<span class="status-badge status-encerrada"><i class="fas fa-circle-check"></i> Encerrada</span>'
  };
  return map[status] || '<span class="status-badge">' + (status || '--') + '</span>';
}

function statusDot(status) {
  var cores = { aberta:'#ca8a04', em_andamento:'#ea580c', encerrada:'#16a34a' };
  return cores[status] || '#9ca3af';
}

function formatDate(str) {
  if (!str) return '--';
  var d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleDateString('pt-BR');
}

function formatDateTime(str) {
  if (!str) return '--';
  var d = new Date(str);
  if (isNaN(d)) return str;
  return d.toLocaleString('pt-BR', {
    day:'2-digit', month:'2-digit', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  });
}

function formatDateTimeLocal(str) {
  if (!str) return '';
  var d = new Date(str);
  if (isNaN(d)) return '';
  var pad = function(n) { return String(n).padStart(2,'0'); };
  return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) +
         'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function timeAgo(str) {
  if (!str) return '--';
  var d = new Date(str);
  if (isNaN(d)) return '--';
  var diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60)     return 'agora mesmo';
  if (diff < 3600)   return Math.floor(diff / 60)   + 'min atrás';
  if (diff < 86400)  return Math.floor(diff / 3600)  + 'h atrás';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd atrás';
  return formatDate(str);
}

// ============ TOAST ============
function showToast(msg, tipo, duracao) {
  tipo = tipo || 'success';
  duracao = duracao || 3500;
  var icons = {
    success: 'fa-circle-check',
    error:   'fa-circle-xmark',
    info:    'fa-circle-info',
    warning: 'fa-triangle-exclamation'
  };
  var container = document.getElementById('toast-container');
  if (!container) return;
  var toast = document.createElement('div');
  toast.className = 'toast toast-' + tipo;
  toast.innerHTML = '<i class="fas ' + (icons[tipo] || icons.info) + '"></i><span>' + msg + '</span>';
  container.appendChild(toast);
  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(110%)';
    setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 350);
  }, duracao);
}

// ============ MODAL ============
function abrirModal(titulo, html, footerHTML) {
  var overlay = document.getElementById('modal-overlay');
  var title   = document.getElementById('modal-title');
  var body    = document.getElementById('modal-body');
  var footer  = document.getElementById('modal-footer');
  if (!overlay) return;
  if (title)  title.textContent  = titulo || '';
  if (body)   body.innerHTML     = html || '';
  if (footer) footer.innerHTML   = footerHTML || '';
  overlay.style.display = 'flex';
  overlay.classList.remove('hidden');
}

function fecharModal(event) {
  // Fechar ao clicar no overlay (fundo escuro)
  // O modal em si tem stopPropagation, então só chega aqui se clicar no overlay
  fecharModalDireto();
}

function fecharModalDireto() {
  var overlay = document.getElementById('modal-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    overlay.classList.add('hidden');
  }
}

// ============ NOTIFICAÇÕES ============
function toggleNotifications() {
  var panel = document.getElementById('notifications-panel');
  if (panel) panel.classList.toggle('hidden');
}

function addNotificacao(msg, tipo, ocId) {
  var notif = {
    id: Date.now(),
    msg: msg,
    tipo: tipo || 'info',
    ocId: ocId || null,
    data: new Date().toISOString(),
    lida: false
  };
  ERB.notificacoes.unshift(notif);
  atualizarBadgeNotif();
  renderNotificacoes();
}

function atualizarBadgeNotif() {
  var naoLidas = ERB.notificacoes.filter(function(n) { return !n.lida; }).length;
  var badge = document.getElementById('notif-badge');
  if (!badge) return;
  if (naoLidas > 0) {
    badge.style.display = 'flex';
    badge.textContent = naoLidas > 9 ? '9+' : naoLidas;
  } else {
    badge.style.display = 'none';
  }
}

function renderNotificacoes() {
  var list = document.getElementById('notif-list');
  if (!list) return;
  if (ERB.notificacoes.length === 0) {
    list.innerHTML = '<div class="notif-empty"><i class="fas fa-bell-slash"></i><p>Nenhuma notificação</p></div>';
    return;
  }
  list.innerHTML = ERB.notificacoes.slice(0, 20).map(function(n) {
    return '<div class="notif-item ' + (n.lida ? '' : 'unread') + '" onclick="lerNotif(' + n.id + ')">' +
      '<div class="notif-icon"><i class="fas fa-clipboard-list"></i></div>' +
      '<div class="notif-text"><p>' + n.msg + '</p><small>' + timeAgo(n.data) + '</small></div>' +
      '</div>';
  }).join('');
}

function lerNotif(id) {
  var n = ERB.notificacoes.find(function(x) { return x.id === id; });
  if (n) {
    n.lida = true;
    atualizarBadgeNotif();
    renderNotificacoes();
    if (n.ocId) { toggleNotifications(); verDetalhes(n.ocId); }
  }
}

function markAllRead() {
  ERB.notificacoes.forEach(function(n) { n.lida = true; });
  atualizarBadgeNotif();
  renderNotificacoes();
}

function checkNotificacoes() {
  fetch('tables/ocorrencias?limit=500')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var abertas = (data.data || []).filter(function(o) {
        return o.status === 'aberta' || o.status === 'em_andamento';
      });
      if (abertas.length > 0) {
        addNotificacao(abertas.length + ' ocorrência(s) abertas aguardando resolução', 'warning');
      }
    }).catch(function() {});
}

// ============ OFFLINE ============
function onOffline() {
  ERB.offline = true;
  var banner = document.getElementById('offline-banner');
  if (banner) banner.classList.remove('hidden');
  showToast('Modo offline ativado', 'warning');
}

function onOnline() {
  ERB.offline = false;
  var banner = document.getElementById('offline-banner');
  if (banner) banner.classList.add('hidden');
  showToast('Conexão restabelecida!', 'success');
  sincronizarOffline();
}

function sincronizarOffline() {
  if (!ERB.offlineQueue || ERB.offlineQueue.length === 0) return;
  showToast('Sincronizando ' + ERB.offlineQueue.length + ' item(s)...', 'info');
  var queue = ERB.offlineQueue.slice();
  ERB.offlineQueue = [];
  queue.forEach(function(item) {
    fetch(item.url, {
      method: item.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item.data)
    }).catch(function() { ERB.offlineQueue.push(item); });
  });
  saveOfflineQueue();
}

function saveOfflineQueue() {
  try { localStorage.setItem('erb_offline_queue', JSON.stringify(ERB.offlineQueue)); } catch(e) {}
}

// ============ LOGS ============
function registrarLog(acao, detalhes) {
  var log = {
    usuario_nome: ERB.usuario ? ERB.usuario.nome : 'Sistema',
    usuario_id:   ERB.usuario ? ERB.usuario.id   : '',
    acao:         acao,
    detalhes:     detalhes || '',
    timestamp:    new Date().toISOString()
  };
  try {
    var local = JSON.parse(localStorage.getItem('erb_logs') || '[]');
    local.unshift(log);
    if (local.length > 200) local = local.slice(0, 200);
    localStorage.setItem('erb_logs', JSON.stringify(local));
  } catch(e) {}
  fetch('tables/logs_sistema', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(log)
  }).catch(function() {});
}

// ============ CONFIGURAÇÕES ============
function carregarConfiguracoes() {
  if (!ERB.usuario) return;
  var u = ERB.usuario;
  var g = function(id) { return document.getElementById(id); };
  if (g('config-nome'))   g('config-nome').value   = u.nome   || '';
  if (g('config-email'))  g('config-email').value  = u.email  || '';
  if (g('config-setor'))  g('config-setor').value  = u.setor  || '';
  if (g('config-perfil')) g('config-perfil').value = u.perfil || '';
  if (g('config-avatar')) g('config-avatar').textContent = (u.nome || 'U')[0].toUpperCase();
  if (g('last-sync'))     g('last-sync').textContent = new Date().toLocaleTimeString('pt-BR');
  if (g('pwa-status')) {
    var installed = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    g('pwa-status').textContent = installed ? 'Instalado ✓' : 'Navegador';
  }
}

function salvarPerfil() {
  var nome = document.getElementById('config-nome');
  if (!nome || !nome.value.trim()) { showToast('Nome não pode ser vazio', 'error'); return; }
  ERB.usuario.nome = nome.value.trim();
  saveSession(ERB.usuario);
  atualizarUIUsuario();
  showToast('Perfil atualizado!', 'success');
  registrarLog('EDITAR', 'Perfil do usuário ' + ERB.usuario.nome + ' atualizado');
}

function alterarSenha() {
  var atual  = (document.getElementById('config-senha-atual')      || {}).value || '';
  var nova   = (document.getElementById('config-senha-nova')       || {}).value || '';
  var conf   = (document.getElementById('config-senha-confirmar')  || {}).value || '';
  if (!atual || !nova || !conf) { showToast('Preencha todos os campos', 'error'); return; }
  if (nova !== conf) { showToast('As senhas não coincidem', 'error'); return; }
  if (nova.length < 6) { showToast('Mínimo 6 caracteres', 'error'); return; }
  showToast('Senha alterada com sucesso!', 'success');
  var el = function(id) { var e = document.getElementById(id); if (e) e.value = ''; };
  el('config-senha-atual'); el('config-senha-nova'); el('config-senha-confirmar');
}

function limparCache() {
  abrirModal('Limpar Cache',
    '<p>Tem certeza que deseja limpar o cache local? Dados offline serão removidos.</p>',
    '<button class="btn btn-secondary" onclick="fecharModalDireto()">Cancelar</button>' +
    '<button class="btn btn-danger" onclick="confirmarLimparCache()"><i class="fas fa-trash"></i> Limpar</button>'
  );
}

function confirmarLimparCache() {
  var u = ERB.usuario;
  localStorage.clear();
  if (u) saveSession(u);
  fecharModalDireto();
  showToast('Cache limpo!', 'success');
}

function exportarBackup() {
  var backup = {
    exportadoEm: new Date().toISOString(),
    usuario: ERB.usuario ? ERB.usuario.nome : '',
    ocorrencias: ERB.ocorrencias,
    tipos: ERB.tipos,
    setores: ERB.setores
  };
  var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href     = url;
  a.download = 'erb_backup_' + new Date().toISOString().split('T')[0] + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Backup exportado!', 'success');
}

function togglePushNotif(input) {
  if (input.checked && 'Notification' in window) {
    Notification.requestPermission().then(function(p) {
      if (p !== 'granted') { input.checked = false; showToast('Permissão negada', 'warning'); }
      else showToast('Notificações push ativadas!', 'success');
    });
  }
}

// ============ LOGS PAGE ============
function carregarLogs() {
  var listEl = document.getElementById('logs-list');
  if (listEl) listEl.innerHTML = '<div class="loading-spinner"><i class="fas fa-circle-notch fa-spin"></i> Carregando...</div>';

  fetch('tables/logs_sistema?limit=200')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var logs = (data.data || []).sort(function(a,b) { return new Date(b.timestamp) - new Date(a.timestamp); });
      // Mesclar com logs locais
      var local = [];
      try { local = JSON.parse(localStorage.getItem('erb_logs') || '[]'); } catch(e) {}
      var ids = {};
      logs.forEach(function(l) { if (l.id) ids[l.id] = true; });
      local.forEach(function(l) { if (l.id && !ids[l.id]) logs.push(l); else if (!l.id) logs.push(l); });
      logs.sort(function(a,b) { return new Date(b.timestamp) - new Date(a.timestamp); });
      ERB.logs = logs;
      renderLogs(logs);
    })
    .catch(function() {
      var local = [];
      try { local = JSON.parse(localStorage.getItem('erb_logs') || '[]'); } catch(e) {}
      ERB.logs = local;
      renderLogs(local);
    });
}

function renderLogs(logs) {
  var listEl = document.getElementById('logs-list');
  if (!listEl) return;
  if (!logs || logs.length === 0) {
    listEl.innerHTML = '<div class="empty-state"><i class="fas fa-scroll"></i><p>Nenhum log encontrado</p></div>';
    return;
  }
  var icons = {
    LOGIN:  'fa-right-to-bracket',
    LOGOUT: 'fa-right-from-bracket',
    CRIAR:  'fa-plus',
    EDITAR: 'fa-pen',
    EXCLUIR:'fa-trash'
  };
  listEl.innerHTML = logs.map(function(l) {
    var tipo = (l.acao || '').split(' ')[0].toUpperCase();
    var icon = icons[tipo] || 'fa-circle-dot';
    return '<div class="log-item log-' + tipo + '">' +
      '<div class="log-icon"><i class="fas ' + icon + '"></i></div>' +
      '<div class="log-content">' +
        '<div class="log-acao">' + (l.acao || '') + '</div>' +
        '<div class="log-detalhes">' + (l.detalhes || '') + '</div>' +
      '</div>' +
      '<div class="log-meta">' +
        '<span>' + (l.usuario_nome || 'Sistema') + '</span>' +
        '<span>' + formatDateTime(l.timestamp) + '</span>' +
      '</div>' +
      '</div>';
  }).join('');
}

function filtrarLogs() {
  var busca = ((document.getElementById('logs-busca') || {}).value || '').toLowerCase();
  var tipo  = (document.getElementById('logs-tipo-filtro') || {}).value || '';
  var logs = ERB.logs.filter(function(l) {
    var textMatch = !busca || ((l.acao || '') + (l.detalhes || '') + (l.usuario_nome || '')).toLowerCase().includes(busca);
    var tipoMatch = !tipo  || (l.acao || '').toUpperCase().startsWith(tipo);
    return textMatch && tipoMatch;
  });
  renderLogs(logs);
}

function exportarLogs() {
  if (!window.XLSX) { showToast('XLSX não disponível', 'error'); return; }
  var data = ERB.logs.map(function(l) {
    return {
      'Data/Hora': formatDateTime(l.timestamp),
      'Ação':      l.acao,
      'Detalhes':  l.detalhes,
      'Usuário':   l.usuario_nome
    };
  });
  var ws = XLSX.utils.json_to_sheet(data);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Logs');
  XLSX.writeFile(wb, 'logs_' + new Date().toISOString().split('T')[0] + '.xlsx');
  showToast('Logs exportados!', 'success');
}

// ============ SESSÃO ============
function saveSession(usuario) {
  try {
    sessionStorage.setItem('erb_session', JSON.stringify(usuario));
    localStorage.setItem('erb_session_persist', JSON.stringify(usuario));
  } catch(e) {}
}

function getSession() {
  try {
    var ss = sessionStorage.getItem('erb_session');
    if (ss) return JSON.parse(ss);
    var ls = localStorage.getItem('erb_session_persist');
    if (ls) return JSON.parse(ls);
  } catch(e) {}
  return null;
}

function clearSession() {
  sessionStorage.removeItem('erb_session');
  localStorage.removeItem('erb_session_persist');
}

// ============ TOGGLE PASSWORD ============
function togglePassword() {
  var input = document.getElementById('login-senha');
  var icon  = document.getElementById('eye-icon');
  if (!input || !icon) return;
  if (input.type === 'password') {
    input.type = 'text';
    icon.className = 'fas fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fas fa-eye';
  }
}

// ============ FECHAR AO CLICAR FORA ============
document.addEventListener('click', function(e) {
  var panel = document.getElementById('notifications-panel');
  var btn   = document.getElementById('notif-btn');
  if (panel && !panel.classList.contains('hidden')) {
    if (!btn.contains(e.target) && !panel.contains(e.target)) {
      panel.classList.add('hidden');
    }
  }
});

// ESC fecha modal e painel
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    fecharModalDireto();
    var np = document.getElementById('notifications-panel');
    if (np) np.classList.add('hidden');
  }
});
