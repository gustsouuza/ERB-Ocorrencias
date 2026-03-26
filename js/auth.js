/* ============================================
   ERB OCORRÊNCIAS — AUTH.JS
   ============================================ */

var DEMO_USERS = [
  { email: 'admin@erb.gov.br',      senha: 'admin123', nome: 'Administrador ERB', perfil: 'administrador', setor: 'Administração' },
  { email: 'supervisor@erb.gov.br', senha: 'super123', nome: 'Carlos Supervisor', perfil: 'supervisor',    setor: 'Operações'    },
  { email: 'fiscal@erb.gov.br',     senha: 'fiscal123',nome: 'Ana Fiscal',        perfil: 'fiscal',        setor: 'Plataforma A' }
];

// Bind do formulário ao carregar
document.addEventListener('DOMContentLoaded', function() {
  var form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      fazerLogin();
    });
  }
});

// ============ LOGIN ============
function fazerLogin() {
  var emailEl  = document.getElementById('login-email');
  var senhaEl  = document.getElementById('login-senha');
  var btnLogin = document.getElementById('btn-login');
  var errorEl  = document.getElementById('login-error');

  if (!emailEl || !senhaEl) return;

  var email = emailEl.value.trim().toLowerCase();
  var senha = senhaEl.value;

  // Limpar erro anterior
  if (errorEl) errorEl.style.display = 'none';

  if (!email || !senha) {
    mostrarErroLogin('Preencha email e senha.');
    return;
  }

  // Feedback visual no botão
  if (btnLogin) {
    btnLogin.disabled = true;
    btnLogin.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Entrando...';
  }

  // Pequeno delay para UX
  setTimeout(function() {
    // 1. Tentar usuários demo
    var usuario = autenticarDemo(email, senha);

    // 2. Tentar usuários locais
    if (!usuario) usuario = autenticarLocal(email, senha);

    if (usuario) {
      concluirLogin(usuario);
      return;
    }

    // 3. Tentar API
    fetch('tables/usuarios?limit=300')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var encontrado = (data.data || []).find(function(u) {
          return u.email && u.email.toLowerCase() === email &&
                 (u.senha_hash === senha || u.senha === senha) &&
                 u.ativo !== false;
        });
        if (encontrado) {
          var u = {
            id:     encontrado.id,
            nome:   encontrado.nome,
            email:  encontrado.email,
            perfil: encontrado.perfil,
            setor:  encontrado.setor
          };
          concluirLogin(u);
        } else {
          mostrarErroLogin('Email ou senha incorretos.');
        }
      })
      .catch(function() {
        mostrarErroLogin('Erro de conexão. Verifique sua internet.');
      });
  }, 500);
}

function concluirLogin(usuario) {
  saveSession(usuario);
  ERB.usuario = usuario;
  registrarLog('LOGIN', 'Login realizado por ' + usuario.nome + ' (' + usuario.perfil + ')');
  iniciarApp();
}

function autenticarDemo(email, senha) {
  var demo = DEMO_USERS.find(function(u) { return u.email === email && u.senha === senha; });
  if (!demo) return null;
  return {
    id:     'demo_' + demo.email,
    nome:   demo.nome,
    email:  demo.email,
    perfil: demo.perfil,
    setor:  demo.setor
  };
}

function autenticarLocal(email, senha) {
  try {
    var local = JSON.parse(localStorage.getItem('erb_usuarios_local') || '[]');
    var u = local.find(function(x) {
      return x.email === email &&
             (x.senha === senha || x.senha_hash === senha) &&
             x.ativo !== false;
    });
    if (u) return { id: u.id || ('local_' + email), nome: u.nome, email: u.email, perfil: u.perfil, setor: u.setor };
  } catch(e) {}
  return null;
}

function mostrarErroLogin(msg) {
  var btnLogin = document.getElementById('btn-login');
  var errorEl  = document.getElementById('login-error');

  if (btnLogin) {
    btnLogin.disabled = false;
    btnLogin.innerHTML = '<span>Entrar no Sistema</span><i class="fas fa-arrow-right"></i>';
  }

  if (errorEl) {
    errorEl.style.display = 'flex';
    var span = errorEl.querySelector('span');
    if (span) span.textContent = msg || 'Email ou senha incorretos.';
  }

  // Shake animation
  var loginCard = document.querySelector('.login-container');
  if (loginCard) {
    loginCard.style.animation = 'none';
    setTimeout(function() { loginCard.style.animation = 'shake 0.4s ease'; }, 10);
  }
}

// ============ LOGOUT ============
function logout() {
  abrirModal(
    'Sair do Sistema',
    '<p style="color:var(--gray-600)">Tem certeza que deseja sair do sistema ERB Ocorrências?</p>',
    '<button class="btn btn-secondary" onclick="fecharModalDireto()">Cancelar</button>' +
    '<button class="btn btn-danger" onclick="confirmarLogout()"><i class="fas fa-right-from-bracket"></i> Sair</button>'
  );
}

function confirmarLogout() {
  registrarLog('LOGOUT', 'Logout realizado por ' + (ERB.usuario ? ERB.usuario.nome : 'Usuário'));

  clearSession();
  ERB.usuario = null;

  fecharModalDireto();

  // Destruir charts
  Object.keys(ERB.charts || {}).forEach(function(k) {
    try { ERB.charts[k].destroy(); } catch(e) {}
  });
  ERB.charts = {};
  ERB.ocorrencias = [];
  ERB.notificacoes = [];
  ERB.logs = [];

  // Voltar para login
  var app = document.getElementById('app');
  if (app) app.style.display = 'none';

  var loginScreen = document.getElementById('login-screen');
  if (loginScreen) {
    loginScreen.style.display = '';
    var form = document.getElementById('login-form');
    if (form) form.reset();
    var errorEl = document.getElementById('login-error');
    if (errorEl) errorEl.style.display = 'none';
    var btnLogin = document.getElementById('btn-login');
    if (btnLogin) {
      btnLogin.disabled = false;
      btnLogin.innerHTML = '<span>Entrar no Sistema</span><i class="fas fa-arrow-right"></i>';
    }
  }
}

// CSS shake
(function() {
  var style = document.createElement('style');
  style.textContent = '@keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-10px)} 40%{transform:translateX(10px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }';
  document.head.appendChild(style);
})();
