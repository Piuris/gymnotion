/* Testa a barra de abas menor, o dia de descanso na ofensiva e a meta de água.
   Uso: node tools/habits-test.js [saida]   (GYM_URL opcional) */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const OUT = process.argv[2] || path.join(__dirname, '..', '__shots');
const BASE = (process.env.GYM_URL || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PORT = 9352;
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

  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1500);
  await ev('localStorage.clear()');
  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1700);

  console.log('barra de abas:');
  const altura = await ev("parseInt(getComputedStyle(document.documentElement).getPropertyValue('--tabbar-h'))");
  ck(altura === 48, 'a barra encolheu para ' + altura + 'px');
  const reserva = await ev("parseInt(getComputedStyle(currentScreen().el.querySelector('.scroll')).paddingBottom)");
  ck(reserva >= altura, 'a lista reserva ' + reserva + 'px, cobrindo a barra de ' + altura + 'px');
  ck(await ev("currentScreen().el.classList.contains('com-abas')"), 'a tela raiz se marca como tendo abas');
  /* a última linha da lista não pode ficar por baixo da barra */
  await ev(`
    var w = newWorkout(); w.name = 'Push';
    addExerciseToWorkout(w.id, findExercise('ex_supino_reto'), 3);
    for (var i = 0; i < 6; i++) {
      startSession(w.id);
      S.active.exercises.forEach(function (e) {
        e.sets.forEach(function (s) { s.peso = 60; s.reps = 10; s.done = true; });
      });
      var s = finishSession(); s.date = Date.now() - i * 86400000;
    }
    saveNow(); popToRoot(); currentScreen().refresh(); 'ok';
  `);
  await sleep(500);
  const livre = await ev(`(function () {
    var sc = currentScreen().el.querySelector('.scroll');
    sc.scrollTop = sc.scrollHeight;
    var cartoes = currentScreen().el.querySelectorAll('.sess');
    var ultimo = cartoes[cartoes.length - 1].getBoundingClientRect();
    var barra = currentScreen().el.querySelector('.tabbar').getBoundingClientRect();
    return Math.round(barra.top - ultimo.bottom);
  })()`);
  ck(livre >= 0, 'o último registro fica ' + livre + 'px acima da barra, sem ser coberto');
  await shot('h1-lista-completa');

  console.log('\ndia de descanso:');
  ck(await ev('Array.isArray(S.descansos)'), 'o estado guarda os dias de descanso');
  ck(await ev('metaSemanal() === 2'), 'meta padrão de 2 treinos por semana');

  /* ofensiva quebra sem descanso: treino anteontem, nada ontem */
  await ev(`
    S.sessions = []; S.descansos = [];
    var w = S.workouts[0];
    function registrar(diasAtras) {
      startSession(w.id);
      S.active.exercises.forEach(function (e) {
        e.sets.forEach(function (s) { s.peso = 60; s.reps = 10; s.done = true; });
      });
      var s = finishSession();
      s.date = Date.now() - diasAtras * 86400000;
    }
    registrar(3); registrar(2); registrar(0);
    saveNow(); 'ok';
  `);
  const semDescanso = await ev('streak()');
  ck(semDescanso === 1, 'sem marcar descanso, o buraco de ontem corta a ofensiva em ' + semDescanso);

  await ev('alternarDescanso(Date.now() - 86400000);');
  const comDescanso = await ev('streak()');
  ck(comDescanso === 4, 'marcando ontem como descanso, a ofensiva vai a ' + comDescanso);
  ck(await ev('ehDescanso(Date.now() - 86400000)'), 'o dia fica marcado');

  await ev('alternarDescanso(Date.now() - 86400000);');
  ck(await ev('!ehDescanso(Date.now() - 86400000)'), 'tocar de novo desmarca');
  await ev('alternarDescanso(Date.now() - 86400000);');

  /* descanso não vira desculpa: semana fechada sem a meta não sustenta */
  const semanaFraca = await ev(`(function () {
    var guardaS = S.sessions.slice(), guardaD = S.descansos.slice();
    S.sessions = []; S.descansos = [];
    /* uma semana inteira só de descanso, bem no passado */
    for (var i = 8; i < 15; i++) S.descansos.push(dayKey(Date.now() - i * 86400000));
    var r = diaMantemOfensiva(Date.now() - 10 * 86400000);
    S.sessions = guardaS; S.descansos = guardaD;
    return r;
  })()`);
  ck(semanaFraca === false, 'semana fechada sem treino: o descanso não sustenta a ofensiva');

  const semanaAtual = await ev('diaMantemOfensiva(Date.now() - 86400000)');
  ck(semanaAtual === true, 'na semana em curso o descanso vale, porque a meta ainda pode ser batida');

  await ev("popToRoot(); TAB = 'treinos'; currentScreen().refresh();"); await sleep(400);
  ck(await ev("!!currentScreen().el.querySelector('.day.descanso')"),
    'o descanso aparece na faixa da semana');
  await shot('h2-descanso-na-semana');

  console.log('\nmeta de água:');
  await ev("TAB = 'nutricao'; popToRoot(); currentScreen().refresh();"); await sleep(500);
  ck(await ev("currentScreen().el.querySelector('.top-bar .title').textContent.trim() === 'Água'"),
    'a aba Nutrição mostra a Água');
  ck(await ev("!currentScreen().el.textContent.includes('Em breve')"), 'o "Em breve" saiu');
  ck(await ev('metaAgua() === 2600'), '75 kg × 35 ml dá meta de ' + await ev('metaAgua()') + ' ml');
  ck(await ev('aguaDoDia() === 0'), 'o dia começa zerado');
  await shot('h3-agua-vazia');

  await ev("currentScreen().el.querySelectorAll('.agua-copo')[2].click()"); await sleep(400);
  ck(await ev('aguaDoDia() === 500'), 'o copo de 500 ml soma');
  await ev("currentScreen().el.querySelectorAll('.agua-copo')[0].click()"); await sleep(400);
  ck(await ev('aguaDoDia() === 700'), 'somando 200, vai a ' + await ev('aguaDoDia()') + ' ml');
  ck(await ev("currentScreen().el.textContent.includes('Faltam 1900 ml')"), 'mostra quanto falta');
  await shot('h4-agua-parcial');

  await ev("currentScreen().el.querySelector('[data-act=menos]').click()"); await sleep(400);
  ck(await ev('aguaDoDia() === 500'), 'desfazer tira 200 ml');

  await ev('beberAgua(2200); popToRoot(); currentScreen().refresh();'); await sleep(400);
  ck(await ev('aguaDoDia() === 2700'), 'chegando a 2700 ml');
  ck(await ev("currentScreen().el.textContent.includes('Meta batida')"), 'avisa quando bate a meta');
  ck(await ev("!!currentScreen().el.querySelector('.agua-dia.bateu')"),
    'o dia aparece marcado no gráfico da semana');
  await shot('h5-agua-batida');

  ck(await ev("JSON.parse(localStorage.getItem('gymnotion.v1')).agua[dayKey(Date.now())] === 2700"),
    'o consumo persiste');
  await ev('S.settings.metaAgua = 3000; saveNow(); currentScreen().refresh();'); await sleep(300);
  ck(await ev('metaAgua() === 3000'), 'meta manual tem prioridade sobre o cálculo por peso');
  ck(await ev('beberAgua(-9999) === 0'), 'não deixa o consumo ficar negativo');

  console.log('\nproblemas:', bad.length);
  bad.forEach((b) => console.log('  !', b));
  ws.close(); chrome.kill();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
