/* Testa os módulos de organização: os atalhos do Início, o Menu, o cronograma
   com calendário, o cofrinho das metas e a tela de estudos.
   Uso: node tools/vida-test.js [saida]   (GYM_URL opcional) */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const OUT = process.argv[2] || path.join(__dirname, '..', '__shots');
const BASE = (process.env.GYM_URL || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PORT = 9357;
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

  /* ============================================================
     INÍCIO
     ============================================================ */
  console.log('tela de início:');
  ck(await ev("currentScreen().name === 'root'"), 'o app abre na raiz');
  ck(await ev("TAB === 'inicio'"), 'e a aba inicial é o Início');
  ck(await ev(`${tela()}.querySelectorAll('.tab').length === 2`),
    'a barra de abas ficou com duas abas');
  const nAtalhos = await ev(`${tela()}.querySelectorAll('.hub-card').length`);
  ck(nAtalhos === await ev('MODULOS.length'),
    'há um atalho para cada módulo (' + nAtalhos + ')');
  ck(await ev(`Array.from(${tela()}.querySelectorAll('.hub-card b')).map(function (b) { return b.textContent; }).join(',')`)
    === 'Academia,Cronograma,Hidratação,Metas,Estudos,Configurações',
    'na ordem esperada');

  /* cada atalho leva a cor do seu módulo */
  const coresAtalhos = await ev(`(function () {
    var v = [];
    ${tela()}.querySelectorAll('.hub-card').forEach(function (c) {
      v.push(getComputedStyle(c).getPropertyValue('--accent').trim().toUpperCase());
    });
    return v.join(',');
  })()`);
  /* le as constantes em vez de repetir o hexadecimal: a paleta pode ser
     reafinada sem que o teste passe a cobrar uma cor que nao existe mais */
  for (const [cor, quem] of [['COR_AGENDA', 'cronograma'], ['AZUL_AGUA', 'hidratação'], ['COR_METAS', 'metas'], ['COR_ESTUDOS', 'estudos']]) {
    const hex = (await ev(cor)).toUpperCase();
    ck(coresAtalhos.indexOf(hex) >= 0, 'o atalho de ' + quem + ' sai na cor do módulo (' + hex + ')');
  }
  await shot('v1-inicio');

  console.log('\nmenu:');
  await ev("TAB = 'menu'; currentScreen().refresh();"); await sleep(500);
  ck(await ev(`${tela()}.querySelectorAll('.mod-row').length === MODULOS.length`),
    'o Menu lista os mesmos módulos');
  ck(await ev(`${tela()}.textContent.includes('Resumo e recordes')`),
    'e guarda os atalhos da academia');
  const folga = await ev(`(function () {
    var sc = ${tela()}.querySelector('.scroll');
    sc.scrollTop = sc.scrollHeight;
    var fim = ${tela()}.querySelector('.scroll > *:last-child').getBoundingClientRect();
    var barra = ${tela()}.querySelector('.tabbar').getBoundingClientRect();
    return Math.round(barra.top - fim.bottom);
  })()`);
  ck(folga >= 0, 'a barra de abas nao cobre o fim da lista (' + folga + 'px de folga)');
  await shot('v2-menu');

  /* ============================================================
     CRONOGRAMA
     ============================================================ */
  console.log('\ncronograma:');
  await ev("popToRoot(); abrirModulo('cronograma');"); await sleep(600);
  ck(await ev("currentScreen().name === 'cronograma'"), 'o menu abre o cronograma');
  ck(await ev(`!!${tela()}.querySelector('.cal-grade')`), 'com a grade do mês');
  const nDias = await ev(`${tela()}.querySelectorAll('.cal-dia').length`);
  const noMes = await ev('new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()');
  ck(nDias === noMes, 'a grade traz os ' + noMes + ' dias do mês');
  ck(await ev(`${tela()}.querySelectorAll('.cal-dia.hoje').length === 1`), 'hoje aparece marcado');
  ck(await ev(`${tela()}.textContent.includes('Nada marcado para este dia')`),
    'e o dia começa vazio');

  await ev(`
    novaTarefa({ titulo: 'Dentista', hora: '09:00', tipo: 'compromisso', cor: '#FF3B30' });
    novaTarefa({ titulo: 'Entregar relatório', hora: '14:00', tipo: 'compromisso', cor: '#0A84FF' });
    novaTarefa({ titulo: 'Comprar whey', hora: '', cor: '#22E04A' });
    saveNow(); currentScreen().refresh(); 'ok';
  `);
  await sleep(500);
  ck(await ev(`${tela()}.querySelectorAll('.tarefa').length === 3`), 'as três tarefas entram na lista');
  const ordem = await ev(`Array.from(${tela()}.querySelectorAll('.tarefa-txt b')).map(function (b) { return b.textContent; }).join(' | ')`);
  ck(ordem === 'Dentista | Entregar relatório | Comprar whey',
    'com hora primeiro e na ordem do relógio: ' + ordem);
  const corPrimeira = await ev(`getComputedStyle(${tela()}.querySelector('.tarefa')).getPropertyValue('--accent').trim()`);
  ck(corPrimeira === '#FF3B30', 'cada linha leva a cor da própria tarefa (' + corPrimeira + ')');
  ck(await ev(`${tela()}.querySelectorAll('.cal-dia.sel .pontos i').length === 3`),
    'e o dia do calendário ganha um ponto por cor');
  await shot('v3-cronograma');

  await ev(`${tela()}.querySelector('.tarefa .check').click()`); await sleep(450);
  ck(await ev("tarefasDoDia().filter(function (t) { return t.feito; }).length === 1"),
    'tocar no círculo marca a tarefa como feita');
  ck(await ev(`${tela()}.querySelectorAll('.tarefa')[2].querySelector('.tarefa-txt b').textContent === 'Dentista'`),
    'e ela desce para o fim da lista em vez de sumir');
  ck(await ev('pendentesDoDia() === 2'), 'sobram 2 pendentes hoje');

  /* uma tarefa aberta em dia que já passou tem que aparecer como atrasada */
  await ev(`
    var d = new Date(); d.setDate(d.getDate() - 3);
    novaTarefa({ titulo: 'Pagar boleto', data: dayKey(d.getTime()) });
    saveNow(); currentScreen().refresh(); 'ok';
  `);
  await sleep(450);
  ck(await ev('tarefasAtrasadas().length === 1'), 'a de três dias atrás conta como atrasada');
  ck(await ev(`${tela()}.textContent.includes('Atrasadas')`), 'e a tela abre uma seção para ela');

  console.log('');
  console.log('editor de tarefa:');
  await ev(`${tela()}.querySelector('.fab').click()`); await sleep(550);
  ck(await ev("!!document.querySelector('.sheet .form')"), 'o + abre o editor');
  ck(await ev(`document.querySelector('.sheet [data-c="data"]').value === dayKey(DIA_AGENDA)`),
    'já com o dia que está aberto no calendário');
  await shot('v9-editor');

  await ev(`(function () {
    var f = document.querySelector('.sheet .form');
    f.querySelector('[data-c="titulo"]').value = 'Consulta';
    f.querySelector('[data-tipo="compromisso"]').click();
    f.querySelector('[data-c="hora"]').value = '16:30';
    f.querySelectorAll('[data-cor]')[4].click();
    f.querySelector('[data-x="yes"]').click();
  })()`);
  await sleep(800);
  const nova = await ev(`JSON.stringify(tarefasDoDia().find(function (t) { return t.titulo === 'Consulta'; }) || null)`);
  const t = JSON.parse(nova || 'null');
  ck(!!t, 'salvar cria a tarefa');
  ck(t && t.hora === '16:30', 'com a hora escolhida (' + (t && t.hora) + ')');
  ck(t && t.tipo === 'compromisso', 'e com o tipo marcado nos chips');
  ck(t && t.cor === await ev('COLORS[4].hex'), 'e com a cor escolhida na paleta (' + (t && t.cor) + ')');
  ck(await ev("!document.querySelector('.sheet')"), 'o editor fecha depois de salvar');
  ck(await ev(`${tela()}.querySelectorAll('.tarefa')[1].querySelector('.tarefa-txt b').textContent === 'Consulta'`),
    'e ela entra na lista já na posição do horário, entre as 14h e a feita');

  /* salvar sem título não pode criar tarefa fantasma */
  const antesVazio = await ev('S.tarefas.length');
  await ev(`${tela()}.querySelector('.fab').click()`); await sleep(500);
  await ev(`document.querySelector('.sheet [data-x="yes"]').click()`); await sleep(500);
  ck(await ev('S.tarefas.length') === antesVazio, 'salvar sem título não cria nada');
  ck(await ev("!!document.querySelector('.sheet')"), 'e o editor continua aberto para corrigir');
  await ev(`document.querySelector('.sheet [data-x="no"]').click()`); await sleep(500);

  /* navegar de mês não pode arrastar o dia aberto junto */
  const mesAntes = await ev('new Date(MES_AGENDA).getMonth()');
  await ev(`${tela()}.querySelector('.cal-topo [data-act="ant"]').click()`); await sleep(500);
  ck(await ev('new Date(MES_AGENDA).getMonth()') === (mesAntes + 11) % 12,
    'a seta volta um mês');
  ck(await ev('dayKey(DIA_AGENDA) === dayKey(Date.now())'),
    'e o dia aberto continua sendo hoje, não muda sozinho');
  ck(await ev(`${tela()}.querySelectorAll('.cal-dia.hoje').length === 0`),
    'no mês anterior não há marca de hoje');

  /* ============================================================
     METAS
     ============================================================ */
  console.log('\nmetas:');
  await ev("popToRoot(); abrirModulo('metas');"); await sleep(600);
  ck(await ev("currentScreen().name === 'metas'"), 'a tela de metas abre');
  ck(await ev(`${tela()}.textContent.includes('cofrinho')`), 'e explica o cofrinho quando está vazia');

  await ev("novaMeta('Viagem', 3000, '#FF2D96'); novaMeta('Notebook', 5000, '#32D6E0'); saveNow(); currentScreen().refresh();");
  await sleep(500);
  ck(await ev(`${tela()}.querySelectorAll('.meta-card').length === 2`), 'os dois cofrinhos aparecem');
  /* metas novas entram no topo, entao o primeiro cartao e o ultimo criado */
  const coresMetas = await ev(`(function () {
    var v = [];
    ${tela()}.querySelectorAll('.meta-card').forEach(function (c) {
      v.push(getComputedStyle(c).getPropertyValue('--accent').trim());
    });
    return v.join(',');
  })()`);
  ck(coresMetas === await ev("S.metas.map(function (m) { return m.cor; }).join(',')"),
    'cada cofrinho tem a sua cor (' + coresMetas + ')');
  ck(coresMetas.split(',')[0] !== coresMetas.split(',')[1],
    'e dois cofrinhos novos nao saem da mesma cor');
  await shot('v4-metas');

  await ev(`${tela()}.querySelector('.meta-card').click()`); await sleep(600);
  ck(await ev("currentScreen().name === 'meta'"), 'tocar abre o detalhe da meta');
  await ev(`${tela()}.querySelectorAll('.agua-copo')[2].click()`); await sleep(450);
  ck(await ev("metaGuardado(S.metas[0]) === 200"), 'o botão rápido guarda 200');
  await ev(`${tela()}.querySelectorAll('.agua-copo')[2].click()`); await sleep(450);
  ck(await ev("metaGuardado(S.metas[0]) === 400"), 'e vai somando');
  ck(await ev(`${tela()}.querySelector('.meta-pct, .agua-valor b') !== null`), 'o anel mostra o guardado');
  ck(await ev("S.metas[0].depositos.length === 2"), 'cada valor vira um lançamento no extrato');

  /* o cofrinho não pode ficar devendo */
  await ev("guardarNaMeta(S.metas[0].id, -1000); currentScreen().refresh();"); await sleep(400);
  ck(await ev("metaGuardado(S.metas[0]) === 0"),
    'retirar mais do que tem esvazia, mas não fica negativo');
  ck(await ev("S.metas[0].depositos[0].valor === -400"),
    'e a retirada entra no extrato pelo que realmente saiu');
  await shot('v5-meta');

  await ev("guardarNaMeta(S.metas[0].id, S.metas[0].alvo); currentScreen().refresh();"); await sleep(400);
  ck(await ev('metaBatida(S.metas[0])'), 'chegando no alvo, a meta conta como batida');
  await ev('guardarNaMeta(S.metas[0].id, 900); currentScreen().refresh();'); await sleep(400);
  ck(await ev('metaPct(S.metas[0]) === 1'),
    'e guardar a mais nao passa dos 100%, para a barra nao vazar');
  ck(await ev('metaGuardado(S.metas[0]) > S.metas[0].alvo'),
    'ainda que o valor guardado continue subindo de verdade');

  /* ============================================================
     ESTUDOS
     ============================================================ */
  console.log('\nestudos:');
  await ev("popToRoot(); abrirModulo('estudos');"); await sleep(600);
  ck(await ev("currentScreen().name === 'estudos'"), 'a tela de estudos abre');

  await ev("novaMateria('Cálculo', '#A020F0', 180); saveNow(); currentScreen().refresh();");
  await sleep(500);
  ck(await ev(`${tela()}.querySelectorAll('.mat-card').length === 1`), 'a matéria aparece');
  const corMat = await ev(`getComputedStyle(${tela()}.querySelector('.mat-card')).getPropertyValue('--accent').trim()`);
  ck(corMat === '#A020F0', 'com a cor dela (' + corMat + ')');

  await ev(`${tela()}.querySelector('.mat-card').click()`); await sleep(600);
  ck(await ev("currentScreen().name === 'materia'"), 'tocar abre o detalhe');
  await ev("addTopico(S.materias[0].id, 'Limites'); addTopico(S.materias[0].id, 'Derivadas'); currentScreen().refresh();");
  await sleep(450);
  ck(await ev(`${tela()}.querySelectorAll('.tarefa').length === 2`), 'os tópicos entram como lista de check');
  await ev(`${tela()}.querySelector('.tarefa .check').click()`); await sleep(450);
  ck(await ev('topicosFeitos(S.materias[0]) === 1'), 'marcar um tópico conta');
  ck(await ev('progressoMateria(S.materias[0]) === 0.5'), 'e o progresso vira 50%');

  await ev(`${tela()}.querySelectorAll('.agua-copo')[1].click()`); await sleep(450);
  ck(await ev('minutosNaSemana(S.materias[0]) === 50'), 'o botão de 50 min registra o estudo');
  ck(await ev('minutosTotais(S.materias[0]) === 50'), 'e entra no acumulado');
  ck(await ev(`${tela()}.textContent.includes('50 min')`), 'a tela mostra o tempo formatado');
  await ev("registrarEstudo(S.materias[0].id, 130); currentScreen().refresh();"); await sleep(400);
  ck(await ev('fmtMin(minutosNaSemana(S.materias[0])) === "3h"'), '50 + 130 minutos viram "3h"');
  await shot('v6-materia');

  await ev('popScreen();'); await sleep(600);
  ck(await ev(`!!${tela()}.querySelector('.estudo-semana')`), 'com horas lançadas aparece o gráfico de 14 dias');
  const corBarra = await ev(`(function () {
    var b = ${tela()}.querySelectorAll('.estudo-barra i');
    return b[b.length - 1].style.background;
  })()`);
  ck(corBarra.replace(/\s/g, '').toLowerCase().indexOf('rgb(160,32,240)') >= 0,
    'e cada barra leva a cor da matéria que rendeu no dia (' + corBarra + ')');
  await shot('v7-estudos');

  /* ============================================================
     ÁGUA
     ============================================================ */
  console.log('\nhidratação:');
  await ev("popToRoot(); abrirModulo('agua');"); await sleep(600);
  ck(await ev("currentScreen().name === 'agua'"), 'a tela de água abre pelo módulo');
  const copos = await ev(`Array.from(${tela()}.querySelectorAll('.agua-copo b')).map(function (b) { return b.textContent; }).join(',')`);
  ck(copos === '+300,+500,+800', 'os copos são 300, 500 e 800 ml (' + copos + ')');
  ck(await ev(`${tela()}.textContent.includes('Desfazer 800 ml')`),
    'e o desfazer parte de 800, o tamanho da garrafa');

  await ev(`${tela()}.querySelectorAll('.agua-copo')[2].click()`); await sleep(450);
  ck(await ev('aguaDoDia() === 800'), 'tocar em +800 registra a garrafa cheia');
  await ev(`${tela()}.querySelectorAll('.agua-copo')[0].click()`); await sleep(450);
  ck(await ev('aguaDoDia() === 1100'), 'somando os 300 do copo seguinte');
  ck(await ev(`${tela()}.textContent.includes('Desfazer 300 ml')`),
    'o desfazer passa a oferecer os 300 que entraram por último');
  await ev(`${tela()}.querySelector('.agua-extras [data-act="menos"]').click()`); await sleep(450);
  ck(await ev('aguaDoDia() === 800'),
    'e tira exatamente esse valor, em vez de descontar um número fixo');
  await ev(`${tela()}.querySelector('.agua-extras [data-act="menos"]').click()`); await sleep(450);
  ck(await ev('aguaDoDia() === 0'), 'desfazendo de novo, sai a garrafa de 800');
  await shot('v8-agua');

  /* ============================================================
     ACADEMIA E PERSISTÊNCIA
     ============================================================ */
  console.log('\nacademia e dados:');
  await ev("popToRoot(); abrirModulo('academia');"); await sleep(600);
  ck(await ev("currentScreen().name === 'academia'"), 'a academia virou tela empilhada');
  ck(await ev(`!!${tela()}.querySelector('.week')`), 'com a faixa da semana no lugar');
  ck(await ev(`!!${tela()}.querySelector('.acad-barra .streak')`), 'e a ofensiva na barra de cima');
  await ev(`${tela()}.querySelector('.acad-barra [data-act="resumo"]').click()`); await sleep(600);
  ck(await ev("currentScreen().name === 'resumo'"), 'o botão abre o resumo da academia');
  await ev('popScreen();'); await sleep(500);
  await ev(`${tela()}.querySelector('.nav [data-act="back"]').click()`); await sleep(500);
  ck(await ev("currentScreen().name === 'root'"), 'e o voltar devolve para o Início');

  await ev("popToRoot(); abrirModulo('config');"); await sleep(600);
  ck(await ev("currentScreen().name === 'config'"), 'as configurações abrem pelo módulo');
  ck(await ev(`${tela()}.textContent.includes('Peso corporal')`), 'com os ajustes que moravam no Perfil');

  console.log('\npersistência:');
  const antes = await ev("JSON.stringify([S.tarefas.length, S.metas.length, S.materias.length])");
  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1700);
  const depois = await ev("JSON.stringify([S.tarefas.length, S.metas.length, S.materias.length])");
  ck(antes === depois, 'tarefas, metas e matérias sobrevivem ao recarregar (' + depois + ')');
  ck(await ev('S.version === 3'), 'o estado está na versão 3');

  /* um backup da versão antiga não pode quebrar ao ser importado */
  const migrou = await ev(`(function () {
    var v2 = { version: 2, workouts: [], sessions: [], customExercises: [], agua: {}, settings: {} };
    importJSON(JSON.stringify(v2));
    return [S.version, Array.isArray(S.tarefas), Array.isArray(S.metas), Array.isArray(S.materias)].join(',');
  })()`);
  ck(migrou === '3,true,true,true',
    'um backup da v2 sobe para a v3 com os módulos novos vazios (' + migrou + ')');

  console.log('\nproblemas:', bad.length);
  bad.forEach((b) => console.log('  !', b));
  ws.close(); chrome.kill();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
