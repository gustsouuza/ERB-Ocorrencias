/* ============================================
   ERB OCORRÊNCIAS — DASHBOARD.JS
   ============================================ */

function carregarDashboard() {
  // Data atual
  var now = new Date();
  var dateEl = document.getElementById('dashboard-date');
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString('pt-BR', {
      weekday:'long', day:'numeric', month:'long', year:'numeric'
    });
  }

  // Definir mês/ano atual nos selects (só na primeira vez)
  var mesEl = document.getElementById('dashboard-mes');
  var anoEl = document.getElementById('dashboard-ano');
  if (mesEl && !mesEl.dataset.init) {
    mesEl.value = now.getMonth();
    mesEl.dataset.init = '1';
  }
  if (anoEl && !anoEl.dataset.init) {
    anoEl.value = now.getFullYear();
    anoEl.dataset.init = '1';
  }

  // Buscar ocorrências
  fetch('tables/ocorrencias?limit=500')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      ERB.ocorrencias = data.data || [];
      processarDashboard();
    })
    .catch(function(e) {
      console.error('Erro dashboard:', e);
      processarDashboard();
    });
}

function loadDashboard() { carregarDashboard(); }

function processarDashboard() {
  var mesEl = document.getElementById('dashboard-mes');
  var anoEl = document.getElementById('dashboard-ano');
  var mes = mesEl ? parseInt(mesEl.value) : new Date().getMonth();
  var ano = anoEl ? parseInt(anoEl.value) : new Date().getFullYear();

  // Filtrar por mês/ano
  var ocMes = ERB.ocorrencias.filter(function(o) {
    var d = new Date(o.data_hora);
    return d.getMonth() === mes && d.getFullYear() === ano;
  });

  atualizarCards(ocMes);
  renderGraficoDiario(ocMes, mes, ano);
  renderGraficoTipo(ocMes);
  renderGraficoSetor(ocMes);
  renderRanking(ocMes);
  renderRecentes();
}

// ============ CARDS ============
function atualizarCards(ocs) {
  var el = function(id, v) {
    var e = document.getElementById(id);
    if (e) e.textContent = v;
  };
  el('stat-total', ocs.length);
  el('stat-open', ocs.filter(function(o) { return o.status==='aberta'; }).length);
  el('stat-progress', ocs.filter(function(o) { return o.status==='em_andamento'; }).length);
  el('stat-closed', ocs.filter(function(o) { return o.status==='encerrada'; }).length);
}

// ============ GRÁFICO DIÁRIO ============
function renderGraficoDiario(ocs, mes, ano) {
  var canvas = document.getElementById('chart-daily');
  if (!canvas || !window.Chart) return;

  var diasNoMes = new Date(ano, mes+1, 0).getDate();
  var labels = [], valores = [];
  for (var d = 1; d <= diasNoMes; d++) {
    labels.push(String(d).padStart(2,'0'));
    var count = ocs.filter(function(o) { return new Date(o.data_hora).getDate() === d; }).length;
    valores.push(count);
  }

  if (ERB.charts.daily) { try { ERB.charts.daily.destroy(); } catch(e){} }

  ERB.charts.daily = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Ocorrências',
        data: valores,
        backgroundColor: 'rgba(22,163,74,0.7)',
        borderColor: '#16a34a',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 0 } },
        y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: 'rgba(0,0,0,.05)' } }
      }
    }
  });
}

// ============ GRÁFICO TIPO ============
function renderGraficoTipo(ocs) {
  var canvas = document.getElementById('chart-tipo');
  if (!canvas || !window.Chart) return;

  var contagem = {};
  ocs.forEach(function(o) { if (o.tipo) contagem[o.tipo] = (contagem[o.tipo]||0) + 1; });

  var sorted = Object.entries(contagem).sort(function(a,b){return b[1]-a[1];}).slice(0,8);
  if (sorted.length === 0) {
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '14px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Sem dados para este período', canvas.width/2, canvas.height/2);
    return;
  }

  if (ERB.charts.tipo) { try { ERB.charts.tipo.destroy(); } catch(e){} }

  ERB.charts.tipo = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: sorted.map(function(e){return e[0];}),
      datasets: [{
        data: sorted.map(function(e){return e[1];}),
        backgroundColor: sorted.map(function(e){return getTipoCor(e[0]);}),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position:'right', labels: { font:{size:11}, padding:8, boxWidth:14 } }
      },
      cutout: '55%'
    }
  });
}

