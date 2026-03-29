document.addEventListener('DOMContentLoaded', function() {
  var form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      fazerLogin();
    });
  }
});
 
function fazerLogin() {
  var email = (document.getElementById('login-email') || {}).value || '';
  var senha = (document.getElementById('login-senha') || {}).value || '';
  var btnLogin  = document.getElementById('btn-login');
  var erroEl    = document.getElementById('login-error');
 
  email = email.trim().toLowerCase();
 
  // Validação básica
  if (!email || !senha) {
    mostrarErroLogin('Preencha o e-mail e a senha.');
    return;
  }
 
  // Feedback visual no botão
  if (btnLogin) {
    btnLogin.disabled = true;
    btnLogin.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Entrando...';
  }
  if (erroEl) erroEl.classList.add('hidden');
 
  // Buscar usuário pelo e-mail na tabela usuarios
  fetch('tables/usuarios?email=' + encodeURIComponent(email) + '&ativo=true&limit=1')
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var lista   = res.data || [];
      var usuario = lista[0] || null;
 
      // Usuário não encontrado no Supabase — tentar localStorage
      if (!usuario) {
        try {
          var local = JSON.parse(localStorage.getItem('erb_usuarios_local') || '[]');
          usuario = local.find(function(u) {
            return u.email && u.email.toLowerCase() === email && u.ativo !== false;
          }) || null;
        } catch(e) { usuario = null; }
      }
      if (!usuario) {
        mostrarErroLogin('Email ou senha incorretos.');
        resetarBotaoLogin();
        return;
      }
 
      // Verificar senha (campo 'senha' — texto puro)
      if (usuario.senha !== senha) {
        mostrarErroLogin('Email ou senha incorretos.');
        resetarBotaoLogin();
        return;
      }
 
      // Usuário inativo
      if (usuario.ativo === false) {
        mostrarErroLogin('Usuário inativo. Contate o administrador.');
        resetarBotaoLogin();
        return;
      }
 
      // Login bem-sucedido — montar objeto de sessão
      var sessao = {
        id:     usuario.id,
        nome:   usuario.nome,
        email:  usuario.email,
        perfil: usuario.perfil,
        setor:  usuario.setor || '',
        ativo:  usuario.ativo
      };
 
      // Salvar sessão
      saveSession(sessao);
      ERB.usuario = sessao;
 
      // Registrar log de login
      registrarLog('LOGIN', 'Login realizado por ' + sessao.nome + ' (' + sessao.perfil + ')');
 
      // Iniciar aplicação
      iniciarApp();
    })
    .catch(function(err) {
      console.error('[ERB auth.js] Erro no login:', err);
      mostrarErroLogin('Erro ao conectar. Verifique sua conexão e tente novamente.');
      resetarBotaoLogin();
    });
}
 
function mostrarErroLogin(msg) {
  var erroEl  = document.getElementById('login-error');
  var spanEl  = erroEl ? erroEl.querySelector('span') : null;
  if (spanEl) spanEl.textContent = msg;
  if (erroEl) erroEl.classList.remove('hidden');
}
 
function resetarBotaoLogin() {
  var btn = document.getElementById('btn-login');
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<span>Entrar no Sistema</span><i class="fas fa-arrow-right"></i>';
  }
}
 
 
/* ============================================================
   LOGOUT
   ============================================================ */
function logout() {
  abrirModal(
    'Sair do Sistema',
    '<p style="color:var(--text-secondary)">Tem certeza que deseja sair?</p>',
    '<button class="btn btn-secondary" onclick="fecharModalDireto()">Cancelar</button>' +
    '<button class="btn btn-danger" onclick="confirmarLogout()"><i class="fas fa-right-from-bracket"></i> Sair</button>'
  );
}
 
function confirmarLogout() {
  if (ERB.usuario) {
    registrarLog('LOGOUT', 'Logout de ' + ERB.usuario.nome);
  }
  clearSession();
  ERB.usuario = null;
  fecharModalDireto();
 
  // Redirecionar para o login
  mostrarTela('login-screen');
 
  // Limpar estado da aplicação
  ERB.ocorrencias  = [];
  ERB.paginaAtual  = 'dashboard';
  ERB.notificacoes = [];
 
  // Limpar campos do formulário de login
  var emailEl = document.getElementById('login-email');
  var senhaEl = document.getElementById('login-senha');
  var erroEl  = document.getElementById('login-error');
  if (emailEl) emailEl.value = '';
  if (senhaEl) senhaEl.value = '';
  if (erroEl)  erroEl.classList.add('hidden');
}
 
 
/* ============================================================
   ALTERAR SENHA
   Substituí a função do app.js por uma que salva no Supabase
   ============================================================ */
