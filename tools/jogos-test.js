/* Testa a estante de jogos: estados, filtro, capa comprimida e o que sobra
   quando não há capa.
   Uso: node tools/jogos-test.js [saida]   (GYM_URL opcional) */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const OUT = process.argv[2] || path.join(__dirname, '..', '__shots');
const BASE = (process.env.GYM_URL || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PORT = 9365;
const PROFILE = path.join(os.tmpdir(), 'gymnotion-chrome');

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--no-first-run',
    '--user-data-dir=' + PROFILE, '--remote-debugging-port=' + PORT,
    '--window-size=393,852', 'about:blank',
  ], { stdio: 'ignore' });

  let alvo = null;
  for (let i = 0; i < 40 && !alvo; i++) {
    await sleep(250);
    try {
      const lista = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      alvo = lista.find((t) => t.type === 'page');
    } catch (e) { /* subindo */ }
  }
  if (!alvo) throw new Error('Chrome não respondeu ao CDP');

  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0; const pend = new Map(); const bad = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) {
      const p = pend.get(m.id); pend.delete(m.id);
      m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
      return;
    }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      bad.push('EXCEÇÃO: ' + ((d.exception && d.exception.description) || d.text));
    }
    if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) {
      bad.push(m.params.type + ': ' + m.params.args.map((a) => a.description || a.value).join(' '));
    }
  };
  const send = (metodo, params) => new Promise((resolve, reject) => {
    const i = ++id; pend.set(i, { resolve, reject });
    ws.send(JSON.stringify({ id: i, method: metodo, params: params || {} }));
  });
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 2, mobile: true });

  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      bad.push('AVALIAÇÃO: ' + ((d.exception && d.exception.description) || d.text));
    }
    return r.result && r.result.value;
  };
  const shot = async (n) => {
    await sleep(450);
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, n + '.png'), Buffer.from(data, 'base64'));
  };
  const ck = (cond, msg) => {
    console.log((cond ? '  ok    ' : '  FALHA ') + msg);
    if (!cond) bad.push('VERIFICAÇÃO: ' + msg);
  };
  const tela = () => 'currentScreen().el';

  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1500);
  await ev('localStorage.clear()');
  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1700);

  /* ============================================================
     ESTANTE VAZIA
     ============================================================ */
  console.log('estante vazia:');
  await ev("popToRoot(); abrirModulo('jogos');"); await sleep(700);
  ck(await ev("currentScreen().name === 'jogos'"), 'o módulo abre a estante');
  const corTela = await ev(`getComputedStyle(${tela()}).getPropertyValue('--accent').trim()`);
  ck(corTela === await ev('COR_JOGOS'), 'com a cor própria do módulo (' + corTela + ')');
  ck(await ev(`${tela()}.querySelector('.hero-titulo').textContent.trim() === 'Estante vazia'`),
    'o cartão diz que a estante está vazia');
  ck(await ev(`!${tela()}.querySelector('.chips .chip')`),
    'sem filtros quando não há o que filtrar');
  await shot('jg1-vazia');

  /* ============================================================
     COLOCAR JOGOS
     ============================================================ */
  console.log('');
  console.log('colocar jogos:');
  await ev(`${tela()}.querySelector('.fab').click()`); await sleep(650);
  ck(await ev("!!document.querySelector('.sheet .capa-previa')"),
    'o editor mostra a prévia da capa no formato da estante');
  ck(await ev("document.querySelectorAll('.sheet [data-e]').length === 3"),
    'com os três estados para escolher');
  ck(await ev("document.querySelector('.sheet [data-e=fila]').classList.contains('on')"),
    'começando na fila');

  await ev(`(function () {
    document.querySelector('.sheet [data-c=nome]').value = 'Hollow Knight';
    document.querySelector('.sheet [data-c=plat]').value = 'Switch';
    document.querySelector('.sheet [data-x=yes]').click();
  })()`);
  await sleep(800);
  ck(await ev('S.jogos.length === 1'), 'salvar coloca o jogo na estante');
  ck(await ev("S.jogos[0].nome === 'Hollow Knight' && S.jogos[0].estado === 'fila'"),
    'com nome e estado');
  ck(await ev(`${tela()}.querySelectorAll('.estante .jogo').length === 1`),
    'e ele aparece na grade');
  ck(await ev(`${tela()}.querySelector('.jogo-iniciais').textContent === 'HK'`),
    'sem capa, as iniciais preenchem o lugar dela');
  ck(await ev(`${tela()}.querySelector('.jogo-plat').textContent === 'Switch'`),
    'a plataforma aparece embaixo do nome');

  /* salvar sem nome não pode criar jogo fantasma */
  await ev(`${tela()}.querySelector('.fab').click()`); await sleep(600);
  await ev(`document.querySelector('.sheet [data-x=yes]').click()`); await sleep(500);
  ck(await ev('S.jogos.length === 1'), 'salvar sem nome não cria nada');
  ck(await ev("!!document.querySelector('.sheet')"), 'e o editor fica aberto para corrigir');
  await ev(`document.querySelector('.sheet [data-x=no]').click()`); await sleep(400);

  await ev(`
    novoJogo({ nome: 'Elden Ring', plataforma: 'PS5' });
    novoJogo({ nome: 'Celeste' });
    saveNow(); currentScreen().refresh(); 'ok';
  `);
  await sleep(500);
  ck(await ev(`${tela()}.querySelectorAll('.estante .jogo').length === 3`), 'três jogos na estante');

  /* ============================================================
     ESTADOS
     ============================================================ */
  console.log('');
  console.log('marcar o que está jogando e o que zerou:');
  await ev(`${tela()}.querySelectorAll('.estante .jogo')[0].click()`); await sleep(650);
  ck(await ev("!!document.querySelector('.pop')"), 'tocar num jogo abre o menu dele');
  ck(await ev("document.querySelectorAll('.pop .pop-item').length === 5"),
    'com os 3 estados, editar e tirar');
  await ev(`(function () {
    var itens = document.querySelectorAll('.pop .pop-item');
    for (var i = 0; i < itens.length; i++) {
      if (itens[i].textContent.indexOf('Jogando') >= 0) { itens[i].click(); return 'ok'; }
    }
    return 'nao achou';
  })()`);
  await sleep(700);
  ck(await ev("contaJogos('jogando') === 1"), 'marcar Jogando muda o estado');
  ck(await ev("S.jogos.filter(function (j) { return j.estado === 'jogando'; })[0].comecado > 0"),
    'e carimba quando começou');
  ck(await ev(`${tela()}.querySelectorAll('.estante .jogo')[0].classList.contains('estado-jogando')`),
    'o que está jogando vai para a frente da estante');
  ck(await ev(`${tela()}.querySelector('.jogo-selo').textContent.trim() === 'Jogando'`),
    'com o selo por cima da capa');

  const jogandoId = await ev("S.jogos.filter(function (j) { return j.estado === 'jogando'; })[0].id");
  await ev(`definirEstadoJogo('${jogandoId}', 'zerado'); currentScreen().refresh();`); await sleep(500);
  ck(await ev(`getJogo('${jogandoId}').zeradoEm > 0`), 'zerar carimba a data de conclusão');
  ck(await ev(`getJogo('${jogandoId}').comecado > 0`), 'e não apaga quando começou');
  ck(await ev("contaJogos('zerado') === 1"), 'a conta de zerados sobe');

  /* voltar para a fila tem de limpar os carimbos */
  await ev(`definirEstadoJogo('${jogandoId}', 'fila'); currentScreen().refresh();`); await sleep(450);
  ck(await ev(`getJogo('${jogandoId}').zeradoEm === 0 && getJogo('${jogandoId}').comecado === 0`),
    'voltar para a fila limpa os carimbos, senão o jogo recomeçado continuaria dizendo que foi concluído');
  ck(await ev(`definirEstadoJogo('${jogandoId}', 'inventado') === null`),
    'um estado que não existe é recusado');

  /* ============================================================
     ORDEM E FILTRO
     ============================================================ */
  console.log('');
  console.log('ordem e filtro:');
  await ev(`
    definirEstadoJogo(S.jogos[2].id, 'zerado');
    definirEstadoJogo(S.jogos[1].id, 'jogando');
    currentScreen().refresh(); 'ok';
  `);
  await sleep(500);
  const ordem = await ev(`Array.from(${tela()}.querySelectorAll('.estante .jogo')).map(function (j) {
    return j.className.replace('jogo estado-', '');
  }).join(',')`);
  ck(ordem === 'jogando,fila,zerado',
    'a estante lê na ordem: jogando, na fila, zerado (' + ordem + ')');

  ck(await ev(`${tela()}.querySelectorAll('.chips .chip').length === 4`),
    'aparecem os filtros: todos mais os três estados');
  await ev(`${tela()}.querySelector('[data-f=zerado]').click()`); await sleep(600);
  ck(await ev(`${tela()}.querySelectorAll('.estante .jogo').length === 1`),
    'filtrar por zerados mostra só um');
  ck(await ev("FILTRO_JOGOS === 'zerado'"), 'e o filtro fica marcado');
  await ev(`${tela()}.querySelector('[data-f=""]').click()`); await sleep(600);
  ck(await ev(`${tela()}.querySelectorAll('.estante .jogo').length === 3`),
    'voltar para Todos mostra a estante inteira');
  await shot('jg2-estante');

  /* filtro sem resultado não pode virar tela em branco */
  await ev(`
    S.jogos.forEach(function (j) { definirEstadoJogo(j.id, 'fila'); });
    FILTRO_JOGOS = 'zerado'; currentScreen().refresh(); 'ok';
  `);
  await sleep(500);
  ck(await ev(`!!${tela()}.querySelector('.empty')`),
    'um filtro sem resultado explica que não há nada ali');
  ck(await ev(`${tela()}.querySelector('.empty').textContent.indexOf('Nenhum jogo neste estado') >= 0`),
    'sem dizer que a estante está vazia, porque não está');
  await ev("FILTRO_JOGOS = ''; currentScreen().refresh();"); await sleep(400);

  /* ============================================================
     CAPA
     ============================================================ */
  console.log('');
  console.log('capa:');
  const capa = await ev(`(function () {
    /* uma imagem grande de propósito, para ver a compressão trabalhar */
    var c = document.createElement('canvas');
    c.width = 1200; c.height = 1600;
    var g = c.getContext('2d');
    g.fillStyle = '#A020F0'; g.fillRect(0, 0, 1200, 1600);
    g.fillStyle = '#FFD60A'; g.fillRect(200, 300, 800, 900);
    return c.toDataURL('image/png');
  })()`);
  ck(capa.length > 5000, 'a imagem de teste é grande (' + Math.round(capa.length / 1024) + ' KB em base64)');

  const comprimida = await ev(`new Promise(function (ok) {
    fetch(${JSON.stringify(capa)}).then(function (r) { return r.blob(); }).then(function (b) {
      comprimirCapa(new File([b], 'capa.png', { type: 'image/png' }),
        function (url) { ok(url); }, function (e) { ok('ERRO:' + e); });
    });
  })`);
  ck(comprimida.indexOf('data:image') === 0, 'a compressão devolve um data URL');
  ck(comprimida.length < capa.length / 4,
    'bem menor que o original (' + Math.round(comprimida.length / 1024) + ' KB contra ' + Math.round(capa.length / 1024) + ')');
  const larg = await ev(`new Promise(function (ok) {
    var i = new Image();
    i.onload = function () { ok(i.width + 'x' + i.height); };
    i.src = ${JSON.stringify(comprimida)};
  })`);
  ck(larg === '360x480', 'e sai em 360px de largura, na proporção original (' + larg + ')');

  await ev(`S.jogos[0].capa = ${JSON.stringify(comprimida)}; saveNow(); currentScreen().refresh();`);
  await sleep(600);
  ck(await ev(`!!${tela()}.querySelector('.estante .jogo img')`), 'a capa aparece na estante');
  ck(await ev(`${tela()}.querySelectorAll('.estante .jogo-iniciais').length === 2`),
    'e só os sem capa mostram iniciais');
  const forma = await ev(`(function () {
    var c = ${tela()}.querySelector('.jogo-capa').getBoundingClientRect();
    return (c.height / c.width).toFixed(2);
  })()`);
  ck(forma === '1.33', 'as capas ficam na proporção 3:4, como uma prateleira (' + forma + ')');
  await shot('jg3-com-capa');

  /* ============================================================
     PERSISTÊNCIA
     ============================================================ */
  console.log('');
  console.log('persistência:');
  const antes = await ev('JSON.stringify([S.jogos.length, S.jogos[0].capa.length])');
  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1700);
  const depois = await ev('JSON.stringify([S.jogos.length, S.jogos[0].capa.length])');
  ck(antes === depois, 'jogos e capas sobrevivem ao recarregar (' + depois + ')');

  console.log('');
  console.log('atalho no Início:');
  await ev("TAB = 'inicio'; popToRoot();"); await sleep(600);
  ck(await ev(`Array.from(${tela()}.querySelectorAll('.hub-card b')).some(function (b) { return b.textContent === 'Jogos'; })`),
    'o módulo aparece na grade de atalhos');
  ck(await ev(`!Array.from(${tela()}.querySelectorAll('.hub-card b')).some(function (b) { return b.textContent === 'Passos'; })`),
    'e a tela de passos saiu de vez');

  console.log('\nproblemas:', bad.length);
  bad.forEach((b) => console.log('  !', b));
  ws.close(); chrome.kill();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
