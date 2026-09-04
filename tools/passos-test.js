/* Testa a tela de passos e a importação vinda do app Saúde: número solto,
   vários dias de uma vez, área de transferência e endereço com ?passos=.
   Uso: node tools/passos-test.js [saida]   (GYM_URL opcional) */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const OUT = process.argv[2] || path.join(__dirname, '..', '__shots');
const BASE = (process.env.GYM_URL || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PORT = 9363;
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
     O QUE O ATALHO MANDA
     ============================================================ */
  console.log('leitura do que vem do Saúde:');
  ck(await ev("importarPassos('8432') !== null && passosDoDia() === 8432"),
    'um número solto vira os passos de hoje');
  ck(await ev("importarPassos('8.432') && passosDoDia() === 8432"),
    'com ponto de milhar também (8.432)');
  ck(await ev("importarPassos('passos=9100') && passosDoDia() === 9100"),
    'o "passos=" da URL é ignorado, para o mesmo texto servir nos dois caminhos');
  ck(await ev("importarPassos('  7200  ') && passosDoDia() === 7200"),
    'espaços em volta não atrapalham');

  const varios = await ev(`(function () {
    var h = new Date(); var d1 = new Date(h.getTime() - 86400000);
    var d2 = new Date(h.getTime() - 2 * 86400000);
    var txt = dayKey(d1.getTime()) + ':6000,' + dayKey(d2.getTime()) + ':11500';
    var r = importarPassos(txt);
    return JSON.stringify({
      r: r,
      d1: passosDoDia(d1.getTime()),
      d2: passosDoDia(d2.getTime()),
      hoje: passosDoDia(),
    });
  })()`);
  const v = JSON.parse(varios);
  ck(v.r && v.r.dias === 2, 'pares data:valor importam vários dias de uma vez');
  ck(v.d1 === 6000 && v.d2 === 11500, 'cada dia no seu lugar (' + v.d1 + ', ' + v.d2 + ')');
  ck(v.hoje === 7200, 'e o dia de hoje não é tocado por engano');

  ck(await ev("importarPassos('') === null && importarPassos('abc') === null"),
    'texto vazio ou sem número não grava nada');
  ck(await ev("importarPassos('0') === null"), 'zero também não, para não apagar o dia sem querer');

  /* substituir, e não somar: o Saúde manda o total do dia */
  ck(await ev("importarPassos('9000') && passosDoDia() === 9000"),
    'importar de novo SUBSTITUI o total do dia em vez de somar');

  /* ============================================================
     A TELA
     ============================================================ */
  console.log('');
  console.log('tela de passos:');
  await ev("popToRoot(); abrirModulo('passos');"); await sleep(700);
  ck(await ev("currentScreen().name === 'passos'"), 'o módulo abre a tela');
  const corTela = await ev(`getComputedStyle(${tela()}).getPropertyValue('--accent').trim()`);
  ck(corTela === await ev('COR_PASSOS'), 'com a cor própria do módulo (' + corTela + ')');
  ck(await ev(`${tela()}.querySelector('.hero-titulo').textContent.trim() === '9.000'`),
    'o cartão traz os passos de hoje formatados');
  ck(await ev(`${tela()}.querySelector('.hero-num').textContent.indexOf('10.000') >= 0`),
    'contra a meta de 10.000');
  ck(await ev(`${tela()}.querySelector('.hero-nota').textContent.indexOf('90%') >= 0`),
    'e diz quanto falta em porcentagem');
  ck(await ev(`${tela()}.querySelectorAll('.dias-col').length === 14`),
    'o gráfico traz 14 dias');
  ck(await ev(`${tela()}.querySelectorAll('.dias-col.tem').length === 3`),
    'com os 3 dias que têm registro marcados');
  ck(await ev(`${tela()}.querySelectorAll('.dias-col.bateu').length === 1`),
    'e só o dia de 11.500 aparece como meta batida');
  await shot('ps1-passos');

  console.log('');
  console.log('média e total:');
  ck(await ev('mediaPassos(7) === Math.round((9000 + 6000 + 11500) / 3)'),
    'a média divide pelos dias com registro, não por sete');
  ck(await ev('totalPassos(7) === 26500'), 'o total soma os três dias');
  ck(await ev('diasComPasso(7) === 3'), 'e a tela sabe dizer quantos dias tem');
  ck(await ev(`${tela()}.textContent.indexOf('3 de 7') >= 0`), 'mostrando "3 de 7" no resumo');

  /* ============================================================
     A FOLHA DE IMPORTAÇÃO
     ============================================================ */
  console.log('');
  console.log('folha de importação:');
  await ev(`${tela()}.querySelector('.acoes [data-act="trazer"]').click()`); await sleep(650);
  ck(await ev("!!document.querySelector('.sheet .passo-lista')"), 'a folha explica o passo a passo');
  ck(await ev("document.querySelectorAll('.sheet .passo').length === 4"), 'em 4 passos');
  ck(await ev("!!document.querySelector('.sheet [data-act=colar]')"), 'com um botão de colar');
  ck(await ev("!!document.querySelector('.sheet [data-c=txt]')"), 'e um campo para digitar');
  const endereco = await ev('urlDosPassos()');
  ck(endereco.indexOf('?passos=') > 0 && endereco.indexOf('index.html') < 0,
    'o endereço do atalho sai limpo, sem index.html (' + endereco + ')');
  await shot('ps2-importar');

  await ev(`(function () {
    document.querySelector('.sheet [data-c=txt]').value = '12345';
    document.querySelector('.sheet [data-x=yes]').click();
  })()`);
  await sleep(800);
  ck(await ev('passosDoDia() === 12345'), 'digitar e importar grava o número');
  ck(await ev("!document.querySelector('.sheet')"), 'e a folha fecha');
  ck(await ev(`${tela()}.querySelector('.hero-titulo').textContent.trim() === '12.345'`),
    'a tela já mostra o valor novo');
  ck(await ev(`${tela()}.querySelector('.hero-nota').textContent.indexOf('Meta batida') >= 0`),
    'passando da meta, o cartão diz que ela foi batida');

  /* texto que não é número não pode fechar a folha calada */
  await ev(`${tela()}.querySelector('.acoes [data-act="trazer"]').click()`); await sleep(650);
  await ev(`(function () {
    document.querySelector('.sheet [data-c=txt]').value = 'nada disso';
    document.querySelector('.sheet [data-x=yes]').click();
  })()`);
  await sleep(600);
  ck(await ev("!!document.querySelector('.sheet')"),
    'texto sem número deixa a folha aberta, em vez de fechar sem gravar');
  ck(await ev('passosDoDia() === 12345'), 'e o valor de antes continua lá');
  await ev("document.querySelector('.sheet [data-x=no]').click()"); await sleep(400);

  /* ============================================================
     ABRIR PELO ENDEREÇO
     ============================================================ */
  console.log('');
  console.log('abrindo pelo endereço do atalho:');
  await send('Page.navigate', { url: BASE + '/index.html?passos=15321' });
  await sleep(1800);
  ck(await ev('passosDoDia() === 15321'), 'o app importa o que veio na URL ao abrir');
  ck(await ev("location.search === ''"),
    'e limpa o endereço, senão recarregar reimportaria o valor velho');

  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1700);
  ck(await ev('passosDoDia() === 15321'), 'o valor sobrevive ao recarregar');

  console.log('');
  console.log('meta ajustável:');
  await ev("popToRoot(); abrirModulo('passos');"); await sleep(700);
  await ev("S.settings.metaPassos = 20000; saveNow(); currentScreen().refresh();"); await sleep(400);
  ck(await ev('metaPassos() === 20000'), 'a meta é ajustável');
  ck(await ev(`${tela()}.querySelectorAll('.dias-col.bateu').length === 0`),
    'e com a meta em 20.000 nenhum dia aparece como batido');
  ck(await ev(`${tela()}.querySelector('.hero-nota').textContent.indexOf('faltam') >= 0`),
    'o cartão volta a dizer quanto falta');

  console.log('');
  console.log('atalho no Início:');
  await ev("TAB = 'inicio'; popToRoot();"); await sleep(600);
  ck(await ev(`Array.from(${tela()}.querySelectorAll('.hub-card b')).some(function (b) { return b.textContent === 'Passos'; })`),
    'o módulo aparece na grade de atalhos');
  const corAtalho = await ev(`(function () {
    var cards = ${tela()}.querySelectorAll('.hub-card');
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].querySelector('b').textContent === 'Passos') {
        return getComputedStyle(cards[i]).getPropertyValue('--accent').trim();
      }
    }
    return '';
  })()`);
  ck(corAtalho === await ev('COR_PASSOS'), 'na cor do módulo (' + corAtalho + ')');
  ck(await ev(`${tela()}.textContent.indexOf('15.321 de 20.000') >= 0`),
    'com o número do dia no resumo do cartão');
  await shot('ps3-inicio');

  console.log('\nproblemas:', bad.length);
  bad.forEach((b) => console.log('  !', b));
  ws.close(); chrome.kill();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
