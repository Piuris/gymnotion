/* Helpers de UI: ícones, navegação, gráficos, acento dinâmico */

/* ---------- ícones ---------- */

const svgFill = (d, vb) => `<svg viewBox="${vb || '0 0 24 24'}">${d}</svg>`;

const I = {
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4 7 12l8 8"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l7 7 7-7"/></svg>',
  chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4l8 8-8 8"/></svg>',
  caret: '<svg class="caret" viewBox="0 0 24 24"><path d="M5 9l7 7 7-7"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M4 12.5 9.5 18 20 6.5"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5" stroke-linecap="round"/></svg>',
  dots: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="12" cy="19" r="1.9"/></svg>',
  burger: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  flame: '<svg viewBox="0 0 24 24"><path d="M12 23a7 7 0 0 0 7-7c0-2-.8-3.7-2-5.2l-.5.9c-.3.5-1 .4-1.2-.1-.5-1.6-1.6-3.6-3.7-5.3-.4-.3-1-.1-1.1.4-.3 2-1 3.4-2.4 5C7.4 12.5 5 14.3 5 16a7 7 0 0 0 7 7zm0-3a2.7 2.7 0 0 1-2.7-2.7c0-1.2.7-2 1.6-2.9.4-.4.9-1 1.1-1.6.7.5 1.3 1.2 1.7 2 .5-.3.8-.8 1-1.4.7.8 1.1 1.7 1.1 2.6A3 3 0 0 1 12 20z"/></svg>',
  dumbbell: '<svg viewBox="0 0 24 24"><path d="M3.4 7.6h3v8.8h-3zM.6 9.8h2.2v4.4H.6zM17.6 7.6h3v8.8h-3zM21.2 9.8h2.2v4.4h-2.2zM6.6 10.4h10.8v3.2H6.6z"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M12 3 2.5 11h2.7v9h5v-5.5h3.6V20h5v-9h2.7z"/></svg>',
  cookie: '<svg viewBox="0 0 24 24"><path d="M21.9 11.6a4 4 0 0 1-5.4-5.5A10 10 0 1 0 21.9 11.6zM8.5 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm.5 6.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm5.5-1a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z"/></svg>',
  user: '<svg viewBox="0 0 24 24"><path d="M12 12.2a4.6 4.6 0 1 0 0-9.2 4.6 4.6 0 0 0 0 9.2zM3.5 21c0-4.4 3.8-7.4 8.5-7.4s8.5 3 8.5 7.4z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M9 3h6l1 2h4v2H4V5h4zM6 8h12l-1 13H7z"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><path d="M8 2h10a2 2 0 0 1 2 2v12h-2V4H8zM4 6h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/></svg>',
  pencil: '<svg viewBox="0 0 24 24"><path d="M3 17.2 16.4 3.8l3.8 3.8L6.8 21H3zM17.8 2.4l1.4-1.4a1.4 1.4 0 0 1 2 0l1.8 1.8a1.4 1.4 0 0 1 0 2l-1.4 1.4z"/></svg>',
  play: '<svg viewBox="0 0 24 24"><path d="M7 4.5 19.5 12 7 19.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M6.5 4h4v16h-4zM13.5 4h4v16h-4z"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2.5"/></svg>',
  text: '<svg viewBox="0 0 24 24"><path d="M4 4h16v3.2h-6.3V20h-3.4V7.2H4z"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 5v5.3l4.2 2.5-1 1.7L11 13.4V7z"/></svg>',
  repeat: '<svg viewBox="0 0 24 24"><path d="M6 7h11V4l5 4.5L17 13v-3H8v4H6zM18 17H7v3l-5-4.5L7 11v3h9v-4h2z"/></svg>',
  chart: '<svg viewBox="0 0 24 24"><path d="M4 19h16v2H2V3h2zM7.5 15.5 12 10l3 3 5-6 1.6 1.3-6.6 8-3-3-3.2 4z"/></svg>',
  target: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M11 3h2v9.2l3.6-3.6L18 10l-6 6-6-6 1.4-1.4L11 12.2zM4 19h16v2H4z"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M12 3l6 6-1.4 1.4L13 6.8V16h-2V6.8L7.4 10.4 6 9zM4 19h16v2H4z"/></svg>',
  fechar: '<svg viewBox="0 0 24 24"><path d="M12 10.6 7.4 6 6 7.4l4.6 4.6L6 16.6 7.4 18l4.6-4.6 4.6 4.6 1.4-1.4-4.6-4.6L18 7.4 16.6 6z"/></svg>',
  arrastar: '<svg viewBox="0 0 24 24"><path d="M4 7.5h16v2H4zM4 14.5h16v2H4z"/></svg>',
  info: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 5h2v2h-2zm0 4h2v7h-2z"/></svg>',
};

