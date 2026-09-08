/* Testa o controle de gastos: o mês como unidade, a divisão por categoria,
   a média que conta só os dias vividos e o teto mensal.
   Uso: node tools/gastos-test.js [saida]   (GYM_URL opcional) */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const OUT = process.argv[2] || path.join(__dirname, '..', '__shots');
const BASE = (process.env.GYM_URL || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PORT = 9367;
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

  /* ============================================================
     AS REGRAS
     ============================================================ */
  console.log('lançar gasto:');
  ck(await ev("novoGasto({ valor: 0 }) === null"), 'gasto de zero não é gasto');
  ck(await ev("novoGasto({ valor: -10 }) === null"), 'valor negativo também não entra');
  ck(await ev("S.gastos.length === 0"), 'e nenhum dos dois deixou lixo na lista');

  ck(await ev("novoGasto({ valor: 25.5, categoria: 'mercado', descricao: 'Pão' }).valor === 25.5"),
    'um gasto normal entra com o valor dado');
  ck(await ev("S.gastos[0].data === dayKey(Date.now())"), 'com o dia de hoje quando nenhum é dado');
  ck(await ev("novoGasto({ valor: 10, categoria: 'nao-existe' }).categoria === 'outros'"),
    'categoria desconhecida cai em Outros, em vez de sumir do resumo');
  ck(await ev("novoGasto({ valor: 3.456 }).valor === 3.46"),
    'o valor é arredondado no centavo');

  await ev("S.gastos = []; saveNow();");

  /* ============================================================
     O MÊS
     ============================================================ */
  console.log('');
  console.log('o mês é a unidade:');
  const montado = await ev(`(function () {
    var h = new Date();
    var mes = h.getFullYear() + '-' + String(h.getMonth() + 1).padStart(2, '0');
    var passado = new Date(h.getFullYear(), h.getMonth() - 1, 15);
    var mesPassado = dayKey(passado.getTime());
    novoGasto({ valor: 100, categoria: 'mercado', data: mes + '-01' });
    novoGasto({ valor: 60, categoria: 'mercado', data: mes + '-02' });
    novoGasto({ valor: 40, categoria: 'lazer', data: mes + '-02' });
    novoGasto({ valor: 999, categoria: 'contas', data: mesPassado });
    saveNow();
    return JSON.stringify({ mes: mes, passado: mesPassado });
  })()`);
  const mm = JSON.parse(montado);
  ck(await ev('S.gastos.length === 4'), 'quatro lançamentos no total');
  ck(await ev('gastosDoMes().length === 3'), 'mas só três caem no mês corrente');
  ck(await ev('totalGastos(gastosDoMes()) === 200'), 'somando 200 no mês');
  ck(await ev(`totalGastos(gastosDoMes(tsDaData('${mm.passado}'))) === 999`),
    'e o mês passado guarda o dele, separado');

  const ordem = await ev("gastosDoMes().map(function (g) { return g.data.slice(-2) + ':' + g.valor; }).join(' ')");
  ck(ordem.indexOf('02:') === 0, 'a lista vem do dia mais novo para o mais velho (' + ordem + ')');

  console.log('');
  console.log('para onde foi:');
  const cats = JSON.parse(await ev('JSON.stringify(gastoPorCategoria().map(function (c) { return [c.cat.id, c.total, Math.round(c.fatia * 100)]; }))'));
  ck(cats.length === 2, 'só as categorias com gasto no mês aparecem (' + cats.length + ')');
  ck(cats[0][0] === 'mercado' && cats[0][1] === 160, 'a maior vem primeiro: mercado com 160');
  ck(cats[0][2] === 80 && cats[1][2] === 20, 'com a fatia de cada uma (80% e 20%)');
  ck(await ev("infoCategoria('mercado').cor === '#25E36B'"), 'cada categoria tem cor própria');

  console.log('');
  console.log('média e projeção:');
  const conta = JSON.parse(await ev(`JSON.stringify({
    dia: new Date().getDate(),
    diasMes: diasNoMes(),
    media: Math.round(mediaDiaria() * 100) / 100,
    proj: Math.round(projecaoDoMes()),
  })`));
  ck(Math.abs(conta.media - 200 / conta.dia) < 0.02,
    'no mês corrente a média divide pelos dias já vividos (' + conta.media + ' = 200 / ' + conta.dia + ')');
  ck(conta.proj === Math.round((200 / conta.dia) * conta.diasMes),
    'e a projeção estende esse ritmo até o fim do mês (' + conta.proj + ')');
  ck(await ev(`projecaoDoMes(tsDaData('${mm.passado}')) === 999`),
    'num mês fechado a projeção é o próprio total, sem inventar futuro');

  console.log('');
  console.log('teto do mês:');
  ck(await ev('orcamento() === 0 && sobraDoMes() === 0'), 'sem teto definido não há sobra a calcular');
  await ev('S.settings.orcamento = 500; saveNow();');
  ck(await ev('sobraDoMes() === 300'), 'com teto de 500 e 200 gastos, sobram 300');
  await ev('S.settings.orcamento = 150; saveNow();');
  ck(await ev('sobraDoMes() === 0'), 'passando do teto, a sobra é zero e não fica negativa');
  await ev('S.settings.orcamento = 500; saveNow();');

  /* ============================================================
     A TELA
     ============================================================ */
  console.log('');
  console.log('tela de gastos:');
  await ev("popToRoot(); abrirModulo('gastos');"); await sleep(700);
  ck(await ev("currentScreen().name === 'gastos'"), 'o módulo abre a tela');
  const corTela = await ev(`getComputedStyle(${tela()}).getPropertyValue('--accent').trim()`);
  ck(corTela === await ev('COR_GASTOS'), 'com a cor própria do módulo (' + corTela + ')');
  ck(await ev(`${tela()}.querySelector('.hero-titulo').textContent.trim() === 'R$ 200'`),
    'o cartão traz o total do mês');
  ck(await ev(`${tela()}.querySelector('.hero-num').textContent.indexOf('R$ 500') >= 0`),
    'contra o teto');
  ck(await ev(`${tela()}.querySelector('.hero-nota').textContent.indexOf('Sobram R$ 300') >= 0`),
    'e diz quanto sobra');
  ck(await ev(`${tela()}.querySelectorAll('.cat-linha').length === 2`), 'duas categorias na divisão');
  const corCat = await ev(`getComputedStyle(${tela()}.querySelector('.cat-linha')).getPropertyValue('--accent').trim()`);
  ck(corCat === '#25E36B', 'cada linha na cor da categoria (' + corCat + ')');
  ck(await ev(`${tela()}.querySelectorAll('.gasto').length === 3`), 'os três lançamentos na lista');
  ck(await ev(`${tela()}.querySelectorAll('.gasto-dia').length === 2`),
    'agrupados por dia, com dois cabeçalhos');
  ck(await ev(`${tela()}.querySelectorAll('.dias-mes .dias-col').length === diasNoMes()`),
    'e o gráfico traz um traço por dia do mês');
  await shot('gt1-gastos');

  /* teto estourado tem de se distinguir de teto batido */
  await ev("S.settings.orcamento = 150; saveNow(); currentScreen().refresh();"); await sleep(500);
  ck(await ev(`${tela()}.querySelector('.progress').classList.contains('estourou')`),
    'passando do teto, a barra muda de tom');
  ck(await ev(`${tela()}.querySelector('.hero-nota').textContent.indexOf('Passou R$ 50') >= 0`),
    'e o cartão diz quanto passou');
  await ev("S.settings.orcamento = 500; saveNow(); currentScreen().refresh();"); await sleep(400);

  console.log('');
  console.log('navegar entre meses:');
  await ev(`${tela()}.querySelector('.cal-topo [data-act="prox"]').disabled === true`);
  ck(await ev(`${tela()}.querySelector('.cal-topo [data-act="prox"]').disabled === true`),
    'no mês corrente não dá para avançar para o futuro');
  await ev(`${tela()}.querySelector('.cal-topo [data-act="ant"]').click()`); await sleep(600);
  ck(await ev(`${tela()}.querySelector('.hero-titulo').textContent.trim() === 'R$ 999'`),
    'voltar um mês mostra o total dele');
  ck(await ev(`${tela()}.querySelector('.cal-topo [data-act="prox"]').disabled === false`),
    'e aí o avançar volta a funcionar');
  await ev(`${tela()}.querySelector('.cal-topo [data-act="prox"]').click()`); await sleep(600);
  ck(await ev(`${tela()}.querySelector('.hero-titulo').textContent.trim() === 'R$ 200'`),
    'avançar devolve ao mês corrente');

  /* ============================================================
     O EDITOR
     ============================================================ */
  console.log('');
  console.log('editor:');
  await ev(`${tela()}.querySelector('.fab').click()`); await sleep(650);
  ck(await ev("!!document.querySelector('.sheet [data-c=valor]')"), 'o editor pede o valor');
  ck(await ev("document.querySelectorAll('.sheet [data-cat]').length === CATEGORIAS_GASTO.length"),
    'com uma opção por categoria');
  ck(await ev("document.querySelector('.sheet [data-cat=mercado]').classList.contains('on')"),
    'já com uma escolhida');
  ck(await ev("document.querySelector('.sheet [data-c=data]').value === dayKey(Date.now())"),
    'e o dia de hoje preenchido');

  await ev(`document.querySelector('.sheet [data-x=yes]').click()`); await sleep(500);
  ck(await ev('S.gastos.length === 4'), 'salvar sem valor não cria nada');
  ck(await ev("!!document.querySelector('.sheet')"), 'e o editor fica aberto para corrigir');

  await ev(`(function () {
    document.querySelector('.sheet [data-c=valor]').value = '77.7';
    document.querySelector('.sheet [data-c=desc]').value = 'Padaria';
    document.querySelector('.sheet [data-cat=comida]').click();
  })()`);
  await sleep(400);
  const corFolha = await ev(`getComputedStyle(document.querySelector('.sheet .form')).getPropertyValue('--accent').trim()`);
  ck(corFolha === await ev("infoCategoria('comida').cor"),
    'a folha veste a cor da categoria escolhida (' + corFolha + ')');
  await ev(`document.querySelector('.sheet [data-x=yes]').click()`); await sleep(800);
  ck(await ev('S.gastos.length === 5'), 'com valor, o gasto entra');
  ck(await ev("gastosDoMes()[0].descricao === 'Padaria' && gastosDoMes()[0].categoria === 'comida'"),
    'com a descrição e a categoria escolhidas');
  ck(await ev('totalGastos(gastosDoMes()) === 277.7'), 'e o total do mês sobe para 277,70');
  ck(await ev(`${tela()}.querySelector('.hero-titulo').textContent.indexOf('277') >= 0`),
    'a tela já mostra o total novo');

  /* lançar num mês diferente do aberto não pode esconder o lançamento */
  await ev(`${tela()}.querySelector('.cal-topo [data-act="ant"]').click()`); await sleep(600);
  await ev(`${tela()}.querySelector('.fab').click()`); await sleep(650);
  await ev(`(function () {
    var d = new Date();
    var alvo = new Date(d.getFullYear(), d.getMonth(), 20);
    document.querySelector('.sheet [data-c=valor]').value = '15';
    document.querySelector('.sheet [data-c=data]').value = dayKey(alvo.getTime());
    document.querySelector('.sheet [data-x=yes]').click();
  })()`);
  await sleep(800);
  ck(await ev("mesKey(MES_GASTOS) === mesKey(Date.now())"),
    'o mês aberto acompanha o lançamento, senão ele sumiria da tela ao salvar');

  console.log('');
  console.log('editar e apagar:');
  await ev(`${tela()}.querySelectorAll('.gasto')[0].click()`); await sleep(650);
  ck(await ev("document.querySelector('.sheet h3').textContent === 'Editar gasto'"),
    'tocar num lançamento abre para editar');
  await ev(`(function () {
    document.querySelector('.sheet [data-c=valor]').value = '20';
    document.querySelector('.sheet [data-x=yes]').click();
  })()`);
  await sleep(800);
  ck(await ev("S.gastos.filter(function (g) { return g.valor === 20; }).length === 1"),
    'editar muda o valor sem criar outro');
  ck(await ev('S.gastos.length === 6'), 'a lista continua com seis');

  const antes = await ev('S.gastos.length');
  await ev(`${tela()}.querySelector('.gasto [data-act=menu]').click()`); await sleep(600);
  await ev(`(function () {
    var itens = document.querySelectorAll('.sheet-item');
    for (var i = 0; i < itens.length; i++) {
      if (itens[i].textContent.indexOf('Apagar') >= 0) { itens[i].click(); return 'ok'; }
    }
    return 'nao achou';
  })()`); await sleep(600);
  await ev(`document.querySelector('.sheet [data-x=yes]').click()`); await sleep(800);
  ck(await ev('S.gastos.length') === antes - 1, 'apagar tira o lançamento');

  console.log('');
  console.log('persistência e atalho:');
  const guardado = await ev('JSON.stringify([S.gastos.length, S.settings.orcamento])');
  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1700);
  ck(await ev('JSON.stringify([S.gastos.length, S.settings.orcamento])') === guardado,
    'gastos e teto sobrevivem ao recarregar (' + guardado + ')');

  await ev("TAB = 'inicio'; popToRoot();"); await sleep(600);
  ck(await ev(`Array.from(${tela()}.querySelectorAll('.hub-card b')).some(function (b) { return b.textContent === 'Gastos'; })`),
    'o módulo aparece na grade de atalhos');
  const resumo = await ev(`(function () {
    var cards = ${tela()}.querySelectorAll('.hub-card');
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].querySelector('b').textContent === 'Gastos') return cards[i].querySelector('span').textContent;
    }
    return '';
  })()`);
  ck(resumo.indexOf('R$') === 0 && resumo.indexOf('de R$ 500') > 0,
    'com o gasto do mês contra o teto (' + resumo + ')');
  await shot('gt2-inicio');

  console.log('\nproblemas:', bad.length);
  bad.forEach((b) => console.log('  !', b));
  ws.close(); chrome.kill();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
