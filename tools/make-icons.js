/* Gera os ícones do app a partir de icons/icone.jpeg.
 *
 * Uso: node tools/make-icons.js
 *
 * A arte vem com margem preta em volta do quadrado arredondado. O iOS aplica a
 * própria máscara arredondada por cima, então usar a imagem inteira deixaria o
 * desenho pequeno dentro de uma moldura. Por isso o gerador detecta o retângulo
 * do desenho e recorta até ele.
 *
 * Usa o canvas de um Chrome headless para decodificar o JPEG e exportar PNG,
 * evitando qualquer dependência de processamento de imagem.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const RAIZ = path.join(__dirname, '..');
const DIR = path.join(RAIZ, 'icons');
const ORIGEM = 'icone.jpeg';
const PERFIL = path.join(os.tmpdir(), 'gymnotion-chrome-icones');
const PORTA_HTTP = 8124;
const PORTA_CDP = 9345;

/* Fundo usado para completar a versão "maskable" do Android, que precisa de
   margem de segurança: o mesmo preto fosco do tema. */
const FUNDO = '#0D0D0F';

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
].find((p) => fs.existsSync(p));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TIPOS = { '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg', '.png': 'image/png' };

(async () => {
  if (!CHROME) throw new Error('Chrome não encontrado');
  if (!fs.existsSync(path.join(DIR, ORIGEM))) {
    throw new Error('Coloque a arte em icons/' + ORIGEM);
  }

  const servidor = http.createServer((req, res) => {
    const nome = decodeURIComponent(req.url.replace(/^\//, '').split('?')[0]);
    const arq = path.join(DIR, nome);
    const tipo = TIPOS[path.extname(nome).toLowerCase()];
    if (tipo && fs.existsSync(arq)) {
      res.writeHead(200, { 'Content-Type': tipo });
      fs.createReadStream(arq).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<!DOCTYPE html><meta charset="utf-8"><title>icones</title>');
    }
  });
  await new Promise((r) => servidor.listen(PORTA_HTTP, '127.0.0.1', r));

  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--mute-audio', '--no-first-run',
    '--user-data-dir=' + PERFIL, '--remote-debugging-port=' + PORTA_CDP, 'about:blank',
  ], { stdio: 'ignore' });

  let alvo = null;
  for (let i = 0; i < 40 && !alvo; i++) {
    await sleep(250);
    try {
      const lista = await (await fetch(`http://127.0.0.1:${PORTA_CDP}/json/list`)).json();
      alvo = lista.find((t) => t.type === 'page');
    } catch (e) { /* subindo */ }
  }
  if (!alvo) throw new Error('Chrome não respondeu ao CDP');

  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pend = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) {
      const p = pend.get(m.id); pend.delete(m.id);
      m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
    }
  };
  const send = (metodo, params) => new Promise((resolve, reject) => {
    const i = ++id; pend.set(i, { resolve, reject });
    ws.send(JSON.stringify({ id: i, method: metodo, params: params || {} }));
  });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error((d.exception && d.exception.description) || d.text);
    }
    return r.result && r.result.value;
  };

  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: `http://127.0.0.1:${PORTA_HTTP}/` });
  await sleep(800);

  /* carrega a arte e acha o retângulo do desenho */
  const caixa = await ev(`(async () => {
    const img = new Image();
    img.src = '/${ORIGEM}';
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;

    /* a margem é preta; o desenho e seu brilho são mais claros */
    const LIMITE = 14;
    let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        if (lum > LIMITE) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    window.__img = img;
    return { w: img.width, h: img.height, x0, y0, x1, y1 };
  })()`);

  /* recorte quadrado centrado no desenho */
  const largura = caixa.x1 - caixa.x0 + 1;
  const altura = caixa.y1 - caixa.y0 + 1;
  const lado = Math.min(caixa.w, caixa.h, Math.max(largura, altura));
  const cx = (caixa.x0 + caixa.x1) / 2;
  const cy = (caixa.y0 + caixa.y1) / 2;
  const sx = Math.max(0, Math.min(caixa.w - lado, Math.round(cx - lado / 2)));
  const sy = Math.max(0, Math.min(caixa.h - lado, Math.round(cy - lado / 2)));

  console.log('origem: %dx%d', caixa.w, caixa.h);
  console.log('desenho: %dx%d a partir de (%d, %d)', largura, altura, caixa.x0, caixa.y0);
  console.log('recorte: %d x %d em (%d, %d)', lado, lado, sx, sy);

  const gerar = async (tamanho, escala, tipo, qualidade) => ev(`(async () => {
    const c = document.createElement('canvas');
    c.width = c.height = ${tamanho};
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.fillStyle = '${FUNDO}';
    g.fillRect(0, 0, ${tamanho}, ${tamanho});
    const destino = Math.round(${tamanho} * ${escala});
    const margem = Math.round((${tamanho} - destino) / 2);
    g.drawImage(window.__img, ${sx}, ${sy}, ${lado}, ${lado}, margem, margem, destino, destino);
    return c.toDataURL('${tipo}', ${qualidade});
  })()`);

  /* O Android recorta a "maskable" num círculo: o desenho precisa caber na zona
     segura de 80%. As demais o iOS mascara sozinho, então vão inteiras.

     A arte tem gradiente, que o PNG comprime mal (o 512 saía com 179 KB). O
     apple-touch-icon fica em PNG por segurança; os tamanhos grandes, que só o
     manifest usa, vão em WebP — lido por Safari 14+ e Chrome. */
  const jobs = [
    ['icon-180.png', 180, 1, 'image/png', 1],
    ['icon-192.png', 192, 1, 'image/png', 1],
    ['icon-512.webp', 512, 1, 'image/webp', 0.9],
    ['icon-512-maskable.webp', 512, 0.72, 'image/webp', 0.9],
  ];

  let total = 0;
  for (const [nome, tamanho, escala, tipo, qualidade] of jobs) {
    const dataUrl = await gerar(tamanho, escala, tipo, qualidade);
    if (!dataUrl.startsWith('data:' + tipo)) throw new Error(tipo + ' não suportado');
    const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
    fs.writeFileSync(path.join(DIR, nome), buf);
    total += buf.length;
    console.log('%s  %dx%d  %s KB', nome, tamanho, tamanho, (buf.length / 1024).toFixed(1));
  }
  console.log('total: %s KB', (total / 1024).toFixed(1));

  ['icon-512.png', 'icon-512-maskable.png'].forEach((velho) => {
    const alvo = path.join(DIR, velho);
    if (fs.existsSync(alvo)) { fs.unlinkSync(alvo); console.log('removido: ' + velho); }
  });

  ws.close(); chrome.kill(); servidor.close();

  console.log('');
  console.log('Lembre de subir o ?v= em index.html, manifest.webmanifest e sw.js:');
  console.log('o Safari guarda o apple-touch-icon por muito tempo e ignora Cache-Control,');
  console.log('entao so uma URL nova faz o iPhone buscar o desenho atualizado.');
  process.exit(0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(1); });