const icon = (k) => I[k] || '';

/* ---------- miniatura do exercício ---------- */

/* Foto do exercício quando existe (img/<slug>.webp), senão o ícone do grupo
   muscular. O slug é o id do exercício sem o prefixo "ex_"; exercícios criados
   por você (prefixo "my_") não têm foto e caem no ícone. */
/* Procura a foto da variação escolhida (movimento__equipamento); sem ela, cai
   na foto do movimento; sem nenhuma, no ícone do grupo muscular. */
function fotoDe(exId, equip) {
  if (typeof EX_IMG === 'undefined') return null;
  const slug = String(exId || '').replace(/^ex_/, '');
  if (equip) {
    const variante = slug + '__' + slugify(equip);
    if (EX_IMG.has(variante)) return variante;
  }
  return EX_IMG.has(slug) ? slug : null;
}

function exThumb(exId, grupo, equip, classe) {
  const foto = fotoDe(exId, equip);
  const dentro = foto
    ? `<img src="img/${foto}.webp" alt="" loading="lazy" decoding="async"/>`
    : svgFill(ICONS[grupoIcon(grupo)] || ICONS.halter);
  return `<div class="thumb${classe ? ' ' + classe : ''}">${dentro}</div>`;
}

/* ---------- acento dinâmico ---------- */

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/* aplica a cor do treino em toda a interface */
function setAccent(hex, target) {
  const el = target || document.documentElement;
  const [r, g, b] = hexToRgb(hex || '#FF5A1E');
  el.style.setProperty('--accent', hex);
  el.style.setProperty('--accent-r', r);
  el.style.setProperty('--accent-g', g);
  el.style.setProperty('--accent-b', b);
  el.style.setProperty('--on-accent', luminance(hex) > 0.45 ? '#000' : '#fff');
}

/* ---------- tema ---------- */

/* Troca só a base (fundo, cartões, texto). A cor do treino continua mandando
   em botões, gráficos e marcadores, em qualquer tema. */
function aplicarTema(id) {
  const t = TEMAS.find((x) => x.id === id) || TEMAS[0];
  if (t.id === 'preto') delete document.documentElement.dataset.tema;
  else document.documentElement.dataset.tema = t.id;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t.amostra[0]);
  return t;
}

const temaAtual = () => TEMAS.find((x) => x.id === S.settings.tema) || TEMAS[0];

/* Cor dos detalhes fora do treino: neutra, para a cor colorida significar
   sempre "isto pertence a um treino". */
function contextAccent() {
  return temaAtual().neutro || '#FFFFFF';
}

/* Cor dos painéis de números e gráficos: a do treino que gerou os dados, o que
   torna a leitura imediata. Sem dados, cai no neutro. */
function accentPainel() {
  if (S.active) return S.active.color;
  if (S.sessions.length) return S.sessions[0].color;
  return contextAccent();
}

/* ---------- helpers DOM ---------- */

function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function on(root, sel, ev, fn) {
  root.querySelectorAll(sel).forEach((el) => el.addEventListener(ev, fn));
}

/* delegação: dispara fn(el, event) para cliques em [data-act="nome"] */
function acts(root, map) {
  root.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || !root.contains(el)) return;
    const fn = map[el.dataset.act];
    if (fn) { e.stopPropagation(); fn(el, e); }
  });
}

function haptic() {
  if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) { /* iOS ignora */ } }
}