function alterarSenha() {
  var atual  = (document.getElementById('config-senha-atual')     || {}).value || '';
  var nova   = (document.getElementById('config-senha-nova')      || {}).value || '';
  var conf   = (document.getElementById('config-senha-confirmar') || {}).value || '';
 
  if (!atual || !nova || !conf) {
    showToast('Preencha todos os campos de senha.', 'error');
    return;
  }
  if (nova !== conf) {
    showToast('As senhas não coincidem.', 'error');
    return;
  }
  if (nova.length < 6) {
    showToast('A senha deve ter no mínimo 6 caracteres.', 'error');
    return;
  }
  if (!ERB.usuario) {
    showToast('Sessão inválida. Faça login novamente.', 'error');
    return;
  }
 
  // Verificar senha atual no Supabase antes de alterar
  fetch('tables/usuarios?id=' + ERB.usuario.id + '&limit=1')
    .then(function(r) { return r.json(); })
    .then(function(res) {
      var usuario = (res.data || [])[0];
      if (!usuario) {
        showToast('Usuário não encontrado.', 'error');
        return;
      }
      if (usuario.senha !== atual) {
        showToast('Senha atual incorreta.', 'error');
        return;
      }
 
      // Salvar nova senha
      return fetch('tables/usuarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: ERB.usuario.id, senha: nova })
      })
      .then(function(r) { return r.json(); })
      .then(function(res) {
        if (res.success) {
          showToast('Senha alterada com sucesso!', 'success');
          registrarLog('EDITAR', 'Senha alterada pelo usuário ' + ERB.usuario.nome);
          // Limpar campos
          ['config-senha-atual','config-senha-nova','config-senha-confirmar'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.value = '';
          });
        } else {
          showToast('Erro ao salvar a nova senha.', 'error');
        }
      });
    })
    .catch(function(err) {
      console.error('[ERB auth.js] Erro ao alterar senha:', err);
      showToast('Erro de conexão ao alterar senha.', 'error');
    });
}
 
 
/* ============================================================
   VERIFICAÇÃO DE PERMISSÃO
   Bloqueia ações que o perfil do usuário não pode fazer
   ============================================================ */
window.verificarPermissao = function(perfilMinimo) {
  var hierarquia = { 'fiscal': 1, 'supervisor': 2, 'administrador': 3 };
  var nivelUsuario = hierarquia[ERB.usuario ? ERB.usuario.perfil : 'fiscal'] || 1;
  var nivelMinimo  = hierarquia[perfilMinimo] || 1;
  return nivelUsuario >= nivelMinimo;
};
 
window.exigirPermissao = function(perfilMinimo) {
  if (!verificarPermissao(perfilMinimo)) {
    showToast('Você não tem permissão para realizar esta ação.', 'error');
    return false;
  }
  return true;
};
 
 
/* ============================================================
   PROTEÇÃO DE ROTA
   Garante que páginas restritas só abrem com o perfil certo
   ============================================================ */
window.protegerRota = function(pagina) {
  var rotasAdmin = ['admin', 'logs'];
  var rotasSuper = ['relatorios'];
 
  if (rotasAdmin.includes(pagina) && !verificarPermissao('administrador')) {
    showToast('Acesso restrito a administradores.', 'error');
    navegar('dashboard');
    return false;
  }
  if (rotasSuper.includes(pagina) && !verificarPermissao('supervisor')) {
    showToast('Acesso restrito a supervisores e administradores.', 'error');
    navegar('dashboard');
    return false;
  }
  return true;
};
 
 
/* ============================================================
   RENOVAÇÃO DE SESSÃO
   Revalida o usuário no banco a cada 30 minutos
   para garantir que contas desativadas sejam deslogadas
   ============================================================ */
function iniciarRenovacaoSessao() {
  setInterval(function() {
    if (!ERB.usuario) return;
    fetch('tables/usuarios?id=' + ERB.usuario.id + '&ativo=true&limit=1')
      .then(function(r) { return r.json(); })
      .then(function(res) {
        var usuario = (res.data || [])[0];
        if (!usuario) {
          showToast('Sua sessão foi encerrada. Faça login novamente.', 'warning');
          setTimeout(confirmarLogout, 2000);
        }
      })
      .catch(function() {
        // Sem conexão — manter sessão ativa (modo offline)
      });
  }, 30 * 60 * 1000); // 30 minutos
}
 
// Iniciar renovação quando o app carregar
document.addEventListener('DOMContentLoaded', function() {
  if (ERB && ERB.usuario) iniciarRenovacaoSessao();
});
 
// Também iniciar após o login
var _iniciarAppOriginal = window.iniciarApp;
window.iniciarApp = function() {
  if (_iniciarAppOriginal) _iniciarAppOriginal();
  iniciarRenovacaoSessao();
};
 
console.log('[ERB auth.js] Carregado — autenticação via Supabase ativa.');