const SUPABASE_URL      = 'https://uzaypyxhbblvmuzoqmzb.supabase.co';  // ← trocar
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6YXlweXhoYmJsdm11em9xbXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3Mjc5MTQsImV4cCI6MjA5MDMwMzkxNH0.jbnneGOdIFhTBcWWaAlqfR7D8cqV7uTmUKRMf1JX9U0';               // ← trocar
 
/* ============================================================
   HEADERS padrão para todas as requisições
   ============================================================ */
function getHeaders(extra) {
  var h = {
    'apikey':        SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation'
  };
  if (extra) {
    Object.keys(extra).forEach(function(k) { h[k] = extra[k]; });
  }
  return h;
}
 
/* ============================================================
   INTERCEPTADOR DE FETCH
   Captura chamadas no formato fetch('tables/nome?params')
   e converte para chamadas REST do Supabase.
   ============================================================ */
var _fetchOriginal = window.fetch.bind(window);
 
window.fetch = function(url, options) {
  if (typeof url !== 'string' || !url.startsWith('tables/')) {
    return _fetchOriginal(url, options);
  }
  return supabaseFetch(url, options || {});
};
 
/* ============================================================
   ROTEADOR PRINCIPAL
   ============================================================ */
function supabaseFetch(url, options) {
  var method  = (options.method || 'GET').toUpperCase();
  var body    = null;
 
  if (options.body) {
    try { body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body; }
    catch(e) { body = options.body; }
  }
 
  // Separar tabela e query string
  // ex: "tables/ocorrencias?status=aberta&limit=100"
  var semPrefix = url.replace(/^tables\//, '');
  var partes    = semPrefix.split('?');
  var tabela    = partes[0];
  var queryStr  = partes[1] || '';
  var params    = new URLSearchParams(queryStr);
 
  if (method === 'GET')                         return sbSelect(tabela, params);
  if (method === 'POST')                        return sbInsert(tabela, body);
  if (method === 'PUT' || method === 'PATCH')   return sbUpdate(tabela, params, body);
  if (method === 'DELETE')                      return sbDelete(tabela, params);
 
  return _fetchOriginal(url, options);
}
 
/* ============================================================
   SELECT — GET
   Converte parâmetros simples em filtros Supabase
   ex: ?status=aberta  →  &status=eq.aberta
   ============================================================ */
function sbSelect(tabela, params) {
  var supaParams = new URLSearchParams();
  var limite = 500;
  var ordem  = 'created_at.desc';

  params.forEach(function(val, key) {
    if (key === 'limit') {
      limite = parseInt(val) || 500;
    } else if (key === 'order') {
      ordem = val;
    } else if (key === 'id') {
      supaParams.append('id', 'eq.' + val);
    } else if (key === 'email') {
      supaParams.append('email', 'eq.' + val);
    } else if (key === 'ativo') {
      supaParams.append('ativo', 'eq.' + val);
    } else if (key === 'status') {
      supaParams.append('status', 'eq.' + val);
    } else if (key === 'tipo') {
      supaParams.append('tipo', 'eq.' + encodeURIComponent(val));
    } else if (key === 'setor') {
      supaParams.append('setor', 'eq.' + encodeURIComponent(val));
    } else if (key === 'fiscal_id') {
      supaParams.append('fiscal_id', 'eq.' + val);
    } else if (key === 'data_hora_gte') {
      supaParams.append('data_hora', 'gte.' + val);
    } else if (key === 'data_hora_lte') {
      supaParams.append('data_hora', 'lte.' + val);
    } else {
      supaParams.append(key, 'eq.' + val);
    }
  });

  supaParams.set('limit', limite);
  supaParams.set('order', ordem);

  // CORRETO: id sempre como filtro na query string, nunca no path
  var apiUrl = SUPABASE_URL + '/rest/v1/' + tabela + '?' + supaParams.toString();

  return _fetchOriginal(apiUrl, {
    method: 'GET',
    headers: getHeaders({ 'Accept': 'application/json' })
  })
  .then(function(res) {
    return res.json().then(function(data) {
      if (!res.ok) {
        console.error('[ERB db.js] Erro SELECT ' + tabela + ':', data);
        return embrulhar([]);
      }
      var lista = Array.isArray(data) ? data : [data];
      return embrulhar(lista);
    });
  })
  .catch(function(err) {
    console.error('[ERB db.js] Falha SELECT ' + tabela + ':', err);
    return embrulhar([]);
  });
}
 
/* ============================================================
   INSERT — POST
   ============================================================ */
function sbInsert(tabela, body) {
  var apiUrl = SUPABASE_URL + '/rest/v1/' + tabela;
 
  return _fetchOriginal(apiUrl, {
    method: 'POST',
    headers: getHeaders({ 'Prefer': 'return=representation' }),
    body: JSON.stringify(body)
  })
  .then(function(res) {
    return res.json().then(function(data) {
      if (!res.ok) {
        console.error('[ERB db.js] Erro INSERT ' + tabela + ':', data);
        return embrulharOp(null, false, data.message || 'Erro ao salvar');
      }
      var item = Array.isArray(data) ? data[0] : data;
      return embrulharOp(item, true);
    });
  })
  .catch(function(err) {
    console.error('[ERB db.js] Falha INSERT ' + tabela + ':', err);
    return embrulharOp(null, false, err.message);
  });
}
 
/* ============================================================
   UPDATE — PUT / PATCH
   Filtra pelo id passado nos params ou no body
   ============================================================ */
function sbUpdate(tabela, params, body) {
  var supaParams = new URLSearchParams();
 
  // Prioridade: id nos params da URL
  var idParam = params.get('id');
  if (idParam) {
    supaParams.set('id', 'eq.' + idParam);
  } else if (body && body.id) {
    // id no body — remove do payload e usa como filtro
    var id = body.id;
    supaParams.set('id', 'eq.' + id);
    body = Object.assign({}, body);
    delete body.id;
  }
 
  // Remove campos que não devem ser enviados no update
  if (body) {
    body = Object.assign({}, body);
    delete body.created_at;
  }
 
  var apiUrl = SUPABASE_URL + '/rest/v1/' + tabela + '?' + supaParams.toString();
 
  return _fetchOriginal(apiUrl, {
    method: 'PATCH',
    headers: getHeaders({ 'Prefer': 'return=representation' }),
    body: JSON.stringify(body)
  })
  .then(function(res) {
    return res.json().then(function(data) {
      if (!res.ok) {
        console.error('[ERB db.js] Erro UPDATE ' + tabela + ':', data);
        return embrulharOp(null, false, data.message || 'Erro ao atualizar');
      }
      var item = Array.isArray(data) ? data[0] : data;
      return embrulharOp(item, true);
    });
  })
  .catch(function(err) {
    console.error('[ERB db.js] Falha UPDATE ' + tabela + ':', err);
    return embrulharOp(null, false, err.message);
  });
}
 
/* ============================================================
   DELETE
   ============================================================ */
function sbDelete(tabela, params) {
  var supaParams = new URLSearchParams();
 
  var idParam = params.get('id');
  if (idParam) supaParams.set('id', 'eq.' + idParam);
 
  var apiUrl = SUPABASE_URL + '/rest/v1/' + tabela + '?' + supaParams.toString();
 
  return _fetchOriginal(apiUrl, {
    method: 'DELETE',
    headers: getHeaders({ 'Prefer': 'return=minimal' })
  })
  .then(function(res) {
    if (!res.ok) {
      return res.json().then(function(data) {
        console.error('[ERB db.js] Erro DELETE ' + tabela + ':', data);
        return embrulharOp(null, false, data.message || 'Erro ao excluir');
      });
    }
    return embrulharOp(null, true);
  })
  .catch(function(err) {
    console.error('[ERB db.js] Falha DELETE ' + tabela + ':', err);
    return embrulharOp(null, false, err.message);
  });
}
 
/* ============================================================
   UPLOAD DE FOTO — Storage do Supabase
   Chamada direta (não passa pelo interceptador de fetch)
   Uso: uploadFoto(arquivo, nomeArquivo)
        retorna a URL pública do arquivo
   ============================================================ */
window.uploadFoto = function(arquivo, nomeArquivo) {
  var bucket = 'ocorrencias-anexos';
  var caminho = 'fotos/' + Date.now() + '_' + (nomeArquivo || arquivo.name);
  var apiUrl  = SUPABASE_URL + '/storage/v1/object/' + bucket + '/' + caminho;
 
  return _fetchOriginal(apiUrl, {
    method: 'POST',
    headers: {
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type':  arquivo.type || 'image/jpeg'
    },
    body: arquivo
  })
  .then(function(res) {
    if (!res.ok) throw new Error('Falha no upload da foto');
    var urlPublica = SUPABASE_URL + '/storage/v1/object/public/' + bucket + '/' + caminho;
    return { url: urlPublica, caminho: caminho };
  });
};
 
/* ============================================================
   HELPERS DE RESPOSTA
   Emulam o formato { data: [...], success: true }
   que o app.js espera receber
   ============================================================ */
function embrulhar(lista) {
  return {
    ok: true,
    json: function() {
      return Promise.resolve({ data: lista, success: true });
    }
  };
}
 
function embrulharOp(item, success, erro) {
  return {
    ok: success,
    json: function() {
      return Promise.resolve({
        data:    item || null,
        success: success,
        erro:    erro  || null
      });
    }
  };
}
 
/* ============================================================
   UTILITÁRIO — teste de conexão (roda no console)
   ============================================================ */
window.testarConexao = function() {
  console.log('[ERB db.js] Testando conexão com Supabase...');
  fetch('tables/setores?limit=1')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.data && d.data.length >= 0) {
        console.log('%c[ERB db.js] Conexão OK — Supabase respondendo!', 'color: #16a34a; font-weight: bold');
      } else {
        console.warn('[ERB db.js] Conexão OK mas sem dados. Verifique se o SQL foi executado.');
      }
    })
    .catch(function(err) {
      console.error('[ERB db.js] Falha na conexão:', err);
    });
};
 
// Testa conexão automaticamente ao carregar (só aparece no console)
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(window.testarConexao, 1500);
});
 
console.log('[ERB db.js] Carregado — interceptando chamadas para o Supabase.');