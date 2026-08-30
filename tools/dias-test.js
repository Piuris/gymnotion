/* Testa a navegação por dia na aba Treinos: dia sem treino mostra os treinos
   disponíveis, dia com treino mostra os números e o registro.
   Uso: node tools/dias-test.js [saida]   (GYM_URL opcional) */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const OUT = process.argv[2] || path.join(__dirname, '..', '__shots');
const BASE = (process.env.GYM_URL || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PORT = 9353;
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
  const tela = () => 'currentScreen().el';

  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1500);
  await ev('localStorage.clear()');
  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1700);

  /* três treinos montados e um registro de dois dias atrás */
  await ev(`
    [['Pull', '#A020F0', 'ex_puxada_frontal'],
     ['Push', '#FF5A1E', 'ex_supino_reto'],
     ['Legs', '#22E04A', 'ex_agachamento_livre']].forEach(function (t) {
      var w = newWorkout(); w.name = t[0]; w.color = t[1];
      addExerciseToWorkout(w.id, findExercise(t[2]), 3);
    });
    startSession(S.workouts[0].id);
    S.active.exercises.forEach(function (e) {
      e.sets.forEach(function (s) { s.peso = 60; s.reps = 10; s.done = true; });
    });
    var s = finishSession();
    s.date = Date.now() - 2 * 86400000;
    saveNow(); DIA_SEL = Date.now(); popToRoot(); currentScreen().refresh(); 'ok';
  `);
  await sleep(500);

  console.log('hoje, sem treino:');
  ck(await ev(`${tela()}.textContent.includes('Treinos disponíveis')`),
    'mostra os treinos disponíveis');
  ck(await ev(`${tela()}.querySelectorAll('.folders .folder').length === 3`),
    'os 3 treinos aparecem como pastas');
  ck(await ev(`!${tela()}.querySelector('.rings')`), 'sem gráficos num dia sem treino');
  ck(await ev(`!!${tela()}.querySelector('.descanso-aviso')`), 'avisa sobre a meta da semana');
  ck(await ev(`!${tela()}.querySelector('.voltar-hoje')`), 'sem atalho de volta, porque já é hoje');
  await shot('d1-hoje-sem-treino');

  console.log('\nnavegar para um dia com treino:');
  await ev('DIA_SEL = Date.now() - 2 * 86400000; currentScreen().refresh();'); await sleep(500);
  ck(await ev(`!!${tela()}.querySelector('.rings')`), 'o dia com treino mostra os gráficos');
  ck(await ev(`${tela()}.querySelectorAll('.sess').length === 1`), 'e o registro daquele dia');
  ck(await ev(`!${tela()}.querySelector('.folders')`), 'sem a grade de treinos disponíveis');
  ck(await ev(`!!${tela()}.querySelector('.voltar-hoje')`), 'aparece o atalho para voltar a hoje');
  await shot('d2-dia-com-treino');

  const numeros = await ev(`(function () {
    var v = [];
    ${tela()}.querySelectorAll('.ring-val').forEach(function (r) { v.push(r.textContent.trim()); });
    return v.join(',');
  })()`);
  const esperado = await ev(`(function () {
    var s = sessionsOn(DIA_SEL)[0];
    return [fmtNum(s.calorias), fmtNum(s.volume), String(s.sets), String(s.reps)].join(',');
  })()`);
  ck(numeros === esperado,
    'os números são do dia navegado (' + numeros + '), batendo com o registro (' + esperado + ')');
  const deHoje = await ev("sessionsOn(Date.now()).length");
  ck(deHoje === 0, 'e hoje não tem registro nenhum, provando que não são os de hoje');

  console.log('\nmarcador do dia:');
  ck(await ev(`${tela()}.querySelectorAll('.day.sel').length === 1`), 'um dia selecionado por vez');
  /* O anel só existe se hoje estiver na semana exibida — num domingo, um dia
     anterior cai na semana passada e hoje nem aparece. Deriva da semana em
     vez de presumir. */
  const hojeNaFaixa = await ev('inicioDaSemana(DIA_SEL) === inicioDaSemana(Date.now())');
  const anel = await ev(`${tela()}.querySelectorAll('.day.hoje').length`);
  ck(anel === (hojeNaFaixa ? 1 : 0),
    hojeNaFaixa
      ? 'hoje ganha o anel quando não é o selecionado'
      : 'a semana exibida é anterior, então não há anel de hoje nela');
  ck(await ev(`${tela()}.querySelector('.day.sel .num').textContent.trim() === String(new Date(DIA_SEL).getDate())`),
    'o dia aceso é o selecionado');
  ck(await ev(`${tela()}.querySelectorAll('.day.has').length === 1`), 'o dia com treino tem o ponto');

  console.log('\ntocar num dia:');
  const alvoDia = await ev(`(function () {
    var dias = ${tela()}.querySelectorAll('.day:not(.futuro)');
    var d = dias[dias.length - 1];
    var n = d.querySelector('.num').textContent.trim();
    d.click();
    return n;
  })()`);
  await sleep(500);
  ck(await ev(`${tela()}.querySelector('.day.sel .num').textContent.trim() === '${alvoDia}'`),
    'tocar seleciona o dia ' + alvoDia);

  console.log('\ndias futuros:');
  const futuros = await ev(`${tela()}.querySelectorAll('.day.futuro').length`);
  const esperadoFuturo = await ev(`(function () {
    var ini = inicioDaSemana(DIA_SEL);
    var n = 0;
    for (var i = 0; i < 7; i++) {
      var d = new Date(ini); d.setDate(d.getDate() + i);
      if (d.getTime() > Date.now() && dayKey(d.getTime()) !== dayKey(Date.now())) n += 1;
    }
    return n;
  })()`);
  ck(futuros === esperadoFuturo,
    'os ' + futuros + ' dias depois de hoje na semana exibida ficam fora de alcance');
  ck(await ev(`getComputedStyle(${tela()}.querySelector('.day.futuro') || document.body).pointerEvents === 'none' || ${futuros} === 0`),
    'e não respondem ao toque');

  console.log('\nvoltar para hoje:');
  await ev('DIA_SEL = Date.now() - 3 * 86400000; currentScreen().refresh();'); await sleep(400);
  await ev(`${tela()}.querySelector('.voltar-hoje').click()`); await sleep(450);
  ck(await ev('dayKey(DIA_SEL) === dayKey(Date.now())'), 'o atalho devolve para hoje');
  ck(await ev(`!${tela()}.querySelector('.voltar-hoje')`), 'e o atalho some');

  console.log('\nhistórico completo:');
  ck(await ev(`${tela()}.textContent.includes('Todos os registros')`), 'há um caminho para a lista inteira');
  await ev(`${tela()}.querySelectorAll('.ex-item').forEach(function (b) {
    if (b.textContent.includes('Todos os registros')) b.click();
  })`);
  await sleep(600);
  ck(await ev("currentScreen().name === 'historico'"), 'abre a tela de registros');
  ck(await ev(`${tela()}.querySelectorAll('.sess').length === 1`), 'com todos os registros');
  await shot('d3-historico');
  await ev('popScreen();'); await sleep(400);

  console.log('descanso automatico:');

  /* hoje ainda pode virar treino: nao e chamado de descanso nem marcado */
  await ev('DIA_SEL = Date.now(); currentScreen().refresh();'); await sleep(400);
  ck(await ev(`!${tela()}.querySelector('.day.sel.descanso')`),
    'hoje nao aparece como descanso, porque o dia ainda nao acabou');
  ck(await ev(`${tela()}.querySelectorAll('.day.futuro.descanso').length === 0`),
    'e nenhum dia futuro aparece como descanso');
  const avisoHoje = await ev(`${tela()}.querySelector('.descanso-aviso').textContent.trim()`);
  ck(avisoHoje.indexOf('descanso') < 0,
    'o aviso de hoje olha para a frente: ' + JSON.stringify(avisoHoje));
  ck(avisoHoje.indexOf('semana') >= 0, 'e fala da meta da semana');
  await shot('d4-hoje');

  /* Um dia passado so vira descanso se a semana dele bateu a meta. Aqui a
     semana anterior tem um treino so, entao ela NAO cobre. */
  await ev('DIA_SEL = Date.now() - 86400000; currentScreen().refresh();'); await sleep(400);
  const semanaDoDia = await ev('treinosNaSemana(inicioDaSemana(DIA_SEL))');
  ck(await ev('!ehDescanso(DIA_SEL)'),
    'com ' + semanaDoDia + ' treino(s) na semana e meta 2, o dia nao vira descanso');
  ck(await ev(`!${tela()}.querySelector('.day.sel.descanso')`),
    'e a faixa nao o marca');
  const avisoFraco = await ev(`${tela()}.querySelector('.descanso-aviso').textContent.trim()`);
  ck(avisoFraco.indexOf('cai aqui') >= 0,
    'o aviso diz que a ofensiva cai ali: ' + JSON.stringify(avisoFraco));
  ck(await ev(`${tela()}.querySelector('.descanso-aviso').classList.contains('alerta')`),
    'e o aviso fica em tom de alerta');
  ck(await ev(`!${tela()}.querySelector('.descanso-btn')`),
    'nao ha botao de marcar descanso');
  await shot('d5-semana-abaixo-da-meta');

  /* com a semana batendo a meta, o mesmo dia passa a ser descanso coberto */
  await ev(`
    var molde = S.sessions[0];
    var s = JSON.parse(JSON.stringify(molde));
    s.id = 'extra';
    s.date = inicioDaSemana(DIA_SEL) + 86400000;   /* segunda daquela semana */
    S.sessions.push(s);
    S.sessions.sort(function (a, b) { return b.date - a.date; });
    saveNow(); currentScreen().refresh(); 'ok';
  `);
  await sleep(400);
  ck(await ev('treinosNaSemana(inicioDaSemana(DIA_SEL)) >= 2'), 'a semana passa a ter 2 treinos');
  ck(await ev('ehDescanso(DIA_SEL)'),
    'e o dia vazio vira descanso sozinho, sem ninguem marcar');
  ck(await ev(`!!${tela()}.querySelector('.day.sel.descanso')`),
    'a faixa passa a marca-lo');
  const avisoOk = await ev(`${tela()}.querySelector('.descanso-aviso').textContent.trim()`);
  ck(avisoOk.indexOf('Dia de descanso') >= 0 && avisoOk.indexOf('segue') >= 0,
    'com o aviso certo: ' + JSON.stringify(avisoOk));
  await shot('d6-descanso-coberto');
  await ev("S.sessions = S.sessions.filter(function (x) { return x.id !== 'extra'; }); saveNow();");

  /* o dia com treino nao e descanso */
  await ev('DIA_SEL = Date.now() - 2 * 86400000; currentScreen().refresh();'); await sleep(400);
  ck(await ev('!ehDescanso(DIA_SEL)'), 'um dia com treino nao conta como descanso');
  ck(await ev(`!${tela()}.querySelector('.day.sel.descanso')`),
    'e nao aparece marcado na faixa');
  await ev('DIA_SEL = Date.now(); currentScreen().refresh();'); await sleep(300);


  console.log('\nproblemas:', bad.length);
  bad.forEach((b) => console.log('  !', b));
  ws.close(); chrome.kill();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
