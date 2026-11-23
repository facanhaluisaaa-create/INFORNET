// Simulador de atendimento Infornet: página do atendente.
// Fala com o servidor em /api; os segredos dos clientes e a chave do Claude ficam só no servidor.
(function () {
  "use strict";

  var CFG = null;           // vem de /api/config
  var KEY = "infornet-simulador-v2";
  // Ritmo do treino: cerca de 25 minutos para os 4 clientes, uns 6 por cliente.
  var TEMPO_TREINO_MIN = 25, TEMPO_CLIENTE_MIN = 6, ALERTA_CLIENTE_MIN = 7;

  // ---------- estado salvo no navegador (para continuar depois de recarregar) ----------
  function carregar() {
    try { var s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; }
  }
  function salvar() {
    try { localStorage.setItem(KEY, JSON.stringify(estado)); } catch (e) { /* sem armazenamento: segue só nesta aba */ }
  }
  var estado = carregar();
  if (!estado || typeof estado !== "object") estado = { nome: "", codigo: "", modo: "variado", usados: [], sessao: null };
  if (!Array.isArray(estado.usados)) estado.usados = [];

  var ui = { view: "carregando", atual: null, rascunho: "", erro: "", aguardando: false, confirmarEncerrar: false,
             confirmarReinicio: false, avaliando: {}, errosAval: {}, erroInicio: "", copiado: "", mostrarTexto: false, iniciando: false };
  var ctl = null;

  // ---------- servidor ----------
  async function api(caminho, corpo, sinal) {
    var resp;
    try {
      resp = await fetch(caminho, corpo ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo), signal: sinal } : { signal: sinal });
    } catch (e) {
      if (e && e.name === "AbortError") throw { cancelado: true };
      throw { mensagem: "Sem conexão com o simulador. Confira a internet e tente de novo." };
    }
    var dados = null;
    try { dados = await resp.json(); } catch (e) { /* resposta sem JSON */ }
    if (!resp.ok) throw { status: resp.status, mensagem: (dados && dados.erro) || "O simulador não respondeu. Tente de novo." };
    return dados;
  }

  // ---------- sorteio ----------
  function persona(id) { return CFG.personas.filter(function (p) { return p.id === id; })[0] || null; }
  function embaralhar(lista) {
    var a = lista.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; }
    return a;
  }
  function escolher(perfil) {
    var pool = CFG.personas.filter(function (p) { return p.perfil === perfil; });
    var usadosDoPerfil = estado.usados.filter(function (id) { return pool.some(function (p) { return p.id === id; }); });
    var livres = pool.filter(function (p) { return usadosDoPerfil.indexOf(p.id) === -1; });
    if (!livres.length) {
      // todos já apareceram: recomeça o ciclo, sem repetir o último cliente desse perfil
      var ultimo = usadosDoPerfil[usadosDoPerfil.length - 1];
      estado.usados = estado.usados.filter(function (id) { return usadosDoPerfil.indexOf(id) === -1; });
      livres = pool.filter(function (p) { return p.id !== ultimo; });
    }
    var p = livres[Math.floor(Math.random() * livres.length)];
    estado.usados.push(p.id);
    return p.id;
  }
  function sortearTemperamentos(modo) {
    var T = CFG.temperamentos, todos = Object.keys(T);
    var nivel = function (k) { return T[k].nivel; };
    if (modo === "iniciante") return embaralhar(todos.filter(function (k) { return nivel(k) <= 2; })).slice(0, 4);
    if (modo === "desafio") {
      var medios = embaralhar(todos.filter(function (k) { return nivel(k) === 2; })).slice(0, 2);
      return embaralhar(["irritado", "explosivo"].concat(medios));
    }
    for (var t = 0; t < 100; t++) {
      var pick = embaralhar(todos).slice(0, 4);
      if (pick.indexOf("tranquilo") !== -1 && pick.some(function (k) { return nivel(k) === 3; })) return pick;
    }
    return embaralhar(["tranquilo", "indeciso", "desconfiado", "irritado"]);
  }
  function novoId() {
    try { return crypto.randomUUID(); } catch (e) { return String(Date.now()) + Math.random().toString(16).slice(2); }
  }
  function novaSessao() {
    var modo = CFG.modos[estado.modo] ? estado.modo : "variado";
    var ids = CFG.ordem.map(escolher);
    var temps = sortearTemperamentos(modo);
    var res = {}, mapa = {};
    ids.forEach(function (id, i) { res[id] = { estado: "pendente", msgs: [], fim: false, aval: null, salvo: false }; mapa[id] = temps[i]; });
    estado.sessao = { id: novoId(), ids: ids, res: res, temps: mapa, modo: modo, inicio: new Date().toISOString() };
    salvar();
  }
  function sessaoValida() {
    var s = estado.sessao;
    return s && Array.isArray(s.ids) && s.ids.every(function (id) { return persona(id) && s.res[id]; });
  }
  function temperamentoId(id) { return (estado.sessao.temps || {})[id] || "tranquilo"; }
  function temperamento(id) { return CFG.temperamentos[temperamentoId(id)] || CFG.temperamentos.tranquilo; }

  // ---------- util ----------
  function h(tag, props) {
    var e = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === "class") e.className = v;
      else if (k === "style") e.setAttribute("style", v);
      else if (k.indexOf("on") === 0) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    });
    for (var i = 2; i < arguments.length; i++) anexar(e, arguments[i]);
    return e;
  }
  function anexar(e, kid) {
    if (kid == null || kid === false) return;
    if (Array.isArray(kid)) { kid.forEach(function (k) { anexar(e, k); }); return; }
    e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  function iniciais(nome) {
    var partes = nome.replace(/^Dona\s+/i, "").split(/\s+/);
    return (partes[0][0] + (partes[1] ? partes[1][0] : "")).toUpperCase();
  }
  function fmt(n) { return Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
  function corNota(n) { return n >= 8 ? "var(--good)" : n >= 6 ? "var(--warn)" : "var(--bad)"; }
  function logo(classe) {
    return h("div", { class: "brand" + (classe ? " " + classe : "") }, h("img", { src: "/logo-infornet.jpg", alt: "Infornet", width: "480", height: "340" }));
  }
  function chip(perfil) { return h("span", { class: "chip p-" + perfil }, CFG.perfis[perfil].rotulo); }
  function chipTemp(t) {
    var cor = t.nivel === 3 ? "var(--bad)" : t.nivel === 2 ? "var(--warn)" : "var(--good)";
    return h("span", { class: "chip", style: "--c:" + cor }, "Temperamento: " + t.rotulo);
  }
  function concluidos() {
    var s = estado.sessao; if (!s) return [];
    return s.ids.filter(function (id) { return s.res[id].estado === "concluido" && s.res[id].aval; });
  }
  function media() {
    var c = concluidos(); if (!c.length) return null;
    return c.reduce(function (a, id) { return a + Number(estado.sessao.res[id].aval.nota || 0); }, 0) / c.length;
  }
  function mmss(seg) {
    seg = Math.max(0, Math.floor(seg));
    var m = Math.floor(seg / 60), s = seg % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }
  function segCliente(r) {
    if (!r || !r.inicioTs) return 0;
    return ((r.fimTs || Date.now()) - r.inicioTs) / 1000;
  }
  function segTreino() {
    var s = estado.sessao; if (!s) return 0;
    return ((s.fimTs || Date.now()) - Date.parse(s.inicio)) / 1000;
  }
  // Atualiza só os cronômetros na tela, sem redesenhar a página.
  function tick() {
    if (!CFG || !estado.sessao) return;
    var c = document.getElementById("cron");
    if (c && ui.atual) {
      var r = estado.sessao.res[ui.atual], seg = segCliente(r);
      c.textContent = mmss(seg);
      c.classList.toggle("over", !r.fim && seg >= ALERTA_CLIENTE_MIN * 60);
      var al = document.getElementById("alerta-tempo");
      if (al) al.hidden = r.fim || seg < ALERTA_CLIENTE_MIN * 60;
    }
    var t = document.getElementById("cron-total");
    if (t) {
      var total = segTreino();
      t.textContent = mmss(total);
      t.style.color = total >= TEMPO_TREINO_MIN * 60 && !estado.sessao.fimTs ? "var(--bad)" : "";
    }
  }
  setInterval(tick, 1000);

  function limparResposta(texto, p) {
    var fim = /\[FIM\]/i.test(texto);
    var t = texto.replace(/\[FIM\]/gi, "").trim();
    var prefixo = new RegExp("^\\s*" + p.nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*(\\(cliente\\))?\\s*:\\s*", "i");
    var partes = t.split(/\n\s*\n/).map(function (s) { return s.replace(prefixo, "").trim(); }).filter(Boolean);
    return { partes: partes, fim: fim };
  }

  // ---------- ações ----------
  async function comecar(e) {
    e.preventDefault();
    if (ui.iniciando) return;
    estado.nome = (document.getElementById("nome").value || "").trim();
    var campoCodigo = document.getElementById("codigo");
    if (campoCodigo) estado.codigo = campoCodigo.value.trim();
    if (!estado.nome) { ui.erroInicio = "Escreva seu nome para o instrutor saber de quem é o resultado."; render(); return; }
    ui.erroInicio = ""; ui.iniciando = true; render();
    try {
      if (CFG.exigeCodigo) {
        var r = await api("/api/config?codigo=" + encodeURIComponent(estado.codigo));
        if (!r.codigoValido) { ui.erroInicio = "Código da turma incorreto. Confira com o instrutor."; return; }
      }
      novaSessao(); ui.view = "painel";
    } catch (err) {
      ui.erroInicio = err.mensagem || "Não foi possível começar. Tente de novo.";
    } finally {
      ui.iniciando = false; salvar(); render();
    }
  }

  function abrirCliente(id) {
    var r = estado.sessao.res[id], p = persona(id);
    if (r.estado === "concluido") { ui.view = "aval"; ui.atual = id; render(); return; }
    if (r.estado === "pendente") { r.estado = "andamento"; r.msgs = [{ de: "cliente", t: p.abertura }]; r.inicioTs = Date.now(); salvar(); }
    if (r.fim && !r.aval) { avaliar(id); return; }
    ui.view = "chat"; ui.atual = id; ui.rascunho = ""; ui.erro = ""; ui.confirmarEncerrar = false;
    render();
    var ta = document.getElementById("msg"); if (ta) ta.focus();
  }

  function voltarPainel() {
    if (ctl) { ctl.abort(); ctl = null; }
    ui.view = "painel"; ui.atual = null; ui.confirmarEncerrar = false; ui.copiado = "";
    render();
  }

  async function enviar() {
    var id = ui.atual, r = estado.sessao.res[id], p = persona(id);
    var texto = ui.rascunho.trim();
    if (!texto || ui.aguardando || r.fim) return;
    r.msgs.push({ de: "atendente", t: texto });
    ui.rascunho = ""; ui.erro = ""; ui.aguardando = true; salvar(); render();
    ctl = new AbortController();
    try {
      var resp = await api("/api/cliente", { codigo: estado.codigo, personaId: id, temperamentoId: temperamentoId(id), msgs: r.msgs }, ctl.signal);
      var limpo = limparResposta(resp.texto || "", p);
      if (!limpo.partes.length && !limpo.fim) throw { mensagem: "O cliente não respondeu. Envie de novo." };
      limpo.partes.forEach(function (t) { r.msgs.push({ de: "cliente", t: t }); });
      if (limpo.fim) { r.fim = true; r.fimTs = Date.now(); }
    } catch (e) {
      r.msgs.pop();
      if (!e || !e.cancelado) { ui.rascunho = texto; ui.erro = e.mensagem || "Algo deu errado. Envie de novo."; }
    } finally {
      ctl = null; ui.aguardando = false; salvar();
      if (ui.view === "chat" && ui.atual === id) { render(); var ta = document.getElementById("msg"); if (ta && !r.fim) ta.focus(); }
    }
  }

  // A avaliação roda em segundo plano: o atendente pode voltar e atender o próximo cliente enquanto isso.
  async function avaliar(id) {
    var s = estado.sessao, r = s.res[id];
    if (ctl) { ctl.abort(); ctl = null; }
    ui.view = "aval"; ui.atual = id; ui.confirmarEncerrar = false;
    r.fim = true; if (!r.fimTs) r.fimTs = Date.now(); salvar();
    if (r.aval || ui.avaliando[id]) { render(); return; }
    ui.avaliando[id] = true; delete ui.errosAval[id]; render();
    try {
      var resp = await api("/api/avaliar", {
        codigo: estado.codigo, nome: estado.nome, sessaoId: s.id, modo: s.modo,
        personaId: id, temperamentoId: temperamentoId(id), msgs: r.msgs, duracaoSeg: Math.round(segCliente(r))
      });
      r.aval = resp.avaliacao; r.salvo = Boolean(resp.salvo); r.estado = "concluido";
      if (concluidos().length === 4 && !s.fimTs) s.fimTs = Date.now();
    } catch (e) {
      ui.errosAval[id] = e.mensagem || "Não foi possível gerar a avaliação. Tente de novo.";
    } finally {
      delete ui.avaliando[id]; salvar();
      if (estado.sessao === s && (ui.view === "painel" || (ui.view === "aval" && ui.atual === id))) render();
    }
  }

  function textoRelatorio() {
    var s = estado.sessao;
    var linhas = ["Treino de atendimento Infornet" + (estado.nome ? " - " + estado.nome : ""), new Date(s.inicio).toLocaleDateString("pt-BR"), ""];
    s.ids.forEach(function (id, i) {
      var p = persona(id), r = s.res[id];
      var nota = r.aval ? fmt(r.aval.nota) + "/10 - " + r.aval.resultado : "não concluído";
      linhas.push((i + 1) + ". " + CFG.perfis[p.perfil].rotulo + " (" + p.nome + ", " + p.cidade + ", " + temperamento(id).rotulo.toLowerCase() + "): " + nota);
    });
    var m = media();
    if (m != null) { linhas.push(""); linhas.push("Média: " + fmt(m) + "/10"); }
    return linhas.join("\n");
  }
  async function copiarRelatorio() {
    try { await navigator.clipboard.writeText(textoRelatorio()); ui.copiado = "Resultado copiado."; }
    catch (e) { ui.copiado = "Não deu para copiar automaticamente. Selecione o texto abaixo e copie."; ui.mostrarTexto = true; }
    render();
  }

  // ---------- telas ----------
  var app = document.getElementById("app");

  function telaCarregando() {
    return h("div", { class: "loading", role: "status" }, h("h2", null, "Carregando o simulador…"));
  }
  function telaFalha() {
    return h("div", { class: "notice warn", role: "alert" },
      h("strong", null, "Não foi possível abrir o simulador"),
      h("p", null, "O servidor não respondeu. Confira a internet e recarregue a página."),
      h("div", { class: "row" }, h("button", { class: "btn", onclick: function () { location.reload(); } }, "Recarregar")));
  }

  function telaInicio() {
    var campoNome = h("input", { id: "nome", type: "text", autocomplete: "name", placeholder: "Seu nome completo", value: estado.nome || "", required: true });
    var campoCodigo = CFG.exigeCodigo ? h("input", { id: "codigo", type: "text", autocomplete: "off", placeholder: "Passado pelo instrutor", value: estado.codigo || "", required: true }) : null;
    return [
      h("header", { class: "hero" },
        logo(),
        h("span", { class: "eyebrow" }, "Treinamento comercial Infornet · Simulações práticas"),
        h("h1", null, "Simulador de atendimento"),
        h("p", null, "Você vai atender 4 clientes pelo WhatsApp, um de cada perfil. Cada cliente aparece uma única vez no seu treino, e no próximo treino os clientes são outros. No fim de cada conversa, você recebe uma avaliação preliminar com dicas do que melhorar, e o instrutor faz a avaliação final."),
        h("p", { class: "time-note" }, "O treino leva cerca de " + TEMPO_TREINO_MIN + " minutos: uns " + TEMPO_CLIENTE_MIN + " minutos por cliente. Um cronômetro mostra o seu ritmo.")),
      h("form", { class: "start", onsubmit: comecar },
        h("div", { class: "field" }, h("label", { for: "nome" }, "Seu nome"), campoNome),
        campoCodigo ? h("div", { class: "field" }, h("label", { for: "codigo" }, "Código da turma"), campoCodigo) : null,
        h("fieldset", { class: "modes" },
          h("legend", null, "Nível dos clientes"),
          h("div", { class: "mode-opts" }, Object.keys(CFG.modos).map(function (k) {
            return h("label", { class: "mode", for: "modo-" + k },
              h("input", { type: "radio", name: "modo", id: "modo-" + k, value: k, checked: (estado.modo || "variado") === k,
                onchange: function () { estado.modo = k; salvar(); } }),
              h("span", null, h("b", null, CFG.modos[k].rotulo), h("span", { class: "muted" }, CFG.modos[k].texto)));
          }))),
        ui.erroInicio ? h("p", { class: "form-error", role: "alert" }, ui.erroInicio) : null,
        h("button", { class: "btn", type: "submit", disabled: ui.iniciando }, ui.iniciando ? "Abrindo…" : "Começar treino")),
      h("section", { class: "grid", "aria-label": "Perfis de cliente" },
        CFG.ordem.map(function (k) {
          return h("article", { class: "card" }, chip(k), h("h3", null, CFG.perfis[k].rotulo), h("p", { class: "muted" }, CFG.perfis[k].objetivo));
        })),
      h("section", { class: "temps", "aria-label": "Temperamentos" },
        h("h2", null, "Cada cliente chega de um jeito"),
        h("p", { class: "muted" }, "Além do perfil, cada cliente recebe um temperamento sorteado. O mesmo caso pode vir com uma pessoa calma num treino e com uma pessoa muito difícil no outro. Você só descobre o temperamento na avaliação, como na vida real."),
        h("div", { class: "row" }, Object.keys(CFG.temperamentos).map(function (k) { return chipTemp(CFG.temperamentos[k]); }))),
      h("section", { class: "steps", "aria-label": "Como funciona" },
        h("div", { class: "step" }, h("b", null, "1. Escolha um cliente"), h("p", { class: "muted" }, "Os 4 perfis podem ser atendidos em qualquer ordem.")),
        h("div", { class: "step" }, h("b", null, "2. Atenda como no WhatsApp"), h("p", { class: "muted" }, "O cliente reage ao seu atendimento: pergunte, entenda e negocie.")),
        h("div", { class: "step" }, h("b", null, "3. Encerre e veja a avaliação"), h("p", { class: "muted" }, "Nota de 0 a 10 em 5 critérios, com exemplo de resposta.")))
    ];
  }

  function telaPainel() {
    var s = estado.sessao;
    var feitos = concluidos().length;
    var m = media();
    var cards = s.ids.map(function (id, i) {
      var p = persona(id), r = s.res[id];
      var status, acao;
      if (ui.avaliando[id]) {
        status = h("span", { class: "status live" }, "Avaliando…");
        acao = h("button", { class: "btn ghost", onclick: function () { ui.view = "aval"; ui.atual = id; render(); } }, "Acompanhar");
      } else if (r.estado === "concluido" && r.aval) {
        status = h("span", { class: "status done" }, "Concluído · " + r.aval.resultado);
        acao = h("button", { class: "btn ghost", onclick: function () { abrirCliente(id); } }, "Ver avaliação");
      } else if (r.estado === "andamento") {
        status = h("span", { class: "status live" }, r.fim ? "Conversa encerrada · falta avaliar" : "Em andamento");
        acao = r.fim
          ? h("button", { class: "btn", onclick: function () { avaliar(id); } }, "Ver avaliação")
          : h("button", { class: "btn", onclick: function () { abrirCliente(id); } }, "Continuar conversa");
      } else {
        status = h("span", { class: "status" }, "Ainda não atendido");
        acao = h("button", { class: "btn", onclick: function () { abrirCliente(id); } }, "Começar atendimento");
      }
      return h("article", { class: "card" },
        h("div", { class: "card-head" }, chip(p.perfil),
          r.aval ? h("span", { class: "score-pill", style: "color:" + corNota(r.aval.nota) }, fmt(r.aval.nota)) : h("span", { class: "muted" }, "Cliente " + (i + 1))),
        r.aval ? chipTemp(temperamento(id)) : null,
        h("h3", null, r.estado === "pendente" ? "Quem é o cliente aparece ao abrir" : p.nome + " · " + p.cidade),
        h("p", { class: "muted" }, CFG.perfis[p.perfil].objetivo + (r.fimTs ? " · " + mmss(segCliente(r)) + " de conversa" : "")),
        h("div", { class: "card-foot" }, status, acao));
    });

    var resumo = null;
    if (feitos === 4) {
      var todosSalvos = s.ids.every(function (id) { return s.res[id].salvo; });
      resumo = h("section", { class: "summary" },
        h("h2", null, "Treino concluído"),
        h("p", { class: "muted" }, "Média de " + fmt(m) + " nos 4 atendimentos. " + (todosSalvos ? "Os resultados já foram enviados ao instrutor." : "Copie o resultado e envie ao instrutor.")),
        h("div", { style: "overflow-x:auto" },
          h("table", null, h("tbody", null, s.ids.map(function (id) {
            var p = persona(id), r = s.res[id];
            return h("tr", null, h("td", null, chip(p.perfil)), h("td", null, p.nome + " (" + temperamento(id).rotulo.toLowerCase() + ") · " + r.aval.resultado),
              h("td", { class: "n", style: "color:" + corNota(r.aval.nota) }, fmt(r.aval.nota)));
          })))),
        h("div", { class: "row" },
          h("button", { class: "btn", onclick: function () { novaSessao(); ui.copiado = ""; render(); } }, "Novo treino com outros clientes"),
          h("button", { class: "btn ghost", onclick: copiarRelatorio }, "Copiar resultado")),
        ui.copiado ? h("p", { class: "muted", role: "status" }, ui.copiado) : null,
        ui.mostrarTexto ? h("textarea", { readonly: true, rows: 8, style: "width:100%" }, textoRelatorio()) : null);
    }

    var reinicio = ui.confirmarReinicio
      ? h("div", { class: "confirm" }, h("span", null, "Descartar este treino e sortear outros 4 clientes?"),
          h("button", { class: "btn danger", onclick: function () { novaSessao(); ui.confirmarReinicio = false; render(); } }, "Descartar e recomeçar"),
          h("button", { class: "btn ghost", onclick: function () { ui.confirmarReinicio = false; render(); } }, "Manter treino"))
      : h("div", { class: "row" },
          h("button", { class: "btn link", onclick: function () { ui.confirmarReinicio = true; render(); } }, "Recomeçar com outros clientes"),
          h("button", { class: "btn link", onclick: function () { ui.view = "inicio"; render(); } }, "Trocar nome ou nível"));

    return [
      h("header", { class: "topbar" },
        h("div", { style: "display:grid;gap:8px" },
          logo("small"),
          h("span", { class: "eyebrow" }, "Treinamento comercial Infornet · Nível " + (CFG.modos[s.modo] || CFG.modos.variado).rotulo),
          h("h1", null, estado.nome ? "Treino de " + estado.nome : "Seu treino")),
        h("div", { class: "progress" },
          h("div", { class: "stat" }, h("span", null, "Tempo"), h("strong", null, h("b", { id: "cron-total" }, mmss(segTreino())), h("small", { class: "of" }, " de ~" + TEMPO_TREINO_MIN + " min"))),
          h("div", { class: "stat" }, h("span", null, "Concluídos"), h("strong", null, feitos + " de 4")),
          h("div", { class: "stat" }, h("span", null, "Média"), h("strong", m != null ? { style: "color:" + corNota(m) } : null, m != null ? fmt(m) : "–")))),
      resumo,
      h("section", { class: "grid", "aria-label": "Clientes do treino" }, cards),
      feitos < 4 ? reinicio : null
    ];
  }

  function cola(p) {
    return h("details", { class: "cola", open: window.matchMedia("(min-width: 861px)").matches },
      h("summary", null, "Consulta rápida"),
      h("p", { class: "objective" }, h("strong", null, "Seu objetivo: "), CFG.perfis[p.perfil].objetivo),
      h("section", null, h("h3", null, "Escada de desconto"),
        h("div", { class: "ladder" }, [10, 15, 20, 30, 50].map(function (n) { return h("span", { style: "--s:" + (n * 0.6) }, n + "%"); })),
        h("p", { class: "muted" }, "Comece pelo menor. 50% é o teto. Mensalidade grátis não.")),
      h("section", null, h("h3", null, "Se o desconto não resolver"), h("p", null, "Troca do Wi-Fi 6 por Wi-Fi 7 bonificado.")),
      h("section", null, h("h3", null, "Básico de Wi-Fi e fibra"),
        h("ul", null, h("li", null, "Paredes e distância enfraquecem o Wi-Fi: peça um teste perto do roteador ou no cabo"),
          h("li", null, "Rede 5 GHz: mais rápida, alcança menos. Rede 2.4 GHz: alcança mais longe, é mais lenta"),
          h("li", null, "Muitos aparelhos ao mesmo tempo dividem a velocidade"),
          h("li", null, "Luz vermelha no aparelho da fibra: o sinal não está chegando, normalmente precisa de técnico"))),
      h("section", null, h("h3", null, "Diferenciais"),
        h("ul", null, h("li", null, "Atendimento local, rápido e pessoal"), h("li", null, "Chamado resolvido em cerca de 2 horas"),
          h("li", null, "Mesmo sinal em todos os bairros"), h("li", null, "Rede com capacidade sobrando"))),
      h("section", null, h("h3", null, "Lembretes"),
        h("ul", null, h("li", null, "Pergunte antes de oferecer (SPIN)"), h("li", null, "Descubra quem decide e paga (BANT)"),
          h("li", null, "Teste a distância antes de mandar técnico"), h("li", null, "Quem sai pelo preço costuma voltar em até 2 meses"),
          h("li", null, "Contrato de 12 meses com multa"))));
  }

  function telaChat() {
    var id = ui.atual, r = estado.sessao.res[id], p = persona(id);
    var temResposta = r.msgs.some(function (m) { return m.de === "atendente"; });

    var msgs = h("div", { class: "msgs", id: "msgs", "aria-live": "polite" },
      h("span", { class: "day" }, "Hoje"),
      r.msgs.map(function (m) { return h("div", { class: "bubble " + (m.de === "atendente" ? "me" : "them") }, m.t); }),
      ui.aguardando ? h("div", { class: "typing", "aria-label": p.nome + " está digitando" }, h("i"), h("i"), h("i")) : null,
      r.fim ? h("div", { class: "ended" }, h("strong", null, p.nome + " encerrou a conversa."),
        h("button", { class: "btn", onclick: function () { avaliar(id); } }, "Ver avaliação")) : null);

    var ta = h("textarea", { id: "msg", rows: 1, placeholder: r.fim ? "Conversa encerrada" : "Escreva sua mensagem…", disabled: r.fim || ui.aguardando,
      "aria-label": "Mensagem para " + p.nome, maxlength: "2000",
      oninput: function (e) { ui.rascunho = e.target.value; ajustar(e.target); },
      onkeydown: function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } } });
    ta.value = ui.rascunho;

    var encerrar = ui.confirmarEncerrar
      ? h("div", { class: "confirm-bar confirm" }, h("span", null, "Encerrar este atendimento? Depois não dá para continuar a conversa."),
          h("button", { class: "btn", onclick: function () { avaliar(id); } }, "Encerrar e avaliar"),
          h("button", { class: "btn ghost", onclick: function () { ui.confirmarEncerrar = false; render(); } }, "Continuar conversando"))
      : null;

    return [
      h("div", { class: "chat-layout" },
        h("section", { class: "chat", "aria-label": "Conversa com " + p.nome },
          h("div", { class: "chat-head" },
            h("button", { class: "btn ghost", onclick: voltarPainel, "aria-label": "Voltar para os clientes" }, "← Clientes"),
            h("div", { class: "avatar p-" + p.perfil, style: "background:var(--c)" }, iniciais(p.nome)),
            h("div", { class: "chat-id" }, h("strong", null, p.nome), h("span", null, p.cidade + " · " + CFG.perfis[p.perfil].rotulo)),
            h("div", { class: "head-actions" },
              h("span", { class: "cron", id: "cron", title: "Tempo com este cliente (meta: cerca de " + TEMPO_CLIENTE_MIN + " minutos)" }, mmss(segCliente(r))),
              r.fim ? null : h("button", { class: "btn ghost", disabled: !temResposta || ui.aguardando,
                onclick: function () { ui.confirmarEncerrar = true; render(); } }, "Encerrar atendimento"))),
          encerrar,
          h("div", { class: "confirm-bar", id: "alerta-tempo", role: "status", hidden: r.fim || segCliente(r) < ALERTA_CLIENTE_MIN * 60 },
            "Já são mais de " + ALERTA_CLIENTE_MIN + " minutos com este cliente. Procure encaminhar o fechamento: o treino todo leva cerca de " + TEMPO_TREINO_MIN + " minutos."),
          msgs,
          ui.erro ? h("p", { class: "err", role: "alert" }, ui.erro) : null,
          h("div", { class: "composer" }, ta,
            h("button", { class: "btn", disabled: r.fim || ui.aguardando, onclick: enviar }, "Enviar"))),
        cola(p))
    ];
  }

  function ajustar(ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 140) + "px"; }

  function telaAval() {
    var id = ui.atual, r = estado.sessao.res[id], p = persona(id);
    var topo = h("div", { class: "row" },
      h("button", { class: "btn ghost", onclick: voltarPainel }, "← Clientes"),
      chip(p.perfil), h("strong", null, p.nome + " · " + p.cidade),
      r.aval || ui.avaliando[id] ? chipTemp(temperamento(id)) : null);

    if (ui.avaliando[id]) {
      var proximo = estado.sessao.ids.some(function (x) { return estado.sessao.res[x].estado !== "concluido" && x !== id; });
      return [topo, h("div", { class: "loading", role: "status" },
        h("h2", null, "Avaliando o atendimento…"),
        h("p", { class: "muted" }, "O instrutor virtual está lendo a conversa. Isso leva de alguns segundos a um minuto."),
        proximo ? h("button", { class: "btn", onclick: voltarPainel }, "Atender o próximo cliente enquanto isso") : null)];
    }
    if (!r.aval) {
      return [topo, h("div", { class: "notice warn", role: "alert" },
        h("strong", null, "Não foi possível gerar a avaliação"),
        h("p", null, ui.errosAval[id] || "Tente de novo."),
        h("div", { class: "row" }, h("button", { class: "btn", onclick: function () { avaliar(id); } }, "Tentar de novo")))];
    }
    var a = r.aval;
    return [
      topo,
      h("section", { class: "eval" },
        h("div", { class: "eval-top" },
          h("div", { class: "big-score", style: "color:" + corNota(a.nota) }, fmt(a.nota), h("small", null, " / 10")),
          h("div", { style: "display:grid;gap:6px;min-width:0;flex:1 1 220px" },
            h("span", { class: "eyebrow" }, "Avaliação preliminar"),
            h("h2", null, a.resultado),
            h("p", { class: "muted" }, "Objetivo: " + CFG.perfis[p.perfil].objetivo),
            h("p", { class: "muted" }, r.salvo ? "Esta é a avaliação preliminar da IA. A conversa foi enviada ao instrutor, que faz a avaliação final." : "Este resultado não foi salvo no servidor. Use \"Copiar resultado\" no fim do treino."))),
        h("div", { class: "eval-grid" },
          h("div", { class: "panel" }, h("h3", null, "Critérios"),
            a.criterios.map(function (c) {
              return h("div", { class: "crit" },
                h("div", { class: "crit-top" }, h("span", null, c.nome), h("span", null, c.nota + "/10")),
                h("div", { class: "bar" }, h("i", { style: "width:" + (c.nota * 10) + "%;--c:" + corNota(c.nota) })),
                c.comentario ? h("p", null, c.comentario) : null);
            })),
          h("div", { style: "display:grid;gap:16px;align-content:start;min-width:0" },
            h("div", { class: "panel" }, h("h3", null, "Mandou bem"), h("ul", { class: "list" }, a.pontosFortes.map(function (t) { return h("li", null, t); }))),
            h("div", { class: "panel" }, h("h3", null, "Para melhorar"), h("ul", { class: "list" }, a.melhorar.map(function (t) { return h("li", null, t); }))),
            a.fraseExemplo ? h("div", { class: "panel" }, h("h3", null, "Você poderia ter dito"), h("p", { class: "example" }, a.fraseExemplo)) : null)),
        h("details", { class: "panel" }, h("summary", null, h("strong", null, "Ver a conversa")),
          h("div", { class: "transcript" }, r.msgs.map(function (m) {
            return h("p", null, h("b", null, m.de === "atendente" ? "Você: " : p.nome + ": "), m.t);
          }))),
        h("div", { class: "row" }, h("button", { class: "btn", onclick: voltarPainel }, "Voltar para os clientes")))
    ];
  }

  function render() {
    app.replaceChildren();
    if (ui.view === "carregando") { anexar(app, telaCarregando()); return; }
    if (ui.view === "falha") { anexar(app, telaFalha()); return; }
    if (ui.view !== "inicio" && !sessaoValida()) ui.view = "inicio";
    var telas = { inicio: telaInicio, painel: telaPainel, chat: telaChat, aval: telaAval };
    anexar(app, telas[ui.view]());
    if (ui.view === "chat") {
      var box = document.getElementById("msgs"); if (box) box.scrollTop = box.scrollHeight;
      var ta = document.getElementById("msg"); if (ta) ajustar(ta);
    }
    tick();
  }

  render();
  api("/api/config").then(function (cfg) {
    CFG = cfg;
    ui.view = sessaoValida() ? "painel" : "inicio";
    render();
  }).catch(function () { ui.view = "falha"; render(); });
})();
