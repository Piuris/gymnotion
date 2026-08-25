/* Baixa as fotos do free-exercise-db (domínio público / Unlicense), corta em
   quadrado, reduz e grava em img/<slug>.webp. Gera também js/exercise-images.js
   com a lista de exercícios que têm foto.

   Uso: node tools/fetch-images.js

   O corte e a conversão são feitos por um Chrome headless via canvas, para não
   precisar de nenhuma dependência de processamento de imagem. */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const RAIZ = path.join(__dirname, '..');
const IMG_DIR = path.join(RAIZ, 'img');
const TMP = path.join(os.tmpdir(), 'gymnotion-orig');
const PERFIL = path.join(os.tmpdir(), 'gymnotion-chrome-img');
const PORTA_HTTP = 8123;
const PORTA_CDP = 9340;

const LADO = 192;          // lado do quadrado final, em pixels
const QUALIDADE = 0.72;    // qualidade do WebP

const FONTE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main';

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
].find((p) => fs.existsSync(p));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slugify(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

async function baixar(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status + ' em ' + url);
  return Buffer.from(await res.arrayBuffer());
}

(async () => {
  if (!CHROME) throw new Error('Chrome não encontrado');
  fs.mkdirSync(IMG_DIR, { recursive: true });
  fs.mkdirSync(TMP, { recursive: true });

  /* ---- 1. catálogo e mapeamento ---- */
  console.log('baixando catálogo do free-exercise-db...');
  const catalogo = JSON.parse((await baixar(FONTE + '/dist/exercises.json')).toString('utf8'));
  const porNome = new Map(catalogo.map((e) => [e.name, e]));

  const mapa = JSON.parse(fs.readFileSync(path.join(__dirname, 'image-map.json'), 'utf8'));
  delete mapa._comment;

  const tarefas = [];
  const semImagem = [];
  for (const [pt, en] of Object.entries(mapa)) {
    if (!en) { semImagem.push(pt + ' (sem equivalente)'); continue; }
    const ex = porNome.get(en);
    if (!ex || !ex.images || !ex.images.length) {
      semImagem.push(pt + ' -> "' + en + '" não encontrado');
      continue;
    }
    tarefas.push({ pt, slug: slugify(pt), url: FONTE + '/exercises/' + ex.images[0] });
  }
  console.log('com foto: %d | sem foto: %d', tarefas.length, semImagem.length);
  semImagem.forEach((s) => console.log('  - ' + s));

  /* ---- 2. baixa os originais ---- */
  console.log('\nbaixando %d originais...', tarefas.length);
  let n = 0;
  for (const t of tarefas) {
    const destino = path.join(TMP, t.slug + '.jpg');
    if (!fs.existsSync(destino)) {
      fs.writeFileSync(destino, await baixar(t.url));
    }
    n += 1;
    if (n % 20 === 0) console.log('  %d/%d', n, tarefas.length);
  }

  /* ---- 3. servidor local (evita canvas "sujo" por CORS) ---- */
  const servidor = http.createServer((req, res) => {
    const nome = decodeURIComponent(req.url.replace(/^\//, '').split('?')[0]);
    const arq = path.join(TMP, nome);
    if (nome && nome.endsWith('.jpg') && fs.existsSync(arq)) {
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      fs.createReadStream(arq).pipe(res);
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<!DOCTYPE html><meta charset="utf-8"><title>proc</title>');
    }
  });
  await new Promise((r) => servidor.listen(PORTA_HTTP, '127.0.0.1', r));

  /* ---- 4. Chrome para cortar e converter ---- */
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--mute-audio', '--no-first-run',
    '--user-data-dir=' + PERFIL,
    '--remote-debugging-port=' + PORTA_CDP,
    'about:blank',
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

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: `http://127.0.0.1:${PORTA_HTTP}/` });
  await sleep(800);

  const processar = async (slug) => {
    const r = await send('Runtime.evaluate', {
      expression: `(async () => {
        const img = new Image();
        img.src = '/${slug}.jpg';
        await img.decode();
        const lado = Math.min(img.width, img.height);
        const sx = (img.width - lado) / 2;
        const sy = (img.height - lado) / 2;
        const c = document.createElement('canvas');
        c.width = c.height = ${LADO};
        const g = c.getContext('2d');
        g.imageSmoothingQuality = 'high';
        g.drawImage(img, sx, sy, lado, lado, 0, 0, ${LADO}, ${LADO});
        return c.toDataURL('image/webp', ${QUALIDADE});
      })()`,
      awaitPromise: true, returnByValue: true,
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    return r.result.value;
  };

  console.log('\nconvertendo para WebP %dx%d...', LADO, LADO);
  const prontos = [];
  const falhas = [];
  let bytes = 0;
  for (const t of tarefas) {
    try {
      const dataUrl = await processar(t.slug);
      if (!dataUrl.startsWith('data:image/webp')) throw new Error('WebP não suportado');
      const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
      fs.writeFileSync(path.join(IMG_DIR, t.slug + '.webp'), buf);
      bytes += buf.length;
      prontos.push(t.slug);
    } catch (e) {
      falhas.push(t.pt + ': ' + e.message);
    }
  }

  ws.close(); chrome.kill(); servidor.close();

  /* ---- 5. lista para o app ---- */
  const saida = `/* GERADO por tools/fetch-images.js — não editar à mão.
   Exercícios que possuem foto em img/<slug>.webp.
   Fotos: free-exercise-db (github.com/yuhonas/free-exercise-db), Unlicense. */
const EX_IMG = new Set(${JSON.stringify(prontos.sort(), null, 0).replace(/","/g, '",\n  "').replace('["', '[\n  "').replace('"]', '"\n]')});
`;
  fs.writeFileSync(path.join(RAIZ, 'js', 'exercise-images.js'), saida, 'utf8');

  console.log('\nprontas: %d | falhas: %d', prontos.length, falhas.length);
  falhas.forEach((f) => console.log('  ! ' + f));
  console.log('total: %s KB (média %s KB por foto)',
    (bytes / 1024).toFixed(0), (bytes / 1024 / Math.max(1, prontos.length)).toFixed(1));
  console.log('gravado: img/*.webp e js/exercise-images.js');
  process.exit(falhas.length ? 1 : 0);
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(2); });
