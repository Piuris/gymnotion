/* Testa o app em tela larga: a coluna lateral, o alinhamento do conteúdo numa
   faixa centrada e a volta para a cápsula quando a janela encolhe.
   Uso: node tools/desktop-test.js [saida]   (GYM_URL opcional) */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const OUT = process.argv[2] || path.join(__dirname, '..', '__shots');
const BASE = (process.env.GYM_URL || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PORT = 9371;
const PROFILE = path.join(os.tmpdir(), 'gymnotion-chrome');

/* Largo o bastante para a faixa de 1120px sobrar espaço dos dois lados: é aí
   que a centralização aparece, e era aí que ela estava errada. */
const LARGO = { w: 1568, h: 900 };
const ESTREITO = { w: 393, h: 852 };

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
    `--window-size=${LARGO.w},${LARGO.h}`, 'about:blank',
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

  const janela = (t) => send('Emulation.setDeviceMetricsOverride',
    { width: t.w, height: t.h, deviceScaleFactor: 1, mobile: t.w < 900 });
  await janela(LARGO);

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

  /* Caixa de um seletor dentro da tela atual, em número redondo. */
  const caixa = (sel) => ev(`(function () {
    var x = ${tela()}.querySelector('${sel}');
    if (!x) return null;
    var r = x.getBoundingClientRect();
    return JSON.stringify([Math.round(r.left), Math.round(r.right), Math.round(r.width)]);
  })()`);

  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1500);
  await ev('localStorage.clear()');
  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1800);

  /* ============================================================
     A COLUNA
     ============================================================ */
  console.log('coluna lateral em ' + LARGO.w + 'px:');
  ck(await ev("getComputedStyle(document.querySelector('.lateral')).display === 'flex'"),
    'a coluna aparece em tela larga');
  const larguraLat = await ev("Math.round(document.querySelector('.lateral').getBoundingClientRect().width)");
  ck(larguraLat === 232, 'com ' + larguraLat + 'px de largura');
  ck(await ev("getComputedStyle(document.querySelector('.tabbar') || document.body).display === 'none'"),
    'e a cápsula de baixo some');
  ck(await ev(`Math.round(${tela()}.getBoundingClientRect().left) === ${232}`),
    'as telas começam depois dela');
  ck(await ev("document.querySelectorAll('.lateral .lat-item').length === MODULOS.length + 2"),
    'a coluna lista o Painel, os módulos e o Sair');
  ck(await ev("document.querySelectorAll('.lateral .lat-item.on').length === 1"),
    'com exatamente um item aceso');
  ck(await ev("document.querySelector('.lateral .lat-item.on').textContent.trim() === 'Painel'"),
    'e ele é o Painel, que é onde o app abre');
  await shot('dk1-painel');

  /* ============================================================
     ALINHAMENTO
     ============================================================ */
  console.log('');
  console.log('alinhamento do conteúdo:');
  await ev("popToRoot(); abrirModulo('agua');"); await sleep(700);
  const sec = JSON.parse(await caixa('.sec'));
  const bloco = JSON.parse(await caixa('.bloco'));
  const barras = JSON.parse(await caixa('.dias-barras'));
  ck(sec[2] === 1120, 'a faixa de conteúdo para em 1120px (' + sec[2] + ')');
  ck(Math.abs(bloco[0] - (sec[0] + 16)) <= 1,
    'o cartão começa no mesmo eixo do título (' + bloco[0] + ' contra ' + (sec[0] + 16) + ')');
  ck(Math.abs(bloco[1] - (sec[1] - 16)) <= 1,
    'e termina no mesmo eixo (' + bloco[1] + ' contra ' + (sec[1] - 16) + ')');
  ck(barras[0] === sec[0] && barras[1] === sec[1],
    'o gráfico também acompanha (' + barras.slice(0, 2).join('..') + ')');
  const nav = JSON.parse(await caixa('.nav') || 'null');

  await ev("popToRoot(); abrirModulo('financeiro');"); await sleep(700);
  const secF = JSON.parse(await caixa('.sec'));
  const statsF = JSON.parse(await caixa('.stats'));
  const blocoF = JSON.parse(await caixa('.bloco'));
  ck(statsF[0] === secF[0] && statsF[1] === secF[1],
    'no financeiro, os cartões de número ficam no eixo do título');
  ck(Math.abs(blocoF[0] - (secF[0] + 16)) <= 1,
    'e os blocos também (' + blocoF[0] + ')');
  ck(statsF[1] <= LARGO.w, 'nada passa da borda direita da janela (' + statsF[1] + ' de ' + LARGO.w + ')');
  ck(await ev(`${tela()}.querySelector('.scroll').scrollWidth <= ${tela()}.querySelector('.scroll').clientWidth + 1`),
    'e a tela não rola de lado');

  /* o título da barra de topo tem de ficar no eixo do conteúdo */
  const navF = JSON.parse(await caixa('.nav'));
  const tituloF = JSON.parse(await caixa('.nav .title'));
  const meioTitulo = (tituloF[0] + tituloF[1]) / 2;
  const meioConteudo = (secF[0] + secF[1]) / 2;
  ck(Math.abs(meioTitulo - meioConteudo) <= 2,
    'o título da barra fica no eixo do conteúdo (' + Math.round(meioTitulo) + ' contra ' + Math.round(meioConteudo) + ')');
  ck(navF[2] === LARGO.w - 232, 'a barra em si ocupa a tela inteira');
  await shot('dk2-financeiro');

  console.log('');
  console.log('item aceso segue a tela aberta:');
  ck(await ev("document.querySelectorAll('.lateral .lat-item.on').length === 1"),
    'continua um só aceso com uma tela empilhada');
  ck(await ev("document.querySelector('.lateral .lat-item.on').textContent.trim() === 'Financeiro'"),
    'e é o módulo aberto, não a aba que ficou embaixo dele');
  await ev("document.querySelectorAll('.lateral .lat-item')[2].click()"); await sleep(700);
  ck(await ev("currentScreen().name === 'cronograma'"), 'clicar na coluna navega');
  ck(await ev("document.querySelector('.lateral .lat-item.on').textContent.trim() === 'Cronograma'"),
    'e o aceso acompanha');

  /* ============================================================
     VOLTAR PARA O CELULAR
     ============================================================ */
  console.log('');
  console.log('janela estreita:');
  await janela(ESTREITO); await sleep(600);
  await ev('currentScreen().refresh();'); await sleep(400);
  ck(await ev("getComputedStyle(document.querySelector('.lateral')).display === 'none'"),
    'a coluna some abaixo de 900px');
  ck(await ev(`Math.round(${tela()}.getBoundingClientRect().left) === 0`),
    'e as telas voltam a ocupar a tela inteira');
  await ev("popToRoot();"); await sleep(500);
  ck(await ev("getComputedStyle(currentScreen().el.querySelector('.tabbar')).display !== 'none'"),
    'a cápsula volta');
  const secM = JSON.parse(await caixa('.sec'));
  ck(secM[0] === 0 && secM[2] === ESTREITO.w,
    'e o conteúdo usa a largura toda, sem faixa centrada (' + secM.join('..') + ')');
  await shot('dk3-estreito');

  console.log('\nproblemas:', bad.length);
  bad.forEach((b) => console.log('  !', b));
  ws.close(); chrome.kill();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