// ============ GRÁFICO SETOR ============
function renderGraficoSetor(ocs) {
  var canvas = document.getElementById('chart-setor');
  if (!canvas || !window.Chart) return;

  var contagem = {};
  ocs.forEach(function(o) { if (o.setor) contagem[o.setor] = (contagem[o.setor]||0) + 1; });

  var sorted = Object.entries(contagem).sort(function(a,b){return b[1]-a[1];}).slice(0,8);
  if (sorted.length === 0) return;

  if (ERB.charts.setor) { try { ERB.charts.setor.destroy(); } catch(e){} }

  var cores = ['rgba(22,163,74,.8)','rgba(37,99,235,.8)','rgba(168,85,247,.8)','rgba(234,88,12,.8)',
               'rgba(220,38,38,.8)','rgba(202,138,4,.8)','rgba(6,182,212,.8)','rgba(107,114,128,.8)'];

  ERB.charts.setor = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: sorted.map(function(e){return e[0];}),
      datasets: [{
        data: sorted.map(function(e){return e[1];}),
        backgroundColor: cores,
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero:true, ticks:{ stepSize:1 }, grid:{ color:'rgba(0,0,0,.05)' } },
        y: { grid:{ display:false } }
      }
    }
  });
}

// ============ RANKING ============
function renderRanking(ocs) {
  var el = document.getElementById('ranking-list');
  if (!el) return;

  var contagem = {};
  ocs.forEach(function(o) { if (o.tipo) contagem[o.tipo] = (contagem[o.tipo]||0) + 1; });
  var sorted = Object.entries(contagem).sort(function(a,b){return b[1]-a[1];}).slice(0,8);
  var total = sorted.reduce(function(s,e){return s+e[1];},0) || 1;

  if (sorted.length === 0) {
    el.innerHTML = '<div class="empty-state" style="padding:20px"><i class="fas fa-chart-bar"></i><p>Sem dados</p></div>';
    return;
  }

  var medalhas = ['gold','silver','bronze'];
  el.innerHTML = sorted.map(function(entry, i) {
    var tipo = entry[0], count = entry[1];
    var pct = Math.round(count / total * 100);
    return '<div class="ranking-item">' +
      '<div class="ranking-pos ' + (medalhas[i]||'') + '">' + (i+1) + '</div>' +
      '<div class="ranking-info">' +
        '<div class="ranking-name">' + tipo + '</div>' +
        '<div class="ranking-bar-wrapper"><div class="ranking-bar" style="width:' + pct + '%;background:' + getTipoCor(tipo) + '"></div></div>' +
      '</div>' +
      '<div class="ranking-count">' + count + '</div>' +
      '</div>';
  }).join('');
}

// ============ RECENTES ============
function renderRecentes() {
  var el = document.getElementById('recent-list');
  if (!el) return;

  var sorted = ERB.ocorrencias.slice().sort(function(a,b) {
    return new Date(b.data_hora) - new Date(a.data_hora);
  }).slice(0, 6);

  if (sorted.length === 0) {
    el.innerHTML = '<div class="empty-state" style="padding:20px"><i class="fas fa-clipboard-list"></i><p>Nenhuma ocorrência</p></div>';
    return;
  }

  el.innerHTML = sorted.map(function(o) {
    return '<div class="recent-item" onclick="verDetalhes(\'' + o.id + '\')">' +
      '<div class="recent-dot" style="background:' + statusDot(o.status) + '"></div>' +
      '<div class="recent-info">' +
        '<div class="recent-numero">' + (o.numero||'--') + '</div>' +
        '<div class="recent-tipo">' + (o.tipo||'--') + '</div>' +
        '<div class="recent-meta">' + (o.local||'') + ' · ' + (o.setor||'') + '</div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">' +
        statusBadge(o.status) +
        '<small style="color:var(--gray-400)">' + timeAgo(o.data_hora) + '</small>' +
      '</div>' +
      '</div>';
  }).join('');
}
