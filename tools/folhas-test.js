/* Testa as folhas de cadastro (tarefa, meta e matéria) na métrica do iPhone
   15 Pro, com e sem teclado na frente.
   Uso: node tools/folhas-test.js [saida]   (GYM_URL opcional) */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const OUT = process.argv[2] || path.join(__dirname, '..', '__shots');
const BASE = (process.env.GYM_URL || 'http://127.0.0.1:8099').replace(/\/$/, '');
const PORT = 9359;
const PROFILE = path.join(os.tmpdir(), 'gymnotion-chrome');

/* iPhone 15 Pro em retrato. O teclado ocupa cerca de 336px e NÃO encolhe o
   layout no modo standalone: só a visualViewport enxerga a perda. */
const TELA = { w: 393, h: 852 };
const TECLADO = 336;

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
    `--window-size=${TELA.w},${TELA.h}`, 'about:blank',
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
  await send('Emulation.setDeviceMetricsOverride', {
    width: TELA.w, height: TELA.h, deviceScaleFactor: 3, mobile: true,
  });

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
  await sleep(1500);
  await ev('localStorage.clear()');
  await send('Page.navigate', { url: BASE + '/index.html' });
  await sleep(1800);

  /* env() devolve zero no headless: injeta as margens seguras do 15 Pro, senão
     o teste mediria uma tela que não existe. */
  await ev(`(function () {
    var s = document.createElement('style');
    s.textContent = ':root { --safe-t: 59px !important; --safe-b: 34px !important; }';
    document.head.appendChild(s);
    return 'ok';
  })()`);
  await sleep(300);

  /* O teclado do iOS encolhe a visualViewport, não a janela. Sombreia as duas
     propriedades e avisa quem escuta, que é exatamente o que o Safari faz. */
  const teclado = (aberto) => ev(`(function () {
    var vv = window.visualViewport;
    var alt = ${aberto} ? ${TELA.h - TECLADO} : ${TELA.h};
    Object.defineProperty(vv, 'height', { configurable: true, get: function () { return alt; } });
    Object.defineProperty(vv, 'offsetTop', { configurable: true, get: function () { return 0; } });
    vv.dispatchEvent(new Event('resize'));
    return vv.height;
  })()`);

  const medida = () => ev(`(function () {
    var sh = document.querySelector('.sheet');
    if (!sh) return null;
    var bd = sh.parentElement;
    var vis = window.visualViewport.height;
    var acao = sh.querySelector('.sheet-actions');
    var estouraX = [];
    sh.querySelectorAll('.text-input, .chip, .swatch-btn, .pill-btn').forEach(function (el) {
      var b = el.getBoundingClientRect();
      if (b.right > window.innerWidth + 0.5 || b.left < -0.5) estouraX.push(el.className);
    });
    var r = sh.getBoundingClientRect();
    var a = acao ? acao.getBoundingClientRect() : null;
    return JSON.stringify({
      visivel: Math.round(vis),
      fundo: Math.round(bd.getBoundingClientRect().height),
      folhaTopo: Math.round(r.top),
      folhaBase: Math.round(r.bottom),
      acaoBase: a ? Math.round(a.bottom) : -1,
      estouraX: estouraX,
      rolagem: sh.scrollHeight - sh.clientHeight,
    });
  })()`);

  const abrirEditor = async (modulo) => {
    await ev(`popToRoot(); abrirModulo('${modulo}');`); await sleep(650);
    await ev("currentScreen().el.querySelector('.fab').click()"); await sleep(650);
  };

  const EDITORES = [
    ['cronograma', 'tarefa'],
    ['metas', 'meta'],
    ['estudos', 'materia'],
  ];

  for (const [modulo, nome] of EDITORES) {
    console.log('\nfolha de ' + nome + ' — sem teclado:');
    await teclado(false);
    await abrirEditor(modulo);
    let m = JSON.parse(await medida() || 'null');
    ck(!!m, 'a folha abre');
    ck(m && m.estouraX.length === 0,
      'nada estoura a largura da tela' + (m && m.estouraX.length ? ' (' + m.estouraX.join(', ') + ')' : ''));
    ck(m && m.acaoBase <= m.visivel, 'os botões cabem na tela (' + (m && m.acaoBase) + ' de ' + (m && m.visivel) + ')');
    await shot('s-' + nome + '-1-sem-teclado');

    console.log('folha de ' + nome + ' — com o teclado na frente:');
    await teclado(true);
    await sleep(400);
    m = JSON.parse(await medida() || 'null');
    ck(m && m.fundo === TELA.h - TECLADO,
      'o fundo encolhe para a área que sobrou (' + (m && m.fundo) + 'px)');
    ck(m && m.folhaBase <= m.visivel + 1,
      'a folha inteira fica acima do teclado (base em ' + (m && m.folhaBase) + ', visível até ' + (m && m.visivel) + ')');
    ck(m && m.acaoBase <= m.visivel + 1,
      'e o botão Salvar continua alcançável (' + (m && m.acaoBase) + ')');

    /* Quem rola é o miolo; a folha em si não. Se ela rolasse, os botões
       fixos passariam por cima do último campo em vez de ficarem abaixo. */
    const rolagem = JSON.parse(await ev(`(function () {
      var sh = document.querySelector('.sheet');
      var corpo = sh.querySelector('.form-corpo');
      corpo.scrollTop = corpo.scrollHeight;
      var acao = sh.querySelector('.sheet-actions').getBoundingClientRect();
      var campos = corpo.querySelectorAll('.text-input, .campo-cor');
      var ultimo = campos[campos.length - 1].getBoundingClientRect();
      return JSON.stringify({
        folhaRola: sh.scrollHeight > sh.clientHeight,
        corpoRola: corpo.scrollHeight > corpo.clientHeight,
        sobreposicao: Math.round(ultimo.bottom - acao.top),
      });
    })()`));
    ck(!rolagem.folhaRola, 'a folha inteira não rola, só o miolo dela');
    console.log('        (miolo ' + (rolagem.corpoRola ? 'rola' : 'cabe inteiro') + ' nesta folha)');
    ck(rolagem.sobreposicao <= 0,
      'os botões não cobrem o último campo (' + (rolagem.sobreposicao > 0 ? rolagem.sobreposicao + 'px por cima' : 'sem sobreposição') + ')');
    await shot('s-' + nome + '-2-com-teclado');

    /* fechar o teclado tem de devolver a folha ao tamanho normal */
    await teclado(false);
    await sleep(300);
    const volta = JSON.parse(await medida() || 'null');
    ck(volta && volta.fundo === TELA.h, 'fechando o teclado, o fundo volta à tela inteira');
    await ev("document.querySelector('.sheet [data-x=\"no\"]').click()"); await sleep(400);
    ck(await ev("!document.querySelector('.sheet')"), 'e Cancelar fecha a folha');
  }

  console.log('\ncampos nativos de data e hora:');
  await abrirEditor('cronograma');
  const campos = JSON.parse(await ev(`(function () {
    var d = document.querySelector('.sheet [data-c="data"]');
    var h = document.querySelector('.sheet [data-c="hora"]');
    var rd = d.getBoundingClientRect(), rh = h.getBoundingClientRect();
    return JSON.stringify({
      apar: getComputedStyle(d).webkitAppearance || getComputedStyle(d).appearance,
      alturaData: Math.round(rd.height), alturaHora: Math.round(rh.height),
      larguras: [Math.round(rd.width), Math.round(rh.width)],
      sobrepoe: rd.right > rh.left + 0.5,
    });
  })()`));
  ck(campos.apar === 'none', 'a aparência nativa é desligada, senão o iOS ignora a caixa');
  ck(campos.alturaData === 50 && campos.alturaHora === 50,
    'os dois respeitam os 50px de altura (' + campos.alturaData + ', ' + campos.alturaHora + ')');
  ck(!campos.sobrepoe, 'e não se sobrepõem na linha');
  ck(Math.abs(campos.larguras[0] - campos.larguras[1]) <= 1,
    'dividem a linha ao meio (' + campos.larguras.join(' e ') + ')');
  await ev("document.querySelector('.sheet [data-x=\"no\"]').click()"); await sleep(300);

  console.log('');
  console.log('seletor de cores:');
  await abrirEditor('metas');
  const pal = JSON.parse(await ev(`(function () {
    var campo = document.querySelector('.sheet .campo-cor');
    var r = campo.getBoundingClientRect();
    return JSON.stringify({
      existe: !!campo,
      nome: campo.querySelector('.lab').textContent,
      dentro: r.right <= window.innerWidth + 0.5 && r.left >= -0.5,
      altura: Math.round(r.height),
    });
  })()`));
  ck(pal.existe, 'o editor traz um campo de cor, não a grade de bolinhas');
  ck(pal.dentro, 'que cabe na largura da folha');
  ck(pal.altura === 50, 'com a mesma altura dos outros campos (' + pal.altura + 'px)');

  await ev("document.querySelector('.sheet .campo-cor').click()"); await sleep(600);
  const menu = JSON.parse(await ev(`(function () {
    var pop = document.querySelector('.pop');
    var r = pop.getBoundingClientRect();
    var itens = pop.querySelectorAll('.pop-item');
    return JSON.stringify({
      quantos: itens.length,
      dentro: r.left >= 11 && r.right <= window.innerWidth - 11
        && r.top >= 11 && r.bottom <= window.innerHeight - 11,
      marcado: (pop.querySelector('.pop-item.on') || {}).textContent || '',
      caixa: [Math.round(r.width), Math.round(r.height)],
      pos: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)],
      tela: [window.innerWidth, window.innerHeight],
    });
  })()`));
  ck(menu.quantos === await ev('COLORS.length'),
    'o menu suspenso traz as ' + menu.quantos + ' cores com nome');
  ck(menu.dentro, 'e cabe inteiro na tela (' + menu.caixa.join('x') + ' em ' + menu.pos.join(',') + ' de ' + menu.tela.join('x') + ')');
  ck(menu.marcado.indexOf('Verde') >= 0 || menu.marcado.length > 0,
    'com a cor atual marcada (' + menu.marcado.trim() + ')');
  await shot('s-paleta');
  await ev("document.querySelector('.pop-fundo').click()"); await sleep(400);
  await ev("document.querySelector('.sheet [data-x=\"no\"]').click()"); await sleep(400);

  console.log('');
  console.log('cores da paleta:');
  const cores = JSON.parse(await ev('JSON.stringify(COLORS.map(function (c) { return c.hex; }))'));
  /* Duas cores nao podem sair parecidas numa bolinha de 30px. Matiz sozinho
     engana: do vermelho ao amarelo cabem quatro cores em 45 graus, e todas
     pareciam distintas pela conta de matiz. A distancia em CIE Lab mede o que
     o olho realmente separa. */
  const lab = (hex) => {
    const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
    const [r, g, b] = v;
    const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
    const Y = (0.2126 * r + 0.7152 * g + 0.0722 * b);
    const Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
    const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const fx = f(X), fy = f(Y), fz = f(Z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  };
  const dE = (x, y) => {
    const A = lab(x), B = lab(y);
    return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]);
  };
  const matiz = (hex) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b); const min = Math.min(r, g, b); const d = max - min;
    if (!d) return 0;
    let hh;
    if (max === r) hh = ((g - b) / d) % 6;
    else if (max === g) hh = (b - r) / d + 2;
    else hh = (r - g) / d + 4;
    return (hh * 60 + 360) % 360;
  };

  const LIMITE = 25;
  let pior = { d: 1e9, par: '' };
  const parecidas = [];
  for (let i = 0; i < cores.length; i++) {
    for (let j = i + 1; j < cores.length; j++) {
      const d = dE(cores[i], cores[j]);
      if (d < pior.d) pior = { d, par: cores[i] + '/' + cores[j] };
      if (d < LIMITE) parecidas.push(cores[i] + '/' + cores[j] + ' ΔE ' + d.toFixed(0));
    }
  }
  ck(parecidas.length === 0,
    'nenhum par fica indistinguivel; o mais proximo e ' + pior.par
    + ' com ΔE ' + pior.d.toFixed(0) + (parecidas.length ? ' — abaixo de ' + LIMITE + ': ' + parecidas.join(', ') : ''));

  const verdes = cores.filter((c) => { const m = matiz(c); return m >= 90 && m <= 165; });
  ck(verdes.length === 2, 'ha exatamente dois verdes (' + verdes.join(', ') + ')');
  ck(verdes.length === 2 && Math.abs(lab(verdes[0])[0] - lab(verdes[1])[0]) > 20,
    'e eles sao um claro e um escuro (L* '
    + verdes.map((c) => lab(c)[0].toFixed(0)).join(' e ') + ')');

  console.log('');
  console.log('cor antiga, fora da paleta:');
  await ev(`novaMeta('Antiga', 100, '#8E9AAF'); saveNow(); popToRoot(); abrirModulo('metas');`);
  await sleep(650);
  await ev(`currentScreen().el.querySelectorAll('.meta-card')[0].click()`); await sleep(650);
  await ev(`currentScreen().el.querySelector('.nav [data-act="dir"]').click()`); await sleep(500);
  await ev(`(function () {
    var itens = document.querySelectorAll('.sheet-item');
    for (var i = 0; i < itens.length; i++) {
      if (itens[i].textContent.indexOf('Editar') >= 0) { itens[i].click(); return 'ok'; }
    }
    return 'nao achou';
  })()`); await sleep(700);
  const rotulo = await ev(`document.querySelector('.sheet .campo-cor .lab').textContent`);
  ck(rotulo === 'Cor própria',
    'uma cor fora da paleta se identifica em vez de sumir (' + rotulo + ')');
  await ev("document.querySelector('.sheet .campo-cor').click()"); await sleep(600);
  const antiga = JSON.parse(await ev(`(function () {
    var pop = document.querySelector('.pop');
    var marcada = pop.querySelector('.pop-item.on');
    return JSON.stringify({
      quantos: pop.querySelectorAll('.pop-item').length,
      marcada: marcada ? marcada.textContent.trim() : null,
      cor: marcada ? marcada.querySelector('.dot').style.background : null,
    });
  })()`));
  ck(antiga.quantos === await ev('COLORS.length + 1'),
    'ela entra no fim da lista (' + antiga.quantos + ' opções)');
  ck(antiga.marcada === 'Cor própria',
    'e continua marcada como a escolhida, em vez de o item parecer sem cor');
  await shot('s-paleta-cor-antiga');
  await ev("document.querySelector('.pop-fundo').click()"); await sleep(400);
  await ev("document.querySelector('.sheet [data-x=\"no\"]').click()"); await sleep(400);

  console.log('\nas outras folhas do app também acompanham:');
  await ev("popToRoot(); abrirModulo('config');"); await sleep(650);
  await ev(`(function () {
    var linhas = currentScreen().el.querySelectorAll('.ex-item');
    for (var i = 0; i < linhas.length; i++) {
      if (linhas[i].textContent.indexOf('Peso corporal') >= 0) { linhas[i].click(); return 'ok'; }
    }
    return 'nao achou';
  })()`);
  await sleep(600);
  await teclado(true); await sleep(350);
  const prompt = JSON.parse(await medida() || 'null');
  ck(prompt && prompt.fundo === TELA.h - TECLADO,
    'a folha simples de ajuste também encolhe com o teclado');
  ck(prompt && prompt.acaoBase <= prompt.visivel + 1,
    'e o Salvar dela fica acima do teclado (' + (prompt && prompt.acaoBase) + ')');
  await shot('s-prompt-com-teclado');
  await teclado(false);

  console.log('\nproblemas:', bad.length);
  bad.forEach((b) => console.log('  !', b));
  ws.close(); chrome.kill();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
