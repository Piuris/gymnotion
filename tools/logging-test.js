/* Testa o botão de limpar a busca e o início automático do treino ao anotar.
   Uso: node tools/logging-test.js [saida]   (GYM_URL opcional) */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const OUT = process.argv[2] || path.join(__dirname, '..', '__shots');
const BASE = (process.env.GYM_URL || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PORT = 9349;
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
    '--window-size=390,844', 'about:blank',
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
  await send('Runtime.enable'); await send('Page.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  /* Sem isso o documento fica sem foco no headless e .focus() muda o
     activeElement sem disparar o evento focus. */
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

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
  const naTela = (sel) => `currentScreen().el.querySelector('${sel}')`;

  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1500);
  await ev('localStorage.clear()');
  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1700);

  await ev(`
    var w = newWorkout(); w.name = 'Push'; w.color = '#FF5A1E';
    addExerciseToWorkout(w.id, findExercise('ex_supino_reto'), 3);
    addExerciseToWorkout(w.id, findExercise('ex_triceps_corda'), 3);
    saveNow(); popToRoot(); abrirModulo('academia'); 'ok';
  `);

  console.log('limpar a busca:');
  await ev("openLibrary(S.workouts[0].id, function () {});"); await sleep(900);
  ck(await ev("!!" + naTela('.search-limpar')), 'o botão existe');
  ck(await ev("currentScreen().el.querySelector('.search-limpar').classList.contains('oculto')"),
    'fica escondido com a busca vazia');

  await ev(`var i = currentScreen().el.querySelector('.search input');
    i.value = 'supino'; i.dispatchEvent(new Event('input'));`);
  await sleep(350);
  ck(await ev("!currentScreen().el.querySelector('.search-limpar').classList.contains('oculto')"),
    'aparece quando há texto');
  const filtrados = await ev("currentScreen().el.querySelectorAll('.exrow').length");
  ck(filtrados > 0 && filtrados < 20, 'a busca filtrou para ' + filtrados + ' resultados');
  await shot('l1-busca-com-texto');

  await ev(naTela('.search-limpar') + '.click()'); await sleep(400);
  ck(await ev("currentScreen().el.querySelector('.search input').value === ''"), 'limpa o campo');
  ck(await ev("currentScreen().el.querySelector('.search-limpar').classList.contains('oculto')"),
    'volta a se esconder');
  ck(await ev("currentScreen().el.querySelectorAll('.exrow').length === EXERCISES.length"),
    'a lista completa volta');
  ck(await ev("document.activeElement === currentScreen().el.querySelector('.search input')"),
    'o cursor continua na busca, para você digitar de novo');
  await ev('popScreen();'); await sleep(400);

  console.log('\nanotar carga inicia o treino:');
  ck(await ev('S.active === null'), 'nenhum treino em andamento no começo');
  await ev("openWorkout(S.workouts[0].id, 'view')"); await sleep(600);
  ck(await ev("!" + naTela('.timer')), 'sem cronômetro antes de anotar');
  await ev("openExercise(S.workouts[0].id, S.workouts[0].exercises[0].uid, false)"); await sleep(600);

  await ev("currentScreen().el.querySelector('.set-row input[data-f=peso]').focus();");
  await sleep(500);
  ck(await ev('!!S.active'), 'tocar no campo de peso inicia a sessão');
  ck(await ev("S.active.workoutId === S.workouts[0].id"), 'a sessão é do treino certo');
  ck(await ev('S.active.running === true'), 'o cronômetro está correndo');
  ck(await ev("document.activeElement && document.activeElement.dataset.f === 'peso'"),
    'o cursor continua no campo tocado, sem perder o toque');
  await shot('l2-sessao-iniciada');

  /* o valor digitado tem de ir para a sessão, não para o molde */
  await ev(`var i = document.activeElement;
    i.value = 75; i.dispatchEvent(new Event('change'));`);
  await sleep(300);
  ck(await ev('S.active.exercises[0].sets[0].peso === 75'), 'o peso foi para a sessão');
  ck(await ev('S.workouts[0].exercises[0].sets[0].peso === 0'),
    'e não para o molde do treino, que só é atualizado ao concluir');

  await ev('popScreen();'); await sleep(500);
  ck(await ev("!!" + naTela('.timer')), 'ao voltar, a tela do treino já mostra o cronômetro');
  ck(await ev("currentScreen().el.textContent.includes('Concluir')"),
    'e o botão vira Concluir');
  await shot('l3-treino-rodando');

  console.log('\nnão inicia à toa:');
  await ev('cancelSession(); ajustarTravaTela(); currentScreen().refresh();'); await sleep(400);
  await ev("openExercise(S.workouts[0].id, S.workouts[0].exercises[0].uid, false)"); await sleep(600);
  await ev("currentScreen().el.querySelector('.set-row input[data-f=desc]').focus();");
  await sleep(400);
  ck(await ev('S.active === null'), 'tocar no campo de descanso não inicia');
  await ev('popScreen();'); await sleep(400);

  /* com outro treino em andamento, anotar não sequestra a sessão */
  await ev(`
    var w2 = newWorkout(); w2.name = 'Pull';
    addExerciseToWorkout(w2.id, findExercise('ex_puxada_frontal'), 3);
    startSession(w2.id); saveNow(); 'ok';
  `);
  await ev("openExercise(S.workouts[0].id, S.workouts[0].exercises[0].uid, false)"); await sleep(600);
  await ev("currentScreen().el.querySelector('.set-row input[data-f=peso]').focus();");
  await sleep(400);
  ck(await ev("S.active.workoutId === S.workouts[1].id"),
    'com outro treino rodando, a sessão não é trocada por baixo');
  await ev('popScreen(); cancelSession(); ajustarTravaTela();'); await sleep(400);

  console.log('\nmarcar série também inicia:');
  await ev("popToRoot(); openWorkout(S.workouts[0].id, 'view')"); await sleep(600);
  await ev("openExercise(S.workouts[0].id, S.workouts[0].exercises[0].uid, false)"); await sleep(600);
  await ev("currentScreen().el.querySelector('.set-row [data-act=done]').click();"); await sleep(500);
  ck(await ev('!!S.active'), 'marcar a série inicia a sessão');
  ck(await ev('S.active.exercises[0].sets[0].done === true'), 'e a série fica marcada na sessão');

  console.log('\nproblemas:', bad.length);
  bad.forEach((b) => console.log('  !', b));
  ws.close(); chrome.kill();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
