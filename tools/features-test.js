/* Verifica os recursos novos: tipos de série, "última vez", séries por grupo,
   aviso de recorde, correção de registro e lembrete de backup.
   Uso: node tools/features-test.js [pasta-de-saida]   (GYM_URL opcional) */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const OUT = process.argv[2] || path.join(__dirname, '..', '__shots');
const BASE = (process.env.GYM_URL || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PORT = 9342;
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
  /* As telas ficam empilhadas e as folhas são anexadas ao final: consultar o
     documento inteiro pegaria elementos da tela de baixo. */
  const naTela = (sel) => `currentScreen().el.querySelector('${sel}')`;
  const naFolha = (sel) => `[...document.querySelectorAll('.backdrop')].pop()?.querySelector('${sel}')`;

  const ck = (cond, msg) => {
    console.log((cond ? '  ok    ' : '  FALHA ') + msg);
    if (!cond) bad.push('VERIFICAÇÃO: ' + msg);
  };

  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1200);
  await ev('localStorage.clear()');
  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1600);

  /* ---------- monta um treino e uma sessão ---------- */
  await ev(`
    var w = newWorkout(); w.name = 'Teste'; w.color = '#FF3B30';
    addExerciseToWorkout(w.id, findExercise('ex_supino_reto'), 4);
    startSession(w.id);
    var e = S.active.exercises[0];
    e.sets[0] = { peso: 40, reps: 15, desc: 1, tipo: 'a', done: true };  // aquecimento
    e.sets[1] = { peso: 50, reps: 5,  desc: 1, tipo: 'f', done: true };  // feeder
    e.sets[2] = { peso: 90, reps: 3,  desc: 1, tipo: 'p', done: true };  // PAP
    e.sets[3] = { peso: 80, reps: 10, desc: 1, tipo: 'v', done: true };  // válida
    saveNow(); 'ok';
  `);

  console.log('tipos de série:');
  ck(await ev("SET_TIPOS.map(t => t.id).join(',') === 'v,a,f,p'"),
    'quatro tipos disponíveis: válida, aquecimento, feeder, PAP');

  const st = await ev("JSON.stringify(sessionStats(S.active.exercises, 1800, 75))");
  const stats = JSON.parse(st);
  ck(stats.volume === 800, 'volume só da série válida: 80×10 = 800 (veio ' + stats.volume + ')');
  ck(stats.sets === 1, 'conta 1 série, não 4 (veio ' + stats.sets + ')');
  ck(stats.reps === 10, 'conta 10 reps, não 33 (veio ' + stats.reps + ')');

  await ev("openWorkout(S.workouts[0].id, 'session')");
  await sleep(600);
  await ev("openExercise(S.workouts[0].id, S.active.exercises[0].uid, true)");
  await sleep(600);
  const marcas = await ev("Array.from(currentScreen().el.querySelectorAll('.set-tipo')).map(x => x.textContent.trim()).join(',')");
  ck(marcas === 'A,F,P,1', 'marcadores na tela: A,F,P,1 (veio ' + marcas + ')');
  await shot('n1-tipos');

  /* ---------- conclui e confere o registro ---------- */
  await ev("var s = finishSession(); popToRoot(); currentScreen().refresh(); s.volume");
  ck(await ev("S.sessions[0].volume === 800"), 'registro salvo com volume 800');
  ck(await ev("S.sessions[0].exercises[0].sets.length === 4"),
    'as 4 séries ficam no histórico, mesmo sem contar nas estatísticas');

  /* ---------- séries por grupo ---------- */
  console.log('\nséries por grupo:');
  const peito = await ev("(seriesPorGrupo(inicioDaSemana()).find(g => g.grupo === 'Peito') || {}).series");
  ck(peito === 1, 'Peito com 1 série válida na semana (veio ' + peito + ')');
  ck(await ev('SERIES_MIN === 10 && SERIES_MAX === 20'), 'faixa de referência 10–20');
  await ev("popToRoot(); telaResumo();");
  await sleep(500);
  ck(await ev("currentScreen().el.querySelectorAll('.grupo-row').length > 0"), 'seção aparece na aba Resumo');
  /* o PAP de 90x3 é mais pesado que a válida de 80x10: não pode virar recorde */
  ck(await ev("currentScreen().el.textContent.includes('80 kg × 10')"),
    'recorde vem da série válida (80×10), não do PAP de 90 kg');
  ck(await ev("!currentScreen().el.textContent.includes('90 kg × 3')"),
    'PAP não aparece como recorde');
  await shot('n2-grupos');

  /* ---------- "última vez" ---------- */
  console.log('\núltima vez:');
  ck(await ev("ultimaExecucao('ex_supino_reto').sets.length === 1"),
    'última execução traz só a série válida');
  await ev("popToRoot(); abrirModulo('academia'); startSession(S.workouts[0].id);");
  await ev("openWorkout(S.workouts[0].id, 'session')"); await sleep(500);
  await ev("openExercise(S.workouts[0].id, S.active.exercises[0].uid, true)"); await sleep(600);
  ck(await ev('!!' + naTela('.prev-bar')), 'barra do treino anterior aparece');
  const ph = await ev("(currentScreen().el.querySelector('.set-row:last-of-type input[data-f=peso]') || {}).placeholder");
  ck(String(ph) === '80', 'campo da série válida sugere 80 kg do treino passado (veio ' + ph + ')');
  await shot('n3-ultima-vez');

  await ev(naTela('.prev-bar') + '.click()'); await sleep(500);
  const preenchido = await ev("S.active.exercises[0].sets.filter(x => tipoSet(x) === 'v')[0].peso");
  ck(preenchido === 80, 'botão Usar preenche a série válida com 80 (veio ' + preenchido + ')');

  /* ---------- recorde ---------- */
  console.log('\nrecorde:');
  ck(await ev("Math.round(melhorRM('ex_supino_reto')) === Math.round(80 * (1 + 10/30))"),
    'melhor 1RM estimado vem só das válidas');
  await ev(`
    var e = S.active.exercises[0];
    var v = e.sets.filter(x => tipoSet(x) === 'v')[0];
    v.peso = 100; v.reps = 10; checarRecorde(e, v); 'ok';
  `);
  await sleep(300);
  ck(await ev("!!document.querySelector('.toast') && document.querySelector('.toast').textContent.includes('Recorde')"),
    'avisa recorde ao superar a melhor marca');
  await shot('n4-recorde');
  await ev("cancelSession(); popToRoot(); currentScreen().refresh();");

  /* ---------- corrigir registro ---------- */
  console.log('\ncorrigir registro:');
  await ev("openSessionDetail(S.sessions[0].id)"); await sleep(600);
  await ev(naTela('[data-act=menu]') + '.click()'); await sleep(400);
  await ev("[...document.querySelectorAll('.backdrop')].pop()"
    + ".querySelectorAll('.sheet-item').forEach(b => { if (b.textContent.includes('Corrigir')) b.click(); })");
  await sleep(700);
  ck(await ev('!!' + naTela('[data-act=salvar]')), 'modo de correção abre');
  await ev(`
    var i = currentScreen().el.querySelectorAll('.set-row input[data-f=peso]');
    var alvo = i[i.length - 1];
    alvo.value = 100; alvo.dispatchEvent(new Event('change'));
    currentScreen().el.querySelector('[data-act=salvar]').click(); 'ok';
  `);
  await sleep(700);
  ck(await ev('S.sessions[0].volume === 1000'), 'volume recalculado para 100×10 = 1000 (veio ' + await ev('S.sessions[0].volume') + ')');
  await shot('n5-corrigido');

  /* ---------- backup ---------- */
  console.log('\nbackup:');
  ck(await ev('treinosDesdeBackup() === 1'), 'conta 1 treino desde o último backup');
  ck(await ev('BACKUP_A_CADA === 10'), 'lembra a cada 10 treinos');
  await ev('S.settings.lastBackup = 0; S.settings.backupAvisado = 0; saveNow(); lembrarBackup();');
  await sleep(400);
  ck(await ev("!document.querySelector('.backdrop')"), 'não incomoda com poucos treinos');
  await ev(`
    var base = S.sessions[0];
    for (var i = 0; i < 12; i++) S.sessions.push(Object.assign({}, base, { id: 'x' + i }));
    saveNow(); lembrarBackup(); 'ok';
  `);
  await sleep(500);
  ck(await ev("!!document.querySelector('.backdrop')"), 'oferece backup depois de 10 treinos');
  await shot('n6-backup');
  await ev(naFolha('[data-x=depois]') + '.click()'); await sleep(400);
  await ev('lembrarBackup();'); await sleep(400);
  ck(await ev("!document.querySelector('.backdrop')"), 'não repete o aviso na mesma semana');

  console.log('\nproblemas:', bad.length);
  bad.forEach((b) => console.log('  !', b));
  ws.close(); chrome.kill();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
