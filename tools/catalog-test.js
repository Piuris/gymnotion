/* Testa o catálogo consolidado (movimento + variação de equipamento), a foto
   que acompanha o aparelho, a migração dos dados antigos e a cor neutra fora do
   treino.  Uso: node tools/catalog-test.js [saida]   (GYM_URL opcional) */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const OUT = process.argv[2] || path.join(__dirname, '..', '__shots');
const BASE = (process.env.GYM_URL || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PORT = 9348;
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

  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1500);
  await ev('localStorage.clear()');
  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1700);

  console.log('catálogo consolidado:');
  const n = await ev('EXERCISES.length');
  ck(n >= 105, n + ' movimentos no catálogo');
  ck(await ev('EXERCISES.reduce(function (a, e) { return a + e.equips.length; }, 0) > 200'),
    'mais de 200 combinações de movimento e aparelho');
  /* Movimentos que SO existem numa maquina podem ter o aparelho no nome
     (Triceps na Maquina e outro exercicio, nao uma variacao do pulley). O que
     nao pode sobrar sao os duplicados que viraram variacao. */
  const redundantes = JSON.parse(await ev(`JSON.stringify([
    'Supino Reto com Halteres', 'Supino na Máquina', 'Supino no Smith',
    'Desenvolvimento com Barra', 'Desenvolvimento na Máquina',
    'Rosca Direta com Halteres', 'Rosca no Cabo', 'Encolhimento com Barra',
    'Agachamento no Smith', 'Coice no Cabo', 'Elevação Lateral na Máquina',
  ].filter(function (n) { return EXERCISES.some(function (e) { return e.nome === n; }); }))`));
  ck(redundantes.length === 0,
    'os nomes duplicados por aparelho sumiram' + (redundantes.length ? ': ' + redundantes.join(', ') : ''));
  const supino = JSON.parse(await ev("JSON.stringify(EXERCISES.filter(function (e) { return /^Supino/.test(e.nome); }).map(function (e) { return e.nome; }))"));
  ck(supino.length === 4, 'os supinos viraram 4 movimentos, não 7: ' + supino.join(', '));
  ck(await ev("findExercise('ex_supino_reto').equips.join(',') === 'Barra,Halteres,M\\u00e1quina,Smith'"),
    'Supino Reto oferece barra, halteres, máquina e Smith');
  ck(await ev("EQUIPAMENTOS.indexOf('Sem equipamento') === -1 && EQUIPAMENTOS.indexOf('Peso corporal') >= 0"),
    '"Sem equipamento" virou "Peso corporal"');

  console.log('\nfoto acompanha o aparelho:');
  ck(await ev("fotoDe('ex_supino_reto', 'Barra') === 'supino_reto'"), 'barra usa a foto padrão');
  ck(await ev("fotoDe('ex_supino_reto', 'Halteres') === 'supino_reto__halteres'"), 'halteres tem foto própria');
  ck(await ev("fotoDe('ex_supino_reto', 'M\\u00e1quina') === 'supino_reto__maquina'"), 'máquina tem foto própria');
  ck(await ev("fotoDe('ex_agachamento_hack', 'M\\u00e1quina') === 'agachamento_hack'"),
    'sem variação, cai na foto do movimento');
  ck(await ev("fotoDe('ex_burpee', 'Peso corporal') === null"), 'sem foto alguma, devolve null');
  ck(await ev("exThumb('ex_supino_reto', 'Peito', 'M\\u00e1quina').includes('supino_reto__maquina.webp')"),
    'a miniatura aponta para a variação');

  console.log('\ncorreções de imagem:');
  ck(await ev("!!findExercise('ex_abdominal_maquina')"), 'existe um Abdominal Máquina separado');
  ck(await ev("fotoDe('ex_abdominal_maquina', 'M\\u00e1quina') === 'abdominal_maquina'"),
    'com foto própria, não a do cabo');
  ck(await ev("fotoDe('ex_abdominal_na_polia', 'Cabo') === 'abdominal_na_polia'"),
    'o da polia é outro exercício, com outra foto');

  console.log('\nbiblioteca:');
  await ev("var w = newWorkout(); openLibrary(w.id, function () {});"); await sleep(900);
  ck(await ev("currentScreen().el.querySelectorAll('.exrow').length === EXERCISES.length"),
    'a lista mostra todos os movimentos');
  await shot('cat1-biblioteca');
  const troca = await ev(`(async () => {
    var linhas = currentScreen().el.querySelectorAll('.exrow');
    var alvo = null;
    linhas.forEach(function (l) {
      var t = l.querySelector('.exrow-name b');
      if (t && t.textContent.trim() === 'Supino Reto') alvo = l;
    });
    if (!alvo) return 'linha nao encontrada';
    var antes = alvo.querySelector('img').getAttribute('src');
    var sel = alvo.querySelector('select[data-f=equip]');
    sel.value = 'Halteres';
    sel.dispatchEvent(new Event('change'));
    var depois = alvo.querySelector('img').getAttribute('src');
    return antes + ' -> ' + depois;
  })()`);
  ck(String(troca).includes('supino_reto.webp -> img/supino_reto__halteres.webp'),
    'trocar o aparelho troca a foto na hora (' + troca + ')');
  const chipLib = await ev("getComputedStyle(currentScreen().el.querySelector('.chip.on')).color");
  ck(chipLib === 'rgb(255, 255, 255)', 'a biblioteca e catalogo, fica neutra (veio ' + chipLib + ')');
  await shot('cat2-troca-foto');
  await ev('popScreen();'); await sleep(400);

  console.log('\nmigração dos dados antigos:');
  const antigo = JSON.stringify({
    version: 1,
    workouts: [{
      id: 'w1', name: 'Antigo', color: '#A020F0', icon: 'halter', createdAt: 1,
      exercises: [
        { uid: 'a', exId: 'ex_supino_reto_com_halteres', nome: 'Supino Reto com Halteres', grupo: 'Peito', equip: 'Halteres', notas: '', sets: [{ peso: 30, reps: 10, desc: 1, tipo: 'v', done: false }] },
        { uid: 'b', exId: 'ex_abdominal_na_maquina', nome: 'Abdominal na Máquina', grupo: 'Abdômen', equip: 'Máquina', notas: '', sets: [{ peso: 20, reps: 15, desc: 1, tipo: 'v', done: false }] },
        { uid: 'c', exId: 'ex_flexao_de_braco', nome: 'Flexão de Braço', grupo: 'Peito', equip: 'Sem equipamento', notas: '', sets: [{ peso: 0, reps: 20, desc: 1, tipo: 'v', done: false }] },
      ],
    }],
    sessions: [], customExercises: [], settings: { bodyweight: 75, restDefault: 1, tema: 'preto' }, active: null,
  });
  await ev(`localStorage.setItem('gymnotion.v1', ${JSON.stringify(antigo)});`);
  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1700);
  /* a v2 sobe direto para a v3 ao carregar; o que importa aqui e que a
     remontagem do catalogo continuou valendo no caminho */
  ck(await ev('S.version === 3'), 'o estado antigo foi migrado ate a v3');
  ck(await ev("S.workouts[0].exercises[0].exId === 'ex_supino_reto'"), 'o exId antigo foi reapontado');
  ck(await ev("S.workouts[0].exercises[0].equip === 'Halteres'"), 'o aparelho virou variação');
  ck(await ev("S.workouts[0].exercises[0].nome === 'Supino Reto'"), 'o nome perdeu o sufixo do aparelho');
  ck(await ev('S.workouts[0].exercises[0].sets[0].peso === 30'), 'as cargas anotadas sobreviveram');
  ck(await ev("S.workouts[0].exercises[1].exId === 'ex_abdominal_maquina'"), 'Abdominal na Máquina foi para o movimento certo');
  ck(await ev("S.workouts[0].exercises[2].equip === 'Peso corporal'"), '"Sem equipamento" foi renomeado');
  ck(await ev("!!findExercise(S.workouts[0].exercises[0].exId)"), 'todo exId migrado existe no catálogo');

  console.log('\ncor neutra fora do treino:');
  await ev("popToRoot(); abrirModulo('academia');"); await sleep(400);
  const fab = await ev("getComputedStyle(currentScreen().el.querySelector('.streak svg')).fill");
  ck(fab === 'rgb(255, 255, 255)', 'a chama da ofensiva é branca (veio ' + fab + ')');
  ck(await ev("contextAccent() === '#FFFFFF'"), 'o acento padrão é branco');
  await shot('cat3-treinos-neutro');

  await ev("openWorkout(S.workouts[0].id, 'view')"); await sleep(600);
  const dentro = await ev("getComputedStyle(currentScreen().el.querySelector('.pill-btn')).backgroundColor");
  ck(dentro === 'rgb(160, 32, 240)', 'dentro do treino volta a cor do treino (veio ' + dentro + ')');
  await shot('cat4-dentro-do-treino');
  await ev('popScreen();'); await sleep(400);

  await ev("S.settings.tema = 'claro'; aplicarTema('claro'); popToRoot(); abrirModulo('academia');");
  await sleep(400);
  const claro = await ev("getComputedStyle(currentScreen().el.querySelector('.streak svg')).fill");
  ck(claro !== 'rgb(255, 255, 255)', 'no tema claro o neutro escurece, senão sumiria (veio ' + claro + ')');
  await ev("S.settings.tema = 'preto'; aplicarTema('preto');");

  console.log('\nproblemas:', bad.length);
  bad.forEach((b) => console.log('  !', b));
  ws.close(); chrome.kill();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