/* ---------- formatação ---------- */

const pad2 = (n) => String(n).padStart(2, '0');

function fmtClock(sec) {
  sec = Math.max(0, Math.floor(sec));
  const hrs = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return hrs ? `${hrs}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
}

function fmtNum(n) {
  n = Math.round(n);
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  return String(n);
}

function fmtDate(ts) {
  const d = new Date(ts);
  const hoje = new Date();
  const ontem = new Date(); ontem.setDate(ontem.getDate() - 1);
  if (dayKey(ts) === dayKey(hoje.getTime())) return 'Hoje';
  if (dayKey(ts) === dayKey(ontem.getTime())) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/* "sábado, 23 de ago." — usado quando o dia mostrado não é hoje. */
function fmtDataLonga(ts) {
  const d = new Date(ts);
  const txt = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

function fmtWeight(v) {
  const n = Number(v) || 0;
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
}

/* ---------- gráficos ---------- */

/* curva suave (Catmull-Rom -> Bézier) */
function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

/* gera <svg> de linha com preenchimento em degradê do acento */
function sparkline(values, opts) {
  const o = Object.assign({ w: 200, h: 78, pad: 8, fill: true, dots: false, stroke: 2.2 }, opts || {});
  const gid = 'g' + Math.random().toString(36).slice(2, 8);
  let vals = values.slice();

  if (vals.length === 0) vals = [0.35, 0.4, 0.38, 0.5, 0.55, 0.52, 0.62, 0.6, 0.7];
  if (vals.length === 1) vals = [vals[0], vals[0]];

  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min;
  const innerW = o.w - o.pad * 2;
  const innerH = o.h - o.pad * 2;

  /* série constante (ou um único treino): linha no meio, não colada na base */
  const norm = (v) => (span === 0 ? 0.5 : (v - min) / span);

  const pts = vals.map((v, i) => [
    o.pad + (innerW * i) / (vals.length - 1),
    o.pad + innerH - norm(v) * innerH,
  ]);

  const line = smoothPath(pts);
  const area = `${line} L ${o.w - o.pad} ${o.h} L ${o.pad} ${o.h} Z`;

  const dots = o.dots
    ? pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" fill="var(--accent)"/>`).join('')
    : '';

  return `<svg viewBox="0 0 ${o.w} ${o.h}" preserveAspectRatio="none">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--accent)" stop-opacity=".45"/>
      <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
    </linearGradient></defs>
    ${o.fill ? `<path d="${area}" fill="url(#${gid})"/>` : ''}
    <path d="${line}" fill="none" stroke="var(--accent)" stroke-width="${o.stroke}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    ${dots}
  </svg>`;
}

/* anel de progresso */
function ring(label, value, pct, sub) {
  const R = 38;
  const C = 2 * Math.PI * R;
  const off = C * (1 - Math.max(0.02, Math.min(1, pct)));
  return `<div class="ring-item">
    <div class="lab">${esc(label)}</div>
    <div class="ring-wrap">
      <svg viewBox="0 0 90 90">
        <circle class="ring-bg" cx="45" cy="45" r="${R}"/>
        <circle class="ring-fg" cx="45" cy="45" r="${R}" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"/>
      </svg>
      <div class="ring-val">${esc(value)}</div>
    </div>
    <div class="ring-sub">${esc(sub || '')}</div>
  </div>`;
}

/* ---------- navegação em pilha ---------- */

const APP = document.getElementById('app');
const stack = [];

function currentScreen() { return stack[stack.length - 1]; }

function pushScreen(builder, opts) {
  const o = opts || {};
  const el = document.createElement('div');
  el.className = 'screen ' + (o.mode === 'sheet' ? 'sheet-in' : 'push-in');
  const screen = {
    el, builder, name: o.name || '', mode: o.mode || 'push',
    refresh() {
      const sc = el.querySelector('.scroll');
      const top = sc ? sc.scrollTop : 0;
      el.innerHTML = '';
      builder(el, screen);
      const sc2 = el.querySelector('.scroll');
      if (sc2 && top) sc2.scrollTop = top;
    },
  };
  builder(el, screen);
  APP.appendChild(el);
  stack.push(screen);
  el.addEventListener('animationend', () => el.classList.remove('push-in', 'sheet-in'), { once: true });
  return screen;
}

