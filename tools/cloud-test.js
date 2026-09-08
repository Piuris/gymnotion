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
window.__updateTime = null; // versão do documento, como o Firestore devolve
window.__ver = 0;
window.__falhaGet = null;   // simula o Firestore recusando a leitura
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
    if ((opts.method || 'GET') === 'PATCH') {
      /* o Firestore de verdade recusa a escrita quando a pré-condição não bate;
         é nisso que a sincronização automática se apoia para não sobrescrever */
      const q = new URL(url).searchParams;
      const exige = q.get('currentDocument.exists');
      const versao = q.get('currentDocument.updateTime');
      if (exige === 'false' && window.__doc) {
        return erro(400, 'FAILED_PRECONDITION: document already exists');
      }
      if (versao && versao !== window.__updateTime) {
        return erro(400, 'FAILED_PRECONDITION: the stored version does not match');
      }
      window.__ver += 1;
      window.__updateTime = '2030-01-01T00:00:0' + (window.__ver % 10) + '.' + window.__ver + 'Z';
      window.__doc = JSON.parse(corpo);
      window.__doc.updateTime = window.__updateTime;
      return ok(window.__doc);
    }
    if (window.__falhaGet) return erro(403, window.__falhaGet);
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

  /* Zera a configuração de propósito: o teste não pode depender do que estiver
     em js/firebase-config.js, e nunca deve falar com o projeto real. */
  await ev("FIREBASE.apiKey = ''; FIREBASE.projectId = ''; cloudEsquecer(); 'ok'");
  await ev("popToRoot(); currentScreen().refresh();"); await sleep(300);

  console.log('sem configuração:');
  ck(await ev('cloudConfigurado() === false'), 'nuvem desligada quando as chaves estão vazias');
  await ev("popToRoot(); abrirModulo('config');"); await sleep(400);
  ck(await ev("!currentScreen().el.textContent.includes('Entrar ou criar conta')"),
    'seção Conta não aparece sem configuração');

  /* liga a configuração e o servidor falso */
  await ev("FIREBASE.apiKey = 'chave-de-teste'; FIREBASE.projectId = 'projeto-de-teste'; 'ok'");
  await ev(MOCK);
  await ev("popToRoot(); abrirModulo('config');"); await sleep(400);

  console.log('\nconfigurado:');
  ck(await ev('cloudConfigurado() === true'), 'nuvem liga com as chaves preenchidas');
  ck(await ev("currentScreen().el.textContent.includes('Entrar ou criar conta')"),
    'seção Conta aparece nas Configurações');
  await shot('c1-perfil-deslogado');

  /* A sincronização sozinha tem seção própria mais adiante; ligada durante as
     outras, um envio agendado cairia no meio de outra medição. */
  await ev('S.settings.nuvemAuto = false; saveNow();');

  console.log('\nerros traduzidos:');
  ck(await ev("cloudEntrar('existe@x.com', 'segredo123', true).then(() => 'sem erro', e => e.message)")
    === 'Esse e-mail já tem conta. Use "Entrar".', 'e-mail já cadastrado');
  ck(await ev("cloudEntrar('a@b.com', 'errada', false).then(() => 'sem erro', e => e.message)")
    === 'E-mail ou senha incorretos.', 'senha errada');

  const semRegras = await ev(`(async () => {
    const f = window.fetch;
    window.fetch = async () => new Response(
      JSON.stringify({ error: { status: 'PERMISSION_DENIED', message: 'Missing or insufficient permissions.' } }),
      { status: 403, headers: { 'Content-Type': 'application/json' } });
    CLOUD.refreshToken = 'r'; CLOUD.uid = 'u'; CLOUD.idToken = 't'; CLOUD.expiraEm = Date.now() + 1e6;
    const msg = await cloudEnviar().then(() => 'sem erro', e => e.message);
    window.fetch = f; cloudEsquecer();
    return msg;
  })()`);
  ck(semRegras.includes('Publique as regras'),
    'regras nao publicadas viram instrucao, nao jargao');

  const semRede = await ev(`(async () => {
    const f = window.fetch;
    window.fetch = async () => { throw new TypeError('Failed to fetch'); };
    const msg = await cloudEntrar('a@b.com', 'segredo123', false).then(() => 'sem erro', e => e.message);
    window.fetch = f;
    return msg;
  })()`);
  ck(semRede.includes('Sem conexao') || semRede.includes('Sem conex'),
    'falha de rede vira aviso tranquilo');

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

  console.log('\nentrar num aparelho novo:');
  /* Era aqui que ele quebrava calado: a oferta de restaurar devolvia sem dizer
     nada quando dava erro ou quando a conta estava vazia. Quem entrava com a
     conta no computador via a tela vazia e nenhuma explicação. */
  const sheetH3 = "(function () { var e = document.querySelector('.sheet h3'); return e ? e.textContent : ''; })()";
  const sheetDesc = "(function () { var e = document.querySelector('.sheet .desc'); return e ? e.textContent : ''; })()";
  const fechar = (x) => ev(`(function () { var b = document.querySelector('.sheet [data-x=${x}]'); if (b) b.click(); })()`);

  await ev("popToRoot(); abrirModulo('config');"); await sleep(500);

  /* 1. a conta tem backup: tem de perguntar se quer puxar */
  ck(await ev('cloudEnviar().then(() => true, () => false)'), 'preparo: a conta volta a ter backup');
  await ev('ofertaRestaurar(currentScreen())'); await sleep(700);
  ck(await ev("!!document.querySelector('.sheet')"), 'com backup na conta, ele pergunta');
  const pergunta = await ev(sheetH3);
  ck(pergunta === 'Restaurar da nuvem?', 'e a pergunta é a de restaurar (' + pergunta + ')');
  ck((await ev(sheetDesc)).indexOf('lançamento') > 0,
    'dizendo tudo o que será substituído, e não só os treinos');
  await fechar('no'); await sleep(400);

  /* 2. a conta está vazia: tem de dizer isso e o que fazer em seguida */
  await ev('window.__doc = null;');
  await ev('ofertaRestaurar(currentScreen())'); await sleep(700);
  const vazio = await ev(sheetH3);
  ck(vazio.indexOf('ainda não tem backup') > 0,
    'conta sem backup abre um aviso dizendo isso (' + vazio + ')');
  ck((await ev(sheetDesc)).indexOf('Enviar para a nuvem') > 0,
    'e aponta o caminho: enviar do aparelho que tem os dados');
  await fechar('ok'); await sleep(400);

  /* 3. o Firestore recusa a leitura: tem de mostrar o motivo */
  await ev("window.__falhaGet = 'PERMISSION_DENIED';");
  await ev('ofertaRestaurar(currentScreen())'); await sleep(700);
  ck((await ev(sheetH3)).indexOf('ler a conta') > 0,
    'erro de leitura também abre um aviso, em vez de não fazer nada');
  ck((await ev(sheetDesc)).indexOf('firestore.rules') > 0,
    'com o motivo: as regras do banco ainda não foram publicadas');
  await shot('c3-aviso-nuvem');
  await fechar('ok'); await sleep(400);
  await ev('window.__falhaGet = null;');

  console.log('\nquem pode sincronizar sozinho:');
  await ev('S.settings.nuvemAuto = true; CLOUD.pendente = false; cloudGravar();');
  ck(await ev('cloudJaSincronizou() === true'),
    'quem já enviou uma vez pode sincronizar sozinho depois');
  await ev('CLOUD.sincronizou = false; CLOUD.ultimoEnvio = 0; cloudGravar();');
  ck(await ev('cloudAutoLigado() === false'),
    'um aparelho que nunca trocou dados com a conta, não: subir o vazio dele apagaria o backup do outro');
  await ev("cloudAoSalvar(); 'ok'");
  ck(await ev('cloudPendente() === false'), 'e nem marca pendência enquanto isso');

  ck(await ev('cloudEnviar().then(() => true, () => false)'), 'enviar à mão funciona');
  ck(await ev('cloudAutoLigado() === true'), 'e libera o automático');
  ck(await ev("S.settings.nuvemAuto = false; cloudAutoLigado()") === false,
    'desligar nas configurações também para o automático');
  await ev('S.settings.nuvemAuto = true;');

  console.log('\nsubir sozinho:');
  await ev("novaTarefa({ titulo: 'Feita no aparelho A' }); saveNow(); 'ok'"); await sleep(300);
  ck(await ev('cloudPendente() === true'), 'gravar qualquer coisa marca que há novidade local');
  const antesReq = await ev('window.__req.length');
  ck(await ev("sincronizarNuvem('teste').then((r) => r)") === 'subiu',
    'e a sincronização sobe isso');
  ck(await ev('cloudPendente() === false'), 'a pendência sai depois de subir');
  ck(await ev('window.__req.length') === antesReq + 1,
    'com uma requisição só: o caminho comum não precisa ler antes de escrever');
  ck(await ev("CLOUD.updateTime === window.__updateTime"),
    'e o aparelho passa a conhecer a versão que acabou de gravar');
  ck(await ev("sincronizarNuvem('teste').then((r) => r)") === 'igual',
    'sem novidade nenhuma, ela não escreve nada');

  console.log('\nbaixar sozinho:');
  /* o outro aparelho escreveu: aqui isso é simular uma gravação vinda de fora */
  await ev(`(function () {
    var fora = JSON.parse(S ? exportJSON() : '{}');
    fora.tarefas.unshift({ id: 't_fora', titulo: 'Feita no aparelho B', data: dayKey(Date.now()),
      hora: '', fim: '', tipo: 'tarefa', cor: COR_AGENDA, feito: false, feitoEm: 0, criada: Date.now() });
    window.__forcado = JSON.stringify(fora);
    return 'ok';
  })()`);
  await ev(`(function () {
    /* grava direto no servidor falso, sem passar pelo app: é o aparelho B */
    var guardado = CLOUD.updateTime;
    window.__ver += 1;
    window.__updateTime = '2030-02-01T00:00:00.' + window.__ver + 'Z';
    window.__doc = { fields: { dados: { stringValue: window.__forcado },
      formato: { stringValue: 'json' },
      atualizadoEm: { timestampValue: new Date().toISOString() } },
      updateTime: window.__updateTime };
    return guardado;
  })()`);
  ck(await ev("sincronizarNuvem('teste').then((r) => r)") === 'baixou',
    'a nuvem mais nova, sem nada local esperando, entra sozinha');
  ck(await ev("S.tarefas.some(function (t) { return t.titulo === 'Feita no aparelho B'; })"),
    'e a tarefa feita no outro aparelho aparece aqui');
  ck(await ev('cloudPendente() === false'),
    'aplicar o que veio de fora não marca pendência: senão voltaria para a nuvem em eco');
  ck(await ev('CLOUD.updateTime === window.__updateTime'), 'a versão conhecida acompanha');

  /* com uma folha aberta, o estado não pode trocar por baixo dela */
  await ev(`(function () {
    window.__ver += 1;
    window.__updateTime = '2030-02-15T00:00:00.' + window.__ver + 'Z';
    window.__doc.updateTime = window.__updateTime;
    return 'ok';
  })()`);
  await ev("promptSheet('Teste', '', '', function () {});"); await sleep(600);
  ck(await ev("sincronizarNuvem('teste').then((r) => r)") === 'ocupado',
    'com uma folha aberta ela espera: aplicar agora apagaria o que está sendo digitado');
  await ev("document.querySelector('.sheet [data-x=no]').click()"); await sleep(500);
  ck(await ev("sincronizarNuvem('teste').then((r) => r)") === 'baixou',
    'fechada a folha, ela aplica');

  console.log('\nos dois lados mudaram:');
  await ev("novaTarefa({ titulo: 'Só aqui' }); saveNow(); 'ok'"); await sleep(300);
  await ev(`(function () {
    window.__ver += 1;
    window.__updateTime = '2030-03-01T00:00:00.' + window.__ver + 'Z';
    window.__doc.updateTime = window.__updateTime;
    return 'ok';
  })()`);
  ck(await ev("sincronizarNuvem('teste').then((r) => r)") === 'conflito',
    'com novidade dos dois lados, ela não escolhe sozinha');
  ck(await ev("!!document.querySelector('.sheet')"), 'abre a folha do conflito');
  ck((await ev(sheetH3)).indexOf('dois lados') > 0,
    'dizendo que os dois mudaram (' + await ev(sheetH3) + ')');
  ck(await ev("document.querySelectorAll('.sheet-col .pill-btn').length === 3"),
    'com as três saídas: ficar com um lado, com o outro, ou salvar uma cópia antes');
  ck(await ev("S.tarefas.some(function (t) { return t.titulo === 'Só aqui'; })"),
    'e nada foi apagado enquanto ela está aberta');
  await shot('c4-conflito');

  await ev("document.querySelector('.sheet [data-x=local]').click()"); await sleep(900);
  ck(await ev("!document.querySelector('.sheet')"), 'escolher fecha a folha');
  ck(await ev('cloudPendente() === false'),
    'ficar com este aparelho manda tudo para a nuvem, sem pré-condição nenhuma');
  ck(await ev("S.tarefas.some(function (t) { return t.titulo === 'Só aqui'; })"),
    'e o que era daqui continua aqui');

  console.log('\na trava da pré-condição:');
  await ev("novaTarefa({ titulo: 'Corrida' }); saveNow(); 'ok'"); await sleep(300);
  await ev(`(function () {
    window.__ver += 1;
    window.__updateTime = '2030-04-01T00:00:00.' + window.__ver + 'Z';
    window.__doc.updateTime = window.__updateTime;
    return 'ok';
  })()`);
  const guardadoAntes = await ev('window.__doc.fields.dados.stringValue.length');
  ck(await ev("cloudSubirPendente().then((r) => r)") === 'conflito',
    'o envio seguro desiste quando o documento mudou desde a última olhada');
  ck(await ev('window.__doc.fields.dados.stringValue.length') === guardadoAntes,
    'e o que estava lá continua lá, em vez de ser sobrescrito em silêncio');
  await ev('CLOUD.updateTime = window.__updateTime; cloudGravar();');
  ck(await ev("cloudSubirPendente().then((r) => r)") === 'subiu',
    'sabendo a versão certa, ele sobe');

  console.log('\nno meio de um treino, ninguém mexe:');
  await ev("S.active = { workoutId: 'w', name: 'Peito', color: '#FF2D96', running: true, exercises: [], startedAt: Date.now() };");
  ck(await ev("sincronizarNuvem('teste').then((r) => r)") === 'treino',
    'aplicar um estado vindo de fora apagaria a sessão que está correndo');
  await ev('S.active = null; saveNow();'); await sleep(200);

  /* restaurar também libera, porque o aparelho passa a ter o que a conta tem */
  await ev('S.settings.nuvemAuto = false; CLOUD.sincronizou = false; CLOUD.ultimoEnvio = 0; cloudGravar();');
  await ev("cloudBaixar().then((r) => { aplicarRestauracao(r.texto, null, r.updateTime); return 'ok'; })");
  await sleep(700);
  ck(await ev('cloudJaSincronizou() === true'), 'restaurar também libera o automático');
  ck(await ev('cloudPendente() === false'), 'e não deixa pendência para trás');

  console.log('\nsair:');
  await ev("popToRoot(); abrirModulo('config');"); await sleep(300);
  await shot('c2-perfil-logado');
  await ev('cloudEsquecer();');
  ck(await ev('cloudLogado() === false'), 'sair limpa a sessão');
  ck(await ev("localStorage.getItem('gymnotion.cloud') === null"), 'sair apaga o token guardado');
  ck(await ev('cloudJaSincronizou() === false'),
    'e zera a marca de sincronização: entrar de novo volta a esperar por você');
  ck(await ev("CLOUD.updateTime === '' && CLOUD.pendente === false"),
    'junto com a versão conhecida e a pendência, que são de uma conta só');
  ck(await ev('S.workouts.length === 1'), 'sair NÃO apaga os treinos do aparelho');

  console.log('\nproblemas:', bad.length);
  bad.forEach((b) => console.log('  !', b));
  ws.close(); chrome.kill();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
