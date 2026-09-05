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

  console.log('');
  console.log('calculadora:');
  await ev("openExercise(S.workouts[0].id, S.workouts[0].exercises[0].uid, false)"); await sleep(700);
  ck(await ev("!!currentScreen().el.querySelector('.calc-abrir')"), 'o atalho aparece na tela do exercício');
  ck(await ev('pesoDeTrabalho(S.workouts[0].exercises[0]) === 100'),
    'a carga de trabalho sai da maior série válida');

  ck(await ev('JSON.stringify(escalonar(100, FAIXA_AQUECIMENTO, 1)) === "[42.5]"'),
    'o aquecimento usa o meio da faixa: 42,5 kg de 100');
  ck(await ev('JSON.stringify(escalonar(100, FAIXA_FEEDER, 1)) === "[67.5]"'),
    'o feeder fica em 67,5 kg (meio de 60–75%)');
  ck(await ev('JSON.stringify(escalonar(100, [1, 1], 1)) === "[100]"'),
    'e o PAP sobe com a carga de trabalho inteira');
  ck(await ev('arredondaCarga(43.3) === 42.5 && arredondaCarga(44) === 45'),
    'as cargas caem no múltiplo de 2,5 mais próximo');

  await ev("currentScreen().el.querySelector('.calc-abrir').click()"); await sleep(600);
  ck(await ev("!!" + naFolha('.calc-linhas')), 'a folha abre');
  ck(await ev(naFolha('input') + '.value === "100"'), 'já vem com a carga de trabalho');
  ck(await ev("document.querySelectorAll('.sheet [data-modo]').length === 2"),
    'com dois modos, e só dois');
  const nomes = await ev(`Array.from(document.querySelectorAll('.sheet [data-modo]')).map(function (b) { return b.textContent; }).join(' | ')`);
  ck(nomes === 'Completo | Feeder + PAP', 'chamados Completo e Feeder + PAP (' + nomes + ')');
  ck(await ev("document.querySelector('.sheet [data-modo=completo]').classList.contains('on')"),
    'o exercício já tem aquecimento marcado, então abre no Completo');

  const linhas = await ev(naFolha('.calc-linhas') + '.textContent.replace(/\\s+/g, " ").trim()');
  ck(linhas.indexOf('Aquecimento') >= 0 && linhas.indexOf('Feeder') >= 0 && linhas.indexOf('PAP') >= 0,
    'o Completo mostra as três partes: ' + linhas);
  ck(linhas.indexOf('12 reps') >= 0 && linhas.indexOf('5 reps') >= 0 && linhas.indexOf('1 rep') >= 0,
    'com 12, 5 e 1 repetição');
  ck(linhas.indexOf('42,5 kg') >= 0 && linhas.indexOf('67,5 kg') >= 0 && linhas.indexOf('100 kg') >= 0,
    'e as cargas de cada uma');
  ck(linhas.indexOf('carga de trabalho') >= 0,
    'dizendo que o PAP usa a carga de trabalho, não uma faixa');
  await shot('k2-calculadora');

  await ev(naFolha('[data-x=aplicar]') + '.click()'); await sleep(800);
  const sets = JSON.parse(await ev(`JSON.stringify(S.workouts[0].exercises[0].sets.map(function (x) {
    return tipoSet(x) + ':' + x.peso + 'x' + x.reps;
  }))`));
  ck(sets.length === 5, 'ficam 3 de preparação mais as 2 válidas (' + sets.length + ')');
  ck(sets[0] === 'a:42.5x12', 'o aquecimento sai em 42,5 kg por 12 (' + sets[0] + ')');
  ck(sets[1] === 'f:67.5x5', 'o feeder em 67,5 kg por 5 (' + sets[1] + ')');
  ck(sets[2] === 'p:100x1', 'o PAP na carga de trabalho por 1 (' + sets[2] + ')');
  ck(sets[3].indexOf('v:100') === 0 && sets[4].indexOf('v:100') === 0,
    'as válidas continuam intactas no fim');
  await shot('k3-completo');

  console.log('');
  console.log('modo curto:');
  await ev("currentScreen().el.querySelector('.calc-abrir').click()"); await sleep(600);
  await ev("document.querySelector('.sheet [data-modo=fp]').click()"); await sleep(500);
  ck(await ev("document.querySelectorAll('.sheet .calc-linha').length === 2"),
    'o Feeder + PAP mostra só duas partes');
  ck(await ev(naFolha('.calc-linhas') + ".textContent.indexOf('Aquecimento') < 0"),
    'sem o aquecimento');
  ck(await ev(naFolha('.calc-nota') + ".textContent.indexOf('tira 1') >= 0"),
    'e a nota avisa que vai tirar a série de aquecimento que existe');

  await ev(naFolha('[data-x=aplicar]') + '.click()'); await sleep(800);
  const curto = JSON.parse(await ev(`JSON.stringify(S.workouts[0].exercises[0].sets.map(function (x) {
    return tipoSet(x) + ':' + x.peso + 'x' + x.reps;
  }))`));
  ck(curto.length === 4, 'sobram 2 de preparação e as 2 válidas (' + curto.length + ')');
  ck(curto[0] === 'f:67.5x5' && curto[1] === 'p:100x1',
    'na ordem feeder, PAP: ' + curto.slice(0, 2).join(' '));
  ck(!curto.some(function (x) { return x.indexOf('a:') === 0; }),
    'o aquecimento foi removido junto, porque não faz parte da receita escolhida');

  /* voltar ao completo tem de trazer o aquecimento de volta */
  await ev("currentScreen().el.querySelector('.calc-abrir').click()"); await sleep(600);
  ck(await ev("document.querySelector('.sheet [data-modo=fp]').classList.contains('on')"),
    'sem aquecimento, a folha reabre no modo curto');
  await ev("document.querySelector('.sheet [data-modo=completo]').click()"); await sleep(500);
  await ev(naFolha('[data-x=aplicar]') + '.click()'); await sleep(800);
  ck(await ev("contaTipo(S.workouts[0].exercises[0], 'a') === 1"),
    'voltar ao Completo recria o aquecimento');

  console.log('');
  console.log('exercicio so com series validas:');
  await ev(`
    popToRoot();
    var ex = findExercise('ex_agachamento_livre');
    var we = addExerciseToWorkout(S.workouts[0].id, ex, 3);
    we.sets.forEach(function (st) { st.peso = 80; st.reps = 8; });
    saveNow();
    openExercise(S.workouts[0].id, we.uid, false);
    'ok';
  `);
  await sleep(700);
  const idx = await ev('S.workouts[0].exercises.length - 1');
  const oEx = () => `S.workouts[0].exercises[${idx}]`;
  ck(await ev(`${oEx()}.sets.every(function (x) { return tipoSet(x) === 'v'; })`),
    'o exercicio comeca sem nenhuma serie de preparacao');

  await ev("currentScreen().el.querySelector('.calc-abrir').click()"); await sleep(600);
  ck(await ev(naFolha('[data-x=aplicar]') + '.disabled === false'),
    'o botao ja nasce clicavel, em vez de morto');
  ck(await ev("document.querySelector('.sheet [data-modo=completo]').classList.contains('on')"),
    'e comeca no Completo');
  ck(await ev(naFolha('.calc-nota') + ".textContent.indexOf('cria 3') >= 0"),
    'avisando que vai criar as tres');
  await shot('k4-so-validas');

  await ev(naFolha('[data-x=aplicar]') + '.click()'); await sleep(800);
  const criados = JSON.parse(await ev(`JSON.stringify(${oEx()}.sets.map(function (x) {
    return tipoSet(x) + ':' + x.peso + 'x' + x.reps;
  }))`));
  ck(criados.length === 6, 'aplicar cria as 3 (ficou com ' + criados.length + ')');
  ck(criados[0] === 'a:35x12', 'com 80 kg, o aquecimento sai em 35 kg por 12 (' + criados[0] + ')');
  ck(criados[1] === 'f:55x5', 'o feeder em 55 kg por 5 (' + criados[1] + ')');
  ck(criados[2] === 'p:80x1', 'e o PAP nos 80 da carga de trabalho (' + criados[2] + ')');
  ck(criados.slice(3).every(function (x) { return x === 'v:80x8'; }),
    'as validas continuam intactas');

  /* a folha veste a cor do treino, e nao o neutro da raiz */
  await ev("currentScreen().el.querySelector('.calc-abrir').click()"); await sleep(600);
  const corFolha = await ev(`getComputedStyle(document.querySelector('.sheet .calc-val')).color`);
  ck(corFolha.indexOf('rgb(255, 255, 255)') < 0,
    'as cargas saem na cor do treino, nao no neutro (' + corFolha + ')');
  await ev(naFolha('[data-x=fechar]') + '.click()'); await sleep(400);

  /* no meio do treino, a ordem nao pode ser remexida */
  await ev(`${oEx()}.sets[5].done = true; saveNow(); currentScreen().refresh();`);
  await sleep(400);
  await ev("currentScreen().el.querySelector('.calc-abrir').click()"); await sleep(600);
  await ev("document.querySelector('.sheet [data-modo=fp]').click()"); await sleep(400);
  await ev(naFolha('[data-x=aplicar]') + '.click()'); await sleep(800);
  ck(await ev(`${oEx()}.sets.some(function (x) { return x.done; })`),
    'com serie ja marcada, o que foi feito continua marcado');
  ck(await ev(`contaTipo(${oEx()}, 'a') === 0`), 'e o aquecimento saiu mesmo assim');

  console.log('');
  console.log('sem carga anotada:');
  await ev(`
    ${oEx()}.sets.forEach(function (x) { x.peso = 0; x.done = false; });
    saveNow(); currentScreen().refresh(); 'ok';
  `);
  await sleep(400);
  ck(await ev(`pesoDeTrabalho(${oEx()}) === 0`),
    'sem carga e sem histórico, a referência é zero');
  await ev("currentScreen().el.querySelector('.calc-abrir').click()"); await sleep(600);
  ck(await ev(naFolha('[data-x=aplicar]') + '.disabled === true'),
    'e o botão de aplicar fica desligado, em vez de gravar zeros');
  ck(await ev(naFolha('.calc-linhas') + ".textContent.indexOf('—') >= 0"),
    'mostrando travessão no lugar dos valores');
  await ev(naFolha('[data-x=fechar]') + '.click()'); await sleep(400);

  console.log('\nproblemas:', bad.length);
  bad.forEach((b) => console.log('  !', b));
  ws.close(); chrome.kill();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