function popScreen() {
  if (stack.length <= 1) return;
  const screen = stack.pop();
  screen.el.classList.add(screen.mode === 'sheet' ? 'sheet-out' : 'push-out');
  screen.el.addEventListener('animationend', () => screen.el.remove(), { once: true });
  setTimeout(() => screen.el.remove(), 400);
  const below = currentScreen();
  if (below && below.onReturn) below.onReturn();
  if (below) below.refresh();
}

function popToRoot() {
  while (stack.length > 1) {
    const s = stack.pop();
    s.el.remove();
  }
  currentScreen().refresh();
}

function replaceRoot(builder, name) {
  while (stack.length) { stack.pop().el.remove(); }
  pushScreen(builder, { name });
}

/* ---------- overlays ---------- */

function openSheet(content, opts) {
  const o = opts || {};
  const bd = h(`<div class="backdrop${o.center ? ' mid' : ''}"></div>`);
  const sheet = h(`<div class="sheet${o.center ? ' center' : ''}"></div>`);
  if (!o.center) sheet.appendChild(h('<div class="grabber"></div>'));
  sheet.appendChild(content);
  bd.appendChild(sheet);
  bd.addEventListener('click', (e) => { if (e.target === bd) closeSheet(bd); });
  APP.appendChild(bd);
  return { bd, sheet, close: () => closeSheet(bd) };
}

function closeSheet(bd) {
  bd.style.animation = 'fade .18s reverse';
  const s = bd.querySelector('.sheet');
  if (s) s.style.animation = 'sheetIn .2s reverse';
  setTimeout(() => bd.remove(), 170);
}

function actionSheet(title, items) {
  const box = h(`<div></div>`);
  if (title) box.appendChild(h(`<h3>${esc(title)}</h3>`));
  const ov = { close: null };
  items.forEach((it) => {
    const b = h(`<button class="sheet-item${it.danger ? ' danger' : ''}">${icon(it.icon)}<span>${esc(it.label)}</span></button>`);
    b.addEventListener('click', () => { ov.close(); setTimeout(it.onClick, 120); });
    box.appendChild(b);
  });
  const r = openSheet(box);
  ov.close = r.close;
  return r;
}

function confirmSheet(title, desc, okLabel, onOk) {
  const box = h(`<div>
    <h3>${esc(title)}</h3>
    ${desc ? `<p class="desc">${esc(desc)}</p>` : ''}
    <div class="sheet-actions">
      <button class="pill-btn grey" data-x="no">Cancelar</button>
      <button class="pill-btn" data-x="yes" style="background:#FF453A;color:#fff">${esc(okLabel)}</button>
    </div></div>`);
  const r = openSheet(box, { center: true });
  box.querySelector('[data-x="no"]').addEventListener('click', r.close);
  box.querySelector('[data-x="yes"]').addEventListener('click', () => { r.close(); setTimeout(onOk, 120); });
}

function promptSheet(title, value, placeholder, onOk) {
  const box = h(`<div>
    <h3>${esc(title)}</h3>
    <input class="text-input" value="${esc(value)}" placeholder="${esc(placeholder || '')}" />
    <div class="sheet-actions">
      <button class="pill-btn grey" data-x="no">Cancelar</button>
      <button class="pill-btn" data-x="yes">Salvar</button>
    </div></div>`);
  const r = openSheet(box, { center: true });
  const input = box.querySelector('input');
  setTimeout(() => { input.focus(); input.select(); }, 250);
  box.querySelector('[data-x="no"]').addEventListener('click', r.close);
  const ok = () => { const v = input.value.trim(); r.close(); if (v) setTimeout(() => onOk(v), 120); };
  box.querySelector('[data-x="yes"]').addEventListener('click', ok);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
}

