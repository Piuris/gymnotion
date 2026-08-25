/* Teste de fumaça: percurso completo a partir de um app vazio.
   Cria um treino, adiciona exercícios, treina, anota carga e conclui.
   Uso: node tools/flow-test.js [pasta-de-saida] */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const OUT = process.argv[2] || path.join(__dirname, '..', '__shots');
const BASE = (process.env.GYM_URL || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PORT = 9334;

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p));

/* O CacheStorage do Chrome acrescenta ~100 caracteres ao caminho do perfil.
   Num diretório fundo o Windows estoura o limite de 260 e TODA escrita em
   cache falha com "Entry already exists" — o que faz o service worker
   parecer quebrado. Por isso o perfil fica num caminho curto. */
const PROFILE = path.join(os.tmpdir(), 'gymnotion-chrome');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio', '--no-first-run',
    '--user-data-dir=' + PROFILE,
    '--remote-debugging-port=' + PORT,
    '--window-size=390,844', 'about:blank',
  ], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch (e) { /* subindo */ }
  }
  if (!target) throw new Error('Chrome não respondeu ao CDP');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0;
  const pend = new Map();
  const bad = [];

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

  const send = (method, params) => new Promise((resolve, reject) => {
    const i = ++id;
    pend.set(i, { resolve, reject });
    ws.send(JSON.stringify({ id: i, method, params: params || {} }));
  });

  await send('Runtime.enable');
  await send('Page.enable');
  /* O GitHub Pages manda max-age=600 e o fetch do service worker passa pelo
     cache HTTP: sem desligar isso, o teste roda contra o deploy anterior. */
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  /* Sem isso o documento fica sem foco no headless e .focus() muda o
     activeElement sem disparar o evento focus. */
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Emulation.setDeviceMetricsOverride',
    { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

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

  const check = (cond, msg) => {
    console.log((cond ? '  ok    ' : '  FALHA ') + msg);
    if (!cond) bad.push('VERIFICAÇÃO: ' + msg);
  };

  /* --- começa com o armazenamento limpo --- */
  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1200);
  await ev('localStorage.clear()');
  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1500);

  console.log('percurso a partir de um app vazio:');
  check(await ev("!!document.querySelector('.empty')"), 'tela vazia orienta o primeiro passo');
  await shot('f01-vazio');

  await ev("document.querySelector('.fab').click()");
  await sleep(500);
  await ev("document.querySelector('[data-act=new]').click()");
  await sleep(600);
  check(await ev('S.workouts.length === 1'), 'treino criado');
  await shot('f02-editor');

  await ev("S.workouts[0].name = 'Peito e Tríceps'; S.workouts[0].color = '#0A84FF'; saveNow(); currentScreen().refresh();");
  check(await ev("getComputedStyle(document.querySelector('.folder-foot')).color !== ''"), 'cor aplicada ao cartão');
  await shot('f03-nome-e-cor');

  await ev("document.querySelector('[data-act=done]').click()");
  await sleep(800);

  await ev("openLibrary(S.workouts[0].id, function () {})");
  await sleep(700);
  await ev("var i = document.querySelector('.search input'); i.value = 'supino'; i.dispatchEvent(new Event('input'));");
  await sleep(400);
  const achados = await ev("document.querySelectorAll('.exrow').length");
  check(achados > 0, 'busca por "supino" retorna ' + achados + ' exercícios');
  await shot('f04-busca');

  await ev("var b = document.querySelectorAll('.exrow [data-act=add]'); b[0].click(); b[1].click();");
  await sleep(400);
  check(await ev('S.workouts[0].exercises.length === 2'), 'dois exercícios adicionados ao treino');

  await ev('popScreen()');
  await sleep(700);
  await ev("var s = document.querySelector('[data-act=start]'); if (s) s.click();");
  await sleep(800);
  check(await ev('!!S.active'), 'sessão iniciada');
  await shot('f05-sessao');

  await ev('openExercise(S.workouts[0].id, S.active.exercises[0].uid, true)');
  await sleep(700);
  await ev("var f = document.querySelectorAll('.set-row')[0].querySelectorAll('input');"
    + " f[0].value = 60; f[0].dispatchEvent(new Event('change'));"
    + " f[1].value = 10; f[1].dispatchEvent(new Event('change'));");
  await ev("document.querySelectorAll('.set-row [data-act=done]')[0].click()");
  await sleep(500);
  check(await ev('S.active.exercises[0].sets[0].peso === 60 && S.active.exercises[0].sets[0].done === true'),
    'série anotada (60 kg x 10) e marcada como feita');
  check(await ev('!!REST'), 'temporizador de descanso disparou');
  await shot('f06-serie-e-descanso');

  await ev('popScreen()');
  await sleep(700);
  await ev("document.querySelector('[data-act=finish]').click()");
  await sleep(600);
  await ev("document.querySelector('[data-x=yes]').click()");
  await sleep(1400);
  check(await ev('S.sessions.length === 1 && S.active === null'), 'treino concluído e movido para o histórico');
  check(await ev('S.sessions[0].volume === 600'), 'volume calculado: 60 x 10 = 600 kg');
  check(await ev('S.sessions[0].sets === 1 && S.sessions[0].reps === 10'), 'séries e repetições contadas');
  await shot('f07-registro');

  await ev('popToRoot(); currentScreen().refresh();');
  await sleep(600);
  check(await ev("JSON.parse(localStorage.getItem('gymnotion.v1')).sessions.length === 1"),
    'gravado no localStorage');
  check(await ev('streak() === 1'), 'sequência de dias = 1');
  check(await ev("S.workouts[0].exercises[0].sets[0].peso === 60"), 'carga usada volta para o molde do treino');
  await shot('f08-home');

  console.log('\nproblemas:', bad.length);
  bad.forEach((b) => console.log('  !', b));

  ws.close();
  chrome.kill();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
