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
  /* A grade de atalhos saiu do Início: era a terceira cópia da mesma lista, e
     ocupava metade da tela. No lugar dela ficaram os cadernos. */
  ck(await ev(`!${tela()}.querySelector('.caderno') && ${tela()}.textContent.includes('Cadernos')`),
    'o painel traz o bloco de cadernos, vazio enquanto não houver nenhum');
  ck(await ev(`${tela()}.querySelectorAll('.pcard').length >= 4`),
    'com os cartões do painel: hoje, próximos, estudo e cronômetro');
  await shot('v1-inicio');

  console.log('');
  console.log('a cor do app:');
  /* Antes cada módulo trazia o próprio hexadecimal e a soma era um mostruário.
     Agora existe uma cor de marca e ela vale para tudo. */
  const marca = (await ev('corMarca()')).toUpperCase();
  ck(await ev("ESQUEMAS.length === 5"), 'há cinco esquemas para escolher');
  ck(await ev("contextAccent() === corMarca()"),
    'fora do treino, o acento é a cor do app (' + marca + ')');
  ck((await ev(`(function () {
    var v = [];
    currentScreen().el.querySelectorAll('.tab-item').forEach(function (c) {
      v.push(getComputedStyle(c).getPropertyValue('--accent').trim().toUpperCase());
    });
    return Array.from(new Set(v)).join(',');
  })()`)) === marca, 'e todos os módulos da grade usam ela, sem exceção');

  await ev("S.settings.esquema = 'verde'; saveNow(); aplicarEsquema(); popToRoot();"); await sleep(600);
  const verde = (await ev('corMarca()')).toUpperCase();
  ck(verde !== marca, 'trocar de esquema muda a cor de marca (' + verde + ')');
  ck((await ev(`getComputedStyle(currentScreen().el.querySelector('.tab-item')).getPropertyValue('--accent').trim()`)).toUpperCase() === verde,
    'e a troca chega às telas já montadas depois dela');
  await ev("S.settings.esquema = 'rosa'; saveNow(); aplicarEsquema(); popToRoot();"); await sleep(600);

  console.log('');
  console.log('a cápsula que cresce:');
  const caixaCap = () => ev(`(function () {
    var r = currentScreen().el.querySelector('.tab-capsula').getBoundingClientRect();
    return JSON.stringify([Math.round(r.width), Math.round(r.height)]);
  })()`);
  const fechada = JSON.parse(await caixaCap());
  ck(fechada[1] === 54, 'fechada, a cápsula tem a altura de uma linha de abas (' + fechada.join('x') + ')');
  ck(await ev(`${tela()}.querySelectorAll('.tab-linha .tab').length === ABAS.length`),
    'com as abas dentro dela');
  ck(await ev(`!!${tela()}.querySelector('.tab-mais')`),
    'e o botão redondo por fora, como peça separada');

  await ev(`${tela()}.querySelectorAll('.tabbar .tab')[ABAS.length].click()`); await sleep(900);
  const aberta = JSON.parse(await caixaCap());
  ck(aberta[1] > fechada[1] * 3 && aberta[0] > fechada[0],
    'o botão abre a própria cápsula, que cresce nos dois sentidos (' + aberta.join('x') + ')');
  ck(await ev(`${tela()}.querySelector('.tab-capsula').classList.contains('aberta')`),
    'e ela abre por classe, não sendo reconstruída: é o que deixa a transição acontecer');
  ck(await ev(`${tela()}.querySelectorAll('.tab-grade .tab-item').length >= MODULOS.length`),
    'a grade traz todos os módulos');
  ck(await ev(`${tela()}.querySelector('.tab-grade').textContent.includes('Resumo')`),
    'e mais os atalhos da academia');
  ck(await ev(`getComputedStyle(${tela()}.querySelector('.tab-linha')).opacity === '0'`),
    'a linha de abas some enquanto a grade está aberta');

  /* cada ladrilho na cor do seu módulo, a mesma regra dos atalhos do Início */
  const corJogos = await ev(`(function () {
    var itens = currentScreen().el.querySelectorAll('.tab-item');
    for (var i = 0; i < itens.length; i++) {
      if (itens[i].textContent.trim() === 'Jogos') {
        return getComputedStyle(itens[i]).getPropertyValue('--accent').trim().toUpperCase();
      }
    }
    return '';
  })()`);
  ck(corJogos === (await ev('corMarca()')).toUpperCase(),
    'cada ladrilho leva a cor do app (' + corJogos + ')');

  /* "Configurações" não cabe em 72px de ladrilho e vira "Ajustes" */
  ck(await ev(`${tela()}.querySelector('.tab-grade').textContent.includes('Ajustes')`),
    'o nome longo tem versão curta, para não sair cortado no meio da palavra');

  /* a cápsula tem de continuar por cima do escurecido, senão o ✕ some */
  ck(await ev(`(function () {
    var b = parseInt(getComputedStyle(document.querySelector('.tabbar')).zIndex, 10);
    var f = parseInt(getComputedStyle(document.querySelector('.tab-fundo')).zIndex, 10);
    return b > f;
  })()`), 'a barra fica acima do fundo escurecido, para o ✕ continuar clicável');
  await shot('v2-menu');

  await ev("document.querySelector('.tab-fundo').click()"); await sleep(800);
  ck(await ev("!document.querySelector('.tab-fundo')"), 'tocar fora fecha o painel');
  ck(await ev(`!${tela()}.querySelector('.tab-capsula').classList.contains('aberta')`),
    'e a cápsula volta ao tamanho de barra');
  ck(JSON.parse(await caixaCap())[1] === 54, 'com a altura de antes');

  /* trocar de tela com o painel aberto não pode deixar a marca para trás */
  await ev(`${tela()}.querySelectorAll('.tabbar .tab')[ABAS.length].click()`); await sleep(700);
  await ev("TAB = 'agua'; popToRoot();"); await sleep(600);
  ck(await ev('MENU_ABERTO === null'),
    'trocar de tela com o painel aberto fecha o painel junto');
  ck(await ev("!document.querySelector('.tab-fundo')"), 'sem deixar o fundo escurecido para trás');
  await ev(`${tela()}.querySelectorAll('.tabbar .tab')[ABAS.length].click()`); await sleep(700);
  ck(await ev(`${tela()}.querySelector('.tab-capsula').classList.contains('aberta')`),
    'e o botão volta a abrir de primeira, em vez de gastar um toque fechando o que não existe');
  await ev("document.querySelector('.tab-fundo').click()"); await sleep(700);

  await ev("TAB = 'inicio'; popToRoot();"); await sleep(400);
  const folga = await ev(`(function () {
    var sc = ${tela()}.querySelector('.scroll');
    sc.scrollTop = sc.scrollHeight;
    var fim = ${tela()}.querySelector('.scroll > *:last-child').getBoundingClientRect();
    var barra = ${tela()}.querySelector('.tabbar').getBoundingClientRect();
    return Math.round(barra.top - fim.bottom);
  })()`);
  ck(folga >= 0, 'a barra de abas nao cobre o fim da lista (' + folga + 'px de folga)');


  /* ============================================================
     CRONOGRAMA
     ============================================================ */
  console.log('\nrotina:');
  await ev("popToRoot(); abrirModulo('rotina');"); await sleep(700);
  ck(await ev("currentScreen().name === 'rotina'"), 'o menu abre a rotina');
  ck(await ev(`${tela()}.textContent.includes('Nada marcado para hoje')`), 'e ela começa vazia');

  await ev(`(function () {
    var el = currentScreen().el;
    el.querySelector('[data-c="nome"], [data-c="titulo"]').value = 'Tomar creatina';
    el.querySelector('.form-linhas [data-act="ok"]').click();
    return 'ok';
  })()`);
  await sleep(700);
  ck(await ev('S.rotina.length === 1'), 'o cadastro rápido cria o item');
  ck(await ev('S.rotina[0].dias.length === 0'),
    'sem dia escolhido, ele vale todo dia: é o caso comum e não custa sete toques');
  ck(await ev(`${tela()}.querySelectorAll('.tarefa .dia-toque.todo').length === 7`),
    'e a linha mostra os sete dias acesos de leve, que é como se diz "todo dia" ali');

  /* marcar e desmarcar é por dia, e o dia é guardado como data */
  await ev(`${tela()}.querySelector('.tarefa .check').click()`); await sleep(500);
  ck(await ev('feitoNoDia(S.rotina[0]) === true'), 'marcar guarda o dia de hoje');
  ck(await ev("S.rotina[0].feitos[0] === dayKey(Date.now())"),
    'como data, e não como um "feito" que alguém precisaria zerar à meia-noite');
  ck(await ev("feitoNoDia(S.rotina[0], Date.now() + 86400000) === false"),
    'e por isso amanhã ele já nasce em branco');
  await ev(`${tela()}.querySelector('.tarefa .check').click()`); await sleep(500);
  ck(await ev('S.rotina[0].feitos.length === 0'), 'desmarcar tira o dia de volta');

  /* item que vale só em alguns dias */
  await ev(`(function () {
    var hoje = new Date().getDay();
    var outro = (hoje + 1) % 7;
    novoItemRotina('Só hoje', [hoje]);
    novoItemRotina('Só amanhã', [outro]);
    saveNow(); currentScreen().refresh(); return 'ok';
  })()`);
  await sleep(700);
  ck(await ev('S.rotina.length === 3 && rotinaDoDia().length === 2'),
    'dos três itens, dois valem hoje');
  ck(await ev(`${tela()}.textContent.includes('Outros dias')`),
    'o que não vale hoje fica à vista num bloco à parte, em vez de sumir');
  ck(await ev(`(function () {
    var fora = currentScreen().el.querySelector('.tarefa.fora');
    return !!fora && fora.textContent.indexOf('Só amanhã') >= 0;
  })()`), 'apagado, e é o item do outro dia');
  await shot('v3-rotina');

  /* a folha dos dias da semana */
  await ev("diasDaRotina(S.rotina[0], currentScreen());"); await sleep(700);
  ck(await ev("document.querySelectorAll('.sheet [data-d]').length === 7"),
    'a folha traz os sete dias');
  await ev("document.querySelector('.sheet [data-d=\"1\"]').click()"); await sleep(400);
  ck(await ev('S.rotina[0].dias.join(",") === "1"'), 'tocar num dia marca ele');
  await ev("document.querySelector('.sheet [data-d=\"1\"]').click()"); await sleep(400);
  ck(await ev('S.rotina[0].dias.length === 0'), 'e tocar de novo desmarca, voltando a valer todo dia');
  await ev("document.querySelector('.sheet [data-x=ok]').click()"); await sleep(500);

  await ev("S.rotina = []; saveNow();");

  console.log('\no horário da rotina:');
  await ev(`(function () {
    S.rotina = [];
    novoItemRotina('Academia', [1,2,3,4,5], '', '06:30', '08:00');
    novoItemRotina('Beber água');
    novoItemRotina('Estudar', [], '', '19:00', '');
    saveNow(); popToRoot(); abrirModulo('rotina'); return 'ok';
  })()`);
  await sleep(800);
  ck(await ev("S.rotina[0].hora === '06:30' && S.rotina[0].fim === '08:00'"),
    'o item guarda início e fim');
  const linhas = await ev(`Array.from(currentScreen().el.querySelectorAll('.rot-sub i')).map(function (x) { return x.textContent; }).join(' | ')`);
  ck(linhas.indexOf('06:30 – 08:00') >= 0, 'a linha mostra a faixa quando há fim (' + linhas + ')');
  ck(linhas.indexOf('19:00') >= 0, 'e só o começo quando não há');
  ck(await ev(`currentScreen().el.querySelector('.tarefa-txt b').textContent === 'Academia'`),
    'com hora primeiro e na ordem do relógio, a mesma ordem das tarefas');

  /* Os dias moram na própria linha: eram três toques até a folha para uma
     decisão que se muda o tempo todo. */
  console.log('');
  console.log('os dias na própria linha:');
  ck(await ev(`currentScreen().el.querySelectorAll('.tarefa .dia-toque').length === S.rotina.filter(function (i) { return valeNoDia(i); }).length * 7 + S.rotina.filter(function (i) { return !valeNoDia(i); }).length * 7`),
    'cada item traz os sete dias na linha, sem abrir folha nenhuma');
  const acesos = await ev(`(function () {
    var linha = Array.from(currentScreen().el.querySelectorAll('.tarefa')).find(function (x) {
      return x.textContent.indexOf('Academia') >= 0;
    });
    return Array.from(linha.querySelectorAll('.dia-toque.on')).map(function (b) { return b.textContent; }).join('');
  })()`);
  ck(acesos === 'STQQS', 'os dias em que ele vale saem acesos, na ordem da semana (' + acesos + ')');
  ck(await ev(`(function () {
    var linha = Array.from(currentScreen().el.querySelectorAll('.tarefa')).find(function (x) {
      return x.textContent.indexOf('Ler 20 páginas') >= 0 || x.textContent.indexOf('Estudar') >= 0;
    });
    return linha.querySelectorAll('.dia-toque.todo').length === 7;
  })()`), 'e quem vale todo dia acende os sete de leve: sete apagados diriam o contrário');

  /* um toque só, sem folha e sem confirmação */
  await ev(`(function () {
    var linha = Array.from(currentScreen().el.querySelectorAll('.tarefa')).find(function (x) {
      return x.textContent.indexOf('Academia') >= 0;
    });
    linha.querySelector('[data-d="6"]').click();
    return 'ok';
  })()`);
  await sleep(600);
  ck(await ev("S.rotina.find(function (i) { return i.titulo === 'Academia'; }).dias.indexOf(6) >= 0"),
    'um toque na letra marca o dia — sem folha, sem Pronto');
  ck(await ev("!document.querySelector('.sheet')"), 'e sem abrir nada por cima');

  /* a folha do horário, e a saída de volta ao dia inteiro */
  await ev("horaDaRotina(S.rotina.find(function (i) { return i.titulo === 'Beber água'; }), currentScreen());");
  await sleep(700);
  ck(await ev("!!document.querySelector('.sheet [data-c=\"hora\"]')"), 'a folha do horário abre');
  await ev(`(function () {
    document.querySelector('.sheet [data-c="hora"]').value = '10:00';
    document.querySelector('.sheet [data-x=ok]').click();
  })()`);
  await sleep(700);
  ck(await ev("S.rotina.find(function (i) { return i.titulo === 'Beber água'; }).hora === '10:00'"),
    'marcar hora guarda a hora');
  await ev("horaDaRotina(S.rotina.find(function (i) { return i.titulo === 'Beber água'; }), currentScreen());");
  await sleep(700);
  await ev("document.querySelector('.sheet [data-x=limpar]').click()"); await sleep(700);
  ck(await ev("S.rotina.find(function (i) { return i.titulo === 'Beber água'; }).hora === ''"),
    'e "Sem horário" devolve o item ao dia inteiro, sem precisar apagar campo a campo');

  console.log('\no cronograma:');
  await ev(`(function () {
    S.tarefas = [];
    novaTarefa({ titulo: 'Dentista', data: dayKey(Date.now()), hora: '09:00', fim: '10:00' });
    novaTarefa({ titulo: 'Mercado', data: dayKey(Date.now()) });
    saveNow(); popToRoot(); definirModoCronograma('dia'); abrirModulo('cronograma');
    return 'ok';
  })()`);
  await sleep(900);
  ck(await ev("currentScreen().name === 'cronograma'"), 'o módulo abre');
  ck(await ev(`!!${tela()}.querySelector('.gc-tabela')`), 'com a grade de horas');

  /* a grade não desenha tarefa nem rotina: desenha compromisso, das duas fontes */
  const titulos = await ev(`Array.from(${tela()}.querySelectorAll('.gc-bloco b')).map(function (b) { return b.textContent; }).join(' | ')`);
  ck(titulos.indexOf('Academia') >= 0 && titulos.indexOf('Dentista') >= 0,
    'e as duas fontes no mesmo desenho: rotina e tarefa (' + titulos + ')');
  ck(await ev(`${tela()}.querySelectorAll('.gc-bloco.rotina').length >= 1`),
    'o que se repete sai com borda tracejada, senão seria indistinguível');
  const chips = await ev(`Array.from(${tela()}.querySelectorAll('.gc-chip')).map(function (c) { return c.textContent; }).join(' | ')`);
  ck(chips.indexOf('Mercado') >= 0 && chips.indexOf('Beber água') >= 0,
    'o que não tem hora vai para a faixa de dia inteiro em vez de sumir, das duas fontes (' + chips + ')');

  /* rótulo não inventa fim */
  const rotulos = await ev(`(function () {
    var r = {};
    currentScreen().el.querySelectorAll('.gc-bloco').forEach(function (b) {
      r[b.querySelector('b').textContent] = b.querySelector('span').textContent;
    });
    return JSON.stringify(r);
  })()`);
  const mapa = JSON.parse(rotulos);
  ck(mapa['Academia'] === '06:30 – 08:00', 'com fim marcado, o bloco mostra a faixa');
  ck(mapa['Estudar'] === '19:00',
    'sem fim marcado, mostra só o começo: a altura de uma hora é desenho, não dado');
  await shot('v13-cronograma');

  /* tocar num bloco de rotina abre o menu do item, e não o editor de tarefa */
  await ev(`(function () {
    var b = Array.from(currentScreen().el.querySelectorAll('.gc-bloco')).find(function (x) {
      return x.querySelector('b').textContent === 'Academia';
    });
    b.click(); return 'ok';
  })()`);
  await sleep(700);
  ck(await ev("!!document.querySelector('.sheet') && document.querySelector('.sheet').textContent.indexOf('Dias da semana') > 0"),
    'tocar num bloco de rotina abre o menu do item');
  await ev("document.querySelector('.backdrop').click()"); await sleep(500);

  /* a noite inteira à vista: uma grade que para às 21 esconde justamente as
     horas onde cai a rotina de quem trabalha de dia */
  const horas = await ev(`Array.from(${tela()}.querySelectorAll('.gc-hora span')).map(function (x) { return x.textContent; })`);
  ck(horas[horas.length - 1] === '23:00',
    'a régua vai até as 23:00 (última linha: ' + horas[horas.length - 1] + ')');

  await ev(`${tela()}.querySelector('.seg [data-m=semana]').click()`); await sleep(800);
  ck(await ev(`${tela()}.querySelectorAll('.gc-col').length === 7`), 'a chave Semana abre as sete colunas');
  ck(await ev(`${tela()}.querySelectorAll('.gc-bloco').length >= 5`),
    'e a rotina se repete pelos dias em que vale, que é o que faz a grade valer a pena');
  await ev("S.rotina = []; S.tarefas = []; saveNow();");

  console.log('\ntarefas:');
  await ev("popToRoot(); abrirModulo('tarefas');"); await sleep(700);
  ck(await ev("currentScreen().name === 'tarefas'"), 'o módulo se chama tarefas');
  ck(await ev(`${tela()}.querySelector('.sec h2').textContent === 'O que tem para fazer'`),
    'com o título novo');
  /* a grade de horários e o calendário do mês saíram */
  ck(await ev(`!${tela()}.querySelector('.cal-grade') && !${tela()}.querySelector('.gc-tabela')`),
    'sem grade de horários e sem calendário do mês: o que ficou é a lista');
  ck(await ev(`!!${tela()}.querySelector('.crono-nav')`),
    'a navegação entre dias fica, que é o que andava no tempo');
  ck(await ev(`${tela()}.textContent.includes('Nada por aqui')`), 'e o dia começa vazio');
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
  await shot('v3-tarefas');

  await ev(`${tela()}.querySelector('.tarefa .check').click()`); await sleep(450);
  ck(await ev("tarefasDoDia().filter(function (t) { return t.feito; }).length === 1"),
    'tocar no círculo marca a tarefa como feita');
  ck(await ev(`${tela()}.querySelectorAll('.tarefa')[2].querySelector('.tarefa-txt b').textContent === 'Dentista'`),
    'e ela desce para o fim da lista em vez de sumir');
  ck(await ev('pendentesDoDia() === 2'), 'sobram 2 pendentes hoje');

  /* andar no tempo continua possível sem o calendário */
  const diaAntes = await ev('dayKey(DIA_AGENDA)');
  await ev(`${tela()}.querySelector('[data-act="prox"]').click()`); await sleep(500);
  ck(await ev('dayKey(DIA_AGENDA)') !== diaAntes, 'a seta anda um dia');
  await ev(`${tela()}.querySelector('[data-act="hoje"]').click()`); await sleep(500);
  ck(await ev('dayKey(DIA_AGENDA)') === diaAntes, 'e Hoje volta');

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
  /* a lista abre com a cor do app, então o quinto item é o quarto da paleta */
  ck(t && t.cor === await ev('COLORS[3].hex'), 'e com a cor escolhida no menu (' + (t && t.cor) + ')');
  ck(await ev("!document.querySelector('.sheet')"), 'o editor fecha depois de salvar');
  ck(await ev(`${tela()}.querySelectorAll('.tarefa')[1].querySelector('.tarefa-txt b').textContent === 'Consulta'`),
    'e ela entra na lista já na posição do horário, entre as 14h e a feita');

  /* adicionar sem título não pode criar tarefa fantasma */
  const antesVazio = await ev('S.tarefas.length');
  await ev(`${tela()}.querySelector('.form-linhas [data-act="ok"]').click()`); await sleep(500);
  ck(await ev('S.tarefas.length') === antesVazio, 'adicionar sem título não cria nada');


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
  /* cor vazia quer dizer "segue o app": quem escolheu uma fica com ela, quem
     não escolheu acompanha o esquema */
  ck(coresMetas === await ev("S.metas.map(corDe).join(',')"),
    'cada cofrinho na sua cor, e quem não escolheu nenhuma na do app (' + coresMetas + ')');
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
  ck(corNome === await ev('corMarca()'),
    'na cor do app (' + corNome + ')');

  const rots = await ev(`Array.from(${tela()}.querySelectorAll('.painel .pcard-rot')).slice(0, 3).map(function (r) { return r.textContent; }).join(' | ')`);
  ck(rots === 'Rotina | Próximos dias | Tempo de estudo',
    'o painel abre com a rotina no lugar das tarefas do dia (' + rots + ')');

  /* o cartão da rotina só mostra o que vale hoje */
  await ev(`(function () {
    var hoje = new Date().getDay();
    novoItemRotina('Tomar creatina');
    novoItemRotina('Alongar');
    novoItemRotina('Só noutro dia', [(hoje + 3) % 7]);
    alternarItemRotina(S.rotina[0].id);
    saveNow(); currentScreen().refresh(); return 'ok';
  })()`);
  await sleep(700);
  ck(await ev(`${tela()}.querySelector('.pcard .pcard-nota').textContent === '1 de 2'`),
    'o cartão conta quantos dos que valem hoje já foram cumpridos');
  ck(await ev(`${tela()}.querySelectorAll('.pcard .tarefa').length === 2`),
    'e lista só os dois que caem hoje, não os três');
  ck(await ev(`!${tela()}.textContent.includes('Só noutro dia')`),
    'o de outro dia não tem nada a dizer aqui');
  ck(await ev(`${tela()}.querySelector('.pcard-add').textContent.trim() === 'Ver a rotina'`),
    'e o pé leva para a tela em vez de prometer adicionar');
  await ev('S.rotina = []; saveNow(); currentScreen().refresh();'); await sleep(500);

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

  console.log('\ncadernos e anotações:');
  await ev("popToRoot(); abrirModulo('cadernos');"); await sleep(700);
  ck(await ev("currentScreen().name === 'cadernos'"), 'o módulo abre');
  ck(await ev(`${tela()}.textContent.includes('Nada anotado ainda')`), 'e começa vazio');

  await ev(`(function () {
    var el = currentScreen().el;
    el.querySelector('[data-c="nome"]').value = 'Claude Code';
    el.querySelector('.form-linhas [data-act="ok"]').click();
    return 'ok';
  })()`);
  await sleep(700);
  ck(await ev('S.cadernos.length === 1'), 'criar um caderno pelo cadastro rápido');
  ck(await ev("S.cadernos[0].cor === '' && corDe(S.cadernos[0]) === corMarca()"),
    'que nasce sem cor própria: cor vazia quer dizer que ele segue o app');
  ck(await ev(`(function () {
    S.settings.esquema = 'verde'; aplicarEsquema();
    var pintado = corDe(S.cadernos[0]) === corMarca();
    S.settings.esquema = 'rosa'; aplicarEsquema();
    return pintado;
  })()`), 'e por isso ele acompanha quando a cor do app muda');
  ck(await ev(`${tela()}.querySelector('.caderno .caderno-txt i').textContent === '0 anotações'`),
    'a capa mostra a contagem, que começa em zero');

  await ev(`${tela()}.querySelector('.caderno').click()`); await sleep(700);
  ck(await ev("currentScreen().name === 'caderno'"), 'tocar na capa abre o caderno');
  await ev(`(function () {
    var el = currentScreen().el;
    el.querySelector('[data-c="titulo"]').value = 'Comandos do dia a dia';
    el.querySelector('.form-linhas [data-act="ok"]').click();
    return 'ok';
  })()`);
  await sleep(900);
  ck(await ev('S.cadernos[0].notas.length === 1'), 'anotar cria a anotação');
  ck(await ev("currentScreen().name === 'nota'"),
    'e já abre o editor: criar uma anotação e não poder escrever nela seria meio caminho');

  await ev(`(function () {
    var t = currentScreen().el.querySelector('[data-c="texto"]');
    t.value = 'git status e git commit';
    t.dispatchEvent(new Event('input', { bubbles: true }));
    return 'ok';
  })()`);
  /* a gravação é adiada em 600ms para não gravar a cada tecla, e o Chrome sem
     janela ainda estica timer curto: 1,6s cobre os dois */
  await sleep(1600);
  ck(await ev("S.cadernos[0].notas[0].texto.indexOf('git status') === 0"),
    'o texto é guardado sozinho enquanto se escreve, sem botão de salvar');
  await shot('v12-nota');

  await ev(`currentScreen().el.querySelector('.nav [data-act="back"]').click()`); await sleep(800);
  ck(await ev("currentScreen().name === 'caderno'"), 'voltar sai do editor');
  ck(await ev(`${tela()}.textContent.includes('Comandos do dia a dia')`),
    'e a anotação aparece na lista do caderno');

  /* o Início mostra os cadernos no lugar onde ficava a grade de atalhos */
  await ev("popToRoot(); irParaAba('inicio');"); await sleep(700);
  ck(await ev(`${tela()}.textContent.includes('Cadernos')`), 'o Início traz o bloco de cadernos');
  ck(await ev(`${tela()}.querySelector('.caderno .caderno-txt b').textContent === 'Claude Code'`),
    'com o caderno mexido por último na frente');
  ck(await ev(`${tela()}.querySelector('.caderno .caderno-txt i').textContent === '1 anotação'`),
    'e a contagem no singular quando é uma só');

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
