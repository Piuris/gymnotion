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
  /* O navegador não tem safe area; sem simular os 34px do iPhone, a folga
     embaixo mediria zero e o teste não veria o problema real. */
  await ev("document.documentElement.style.setProperty('--safe-b', '34px');");
  await sleep(300);

  const geo = JSON.parse(await ev(`(function () {
    var barra = currentScreen().el.querySelector('.tabbar').getBoundingClientRect();
    var icone = currentScreen().el.querySelector('.tab svg').getBoundingClientRect();
    var tela = window.innerHeight;
    var larg = window.innerWidth;
    return JSON.stringify({
      altura: Math.round(barra.height),
      largura: Math.round(barra.width),
      folgaAbaixoDaBarra: Math.round(tela - barra.bottom),
      folgaAbaixoDoIcone: Math.round(tela - icone.bottom),
      centrada: Math.abs((barra.left + barra.right) / 2 - larg / 2) < 1.5,
      raio: getComputedStyle(currentScreen().el.querySelector('.tabbar')).borderTopLeftRadius,
    });
  })()`));
  ck(geo.altura <= 60, 'a cápsula mede ' + geo.altura + 'px de altura');
  ck(geo.largura < 393 - 24, 'e flutua sem encostar nas bordas (' + geo.largura + 'px de largura)');
  ck(geo.centrada, 'centrada na tela');
  ck(parseInt(geo.raio, 10) >= 24, 'com as pontas arredondadas em cápsula (' + geo.raio + ')');
  ck(geo.folgaAbaixoDaBarra >= 12,
    'deixando espaço para o indicador de gesto (' + geo.folgaAbaixoDaBarra + 'px)');
  ck(geo.folgaAbaixoDaBarra <= 34,
    'sem sobrar faixa preta embaixo (' + geo.folgaAbaixoDaBarra + 'px)');
  await ev("document.documentElement.style.removeProperty('--safe-b');");
  await sleep(200);
  const reserva = await ev("parseInt(getComputedStyle(currentScreen().el.querySelector('.scroll')).paddingBottom)");
  ck(reserva >= geo.altura,
    'a lista reserva ' + reserva + 'px, cobrindo a cápsula de ' + geo.altura + 'px');
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
    saveNow(); popToRoot(); abrirModulo('academia'); 'ok';
  `);
  await sleep(500);
  const livre = await ev(`(function () {
    var sc = currentScreen().el.querySelector('.scroll');
    sc.scrollTop = sc.scrollHeight;
    var cartoes = currentScreen().el.querySelectorAll('.sess');
    var ultimo = cartoes[cartoes.length - 1].getBoundingClientRect();
    /* a academia virou tela empilhada e nao tem mais barra de abas embaixo:
       o que nao pode e o cartao passar da borda da tela */
    return Math.round(window.innerHeight - ultimo.bottom);
  })()`);
  ck(livre >= 0, 'o último registro cabe inteiro, ' + livre + 'px acima da borda');
  await shot('h1-lista-completa');

  console.log('descanso automatico:');
  ck(await ev("typeof alternarDescanso === 'undefined'"),
    'nao existe mais marcacao manual');
  ck(await ev('metaSemanal() === 2'), 'meta padrao de 2 treinos por semana');

  /* treinos em -3, -2 e hoje, com ontem vazio */
  await ev(`
    S.sessions = [];
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
  const auto = await ev('streak()');
  ck(auto === 3, 'o dia vazio vira descanso sozinho: ofensiva ' + auto + ', os dias treinados');
  ck(await ev('ehDescanso(Date.now() - 86400000)'),
    'o dia sem treino ja conta como descanso, sem ninguem marcar');
  ck(await ev('!ehDescanso(Date.now())'), 'um dia com treino nao e descanso');

  /* semana fechada abaixo da meta quebra a corrente */
  const semanaFraca = await ev(`(function () {
    var guarda = S.sessions.slice();
    var s = JSON.parse(JSON.stringify(guarda[0]));
    s.date = Date.now() - 20 * 86400000;
    S.sessions = [s];
    var r = descansoCobre(Date.now() - 19 * 86400000);
    S.sessions = guarda;
    return r;
  })()`);
  ck(semanaFraca === false,
    'semana fechada com 1 treino so nao cobre o descanso, e a ofensiva quebra ali');

  ck(await ev('descansoCobre(Date.now() - 86400000)') === true,
    'na semana em curso o descanso cobre, porque a meta ainda pode ser batida');
  ck(await ev('faltamNaSemana(Date.now()) >= 0'),
    'da para saber quantos treinos faltam na semana');

  await ev("popToRoot(); abrirModulo('academia'); DIA_SEL = Date.now() - 86400000; currentScreen().refresh();");
  await sleep(400);
  ck(await ev("!!currentScreen().el.querySelector('.day.descanso')"),
    'o descanso aparece sozinho na faixa da semana');
  ck(await ev("!currentScreen().el.querySelector('.descanso-btn')"),
    'e nao ha mais botao para marcar');
  ck(await ev("!!currentScreen().el.querySelector('.descanso-aviso')"),
    'no lugar dele, o aviso sobre a meta da semana');
  await shot('h2-descanso-automatico');
  await ev('DIA_SEL = Date.now(); currentScreen().refresh();'); await sleep(300);

  console.log('\nmeta de água:');
  await ev("popToRoot(); abrirModulo('agua');"); await sleep(500);
  ck(await ev("TAB === 'agua'"), 'hidratação é uma das abas da cápsula');
  ck(await ev("currentScreen().el.querySelector('.sec h2').textContent.trim() === 'Hidratação'"),
    'e o módulo abre na tela da água');
  ck(await ev("!currentScreen().el.textContent.includes('Em breve')"), 'o "Em breve" saiu');
  ck(await ev('metaAgua() === 2600'), '75 kg × 35 ml dá meta de ' + await ev('metaAgua()') + ' ml');
  ck(await ev('aguaDoDia() === 0'), 'o dia começa zerado');
  await shot('h3-agua-vazia');

  await ev("currentScreen().el.querySelectorAll('.agua-copo')[2].click()"); await sleep(400);
  ck(await ev('aguaDoDia() === 800'), 'a garrafa de 800 ml soma');
  await ev("currentScreen().el.querySelectorAll('.agua-copo')[0].click()"); await sleep(400);
  ck(await ev('aguaDoDia() === 1100'), 'somando 300, vai a ' + await ev('aguaDoDia()') + ' ml');
  ck(await ev("currentScreen().el.textContent.includes('Faltam 1500 ml')"), 'mostra quanto falta');
  await shot('h4-agua-parcial');

  await ev("currentScreen().el.querySelector('[data-act=menos]').click()"); await sleep(400);
  ck(await ev('aguaDoDia() === 800'), 'desfazer tira os 300 que entraram por último');

  await ev('beberAgua(1900); currentScreen().refresh();'); await sleep(400);
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
