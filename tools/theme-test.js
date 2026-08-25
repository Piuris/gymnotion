/* Testa a tela de login e a troca de tema, e fotografa os 5 temas.
   Uso: node tools/theme-test.js [pasta-de-saida]   (GYM_URL opcional) */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const OUT = process.argv[2] || path.join(__dirname, '..', '__shots');
const BASE = (process.env.GYM_URL || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PORT = 9346;
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
  await sleep(1400);
  await ev('localStorage.clear()');
  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1600);

  /* dados para os temas terem o que mostrar */
  await ev(`
    var w = newWorkout(); w.name = 'Pull'; w.color = '#A020F0'; w.icon = 'kettle';
    addExerciseToWorkout(w.id, findExercise('ex_puxada_frontal'), 3);
    addExerciseToWorkout(w.id, findExercise('ex_remada_sentada'), 3);
    startSession(w.id);
    S.active.exercises.forEach(function (e) {
      e.sets.forEach(function (s) { s.peso = 60; s.reps = 10; s.done = true; });
    });
    finishSession();
    popToRoot(); currentScreen().refresh(); 'ok';
  `);

  console.log('temas:');
  ck(await ev('TEMAS.length === 5'), 'cinco temas disponíveis');
  ck(await ev("S.settings.tema === 'preto'"), 'padrão é Preto');
  ck(await ev('!document.documentElement.dataset.tema'),
    'tema padrão não põe atributo no html');

  for (const t of ['preto', 'grafite', 'meia-noite', 'sepia', 'claro']) {
    await ev(`S.settings.tema = '${t}'; saveNow(); aplicarTema('${t}'); popToRoot(); currentScreen().refresh();`);
    await sleep(350);
    const fundo = await ev('getComputedStyle(document.body).backgroundColor');
    const texto = await ev('getComputedStyle(document.body).color');
    console.log('    %-11s fundo %-20s texto %s', t, fundo, texto);
    await shot('tema-' + t);
  }

  /* o acento do treino tem de sobreviver à troca de tema */
  await ev("S.settings.tema = 'claro'; aplicarTema('claro'); popToRoot(); currentScreen().refresh();");
  await sleep(300);
  const acento = await ev("getComputedStyle(currentScreen().el.querySelector('.fab')).backgroundColor");
  ck(acento === 'rgb(28, 28, 30)',
    'fora do treino o detalhe e neutro, e no tema claro ele escurece (veio ' + acento + ')');
  await ev("openWorkout(S.workouts[0].id, 'view')"); await sleep(500);
  const dentro = await ev("getComputedStyle(currentScreen().el.querySelector('.pill-btn')).backgroundColor");
  ck(dentro === 'rgb(160, 32, 240)',
    'dentro do treino a cor do treino manda, mesmo no tema claro (veio ' + dentro + ')');
  await ev('popScreen();'); await sleep(400);
  const fundoClaro = await ev('getComputedStyle(document.body).backgroundColor');
  ck(fundoClaro === 'rgb(242, 242, 247)', 'tema claro aplica fundo claro (' + fundoClaro + ')');
  const txtClaro = await ev('getComputedStyle(document.body).color');
  ck(txtClaro === 'rgb(10, 10, 12)', 'tema claro escurece o texto (' + txtClaro + ')');
  ck(await ev("getComputedStyle(document.documentElement).getPropertyValue('--fill-1').includes('0, 0, 0')"),
    'camadas neutras invertem no tema claro');

  await ev("S.settings.tema = 'preto'; saveNow(); aplicarTema('preto');");

  console.log('\ntela de temas:');
  await ev("TAB = 'perfil'; popToRoot(); currentScreen().refresh();"); await sleep(350);
  ck(await ev("currentScreen().el.textContent.includes('Tema')"), 'entrada Tema aparece no Perfil');
  await ev("telaTemas(currentScreen())"); await sleep(450);
  ck(await ev("currentScreen().el.querySelectorAll('.tema-row').length === 5"), 'lista os 5 temas');
  await shot('escolha-tema');
  await ev("currentScreen().el.querySelectorAll('.tema-row')[1].click()"); await sleep(350);
  ck(await ev("S.settings.tema === 'grafite'"), 'tocar troca o tema na hora');
  ck(await ev("document.documentElement.dataset.tema === 'grafite'"), 'atributo aplicado no html');
  ck(await ev("JSON.parse(localStorage.getItem('gymnotion.v1')).settings.tema === 'grafite'"),
    'escolha persiste');
  await ev("S.settings.tema = 'preto'; saveNow(); aplicarTema('preto'); popScreen();"); await sleep(400);

  console.log('\ntela de login:');
  await ev("FIREBASE.apiKey = 'k'; FIREBASE.projectId = 'p';");
  await ev("TAB = 'perfil'; popToRoot(); currentScreen().refresh();"); await sleep(350);
  await ev("telaLogin(currentScreen())"); await sleep(500);
  ck(await ev("!!currentScreen().el.querySelector('#lg-email')"), 'campo de e-mail presente');
  ck(await ev("!!currentScreen().el.querySelector('#lg-senha')"), 'campo de senha presente');
  ck(await ev("currentScreen().el.querySelector('h1').textContent.trim() === 'Entrar'"),
    'abre no modo Entrar');
  ck(await ev("currentScreen().el.textContent.includes('Agora não')"),
    'oferece continuar sem conta');
  await shot('login-entrar');

  await ev("currentScreen().el.querySelector('[data-act=alternar]').click()"); await sleep(400);
  ck(await ev("currentScreen().el.querySelector('h1').textContent.trim() === 'Criar conta'"),
    'alterna para Criar conta');
  ck(await ev("currentScreen().el.querySelector('#lg-senha').getAttribute('autocomplete') === 'new-password'"),
    'senha nova pede autocomplete correto');
  await shot('login-criar');

  ck(await ev("currentScreen().el.querySelector('[data-act=ok]').textContent.trim() === 'Criar conta'"),
    'botão principal acompanha o modo');
  await ev("currentScreen().el.querySelector('[data-act=pular]').click()"); await sleep(450);
  ck(await ev("currentScreen().name === 'root'"), 'Agora não volta sem criar conta');

  console.log('\naparelho novo:');
  await ev("S.workouts = []; S.sessions = []; saveNow(); TAB = 'treinos'; popToRoot(); currentScreen().refresh();");
  await sleep(400);
  ck(await ev("currentScreen().el.textContent.includes('Já tenho conta')"),
    'tela vazia oferece restaurar de uma conta');
  await shot('vazio-com-conta');

  console.log('\nproblemas:', bad.length);
  bad.forEach((b) => console.log('  !', b));
  ws.close(); chrome.kill();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