let toastTimer = null;
function toast(msg) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = h(`<div class="toast">${esc(msg)}</div>`);
  APP.appendChild(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.style.animation = 'toastIn .2s reverse';
    setTimeout(() => t.remove(), 190);
  }, 1900);
}

/* ---------- manter a tela acesa ---------- */

/* Entre uma série e outra o iPhone apaga a tela e você desbloqueia com a mão
   suada. O Wake Lock evita isso enquanto o treino está rodando (Safari 16.4+).
   O sistema solta o bloqueio sozinho quando o app sai de vista, por isso o
   reforço no visibilitychange. */
let travaTela = null;

async function segurarTela() {
  if (!('wakeLock' in navigator) || travaTela) return false;
  try {
    travaTela = await navigator.wakeLock.request('screen');
    travaTela.addEventListener('release', () => { travaTela = null; });
    return true;
  } catch (e) {
    travaTela = null;               // recusado por bateria fraca, por exemplo
    return false;
  }
}

function soltarTela() {
  if (!travaTela) return;
  try { travaTela.release(); } catch (e) { /* já solto */ }
  travaTela = null;
}

/* Chamado a cada mudança de estado: mantém a trava só durante treino rodando. */
function ajustarTravaTela() {
  const querSegurar = !!(S.active && S.active.running) && !document.hidden;
  if (querSegurar) segurarTela(); else soltarTela();
}

/* ---------- reordenar arrastando ---------- */

/* Arraste por toque, sem biblioteca. O elemento arrastado acompanha o dedo e a
   posição de destino sai da comparação com o meio de cada vizinho, o que
   funciona mesmo com linhas de alturas diferentes. */
function tornarArrastavel(lista, alca, aoSoltar) {
  alca.addEventListener('pointerdown', (ev) => {
    const linha = alca.closest('[data-arrastavel]');
    if (!linha || !linha.parentElement) return;
    ev.preventDefault();
    ev.stopPropagation();

    const pai = linha.parentElement;
    const irmaos = () => Array.from(pai.querySelectorAll('[data-arrastavel]'));
    const origem = irmaos().indexOf(linha);
    const y0 = ev.clientY;
    let destino = origem;

    linha.classList.add('arrastando');
    document.body.classList.add('arrastando-algo');
    alca.setPointerCapture(ev.pointerId);
    haptic();

    const mover = (e) => {
      const dy = e.clientY - y0;
      linha.style.transform = 'translateY(' + dy + 'px)';
      const atuais = irmaos();
      const meio = e.clientY;
      let novo = 0;
      atuais.forEach((el) => {
        if (el === linha) return;
        const r = el.getBoundingClientRect();
        if (meio > r.top + r.height / 2) novo += 1;
      });
      if (novo !== destino) {
        destino = novo;
        const ref = atuais.filter((el) => el !== linha)[destino];
        pai.insertBefore(linha, ref || null);
        /* o elemento pulou de lugar: o deslocamento visual precisa zerar */
        const r = linha.getBoundingClientRect();
        linha.style.transform = 'translateY(' + (e.clientY - (r.top + r.height / 2)) + 'px)';
        haptic();
      }
    };

    const soltar = () => {
      alca.removeEventListener('pointermove', mover);
      alca.removeEventListener('pointerup', soltar);
      alca.removeEventListener('pointercancel', soltar);
      linha.style.transform = '';
      linha.classList.remove('arrastando');
      document.body.classList.remove('arrastando-algo');
      if (destino !== origem) {
        const [item] = lista.splice(origem, 1);
        lista.splice(destino, 0, item);
        aoSoltar();
      }
    };

    alca.addEventListener('pointermove', mover);
    alca.addEventListener('pointerup', soltar);
    alca.addEventListener('pointercancel', soltar);
  });
}

/* ---------- beep de descanso ---------- */

let audioCtx = null;
function beep() {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    [0, 0.18].forEach((delay, i) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = i === 0 ? 880 : 1180;
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.25, audioCtx.currentTime + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + 0.16);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(audioCtx.currentTime + delay);
      o.stop(audioCtx.currentTime + delay + 0.18);
    });
  } catch (e) { /* silencioso */ }
}
