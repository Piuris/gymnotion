/* Gera os ícones PNG do app sem dependências externas. */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

/* ---------- codificador PNG mínimo ---------- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;    // bits por canal
  ihdr[9] = 6;    // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filtro "none"
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------- desenho ---------- */

/* Preto fosco: gradiente quase imperceptível, só o suficiente para o ícone não
   ficar chapado na tela de início. Um degradê forte leria como brilho. */
const BG_A = [0x1C, 0x1C, 0x1E];   // topo
const BG_B = [0x0D, 0x0D, 0x0F];   // base

/* Roxo do app (o mesmo da paleta de cores de treino em js/store.js) */
const GLYPH = [0xA0, 0x20, 0xF0];

/* retângulo arredondado: 1 dentro, 0 fora */
function insideRounded(x, y, size, radius) {
  const r = radius;
  const cx = Math.min(Math.max(x, r), size - r);
  const cy = Math.min(Math.max(y, r), size - r);
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

/* halter centrado, em coordenadas 0..1 */
function insideDumbbell(u, v, scale) {
  const x = (u - 0.5) / scale;
  const y = (v - 0.5) / scale;
  const bar = Math.abs(x) <= 0.30 && Math.abs(y) <= 0.055;
  const plate = Math.abs(Math.abs(x) - 0.335) <= 0.055 && Math.abs(y) <= 0.20;
  const cap = Math.abs(Math.abs(x) - 0.445) <= 0.045 && Math.abs(y) <= 0.115;
  return bar || plate || cap;
}

function render(size, opts) {
  const o = Object.assign({ radius: 0.225, glyph: 0.62, bleed: false }, opts || {});
  const buf = Buffer.alloc(size * size * 4);
  const radius = o.bleed ? 0 : size * o.radius;
  const SS = 3; // supersampling

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let cover = 0, glyph = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          if (o.bleed || insideRounded(px, py, size, radius)) cover++;
          if (insideDumbbell(px / size, py / size, o.glyph)) glyph++;
        }
      }
      const n = SS * SS;
      const a = cover / n;
      const g = glyph / n;

      const t = y / size;
      const bg = [
        Math.round(BG_A[0] + (BG_B[0] - BG_A[0]) * t),
        Math.round(BG_A[1] + (BG_B[1] - BG_A[1]) * t),
        Math.round(BG_A[2] + (BG_B[2] - BG_A[2]) * t),
      ];
      const col = [
        Math.round(bg[0] + (GLYPH[0] - bg[0]) * g),
        Math.round(bg[1] + (GLYPH[1] - bg[1]) * g),
        Math.round(bg[2] + (GLYPH[2] - bg[2]) * g),
      ];

      const i = (y * size + x) * 4;
      buf[i] = col[0]; buf[i + 1] = col[1]; buf[i + 2] = col[2];
      buf[i + 3] = Math.round(a * 255);
    }
  }
  return encodePNG(size, size, buf);
}

/* ---------- saída ---------- */

const out = path.join(__dirname, '..', 'icons');
fs.mkdirSync(out, { recursive: true });

const jobs = [
  ['icon-180.png', 180, {}],
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['icon-512-maskable.png', 512, { bleed: true, glyph: 0.46 }],
];

jobs.forEach(([name, size, opts]) => {
  const png = render(size, opts);
  fs.writeFileSync(path.join(out, name), png);
  console.log(name, size + 'x' + size, (png.length / 1024).toFixed(1) + ' KB');
});

console.log('');
console.log('Lembre de subir o ?v= em index.html, manifest.webmanifest e sw.js:');
console.log('o Safari guarda o apple-touch-icon por muito tempo e ignora Cache-Control,');
console.log('entao so uma URL nova faz o iPhone buscar o desenho atualizado.');
