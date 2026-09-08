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
  ck(await ev("TAB === 'inicio'"), 'o app abre no Início');
  ck(await ev("currentScreen().name === 'inicio'"), 'e a raiz se chama pela aba aberta');
  ck(await ev(`${tela()}.querySelectorAll('.tab').length === ABAS.length + 1`),
    'a cápsula traz as ' + await ev('ABAS.length') + ' abas mais o botão do menu');
  const nAtalhos = await ev(`${tela()}.querySelectorAll('.hub-card').length`);
  ck(nAtalhos === await ev('MODULOS.length'),
    'há um atalho para cada módulo (' + nAtalhos + ')');
  ck(await ev(`Array.from(${tela()}.querySelectorAll('.hub-card b')).map(function (b) { return b.textContent; }).join(',')`)
    === 'Academia,Cronograma,Hidratação,Jogos,Financeiro,Metas,Estudos,Configurações',
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

  console.log('');
  console.log('menu suspenso:');
  await ev(`${tela()}.querySelectorAll('.tabbar .tab')[ABAS.length].click()`); await sleep(600);
  ck(await ev("!!document.querySelector('.pop')"), 'o último botão da cápsula abre um painel');
  ck(await ev("document.querySelectorAll('.pop .pop-item').length >= MODULOS.length"),
    'que lista todos os módulos');
  ck(await ev("document.querySelector('.pop').textContent.includes('Resumo da academia')"),
    'e mais os atalhos da academia');
  ck(await ev("!document.querySelector('.pop-item.on')"),
    'sem marca nenhuma, porque o Início não é um módulo da lista');
  /* a cápsula tem de continuar por cima do painel, senão o ✕ some */
  ck(await ev(`(function () {
    var b = parseInt(getComputedStyle(document.querySelector('.tabbar')).zIndex, 10);
    var p = parseInt(getComputedStyle(document.querySelector('.pop-fundo')).zIndex, 10);
    return b > p;
  })()`), 'a cápsula fica acima do painel, para o ✕ continuar clicável');
  await ev("TAB = 'inicio'; popToRoot();"); await sleep(400);
  const folga = await ev(`(function () {
    var sc = ${tela()}.querySelector('.scroll');
    sc.scrollTop = sc.scrollHeight;
    var fim = ${tela()}.querySelector('.scroll > *:last-child').getBoundingClientRect();
    var barra = ${tela()}.querySelector('.tabbar').getBoundingClientRect();
    return Math.round(barra.top - fim.bottom);
  })()`);
  ck(folga >= 0, 'a barra de abas nao cobre o fim da lista (' + folga + 'px de folga)');
  await shot('v2-menu');
  await ev("document.querySelector('.pop-fundo').click()"); await sleep(400);
  ck(await ev("!document.querySelector('.pop')"), 'tocar fora fecha o painel');

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
  ck(await ev(`${tela()}.textContent.includes('Nada por aqui')`),
    'e o dia começa vazio');
  ck(await ev(`!!${tela()}.querySelector('[data-c="titulo"]')`),
    'com o cadastro rápido na própria tela');

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
  ck(await ev(`${tela()}.textContent.includes('Anteriores')`), 'e a tela abre um bloco para ela');

  console.log('');
  console.log('editor de tarefa:');
  ck(await ev(`${tela()}.querySelector('[data-c="data"]').value === dayKey(DIA_AGENDA)`),
    'já com o dia que está aberto no calendário');
  await shot('v9-editor');

  /* cadastro rápido na tela, e depois o editor completo pelo item */
  await ev(`(function () {
    var el = currentScreen().el;
    el.querySelector('[data-c="titulo"]').value = 'Consulta';
    el.querySelector('[data-c="hora"]').value = '16:30';
    el.querySelector('.form-linhas [data-act="ok"]').click();
  })()`);
  await sleep(800);
  await ev(`(function () {
    var t = tarefasDoDia().filter(function (x) { return x.titulo === 'Consulta'; })[0];
    editorTarefa(t, t.data, currentScreen());
  })()`);
  await sleep(650);
  await ev(`document.querySelector('.sheet .campo-cor').click()`); await sleep(600);
  await ev("document.querySelectorAll('.pop .pop-item')[4].click()"); await sleep(500);
  await ev(`document.querySelector('.sheet [data-x="yes"]').click()`);
  await sleep(800);
  const nova = await ev(`JSON.stringify(tarefasDoDia().find(function (t) { return t.titulo === 'Consulta'; }) || null)`);
  const t = JSON.parse(nova || 'null');
  ck(!!t, 'salvar cria a tarefa');
  ck(t && t.hora === '16:30', 'com a hora escolhida (' + (t && t.hora) + ')');
  ck(t && t.tipo === 'compromisso', 'e com o tipo deduzido da hora preenchida');
  ck(t && t.cor === await ev('COLORS[4].hex'), 'e com a cor escolhida no menu (' + (t && t.cor) + ')');
  ck(await ev("!document.querySelector('.sheet')"), 'o editor fecha depois de salvar');
  ck(await ev(`${tela()}.querySelectorAll('.tarefa')[1].querySelector('.tarefa-txt b').textContent === 'Consulta'`),
    'e ela entra na lista já na posição do horário, entre as 14h e a feita');

  /* adicionar sem título não pode criar tarefa fantasma */
  const antesVazio = await ev('S.tarefas.length');
  await ev(`${tela()}.querySelector('.form-linhas [data-act="ok"]').click()`); await sleep(500);
  ck(await ev('S.tarefas.length') === antesVazio, 'adicionar sem título não cria nada');

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
  ck(await ev(`${tela()}.textContent.includes('Nenhuma meta ainda')`),
    'e diz que ainda não há meta nenhuma');
  ck(await ev(`!!${tela()}.querySelector('[data-c="nome"]')`),
    'com o cadastro rápido na própria tela');

  await ev(`(function () {
    var el = currentScreen().el;
    el.querySelector('[data-c="nome"]').value = 'Viagem';
    el.querySelector('[data-c="alvo"]').value = '3000';
    el.querySelector('.form-linhas [data-act="ok"]').click();
    return 'ok';
  })()`);
  await sleep(700);
  ck(await ev("S.metas.length === 1 && S.metas[0].alvo === 3000"),
    'o cadastro rápido cria a meta com o alvo');
  await ev("novaMeta('Notebook', 5000, '#32D6E0'); saveNow(); currentScreen().refresh();");
  await sleep(500);
  ck(await ev(`${tela()}.querySelectorAll('.meta-card').length === 2`), 'os dois cofrinhos aparecem');
  ck(await ev(`${tela()}.textContent.includes('Total guardado')`), 'com o bloco do total');
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

  await ev(`(function () {
    var el = currentScreen().el;
    el.querySelector('[data-c="nome"]').value = 'Cálculo';
    el.querySelector('.form-linhas [data-act="ok"]').click();
    return 'ok';
  })()`);
  await sleep(700);
  ck(await ev("S.materias.length === 1 && S.materias[0].nome === 'Cálculo'"),
    'o cadastro rápido cria a matéria');
  await ev("S.materias[0].cor = '#A020F0'; S.materias[0].metaSemanal = 180; saveNow(); currentScreen().refresh();");
  await sleep(500);
  ck(await ev(`${tela()}.querySelectorAll('.mat-card').length === 1`), 'a matéria aparece');
  const corMat = await ev(`getComputedStyle(${tela()}.querySelector('.mat-card')).getPropertyValue('--accent').trim()`);
  ck(corMat === '#A020F0', 'com a cor dela (' + corMat + ')');
  /* a cor precisa aparecer de verdade, nao so num contorno de 1px */
  const selo = JSON.parse(await ev(`(function () {
    var s = ${tela()}.querySelector('.mat-card .mat-ico');
    var b = ${tela()}.querySelector('.mat-card .progress');
    var e = getComputedStyle(s);
    return JSON.stringify({
      letra: s.textContent.trim(),
      fundo: e.backgroundColor,
      lado: Math.round(s.getBoundingClientRect().width),
      barra: Math.round(b.getBoundingClientRect().height),
    });
  })()`));
  ck(selo.letra === 'C', 'o selo traz a inicial da matéria (' + selo.letra + ')');
  ck(selo.fundo === 'rgb(160, 32, 240)', 'preenchido na cor dela (' + selo.fundo + ')');
  ck(selo.lado >= 40, 'num tamanho que dá para ver (' + selo.lado + 'px)');
  ck(selo.barra >= 8, 'e a barra de progresso engrossou (' + selo.barra + 'px)');

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
  ck(await ev(`!!${tela()}.querySelector('.dias-barras')`), 'com horas lançadas aparece o gráfico de 14 dias');
  const corBarra = await ev(`(function () {
    var b = ${tela()}.querySelectorAll('.dias-barra i');
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
  const copos = await ev(`Array.from(${tela()}.querySelectorAll('.agua-copos .acao')).map(function (b) { return b.textContent.trim(); }).join(',')`);
  ck(copos === '+ 300 ml,+ 500 ml,+ 800 ml', 'os copos são 300, 500 e 800 ml (' + copos + ')');
  ck(await ev(`${tela()}.textContent.includes('Nenhum copo registrado hoje')`),
    'e o dia começa sem registro nenhum');

  await ev(`${tela()}.querySelectorAll('.agua-copos .acao')[2].click()`); await sleep(450);
  ck(await ev('aguaDoDia() === 800'), 'tocar em +800 registra a garrafa cheia');
  await ev(`${tela()}.querySelectorAll('.agua-copos .acao')[0].click()`); await sleep(450);
  ck(await ev('aguaDoDia() === 1100'), 'somando os 300 do copo seguinte');
  ck(await ev(`${tela()}.querySelectorAll('.gole').length === 2`),
    'cada gole vira um registro do dia');
  ck(await ev(`${tela()}.querySelector('.gole b').textContent === '300 ml'`),
    'com o último em cima');
  await ev(`${tela()}.querySelector('.gole [data-act="desfazer"]').click()`); await sleep(450);
  ck(await ev('aguaDoDia() === 800'),
    'desfazer tira exatamente esse valor, em vez de descontar um número fixo');
  await ev(`${tela()}.querySelector('.gole [data-act="desfazer"]').click()`); await sleep(450);
  ck(await ev('aguaDoDia() === 0'), 'desfazendo de novo, sai a garrafa de 800');
  await shot('v8-agua');

  /* ============================================================
     ACADEMIA E PERSISTÊNCIA
     ============================================================ */
  console.log('\nacademia e dados:');
  await ev("popToRoot(); abrirModulo('academia');"); await sleep(600);
  ck(await ev("currentScreen().name === 'academia'"), 'a academia é uma das abas');
  ck(await ev(`!!${tela()}.querySelector('.week')`), 'com a faixa da semana no lugar');
  ck(await ev(`!${tela()}.querySelector('.streak')`),
    'e sem a ofensiva, que saiu da academia');
  /* sem treino montado nao ha cartao do dia; o que tem de existir e o caminho
     para montar um e as pilulas de acao */
  ck(await ev(`!!${tela()}.querySelector('[data-act="criar"]')`),
    'sem treino montado, a tela oferece montar o primeiro');
  ck(await ev(`${tela()}.querySelectorAll('.acoes .acao').length >= 2`),
    'com as pílulas de evolução e da semana');
  await ev(`${tela()}.querySelector('.acoes [data-act="evolucao"]').click()`); await sleep(600);
  ck(await ev("currentScreen().name === 'resumo'"), 'a pílula abre o resumo da academia');
  await ev(`${tela()}.querySelector('.nav [data-act="back"]').click()`); await sleep(500);
  ck(await ev("currentScreen().name === 'academia'"), 'e o voltar devolve para a academia');
  await ev("TAB = 'inicio'; popToRoot();"); await sleep(400);

  await ev("popToRoot(); abrirModulo('config');"); await sleep(600);
  ck(await ev("currentScreen().name === 'config'"), 'as configurações abrem pelo módulo');
  ck(await ev(`${tela()}.textContent.includes('Peso corporal')`), 'com os ajustes que moravam no Perfil');

  console.log('\no painel do Início:');
  await ev(`(function () {
    S.tarefas = []; S.settings.nome = '';
    var d = function (n) { var x = new Date(); x.setDate(x.getDate() + n); return dayKey(x.getTime()); };
    novaTarefa({ titulo: 'Academia', data: dayKey(Date.now()), hora: '06:30', fim: '08:00', cor: '#FF2D96' });
    novaTarefa({ titulo: 'Mercado', data: dayKey(Date.now()), cor: '#3F4FE0' });
    /* de propósito fora de ordem: o de depois de amanhã entra primeiro e com
       hora mais cedo que o de amanhã */
    novaTarefa({ titulo: 'Prova', data: d(2), hora: '08:00' });
    novaTarefa({ titulo: 'Dentista', data: d(1), hora: '17:00' });
    saveNow(); irParaAba('inicio'); currentScreen().refresh(); return 'ok';
  })()`);
  await sleep(800);

  ck(await ev(`${tela()}.querySelector('.saudar-data').textContent === fmtDataLonga(Date.now())`),
    'o cabeçalho abre com a data do dia');
  ck(await ev(`(function () {
    var s = saudacao();
    return currentScreen().el.querySelector('.saudar h1 i').textContent === s.slice(s.lastIndexOf(' ') + 1) + '!';
  })()`), 'sem nome cadastrado, o destaque cai sobre a hora do dia');

  await ev("S.settings.nome = 'Vitor'; saveNow(); currentScreen().refresh();"); await sleep(600);
  ck(await ev(`${tela()}.querySelector('.saudar h1 i').textContent === 'Vitor!'`),
    'com nome, é o nome que sai em destaque');
  const corNome = await ev(`getComputedStyle(${tela()}.querySelector('.saudar')).getPropertyValue('--accent').trim()`);
  ck(corNome === await ev('COR_AGENDA'),
    'na cor do dia, e não no branco de fora do treino (' + corNome + ')');

  const rots = await ev(`Array.from(${tela()}.querySelectorAll('.painel .pcard-rot')).slice(0, 3).map(function (r) { return r.textContent; }).join(' | ')`);
  ck(rots === 'Hoje | Próximos dias | Tempo de estudo',
    'o painel traz os três cartões do desenho (' + rots + ')');
  ck(await ev(`${tela()}.querySelector('.pcard .pcard-nota').textContent === '2 pendentes'`),
    'o cartão de hoje conta as pendentes no canto');
  ck(await ev(`${tela()}.querySelectorAll('.pcard .tarefa').length === 2`),
    'e lista as tarefas do dia');
  ck(await ev(`!!${tela()}.querySelector('.pcard-add')`),
    'com Adicionar tarefa no pé, sem abrir tela nenhuma');

  const prox = await ev(`Array.from(${tela()}.querySelectorAll('.prox-txt b')).map(function (b) { return b.textContent; }).join(' | ')`);
  ck(prox === 'Dentista | Prova',
    'próximos dias vem em ordem de data, não de hora (' + prox + ')');

  ck(await ev(`!!${tela()}.querySelector('.estudo-graf .graf path')`),
    'o tempo de estudo sai em curva');
  ck(await ev(`${tela()}.querySelectorAll('.estudo-dows span').length === 7`),
    'com um rótulo por dia');
  ck(await ev(`${tela()}.querySelector('.estudo-total b').textContent
    === fmtMin(estudoPorDia(7).reduce(function (a, d) { return a + d.min; }, 0))`),
    'e o total dos sete dias em destaque');
  await shot('v10-inicio-painel');

  console.log('\ncronômetro de estudo:');
  ck(await ev(`${tela()}.querySelector('.crono-visor').textContent === '00:00'`),
    'o relógio começa zerado');
  await ev(`${tela()}.querySelector('[data-act="tocar"]').click()`); await sleep(1300);
  ck(await ev('CRONO_ESTUDO.rodando === true'), 'Iniciar põe o relógio para andar');
  /* O relógio de um segundo do Chrome sem janela é estrangulado, então o teste
     chama o tique na mão. O que ele mede é o que importa: o visor avança e
     continua sendo o MESMO nó — se a tela fosse reconstruída a cada segundo,
     ela derrubaria o campo em foco e fecharia o teclado. */
  await ev("window.__visor = currentScreen().el.querySelector('.crono-visor');");
  await ev('CRONO_ESTUDO.desde -= 5000; globalTick();'); await sleep(300);
  ck(await ev(`${tela()}.querySelector('.crono-visor').textContent !== '00:00'`),
    'e o visor anda a cada tique do relógio global');
  ck(await ev("window.__visor === currentScreen().el.querySelector('.crono-visor')"),
    'sem reconstruir a tela: é o mesmo nó, com o texto trocado');
  ck(await ev(`${tela()}.querySelector('[data-act="tocar"] span').textContent === 'Pausar'`),
    'o botão vira Pausar');

  const antesMin = await ev('minutosTotais(S.materias[0])');
  await ev('CRONO_ESTUDO.acumulado = 26 * 60000; CRONO_ESTUDO.desde = Date.now();');
  await ev(`${tela()}.querySelector('[data-act="zerar"]').click()`); await sleep(800);
  ck(await ev("!!document.querySelector('.sheet')"),
    'encerrar não joga o tempo fora: pergunta em que matéria registrar');
  const pergunta = await ev("(function () { var e = document.querySelector('.sheet h3'); return e ? e.textContent : ''; })()");
  ck(pergunta.indexOf('26 min') > 0, 'com os minutos do relógio (' + pergunta + ')');
  await ev("document.querySelector('.sheet [data-x=yes]').click()"); await sleep(900);
  ck(await ev('minutosTotais(S.materias[0])') === antesMin + 26,
    'registrar soma os minutos na matéria escolhida');
  ck(await ev('cronoEstudoMs() === 0'), 'e o relógio volta a zero');

  console.log('\no cronômetro nas telas de estudo:');
  await ev("popToRoot(); abrirModulo('estudos');"); await sleep(700);
  ck(await ev(`!!${tela()}.querySelector('.crono-visor')`),
    'a tela de Estudos também traz o relógio');
  ck(await ev(`!${tela()}.querySelector('.pcard.crono .pcard-link')`),
    'sem o link de Abrir, que ali levaria para a própria tela');
  ck(await ev(`${tela()}.querySelector('.pcard.crono').compareDocumentPosition(
    ${tela()}.querySelector('.form-linhas')) & Node.DOCUMENT_POSITION_FOLLOWING`) > 0,
    'e vem antes do cadastro: cronometrar é diário, cadastrar matéria é uma vez');

  /* dentro de uma matéria o relógio já sai carimbado com ela */
  await ev('telaMateria(S.materias[0].id);'); await sleep(700);
  const sub = await ev(`${tela()}.querySelector('.pcard.crono .pcard-sub').textContent`);
  ck(sub === 'Cronômetro · ' + await ev('S.materias[0].nome'),
    'dentro da matéria ele diz de quem é o tempo (' + sub + ')');
  const corCrono = await ev(`getComputedStyle(${tela()}.querySelector('.pcard.crono')).getPropertyValue('--accent').trim()`);
  ck(corCrono === await ev('S.materias[0].cor'),
    'e veste a cor dela, não o amarelo do módulo (' + corCrono + ')');

  await ev(`${tela()}.querySelector('[data-act="tocar"]').click()`); await sleep(600);
  ck(await ev('CRONO_ESTUDO.materia === S.materias[0].id'),
    'ligar aqui carimba o tempo com a matéria');
  await ev("popToRoot(); irParaAba('inicio');"); await sleep(700);
  ck(await ev(`${tela()}.querySelector('.pcard.crono .pcard-sub').textContent === 'Cronômetro · ' + S.materias[0].nome`),
    'e o cartão do Início mostra o mesmo relógio, com o mesmo carimbo');

  const antesCarimbo = await ev('minutosTotais(S.materias[0])');
  await ev('CRONO_ESTUDO.acumulado = 40 * 60000; CRONO_ESTUDO.desde = Date.now();');
  await ev(`${tela()}.querySelector('[data-act="zerar"]').click()`); await sleep(800);
  ck(await ev("document.querySelector('.sheet [data-m].on') ? document.querySelector('.sheet [data-m].on').textContent : ''")
    === await ev('S.materias[0].nome'),
    'encerrar já vem com a matéria certa marcada, sem perguntar de novo');
  await ev("document.querySelector('.sheet [data-x=yes]').click()"); await sleep(900);
  ck(await ev('minutosTotais(S.materias[0])') === antesCarimbo + 40,
    'e os 40 minutos entram nela');
  ck(await ev("CRONO_ESTUDO.materia === ''"), 'o carimbo sai junto com o relógio zerado');

  console.log('\na grade do cronograma:');
  await ev(`(function () {
    S.tarefas = [];
    var hoje = dayKey(Date.now());
    novaTarefa({ titulo: 'Academia', data: hoje, hora: '06:30', fim: '08:00', cor: '#FF2D96' });
    novaTarefa({ titulo: 'Reunião', data: hoje, hora: '09:00', cor: '#0A84FF' });
    novaTarefa({ titulo: 'Mercado', data: hoje, cor: '#22E04A' });
    saveNow(); popToRoot(); abrirModulo('cronograma'); return 'ok';
  })()`);
  await sleep(800);

  ck(await ev("modoCronograma() === 'dia'"),
    'em 390px o cronograma abre no dia: sete colunas dariam 47px cada');
  ck(await ev(`${tela()}.querySelectorAll('.gc-col').length === 1`), 'com uma coluna só');
  ck(await ev(`!!${tela()}.querySelector('.form-linhas')`),
    'e o cadastro rápido e as listas continuam embaixo dela');

  await ev(`${tela()}.querySelector('.seg [data-m=semana]').click()`); await sleep(800);
  ck(await ev(`${tela()}.querySelectorAll('.gc-col').length === 7`),
    'a chave Semana abre as sete colunas');
  const dows = await ev(`Array.from(${tela()}.querySelectorAll('.gc-dia i')).map(function (i) { return i.textContent; }).join(',')`);
  ck(dows === 'SEG,TER,QUA,QUI,SEX,SÁB,DOM',
    'começando na segunda, como o calendário de parede (' + dows + ')');
  ck(await ev(`${tela()}.querySelectorAll('.gc-dia.hoje').length === 1`), 'e com hoje aceso');
  ck(await ev(`!${tela()}.querySelector('.form-linhas')`),
    'na semana a grade é a tela inteira, sem as listas embaixo');
  await shot('v11-crono-semana');

  const alturas = JSON.parse(await ev(`(function () {
    var r = {};
    currentScreen().el.querySelectorAll('.gc-bloco').forEach(function (x) {
      r[x.querySelector('b').textContent] = Math.round(x.getBoundingClientRect().height);
    });
    return JSON.stringify(r);
  })()`));
  ck(alturas['Academia'] === 81,
    'o bloco tem a altura do que ocupa: 1h30 vira 81px (' + alturas['Academia'] + ')');
  ck(alturas['Reunião'] === 54,
    'sem término marcado ele vale uma hora (' + alturas['Reunião'] + ')');
  ck(await ev(`${tela()}.querySelectorAll('.gc-bloco').length === 2`),
    'e quem não tem hora não vira bloco');
  ck(await ev(`${tela()}.querySelector('.gc-chip').textContent === 'Mercado'`),
    'ela não some: vai para a faixa de dia inteiro, ainda clicável');
  const corBloco = await ev(`getComputedStyle(${tela()}.querySelector('.gc-bloco')).getPropertyValue('--accent').trim()`);
  ck(corBloco === '#FF2D96', 'cada bloco leva a cor da própria tarefa (' + corBloco + ')');

  const semana0 = await ev('SEMANA_AGENDA');
  await ev(`${tela()}.querySelector('[data-act="prox"]').click()`); await sleep(700);
  ck(await ev('SEMANA_AGENDA') === semana0 + 7 * 86400000, 'a seta anda uma semana inteira');
  ck(await ev(`${tela()}.querySelectorAll('.gc-dia.hoje').length === 0`), 'e hoje sai da tela');
  await ev(`${tela()}.querySelector('[data-act="hoje"]').click()`); await sleep(700);
  ck(await ev('SEMANA_AGENDA') === semana0, 'Hoje traz de volta');

  await ev(`${tela()}.querySelector('.gc-bloco').click()`); await sleep(800);
  ck(await ev(`document.querySelector('.sheet [data-c="fim"]') ? document.querySelector('.sheet [data-c="fim"]').value : ''`) === '08:00',
    'tocar no bloco abre o editor com o término já preenchido');
  await ev("document.querySelector('.sheet [data-x=no]').click()"); await sleep(500);

  /* tocar no vazio marca alguma coisa naquela hora: é o gesto que a grade
     promete só por existir */
  await ev(`(function () {
    var col = currentScreen().el.querySelectorAll('.gc-col')[0];
    var r = col.getBoundingClientRect();
    col.dispatchEvent(new MouseEvent('click', { bubbles: true, clientY: r.top + 54 * 3 }));
  })()`);
  await sleep(800);
  const horaVazio = await ev(`document.querySelector('.sheet [data-c="hora"]') ? document.querySelector('.sheet [data-c="hora"]').value : ''`);
  ck(horaVazio === '08:00', 'e tocar no vazio abre o editor já naquela hora (' + horaVazio + ')');
  await ev("document.querySelector('.sheet [data-x=no]').click()"); await sleep(500);

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
