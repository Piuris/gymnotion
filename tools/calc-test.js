/* Testa a barra de descanso global (que não fecha mais o teclado) e a
   calculadora de aquecimento e feeder.
   Uso: node tools/calc-test.js [saida]   (GYM_URL opcional) */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const OUT = process.argv[2] || path.join(__dirname, '..', '__shots');
const BASE = (process.env.GYM_URL || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PORT = 9356;
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
  const naFolha = (sel) => `[...document.querySelectorAll('.backdrop')].pop().querySelector('${sel}')`;

  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1500);
  await ev('localStorage.clear()');
  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1700);

  /* um treino com aquecimento, feeder e válidas */
  await ev(`
    var w = newWorkout(); w.name = 'Push'; w.color = '#FF5A1E';
    addExerciseToWorkout(w.id, findExercise('ex_supino_reto'), 5);
    var e = w.exercises[0];
    e.sets[0].tipo = 'a'; e.sets[1].tipo = 'a';
    e.sets[2].tipo = 'f';
    e.sets[3].peso = 100; e.sets[3].reps = 8;
    e.sets[4].peso = 100; e.sets[4].reps = 8;
    saveNow(); popToRoot(); abrirModulo('academia'); 'ok';
  `);

  console.log('descanso não atrapalha a busca:');
  await ev("REST = { endsAt: Date.now() + 120000, label: 'Supino Reto' }; atualizarBarraDescanso();");
  await sleep(300);
  ck(await ev("!!document.querySelector('#app > .rest-bar')"),
    'a barra de descanso vive no app, não dentro de uma tela');

  await ev("openLibrary(S.workouts[0].id, function () {});"); await sleep(900);
  ck(await ev("!!document.querySelector('.rest-bar')"),
    'e continua visível na biblioteca, que antes nem a mostrava');

  await ev("currentScreen().el.querySelector('.search input').focus();");
  await ev(`var i = currentScreen().el.querySelector('.search input');
    i.value = 'supino'; i.dispatchEvent(new Event('input'));`);
  await sleep(300);
  const antes = await ev("document.activeElement === currentScreen().el.querySelector('.search input')");
  ck(antes, 'o campo de busca está em foco');

  /* dois tiques do relógio: antes isso reconstruía a tela e fechava o teclado */
  await ev('globalTick(); globalTick();');
  await sleep(200);
  ck(await ev("document.activeElement === currentScreen().el.querySelector('.search input')"),
    'depois de dois segundos de descanso, o foco continua na busca');
  ck(await ev("currentScreen().el.querySelector('.search input').value === 'supino'"),
    'e o texto digitado continua lá');
  ck(await ev("currentScreen().el.querySelectorAll('.exrow').length < 20"),
    'a lista segue filtrada, sem ter sido reconstruída');
  await shot('k1-busca-com-descanso');

  await ev("document.querySelector('.rest-bar [data-act=skip]').click()"); await sleep(300);
  ck(await ev("REST === null && !document.querySelector('.rest-bar')"),
    'pular remove a barra sem mexer na tela');
  ck(await ev("document.activeElement === currentScreen().el.querySelector('.search input')"),
    'e o foco na busca sobrevive até a isso');
  await ev('popScreen();'); await sleep(400);

  console.log('\ncalculadora:');
  await ev("openExercise(S.workouts[0].id, S.workouts[0].exercises[0].uid, false)"); await sleep(700);
  ck(await ev("!!currentScreen().el.querySelector('.calc-abrir')"), 'o atalho aparece na tela do exercício');
  ck(await ev('pesoDeTrabalho(S.workouts[0].exercises[0]) === 100'),
    'a carga de trabalho sai da maior série válida');

  ck(await ev('JSON.stringify(escalonar(100, FAIXA_AQUECIMENTO, 1)) === "[42.5]"'),
    'com uma série de aquecimento, usa o meio da faixa: 42,5 kg');
  ck(await ev('JSON.stringify(escalonar(100, FAIXA_AQUECIMENTO, 2)) === "[35,50]"'),
    'com duas, sobe de 35 a 50 kg');
  ck(await ev('JSON.stringify(escalonar(100, FAIXA_AQUECIMENTO, 3)) === "[35,42.5,50]"'),
    'com três, escalona 35 · 42,5 · 50');
  ck(await ev('JSON.stringify(escalonar(100, FAIXA_FEEDER, 1)) === "[67.5]"'),
    'feeder de uma série fica em 67,5 kg (meio de 60–75%)');
  ck(await ev('JSON.stringify(escalonar(80, FAIXA_FEEDER, 2)) === "[47.5,60]"'),
    'com 80 kg, o feeder vai de 47,5 a 60 kg');
  ck(await ev('arredondaCarga(43.3) === 42.5 && arredondaCarga(44) === 45'),
    'as cargas caem no múltiplo de 2,5 mais próximo');

  await ev("currentScreen().el.querySelector('.calc-abrir').click()"); await sleep(500);
  ck(await ev("!!" + naFolha('.calc-linhas')), 'a folha abre');
  ck(await ev(naFolha('input') + '.value === "100"'), 'já vem com a carga de trabalho');
  const linhas = await ev(naFolha('.calc-linhas') + '.textContent.replace(/\\s+/g, " ").trim()');
  ck(linhas.includes('35–50%') && linhas.includes('60–75%'), 'mostra as duas faixas: ' + linhas);
  ck(linhas.includes('35 kg') && linhas.includes('50 kg'), 'com os valores do aquecimento');
  ck(linhas.includes('67,5 kg'), 'e o do feeder');
  await shot('k2-calculadora');

  await ev(naFolha('[data-x=aplicar]') + '.click()'); await sleep(700);
  const sets = JSON.parse(await ev(`JSON.stringify(S.workouts[0].exercises[0].sets.map(function (x) {
    return tipoSet(x) + ':' + x.peso;
  }))`));
  ck(sets[0] === 'a:35' && sets[1] === 'a:50', 'as duas séries de aquecimento viraram 35 e 50 kg');
  ck(sets[2] === 'f:67.5', 'a de feeder virou 67,5 kg');
  ck(sets[3] === 'v:100' && sets[4] === 'v:100', 'as válidas não foram tocadas');
  await shot('k3-preenchido');

  console.log('\nsem carga anotada:');
  await ev(`
    S.workouts[0].exercises[0].sets.forEach(function (x) { x.peso = 0; });
    saveNow(); currentScreen().refresh(); 'ok';
  `);
  await sleep(400);
  ck(await ev('pesoDeTrabalho(S.workouts[0].exercises[0]) === 0'),
    'sem carga e sem histórico, a referência é zero');
  await ev("currentScreen().el.querySelector('.calc-abrir').click()"); await sleep(500);
  ck(await ev(naFolha('[data-x=aplicar]') + '.disabled === true'),
    'e o botão de preencher fica desligado, em vez de gravar zeros');
  ck(await ev(naFolha('.calc-linhas') + ".textContent.indexOf('—') >= 0"),
    'mostrando travessão no lugar dos valores');

  console.log('\nproblemas:', bad.length);
  bad.forEach((b) => console.log('  !', b));
  ws.close(); chrome.kill();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
