/* Abre o app no Chrome headless, percorre as telas, salva PNGs e
   reporta qualquer erro de console. Uso: node tools/shots.js <destino> */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const OUT = process.argv[2] || path.join(__dirname, '..', '__shots');
const BASE = (process.env.GYM_URL || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PORT = 9333;

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].find((p) => fs.existsSync(p));

/* O CacheStorage do Chrome acrescenta ~100 caracteres ao caminho do perfil.
   Num diretório fundo o Windows estoura o limite de 260 e TODA escrita em
   cache falha com "Entry already exists" — o que faz o service worker
   parecer quebrado. Por isso o perfil fica num caminho curto. */
const PROFILE = path.join(os.tmpdir(), 'gymnotion-chrome');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio',
    '--no-first-run', '--no-default-browser-check',
    '--user-data-dir=' + PROFILE,
    '--remote-debugging-port=' + PORT,
    '--window-size=390,844',
    'about:blank',
  ], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(250);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch (e) { /* ainda subindo */ }
  }
  if (!target) throw new Error('Chrome não respondeu ao CDP');

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0;
  const pending = new Map();
  const problemas = [];

  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      return;
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      problemas.push('EXCEÇÃO: ' + (d.exception && d.exception.description || d.text));
    }
    if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
      problemas.push(msg.params.type.toUpperCase() + ': ' +
        msg.params.args.map((a) => a.description || a.value).join(' '));
    }
  };

  const send = (method, params) => new Promise((resolve, reject) => {
    const mid = ++id;
    pending.set(mid, { resolve, reject });
    ws.send(JSON.stringify({ id: mid, method, params: params || {} }));
  });

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride',
    { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

  const evaluate = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) {
      problemas.push('AVALIAÇÃO: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    }
    return r.result && r.result.value;
  };

  const shot = async (nome) => {
    await sleep(500);
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, nome + '.png'), Buffer.from(data, 'base64'));
    console.log('  ->', nome + '.png');
  };

  /* ---- roteiro ---- */
  await send('Page.navigate', { url: BASE + '/__seed.html' });
  await sleep(2500);

  console.log('telas:');
  await shot('01-treinos');

  await evaluate('openWorkoutsSheet()');
  await shot('02-pastas');

  await evaluate("openWorkout(S.workouts[2].id, 'view')");
  await shot('03-treino-perna');

  await evaluate("document.querySelector('.pill-btn.sm').click()");
  await shot('04-sessao-iniciada');

  await evaluate("openExercise(S.workouts[2].id, S.workouts[2].exercises[0].uid, true)");
  await shot('05-exercicio');

  await evaluate('popScreen()');
  await sleep(400);
  await evaluate("openLibrary(S.workouts[2].id, function(){})");
  await shot('06-biblioteca');

  await evaluate("document.querySelectorAll('.chips .chip')[4].click()");
  await shot('07-biblioteca-filtro');

  await evaluate('popScreen(); popScreen();');
  await sleep(400);
  await evaluate('cancelSession(); popToRoot(); currentScreen().refresh();');
  await evaluate("openWorkoutEditor(S.workouts[1].id)");
  await shot('08-editor-cor');

  await evaluate("document.querySelector('[data-act=\\'cor\\']').click()");
  await shot('09-paleta');

  await evaluate("document.querySelector('.backdrop').remove(); popScreen();");
  await sleep(400);
  await evaluate("TAB='inicio'; popToRoot(); currentScreen().refresh();");
  await shot('10-resumo');

  await evaluate("openSessionDetail(S.sessions[2].id)");
  await shot('11-registro');

  console.log('\nproblemas de console:', problemas.length);
  problemas.forEach((p) => console.log('  !', p));

  ws.close();
  chrome.kill();
  process.exit(problemas.length ? 1 : 0);
}

main().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
