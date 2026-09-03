/* Testa o plano de treino: o molde da semana, a troca avulsa de um dia e o
   rodízio que vale quando nada foi marcado.
   Uso: node tools/plano-test.js [saida]   (GYM_URL opcional) */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const OUT = process.argv[2] || path.join(__dirname, '..', '__shots');
const BASE = (process.env.GYM_URL || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PORT = 9361;
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
    '--window-size=393,852', 'about:blank',
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
  await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  await send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 2, mobile: true });

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

  /* três treinos, e um registro de dois dias atrás para o rodízio ter história */
  await ev(`
    [['Push', '#FF3B30', 'ex_supino_reto'],
     ['Pull', '#A020F0', 'ex_puxada_frontal'],
     ['Perna', '#25E36B', 'ex_agachamento_livre']].forEach(function (t) {
      var w = newWorkout(); w.name = t[0]; w.color = t[1];
      addExerciseToWorkout(w.id, findExercise(t[2]), 3);
    });
    startSession(S.workouts[0].id);
    S.active.exercises.forEach(function (e) {
      e.sets.forEach(function (s) { s.peso = 60; s.reps = 10; s.done = true; });
    });
    var sess = finishSession(); sess.date = Date.now() - 2 * 86400000;
    saveNow(); TAB = 'academia'; DIA_SEL = Date.now(); popToRoot(); 'ok';
  `);
  await sleep(600);

  /* ============================================================
     SEM PLANO: o rodízio manda
     ============================================================ */
  console.log('sem plano nenhum:');
  ck(await ev('temPlano() === false'), 'o app começa sem plano');
  ck(await ev("treinoDoDia(Date.now()).origem === 'rodizio'"),
    'o dia cai no rodízio automático');
  const sugerido = await ev('treinoDoDia(Date.now()).treino.name');
  ck(sugerido !== 'Push', 'que evita o treino feito há dois dias (sugeriu ' + sugerido + ')');
  ck(await ev(`${tela()}.querySelector('.hero-eyebrow').textContent.trim() === 'Sugestão de hoje'`),
    'e o cartão se apresenta como sugestão, não como plano');
  await shot('pl1-sem-plano');

  /* ============================================================
     MOLDE DA SEMANA
     ============================================================ */
  console.log('');
  console.log('plano da semana:');
  await ev("popToRoot(); telaPlanoSemana();"); await sleep(650);
  ck(await ev("currentScreen().name === 'plano'"), 'a tela do plano abre');
  ck(await ev(`${tela()}.querySelectorAll('.plano-dia').length === 7`), 'com uma linha por dia da semana');
  ck(await ev(`${tela()}.querySelectorAll('.plano-dia.hoje').length === 1`), 'e hoje marcado');
  ck(await ev(`Array.from(${tela()}.querySelectorAll('.plano-dia .plano-txt span')).every(function (s) { return s.textContent === 'Livre'; })`),
    'todos os dias começam livres');
  await shot('pl2-plano-vazio');

  /* marca o dia de hoje com o Pull, pela interface */
  const hojeDow = await ev('new Date().getDay()');
  await ev(`${tela()}.querySelectorAll('.plano-dia')[${hojeDow}].click()`); await sleep(600);
  ck(await ev("!!document.querySelector('.pop')"), 'tocar num dia abre o menu de treinos');
  ck(await ev("document.querySelectorAll('.pop .pop-item').length === S.workouts.length + 2"),
    'com os 3 treinos, Descanso e Deixar livre');
  await ev("document.querySelectorAll('.pop .pop-item')[1].click()"); await sleep(700);
  ck(await ev(`planoDaSemana(${hojeDow}) === S.workouts[1].id`), 'escolher grava o treino no dia da semana');
  ck(await ev(`${tela()}.querySelectorAll('.plano-dia')[${hojeDow}].textContent.includes('Pull')`),
    'e a linha passa a mostrar o nome dele');
  ck(await ev('temPlano()'), 'o app passa a ter plano');
  await shot('pl3-plano-marcado');

  /* marca outro dia como folga */
  const outroDow = (hojeDow + 1) % 7;
  await ev(`${tela()}.querySelectorAll('.plano-dia')[${outroDow}].click()`); await sleep(600);
  await ev(`(function () {
    var itens = document.querySelectorAll('.pop .pop-item');
    for (var i = 0; i < itens.length; i++) {
      if (itens[i].textContent.indexOf('Descanso') >= 0) { itens[i].click(); return 'ok'; }
    }
    return 'nao achou';
  })()`); await sleep(700);
  ck(await ev(`planoDaSemana(${outroDow}) === FOLGA`), 'dá para marcar um dia como folga');
  ck(await ev(`${tela()}.querySelectorAll('.plano-dia')[${outroDow}].textContent.includes('Descanso')`),
    'e a linha diz Descanso');

  await ev('popScreen();'); await sleep(600);

  /* ============================================================
     O CARTÃO DO DIA SEGUE O PLANO
     ============================================================ */
  console.log('');
  console.log('a academia segue o plano:');
  ck(await ev("treinoDoDia(Date.now()).origem === 'semana'"), 'hoje passa a vir do molde');
  ck(await ev("treinoDoDia(Date.now()).treino.name === 'Pull'"), 'com o treino que foi marcado');
  const sobrancelha = await ev(`${tela()}.querySelector('.hero-eyebrow').textContent.trim()`);
  ck(sobrancelha === await ev('DIAS_SEMANA[new Date().getDay()]'),
    'o cartão passa a dizer o dia da semana (' + sobrancelha + ')');
  ck(await ev(`${tela()}.querySelector('.hero-titulo').textContent.trim() === 'Pull'`),
    'e traz o treino do plano');
  const corHeroi = await ev(`getComputedStyle(${tela()}.querySelector('.hero')).getPropertyValue('--accent').trim()`);
  ck(corHeroi === '#A020F0', 'na cor daquele treino (' + corHeroi + ')');
  ck(await ev(`${tela()}.querySelector('.linha-tempo .lt-txt b').textContent.includes('Puxada')`),
    'e a linha do tempo mostra os exercícios dele');
  await shot('pl4-academia-com-plano');

  /* o dia de folga do molde aparece como descanso */
  await ev(`DIA_SEL = Date.now() + 86400000; currentScreen().refresh();`); await sleep(500);
  const amanhaEhFolga = await ev(`planoDaSemana(new Date(DIA_SEL).getDay()) === FOLGA`);
  if (amanhaEhFolga) {
    ck(await ev(`${tela()}.querySelector('.hero-titulo').textContent.trim() === 'Descanso'`),
      'o dia marcado como folga mostra Descanso no cartão');
  } else {
    ck(true, 'o dia seguinte não é o de folga nesta rodagem, verificação pulada');
  }
  await ev('DIA_SEL = Date.now(); currentScreen().refresh();'); await sleep(400);

  /* ============================================================
     TROCA AVULSA
     ============================================================ */
  console.log('');
  console.log('trocar só um dia:');
  await ev(`${tela()}.querySelector('.hero-menu').click()`); await sleep(650);
  ck(await ev("!!document.querySelector('.pop')"), 'o ⋯ do cartão abre o menu do dia');
  ck(await ev("document.querySelectorAll('.pop .pop-item').length === S.workouts.length + 1"),
    'com os treinos e o Descanso — ainda sem "voltar ao plano", porque não há troca');
  await ev("document.querySelectorAll('.pop .pop-item')[2].click()"); await sleep(700);
  ck(await ev("planoAvulso(Date.now()) === S.workouts[2].id"), 'a escolha grava só naquele dia');
  ck(await ev(`planoDaSemana(${hojeDow}) === S.workouts[1].id`), 'e o molde da semana continua intacto');
  ck(await ev("treinoDoDia(Date.now()).origem === 'dia'"), 'a troca avulsa vence o molde');
  ck(await ev(`${tela()}.querySelector('.hero-titulo').textContent.trim() === 'Perna'`),
    'o cartão passa a mostrar o treino trocado');
  ck(await ev(`${tela()}.querySelector('.hero-eyebrow').textContent.trim() === 'Treino de hoje'`),
    'e se apresenta como marcado para o dia');
  await shot('pl5-troca-do-dia');

  await ev(`${tela()}.querySelector('.hero-menu').click()`); await sleep(650);
  const temVoltar = await ev(`(function () {
    var itens = document.querySelectorAll('.pop .pop-item');
    for (var i = 0; i < itens.length; i++) {
      if (itens[i].textContent.indexOf('Seguir o plano') >= 0) { itens[i].click(); return true; }
    }
    return false;
  })()`);
  await sleep(700);
  ck(temVoltar, 'com uma troca no ar, o menu oferece voltar ao plano da semana');
  ck(await ev("planoAvulso(Date.now()) === null"), 'e voltar apaga a troca em vez de gravar outra');
  ck(await ev("treinoDoDia(Date.now()).treino.name === 'Pull'"), 'o dia volta ao treino do molde');

  /* ============================================================
     A FAIXA DA SEMANA E A OFENSIVA
     ============================================================ */
  console.log('');
  console.log('faixa da semana e ofensiva:');
  const pontos = await ev(`(function () {
    var v = [];
    ${tela()}.querySelectorAll('.day').forEach(function (d) {
      var p = d.querySelector('.dot');
      v.push(p.style.background || '');
    });
    return JSON.stringify(v);
  })()`);
  ck(JSON.parse(pontos).some((c) => c.indexOf('160, 32, 240') >= 0 || c.toUpperCase().indexOf('#A020F0') >= 0),
    'o dia planejado ganha um ponto na cor do treino marcado');

  /* o plano não pode virar atalho para nunca perder a ofensiva */
  const antesDaFolga = await ev('streak()');
  await ev(`
    /* marca a semana inteira como folga e vê se a regra da meta continua de pé */
    for (var i = 0; i < 7; i++) definirPlanoSemanal(i, FOLGA);
    currentScreen().refresh(); 'ok';
  `);
  await sleep(400);
  ck(await ev('streak()') === antesDaFolga,
    'planejar folga todo dia não muda a ofensiva: ela continua presa à meta semanal');
  ck(await ev("ehDescanso(Date.now() - 2 * 86400000) === false"),
    'e um dia com treino registrado não vira descanso por causa do plano');

  /* ============================================================
     APAGAR TREINO E APAGAR PLANO
     ============================================================ */
  console.log('');
  console.log('limpeza:');
  await ev(`
    for (var i = 0; i < 7; i++) definirPlanoSemanal(i, null);
    definirPlanoSemanal(0, S.workouts[1].id);
    definirPlanoDoDia(Date.now(), S.workouts[1].id);
    saveNow(); 'ok';
  `);
  const alvoId = await ev('S.workouts[1].id');
  await ev(`deleteWorkout('${alvoId}'); saveNow();`); await sleep(300);
  ck(await ev(`planoDaSemana(0) === null`), 'apagar um treino tira ele do molde da semana');
  ck(await ev('planoAvulso(Date.now()) === null'), 'e das trocas avulsas');
  ck(await ev("treinoDoDia(Date.now()).origem === 'rodizio'"),
    'o dia volta ao rodízio, sem apontar para o vazio');

  await ev("popToRoot(); telaPlanoSemana();"); await sleep(650);
  await ev(`definirPlanoSemanal(1, S.workouts[0].id); currentScreen().refresh();`); await sleep(400);
  await ev(`(function () {
    var b = currentScreen().el.querySelectorAll('.acao');
    for (var i = 0; i < b.length; i++) {
      if (b[i].textContent.indexOf('Apagar') >= 0) { b[i].click(); return 'ok'; }
    }
    return 'nao achou';
  })()`); await sleep(500);
  await ev(`document.querySelector('.sheet [data-x="yes"]').click()`); await sleep(700);
  ck(await ev('temPlano() === false'), 'o botão de apagar zera o plano inteiro');
  ck(await ev('S.workouts.length === 2'), 'sem levar os treinos junto');

  console.log('');
  console.log('persistência:');
  await ev(`definirPlanoSemanal(3, S.workouts[0].id); definirPlanoDoDia(Date.now(), FOLGA); saveNow();`);
  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1700);
  ck(await ev('planoDaSemana(3) === S.workouts[0].id'), 'o molde sobrevive ao recarregar');
  ck(await ev('planoAvulso(Date.now()) === FOLGA'), 'e a troca avulsa também');

  console.log('\nproblemas:', bad.length);
  bad.forEach((b) => console.log('  !', b));
  ws.close(); chrome.kill();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
