/* ============================================
   ERB OCORRÊNCIAS — PWA.JS
   Progressive Web App — Service Worker + Install
   ============================================ */

'use strict';

// ============ SERVICE WORKER ============
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('[ERB PWA] Service Worker registrado:', reg.scope);

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showToast('Nova versão disponível! Recarregue para atualizar.', 'info', 8000);
          }
        });
      });
    } catch (e) {
      console.warn('[ERB PWA] Service Worker não registrado:', e);
    }
  });
}

// ============ INSTALAÇÃO PWA ============
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;

  // Mostrar botão de instalação após 3s
  setTimeout(() => {
    if (deferredPrompt && !window.matchMedia('(display-mode: standalone)').matches) {
      mostrarBannerInstall();
    }
  }, 3000);
});

function mostrarBannerInstall() {
  // Verificar se já foi dispensado
  if (localStorage.getItem('erb_install_dismissed')) return;

  const banner = document.createElement('div');
  banner.id = 'install-banner';
  banner.style.cssText = `
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
    background: #1f2937; color: white; border-radius: 12px;
    padding: 16px 20px; box-shadow: 0 10px 25px rgba(0,0,0,.3);
    display: flex; align-items: center; gap: 14px; z-index: 800;
    max-width: 380px; width: 90%;
    animation: slideIn .3s ease;
  `;
  banner.innerHTML = `
    <div style="background:#16a34a;width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <i class="fas fa-shield-halved" style="font-size:1.2rem;color:white"></i>
    </div>
    <div style="flex:1">
      <div style="font-weight:700;font-size:.95rem">Instalar ERB Ocorrências</div>
      <div style="font-size:.8rem;color:#9ca3af;margin-top:2px">Use como app no seu celular</div>
    </div>
    <div style="display:flex;gap:8px">
      <button onclick="instalarPWA()" style="background:#16a34a;color:white;border:none;border-radius:8px;padding:8px 14px;font-weight:700;cursor:pointer;font-size:.85rem">
        Instalar
      </button>
      <button onclick="dispensarInstall()" style="background:transparent;color:#9ca3af;border:1px solid #374151;border-radius:8px;padding:8px;cursor:pointer">
        <i class="fas fa-xmark"></i>
      </button>
    </div>
  `;
  document.body.appendChild(banner);
}

async function instalarPWA() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    showToast('ERB Ocorrências instalado com sucesso!', 'success');
    registrarLog('SISTEMA', 'Aplicativo PWA instalado');
  }
  deferredPrompt = null;
  document.getElementById('install-banner')?.remove();
}

function dispensarInstall() {
  localStorage.setItem('erb_install_dismissed', '1');
  document.getElementById('install-banner')?.remove();
}

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  document.getElementById('install-banner')?.remove();
  showToast('App instalado com sucesso!', 'success');
});
