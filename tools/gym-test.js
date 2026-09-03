/* Testa o trio da academia (tela acesa, substituir exercício, reordenar
   arrastando) e as três análises (comparação, frequência, tendência).
   Uso: node tools/gym-test.js [pasta-de-saida]   (GYM_URL opcional) */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const OUT = process.argv[2] || path.join(__dirname, '..', '__shots');
const BASE = (process.env.GYM_URL || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PORT = 9347;
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
  /* O GitHub Pages manda max-age=600 e o fetch do service worker passa pelo
     cache HTTP: sem desligar isso, o teste roda contra o deploy anterior. */
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
  await sleep(1400);
  await ev('localStorage.clear()');
  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1600);

  /* ---------- montagem: 3 exercícios e dois treinos anteriores ---------- */
  await ev(`
    var w = newWorkout(); w.name = 'Push'; w.color = '#FF5A1E';
    ['ex_supino_reto', 'ex_desenvolvimento', 'ex_triceps_corda']
      .forEach(function (id) { addExerciseToWorkout(w.id, findExercise(id), 3); });
    saveNow(); 'ok';
  `);

  /* dois registros anteriores, o mais antigo com carga menor */
  await ev(`
    function registrar(cargas, diasAtras) {
      startSession(S.workouts[0].id);
      S.active.exercises.forEach(function (e, i) {
        e.sets.forEach(function (s) { s.peso = cargas[i]; s.reps = 10; s.done = true; });
      });
      var s = finishSession();
      s.date = Date.now() - diasAtras * 86400000;
      saveNow();
    }
    registrar([60, 20, 25], 45);
    registrar([70, 22, 27], 0);
    popToRoot(); currentScreen().refresh(); 'ok';
  `);

  console.log('tela acesa:');
  ck(await ev("typeof ajustarTravaTela === 'function'"), 'controle de Wake Lock existe');
  ck(await ev("typeof segurarTela === 'function' && typeof soltarTela === 'function'"),
    'segura e solta em funções separadas');
  const semTreino = await ev('ajustarTravaTela(); travaTela === null');
  ck(semTreino, 'sem treino rodando, não segura a tela');
  await ev("startSession(S.workouts[0].id);");
  await ev('ajustarTravaTela();'); await sleep(300);
  const comTreino = await ev("!!travaTela || !('wakeLock' in navigator)");
  ck(comTreino, 'com treino rodando, segura a tela (ou o navegador não suporta)');
  await ev('pauseSession(); ajustarTravaTela();'); await sleep(200);
  ck(await ev('travaTela === null'), 'pausar solta a tela');
  await ev('resumeSession(); ajustarTravaTela();'); await sleep(200);
  await ev('cancelSession(); ajustarTravaTela();'); await sleep(200);
  ck(await ev('travaTela === null'), 'encerrar solta a tela');

  console.log('\nsubstituir exercício:');
  await ev("openWorkout(S.workouts[0].id, 'view')"); await sleep(600);
  const antes = await ev("S.workouts[0].exercises[1].nome");
  await ev(`
    var w = S.workouts[0];
    w.exercises[1].sets[0].desc = 2;
    substituirExercicio(w.id, w.exercises[1].uid, findExercise('ex_elevacao_lateral'), 'Halteres');
    'ok';
  `);
  ck(await ev("S.workouts[0].exercises[1].nome === 'Elevação Lateral'"),
    'troca o exercício (era ' + antes + ')');
  ck(await ev('S.workouts[0].exercises[1].sets.length === 3'), 'mantém a quantidade de séries');
  ck(await ev('S.workouts[0].exercises[1].sets[0].desc === 2'), 'mantém o descanso configurado');
  ck(await ev('S.workouts[0].exercises[1].sets[0].peso === 0'), 'zera a carga, que era de outro movimento');
  ck(await ev("S.workouts[0].exercises[1].equip === 'Halteres'"), 'aplica o equipamento escolhido');
  ck(await ev("S.workouts[0].exercises[0].exId === 'ex_supino_reto'"), 'os vizinhos ficam onde estavam');

  await ev("popScreen();"); await sleep(400);
  await ev("openWorkout(S.workouts[0].id, 'edit')"); await sleep(600);
  ck(await ev("currentScreen().el.querySelectorAll('[data-alca]').length === 3"),
    'modo edição mostra a alça de arraste em cada linha');
  ck(await ev("!currentScreen().el.querySelector('.check')"),
    'a alça toma o lugar do círculo de marcar');
  await shot('g1-edicao-arrastar');

  console.log('\nreordenar:');
  const ordemAntes = await ev("S.workouts[0].exercises.map(function (e) { return e.nome; }).join(',')");
  await ev("var l = S.workouts[0].exercises; var x = l.splice(0, 1)[0]; l.splice(2, 0, x); saveNow(); currentScreen().refresh();");
  await sleep(300);
  const ordemDepois = await ev("S.workouts[0].exercises.map(function (e) { return e.nome; }).join(',')");
  ck(ordemAntes !== ordemDepois, 'a lista aceita reordenação');
  ck(await ev("currentScreen().el.querySelectorAll('.ex-item')[2].textContent.includes(S.workouts[0].exercises[2].nome)"),
    'a tela reflete a nova ordem');
  ck(await ev("typeof tornarArrastavel === 'function'"), 'arraste por toque implementado');
  ck(await ev("getComputedStyle(currentScreen().el.querySelector('.alca')).touchAction === 'none'"),
    'a alça não rola a tela ao arrastar');
  await ev('popScreen();'); await sleep(400);

  console.log('\ncomparação com o treino anterior:');
  await ev("popToRoot(); abrirModulo('academia'); openSessionDetail(S.sessions[0].id);");
  await sleep(600);
  const comp = JSON.parse(await ev("JSON.stringify(compararComAnterior(S.sessions[0])) || 'null'"));
  ck(!!comp, 'encontra o treino anterior do mesmo molde');
  ck(comp && comp.volume === 420, 'volume comparado: 3570 - 3150 = 420 (veio ' + (comp && comp.volume) + ')');
  ck(comp && comp.porExercicio.length === 3, 'compara os 3 exercícios');
  ck(comp && comp.porExercicio.every((x) => x.delta > 0), 'todos subiram de carga');
  ck(await ev("!!" + naTela('.comparacao')), 'bloco de comparação aparece na tela');
  ck(await ev("currentScreen().el.textContent.includes('+420 kg')"), 'mostra o ganho de volume');
  await shot('g2-comparacao');
  await ev('popScreen();'); await sleep(400);

  console.log('\nfrequência por grupo:');
  const g = JSON.parse(await ev("JSON.stringify(seriesPorGrupo(0))"));
  const peito = g.find((x) => x.grupo === 'Peito');
  ck(!!peito && peito.frequencia === 2, 'Peito treinado em 2 dias distintos (veio ' + (peito && peito.frequencia) + ')');
  ck(!!peito && peito.series === 6, 'e com 6 séries no total (veio ' + (peito && peito.series) + ')');
  await ev("popToRoot(); telaResumo();"); await sleep(500);
  ck(await ev("currentScreen().el.textContent.includes('× na semana')"),
    'a frequência aparece junto das séries');

  console.log('\ntendência de carga:');
  const t = JSON.parse(await ev("JSON.stringify(tendenciaCarga('ex_supino_reto', 30)) || 'null'"));
  ck(!!t, 'calcula a tendência dos últimos 30 dias');
  ck(t && t.antes === 80 && t.agora === 93,
    'de 80 para 93 kg estimados (veio ' + (t && t.antes) + ' -> ' + (t && t.agora) + ')');
  ck(t && t.delta === 13, 'ganho de 13 kg (veio ' + (t && t.delta) + ')');
  await ev("popToRoot(); abrirModulo('academia'); startSession(S.workouts[0].id);");
  await ev("openWorkout(S.workouts[0].id, 'session')"); await sleep(500);
  const alvoSupino = await ev("S.active.exercises.findIndex(function (e) { return e.exId === 'ex_supino_reto'; })");
  await ev(`openExercise(S.workouts[0].id, S.active.exercises[${alvoSupino}].uid, true)`); await sleep(600);
  ck(await ev("!!" + naTela('.chart-tend')), 'a tendência aparece no gráfico');
  ck(await ev("currentScreen().el.querySelector('.chart-tend').textContent.includes('30 dias')"),
    'diz a janela usada');
  await shot('g3-tendencia');

  console.log('\nproblemas:', bad.length);
  bad.forEach((b) => console.log('  !', b));
  ws.close(); chrome.kill();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
