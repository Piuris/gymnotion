/* Testa o financeiro: entradas e saídas, o mês como unidade, a divisão por
   categoria, a média que conta só os dias vividos e o formulário na tela.
   Uso: node tools/financeiro-test.js [saida]   (GYM_URL opcional) */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const OUT = process.argv[2] || path.join(__dirname, '..', '__shots');
const BASE = (process.env.GYM_URL || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PORT = 9369;
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
  console.log('lançar:');
  ck(await ev("novoLancamento({ valor: 0 }) === null"), 'lançamento de zero não é lançamento');
  ck(await ev("novoLancamento({ valor: -10 }) === null"), 'valor negativo também não entra');
  ck(await ev("S.lancamentos.length === 0"), 'e nenhum dos dois deixou lixo na lista');

  ck(await ev("novoLancamento({ valor: 25.5, categoria: 'mercado', descricao: 'Pão' }).tipo === 'saida'"),
    'sem dizer o tipo, o lançamento é saída');
  ck(await ev("novoLancamento({ valor: 4200, tipo: 'entrada', categoria: 'salario' }).tipo === 'entrada'"),
    'e entrada entra como entrada');
  ck(await ev("S.lancamentos[0].data === dayKey(Date.now())"), 'com o dia de hoje quando nenhum é dado');
  ck(await ev("novoLancamento({ valor: 10, categoria: 'nao-existe' }).categoria === 'outros'"),
    'categoria desconhecida cai em Outros, em vez de sumir do resumo');
  ck(await ev("novoLancamento({ valor: 10, tipo: 'entrada', categoria: 'mercado' }).categoria === 'outros'"),
    'e uma categoria de saída não vale para entrada: salário não é mercado');
  ck(await ev("novoLancamento({ valor: 3.456 }).valor === 3.46"), 'o valor é arredondado no centavo');

  await ev("S.lancamentos = []; saveNow();");

  /* ============================================================
     O MÊS
     ============================================================ */
  console.log('');
  console.log('o mês é a unidade:');
  const montado = await ev(`(function () {
    var h = new Date();
    var mes = h.getFullYear() + '-' + String(h.getMonth() + 1).padStart(2, '0');
    var passado = new Date(h.getFullYear(), h.getMonth() - 1, 15);
    novoLancamento({ valor: 3000, tipo: 'entrada', categoria: 'salario', data: mes + '-01' });
    novoLancamento({ valor: 100, categoria: 'mercado', data: mes + '-01' });
    novoLancamento({ valor: 60, categoria: 'mercado', data: mes + '-02' });
    novoLancamento({ valor: 40, categoria: 'lazer', data: mes + '-02' });
    novoLancamento({ valor: 999, categoria: 'contas', data: dayKey(passado.getTime()) });
    saveNow();
    return JSON.stringify({ mes: mes, passado: dayKey(passado.getTime()) });
  })()`);
  const mm = JSON.parse(montado);
  ck(await ev('S.lancamentos.length === 5'), 'cinco lançamentos no total');
  ck(await ev('lancamentosDoMes().length === 4'), 'mas só quatro caem no mês corrente');
  ck(await ev('entradasDoMes() === 3000'), 'as entradas somam 3000');
  ck(await ev('saidasDoMes() === 200'), 'as saídas somam 200');
  ck(await ev('saldoDoMes() === 2800'), 'e o saldo é a diferença entre as duas');
  ck(await ev(`saidasDoMes(tsDaData('${mm.passado}')) === 999`),
    'o mês passado guarda o dele, separado');

  const ordem = await ev("lancamentosDoMes().map(function (l) { return l.data.slice(-2); }).join(' ')");
  ck(ordem.indexOf('02') === 0, 'a lista vem do dia mais novo para o mais velho (' + ordem + ')');

  console.log('');
  console.log('para onde foi:');
  const cats = JSON.parse(await ev('JSON.stringify(saidaPorCategoria().map(function (c) { return [c.cat.id, c.total, Math.round(c.fatia * 100)]; }))'));
  ck(cats.length === 2, 'só as categorias com saída no mês aparecem (' + cats.length + ')');
  ck(cats[0][0] === 'mercado' && cats[0][1] === 160, 'a maior vem primeiro: mercado com 160');
  ck(cats[0][2] === 80 && cats[1][2] === 20, 'com a fatia de cada uma (80% e 20%)');
  ck(!cats.some((c) => c[0] === 'salario'),
    'a entrada fica de fora: misturar salário com mercado não responde "para onde foi"');

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
  console.log('teto de saídas:');
  ck(await ev('orcamento() === 0 && sobraDoMes() === 0'), 'sem teto definido não há sobra a calcular');
  await ev('S.settings.orcamento = 500; saveNow();');
  ck(await ev('sobraDoMes() === 300'), 'com teto de 500 e 200 de saída, sobram 300');
  await ev('S.settings.orcamento = 150; saveNow();');
  ck(await ev('sobraDoMes() === 0'), 'passando do teto, a sobra é zero e não fica negativa');
  await ev('S.settings.orcamento = 500; saveNow();');

  /* ============================================================
     A TELA
     ============================================================ */
  console.log('');
  console.log('tela do financeiro:');
  await ev("popToRoot(); abrirModulo('financeiro');"); await sleep(700);
  ck(await ev("currentScreen().name === 'financeiro'"), 'o módulo abre a tela');
  ck(await ev(`${tela()}.querySelector('.sec h2').textContent.trim() === 'Controle do mês'`),
    'com o título do desenho');
  const valores = await ev(`Array.from(${tela()}.querySelectorAll('.stats .stat b')).map(function (b) { return b.textContent; }).join(' | ')`);
  ck(valores === 'R$ 3.000 | R$ 200 | R$ 2.800',
    'três cartões: entradas, saídas e saldo (' + valores + ')');
  const cores = await ev(`Array.from(${tela()}.querySelectorAll('.stats .stat')).map(function (c) {
    return getComputedStyle(c).getPropertyValue('--accent').trim();
  }).join(',')`);
  ck(cores === await ev("[COR_ENTRADA, COR_SAIDA, corMarca()].join(',')"),
    'cada um na sua cor: verde entra, vermelho sai, azul de saldo (' + cores + ')');
  ck(await ev(`${tela()}.querySelectorAll('.cat-linha').length === 2`), 'duas categorias na divisão');
  ck(await ev(`${tela()}.querySelectorAll('.gasto').length === 4`), 'os quatro lançamentos na lista');
  ck(await ev(`${tela()}.querySelectorAll('.gasto-dia').length === 2`),
    'agrupados por dia, com dois cabeçalhos');
  ck(await ev(`${tela()}.querySelector('.gasto.entrada .gasto-valor').textContent.indexOf('+') === 0`),
    'a entrada aparece com sinal de mais');
  await shot('fn1-financeiro');

  /* saldo negativo tem de mudar de cor */
  await ev("novoLancamento({ valor: 5000, categoria: 'casa', descricao: 'Reforma' }); currentScreen().refresh();");
  await sleep(500);
  const corSaldo = await ev(`getComputedStyle(${tela()}.querySelectorAll('.stats .stat')[2]).getPropertyValue('--accent').trim()`);
  ck(corSaldo === await ev('COR_SAIDA'), 'saldo negativo sai no vermelho (' + corSaldo + ')');
  await ev("removerLancamento(S.lancamentos[0].id); currentScreen().refresh();"); await sleep(400);

  console.log('');
  console.log('navegar entre meses:');
  ck(await ev(`${tela()}.querySelector('.mes-troca [data-act="prox"]').disabled === true`),
    'no mês corrente não dá para avançar para o futuro');
  await ev(`${tela()}.querySelector('.mes-troca [data-act="ant"]').click()`); await sleep(600);
  ck(await ev(`${tela()}.querySelectorAll('.stats .stat b')[1].textContent === 'R$ 999'`),
    'voltar um mês mostra as saídas dele');
  await ev(`${tela()}.querySelector('.mes-troca [data-act="prox"]').click()`); await sleep(600);
  ck(await ev(`${tela()}.querySelectorAll('.stats .stat b')[1].textContent === 'R$ 200'`),
    'avançar devolve ao mês corrente');

  /* ============================================================
     O FORMULÁRIO NA TELA
     ============================================================ */
  console.log('');
  console.log('formulário na própria tela:');
  ck(await ev(`!${tela()}.querySelector('.fab')`),
    'não há botão flutuante: o formulário mora na tela');
  ck(await ev(`${tela()}.querySelectorAll('.form-linhas .campo').length === 5`),
    'com os cinco campos do desenho');
  ck(await ev(`${tela()}.querySelector('[data-c=tipo]').value === 'saida'`), 'começando em Saída');
  const catsSaida = await ev(`${tela()}.querySelectorAll('[data-c=cat] option').length`);
  ck(catsSaida === await ev('CATEGORIAS_SAIDA.length'),
    'e com as categorias de saída (' + catsSaida + ')');

  await ev(`${tela()}.querySelector('[data-act=lancar]').click()`); await sleep(500);
  ck(await ev('S.lancamentos.length === 5'), 'lançar sem valor não cria nada');

  /* trocar o tipo troca a lista de categorias */
  await ev(`(function () {
    var t = currentScreen().el.querySelector('[data-c=tipo]');
    t.value = 'entrada';
    t.dispatchEvent(new Event('change'));
  })()`);
  await sleep(600);
  ck(await ev(`${tela()}.querySelector('[data-c=tipo]').value === 'entrada'`), 'o tipo troca');
  ck(await ev(`${tela()}.querySelectorAll('[data-c=cat] option').length === CATEGORIAS_ENTRADA.length`),
    'e a lista de categorias troca junto: salário não é uma saída');

  await ev(`(function () {
    var el = currentScreen().el;
    var d = el.querySelector('[data-c=desc]'); d.value = 'Freela'; d.dispatchEvent(new Event('input'));
    var v = el.querySelector('[data-c=valor]'); v.value = '800'; v.dispatchEvent(new Event('input'));
    var c = el.querySelector('[data-c=cat]'); c.value = 'freela'; c.dispatchEvent(new Event('input'));
    el.querySelector('[data-act=lancar]').click();
  })()`);
  await sleep(700);
  ck(await ev('S.lancamentos.length === 6'), 'com valor, o lançamento entra');
  ck(await ev("lancamentosDoMes()[0].tipo === 'entrada' && lancamentosDoMes()[0].categoria === 'freela'"),
    'com o tipo e a categoria escolhidos');
  ck(await ev('entradasDoMes() === 3800'), 'e as entradas do mês sobem para 3800');
  ck(await ev(`${tela()}.querySelector('[data-c=tipo]').value === 'entrada'`),
    'o tipo fica escolhido para o próximo: quem lança mercado costuma lançar de novo');
  ck(await ev(`${tela()}.querySelector('[data-c=valor]').value === ''`),
    'mas o valor limpa, para não lançar duas vezes o mesmo sem querer');
  await shot('fn2-lancado');

  /* lançar num mês diferente do aberto não pode esconder o lançamento */
  await ev(`${tela()}.querySelector('.mes-troca [data-act="ant"]').click()`); await sleep(600);
  await ev(`(function () {
    var el = currentScreen().el;
    var d = new Date(); var alvo = new Date(d.getFullYear(), d.getMonth(), 20);
    var v = el.querySelector('[data-c=valor]'); v.value = '15'; v.dispatchEvent(new Event('input'));
    var dt = el.querySelector('[data-c=data]'); dt.value = dayKey(alvo.getTime()); dt.dispatchEvent(new Event('input'));
    el.querySelector('[data-act=lancar]').click();
  })()`);
  await sleep(700);
  ck(await ev("mesKey(MES_FIN) === mesKey(Date.now())"),
    'o mês aberto acompanha o lançamento, senão ele sumiria da tela ao salvar');

  console.log('');
  console.log('apagar:');
  const antes = await ev('S.lancamentos.length');
  await ev(`${tela()}.querySelector('.gasto [data-act=menu]').click()`); await sleep(600);
  await ev(`(function () {
    var itens = document.querySelectorAll('.sheet-item');
    for (var i = 0; i < itens.length; i++) {
      if (itens[i].textContent.indexOf('Apagar') >= 0) { itens[i].click(); return 'ok'; }
    }
    return 'nao achou';
  })()`); await sleep(600);
  await ev(`document.querySelector('.sheet [data-x=yes]').click()`); await sleep(800);
  ck(await ev('S.lancamentos.length') === antes - 1, 'apagar tira o lançamento');

  /* ============================================================
     MIGRAÇÃO E PERSISTÊNCIA
     ============================================================ */
  console.log('');
  console.log('gastos antigos viram lançamentos:');
  const migrou = await ev(`(function () {
    var v3 = {
      version: 3, workouts: [], sessions: [], customExercises: [], agua: {}, settings: {},
      gastos: [{ id: 'g_1', valor: 42, categoria: 'mercado', descricao: 'Feira', data: dayKey(Date.now()) }],
    };
    importJSON(JSON.stringify(v3));
    return JSON.stringify({
      n: S.lancamentos.length,
      tipo: S.lancamentos[0] && S.lancamentos[0].tipo,
      valor: S.lancamentos[0] && S.lancamentos[0].valor,
      sobrou: !!S.gastos,
    });
  })()`);
  const mg = JSON.parse(migrou);
  ck(mg.n === 1, 'um backup com gastos antigos vira um lançamento');
  ck(mg.tipo === 'saida', 'marcado como saída, que é o que todos eram');
  ck(mg.valor === 42, 'com o valor preservado');
  ck(!mg.sobrou, 'e a lista velha some do estado');

  console.log('');
  console.log('persistência e atalho:');
  await ev(`
    novoLancamento({ valor: 120, categoria: 'mercado' });
    novoLancamento({ valor: 900, tipo: 'entrada', categoria: 'salario' });
    S.settings.orcamento = 800; saveNow(); 'ok';
  `);
  const guardado = await ev('JSON.stringify([S.lancamentos.length, S.settings.orcamento])');
  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1700);
  ck(await ev('JSON.stringify([S.lancamentos.length, S.settings.orcamento])') === guardado,
    'lançamentos e teto sobrevivem ao recarregar (' + guardado + ')');

  await ev("TAB = 'inicio'; popToRoot();"); await sleep(600);
  ck(await ev(`Array.from(${tela()}.querySelectorAll('.tab-item')).some(function (b) { return b.textContent.trim() === 'Financeiro'; })`),
    'o módulo aparece na grade de atalhos');
  const saldoCard = await ev(`(function () {
    var s = ${tela()}.querySelectorAll('.stats .stat');
    return s[s.length - 1].textContent.replace(/\\s+/g, ' ').trim();
  })()`);
  ck(saldoCard.indexOf('Saldo do mês') === 0 && saldoCard.indexOf('R$') > 0,
    'e o painel traz o saldo do mês (' + saldoCard + ')');
  await shot('fn3-painel');

  console.log('\nproblemas:', bad.length);
  bad.forEach((b) => console.log('  !', b));
  ws.close(); chrome.kill();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
