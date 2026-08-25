/* Testa o backup na nuvem sem tocar num projeto Firebase real: troca o fetch por
   um servidor falso e confere cada requisição — URL, método, cabeçalhos e corpo.
   Também verifica o ciclo completo compactar → enviar → baixar → restaurar.

   Uso: node tools/cloud-test.js [pasta-de-saida]   (GYM_URL opcional) */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const OUT = process.argv[2] || path.join(__dirname, '..', '__shots');
const BASE = (process.env.GYM_URL || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PORT = 9343;
const PROFILE = path.join(os.tmpdir(), 'gymnotion-chrome');

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find((p) => fs.existsSync(p));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Servidor falso do Firebase, injetado na página no lugar do fetch. */
const MOCK = `
window.__req = [];
window.__doc = null;
const fetchReal = window.fetch;
window.fetch = async (url, opts) => {
  url = String(url); opts = opts || {};
  const corpo = opts.body && typeof opts.body === 'string' ? opts.body : '';
  window.__req.push({ url, metodo: opts.metodo || opts.method || 'GET', corpo,
    auth: (opts.headers || {}).Authorization || '' });

  const ok = (o) => new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } });
  const erro = (cod, msg) => new Response(JSON.stringify({ error: { message: msg } }),
    { status: cod, headers: { 'Content-Type': 'application/json' } });

  if (url.includes('accounts:signUp')) {
    if (JSON.parse(corpo).email === 'existe@x.com') return erro(400, 'EMAIL_EXISTS');
    return ok({ idToken: 'tok1', refreshToken: 'ref1', localId: 'uid123', email: JSON.parse(corpo).email, expiresIn: '3600' });
  }
  if (url.includes('accounts:signInWithPassword')) {
    if (JSON.parse(corpo).password === 'errada') return erro(400, 'INVALID_LOGIN_CREDENTIALS');
    return ok({ idToken: 'tok1', refreshToken: 'ref1', localId: 'uid123', email: JSON.parse(corpo).email, expiresIn: '3600' });
  }
  if (url.includes('securetoken.googleapis.com')) {
    return ok({ id_token: 'tok2', refresh_token: 'ref2', user_id: 'uid123', expires_in: '3600' });
  }
  if (url.includes('firestore.googleapis.com')) {
    if ((opts.method || 'GET') === 'PATCH') { window.__doc = JSON.parse(corpo); return ok(window.__doc); }
    if (!window.__doc) return new Response(JSON.stringify({}), { status: 404 });
    return ok(window.__doc);
  }
  return fetchReal(url, opts);
};
'mock instalado';
`;

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
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      bad.push('error: ' + m.params.args.map((a) => a.description || a.value).join(' '));
    }
  };
  const send = (metodo, params) => new Promise((resolve, reject) => {
    const i = ++id; pend.set(i, { resolve, reject });
    ws.send(JSON.stringify({ id: i, method: metodo, params: params || {} }));
  });
  await send('Runtime.enable'); await send('Page.enable');
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
    await sleep(400);
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

  console.log('sem configuração:');
  ck(await ev('cloudConfigurado() === false'), 'nuvem desligada quando as chaves estão vazias');
  await ev("TAB = 'perfil'; popToRoot(); currentScreen().refresh();"); await sleep(400);
  ck(await ev("!currentScreen().el.textContent.includes('Entrar ou criar conta')"),
    'seção Conta não aparece sem configuração');

  /* liga a configuração e o servidor falso */
  await ev("FIREBASE.apiKey = 'chave-de-teste'; FIREBASE.projectId = 'projeto-de-teste'; 'ok'");
  await ev(MOCK);
  await ev("popToRoot(); currentScreen().refresh();"); await sleep(400);

  console.log('\nconfigurado:');
  ck(await ev('cloudConfigurado() === true'), 'nuvem liga com as chaves preenchidas');
  ck(await ev("currentScreen().el.textContent.includes('Entrar ou criar conta')"),
    'seção Conta aparece na aba Perfil');
  await shot('c1-perfil-deslogado');

  console.log('\nerros traduzidos:');
  ck(await ev("cloudEntrar('existe@x.com', 'segredo123', true).then(() => 'sem erro', e => e.message)")
    === 'Esse e-mail já tem conta. Use "Entrar".', 'e-mail já cadastrado');
  ck(await ev("cloudEntrar('a@b.com', 'errada', false).then(() => 'sem erro', e => e.message)")
    === 'E-mail ou senha incorretos.', 'senha errada');

  console.log('\nentrar:');
  await ev("cloudEntrar('eu@exemplo.com', 'segredo123', false)");
  ck(await ev("cloudLogado() && CLOUD.uid === 'uid123'"), 'sessão guardada após entrar');
  ck(await ev("JSON.parse(localStorage.getItem('gymnotion.cloud')).refreshToken === 'ref1'"),
    'refreshToken persiste para a próxima abertura');
  const reqEntrar = await ev("JSON.stringify(window.__req[window.__req.length - 1])");
  const re = JSON.parse(reqEntrar);
  ck(re.url.includes('accounts:signInWithPassword') && re.url.includes('key=chave-de-teste'),
    'chama signInWithPassword com a chave do projeto');
  ck(JSON.parse(re.corpo).returnSecureToken === true, 'pede returnSecureToken');

  console.log('\nenviar:');
  await ev(`
    var w = newWorkout(); w.name = 'Nuvem';
    addExerciseToWorkout(w.id, findExercise('ex_agachamento_livre'), 3);
    saveNow(); 'ok';
  `);
  const envio = JSON.parse(await ev("cloudEnviar().then(r => JSON.stringify(r), e => JSON.stringify({erro: e.message}))"));
  ck(!envio.erro, 'envio conclui sem erro' + (envio.erro ? ': ' + envio.erro : ''));
  ck(envio.formato === 'gzip+base64', 'dados vão compactados (formato ' + envio.formato + ')');

  const reqEnvio = JSON.parse(await ev("JSON.stringify(window.__req[window.__req.length - 1])"));
  ck(reqEnvio.url.includes('/documents/usuarios/uid123'), 'grava em usuarios/{uid}');
  ck(reqEnvio.auth === 'Bearer tok1', 'envia o idToken no cabeçalho Authorization');
  ck(await ev("!!window.__doc.fields.dados.stringValue"), 'o documento tem o campo dados');

  const bruto = await ev('exportJSON().length');
  ck(envio.bytes < bruto, 'compactado (' + envio.bytes + ' bytes) menor que o original (' + bruto + ')');

  console.log('\nrenovação de token:');
  await ev('CLOUD.expiraEm = Date.now() - 1000; cloudGravar();');
  await ev('cloudToken()');
  const reqRef = JSON.parse(await ev("JSON.stringify(window.__req.filter(r => r.url.includes('securetoken')).pop())"));
  ck(!!reqRef, 'token vencido dispara renovação');
  ck(reqRef.corpo.includes('grant_type=refresh_token'), 'renovação usa grant_type=refresh_token');
  ck(await ev("CLOUD.idToken === 'tok2'"), 'novo idToken guardado');

  console.log('\nbaixar e restaurar:');
  await ev("S.workouts[0].name = 'Alterado depois do envio'; saveNow(); 'ok'");
  const remoto = JSON.parse(await ev("cloudBaixar().then(r => JSON.stringify({ tem: !!r, len: r && r.texto.length }))"));
  ck(remoto.tem, 'documento recuperado da nuvem');
  await ev("cloudBaixar().then(r => { importJSON(r.texto); popToRoot(); currentScreen().refresh(); })");
  await sleep(400);
  ck(await ev("S.workouts[0].name === 'Nuvem'"),
    'restaurar traz de volta o estado enviado, desfazendo a alteração local');
  ck(await ev("S.workouts[0].exercises.length === 1"), 'exercícios voltam junto');

  console.log('\nconta nova:');
  await ev('window.__doc = null;');
  ck(await ev("cloudBaixar().then(r => r === null)"), 'conta sem backup devolve null em vez de erro');

  console.log('\nsair:');
  await ev("TAB = 'perfil'; popToRoot(); currentScreen().refresh();"); await sleep(300);
  await shot('c2-perfil-logado');
  await ev('cloudEsquecer();');
  ck(await ev('cloudLogado() === false'), 'sair limpa a sessão');
  ck(await ev("localStorage.getItem('gymnotion.cloud') === null"), 'sair apaga o token guardado');
  ck(await ev('S.workouts.length === 1'), 'sair NÃO apaga os treinos do aparelho');

  console.log('\nproblemas:', bad.length);
  bad.forEach((b) => console.log('  !', b));
  ws.close(); chrome.kill();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
