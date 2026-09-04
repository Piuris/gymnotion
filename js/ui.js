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
  /* Os furos destes dois saem de fill-rule="evenodd": subcaminho dentro de
     outro vira buraco, então o calendário ganha grade e a engrenagem ganha
     eixo sem precisar de uma segunda cor. */
  calendario: '<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M6.6 1.8h2.2v1.7h6.4V1.8h2.2v1.7h1.8A1.8 1.8 0 0 1 21 5.3v14.9A1.8 1.8 0 0 1 19.2 22H4.8A1.8 1.8 0 0 1 3 20.2V5.3a1.8 1.8 0 0 1 1.8-1.8h1.8zM5.2 9.8v10h13.6v-10zm2.1 1.9h2.6v2.5H7.3zm4.6 0h2.6v2.5h-2.6zm-4.6 4.2h2.6v2.5H7.3zm4.6 0h2.6v2.5h-2.6z"/></svg>',
  cofre: '<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4.2 3.6h12.4A2.4 2.4 0 0 1 19 6v1.2H6.1a.6.6 0 0 0 0 1.2H20.4A1.6 1.6 0 0 1 22 10v8.4a2.4 2.4 0 0 1-2.4 2.4H4.2A2.4 2.4 0 0 1 1.8 18.4V6a2.4 2.4 0 0 1 2.4-2.4zm12.6 9.2a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z"/></svg>',
  livro: '<svg viewBox="0 0 24 24"><path d="M11 6.6C9.4 5.2 7.1 4.4 4.6 4.4c-.8 0-1.6.1-2.3.2a1 1 0 0 0-.8 1v12.6a1 1 0 0 0 1.2 1c.6-.1 1.2-.2 1.9-.2 2.3 0 4.3.8 5.6 2a1 1 0 0 0 .8.3zm2 16.7a1 1 0 0 0 .8-.3c1.3-1.2 3.3-2 5.6-2 .7 0 1.3.1 1.9.2a1 1 0 0 0 1.2-1V5.6a1 1 0 0 0-.8-1c-.7-.1-1.5-.2-2.3-.2-2.5 0-4.8.8-6.4 2.2z" transform="translate(-.5 -1.3)"/></svg>',
  engrenagem: '<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M10.4 1.8h3.2l.4 2.5c.7.2 1.3.5 1.9.8l2.1-1.4 2.3 2.3-1.4 2.1c.3.6.6 1.2.8 1.9l2.5.4v3.2l-2.5.4c-.2.7-.5 1.3-.8 1.9l1.4 2.1-2.3 2.3-2.1-1.4c-.6.3-1.2.6-1.9.8l-.4 2.5h-3.2l-.4-2.5c-.7-.2-1.3-.5-1.9-.8l-2.1 1.4-2.3-2.3 1.4-2.1c-.3-.6-.6-1.2-.8-1.9l-2.5-.4v-3.2l2.5-.4c.2-.7.5-1.3.8-1.9L3.7 6l2.3-2.3 2.1 1.4c.6-.3 1.2-.6 1.9-.8zM12 8.3a3.7 3.7 0 1 0 0 7.4 3.7 3.7 0 0 0 0-7.4z"/></svg>',
  gota: '<svg viewBox="0 0 24 24"><path d="M12 2.2c4.3 4.8 6.6 8.2 6.6 11.4a6.6 6.6 0 0 1-13.2 0c0-3.2 2.3-6.6 6.6-11.4z"/></svg>',
  passos: '<svg viewBox="0 0 24 24"><path d="M8.4 2.4c1.5 0 2.5 1.7 2.5 3.8s-.9 3.7-2.4 3.7S6 8.3 6 6.2s.9-3.8 2.4-3.8zM6.3 11.4h4.2c.7 0 1.2.6 1.1 1.3l-.4 2.7c-.1.6-.6 1-1.2 1H6.8c-.6 0-1.1-.4-1.2-1l-.4-2.7c-.1-.7.4-1.3 1.1-1.3zM17.6 6.1c1.5 0 2.4 1.7 2.4 3.8s-.9 3.7-2.4 3.7-2.4-1.6-2.4-3.7.9-3.8 2.4-3.8zM15.5 15.1h4.2c.7 0 1.2.6 1.1 1.3l-.4 2.7c-.1.6-.6 1-1.2 1h-3.2c-.6 0-1.1-.4-1.2-1l-.4-2.7c-.1-.7.4-1.3 1.1-1.3z"/></svg>',
  grade: '<svg viewBox="0 0 24 24"><path d="M3.4 3.4h7v7h-7zM13.6 3.4h7v7h-7zM3.4 13.6h7v7h-7zM13.6 13.6h7v7h-7z"/></svg>',
};

/* Ícones de contorno, para a barra flutuante e o menu suspenso. Os cheios
   continuam onde estão: num traço fino de 1.7px o desenho respira, e é isso
   que dá o ar leve da barra em cápsula — mas num quadradinho de 20px sobre
   fundo colorido o cheio ainda lê melhor. */
const TRACO = 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
const O = {
  casa: `<path d="M3.6 10.4 12 3.6l8.4 6.8"/><path d="M5.7 9v10a1.3 1.3 0 0 0 1.3 1.3h9.9a1.3 1.3 0 0 0 1.4-1.3V9"/>`,
  tarefas: `<rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4"/><path d="M8.2 12.3l2.6 2.6 5-5.4"/>`,
  haltere: `<path d="M4.2 9.2v5.6M7.4 7.2v9.6M16.6 7.2v9.6M19.8 9.2v5.6M7.4 12h9.2"/>`,
  gota: `<path d="M12 3.4c3.5 3.9 5.4 6.7 5.4 9.2a5.4 5.4 0 0 1-10.8 0c0-2.5 1.9-5.3 5.4-9.2z"/>`,
  passos: `<ellipse cx="8.4" cy="6.2" rx="2.5" ry="3.7"/><path d="M6.2 11.6h4.4a1 1 0 0 1 1 1.2l-.4 2.7a1.2 1.2 0 0 1-1.2 1H6.8a1.2 1.2 0 0 1-1.2-1l-.4-2.7a1 1 0 0 1 1-1.2z"/><ellipse cx="17.6" cy="9.9" rx="2.5" ry="3.7"/><path d="M15.4 15.3h4.4a1 1 0 0 1 1 1.2l-.4 2.7a1.2 1.2 0 0 1-1.2 1h-3.2a1.2 1.2 0 0 1-1.2-1l-.4-2.7a1 1 0 0 1 1-1.2z"/>`,
  garfo: `<path d="M6.4 3.2v6.2a2 2 0 0 0 4 0V3.2M8.4 11.6v9.2M17.6 3.2c-1.5 1.4-2.2 3.2-2.2 5.4 0 1.6.6 2.7 1.6 3.2v9M17.6 3.2v6"/>`,
  menu: `<path d="M4.2 7.2h15.6M4.2 12h15.6M4.2 16.8h15.6"/>`,
  fechar: `<path d="M6.6 6.6l10.8 10.8M17.4 6.6L6.6 17.4"/>`,
  calendario: `<rect x="3.6" y="5.4" width="16.8" height="15" rx="3.4"/><path d="M7.8 3.2v4M16.2 3.2v4M3.6 9.8h16.8"/>`,
  cofre: `<path d="M3.6 8.2h14.6a2.2 2.2 0 0 1 2.2 2.2v7.4a2.4 2.4 0 0 1-2.4 2.4H6a2.4 2.4 0 0 1-2.4-2.4z"/><path d="M3.6 8.2V6.6A2.4 2.4 0 0 1 6 4.2h9.6"/><circle cx="16.6" cy="14.2" r="1.3"/>`,
  livro: `<path d="M12 6.6C10.4 5.1 8.3 4.3 5.9 4.3c-.8 0-1.5.1-2.3.2v13.9c.8-.1 1.5-.2 2.3-.2 2.4 0 4.5.8 6.1 2.3"/><path d="M12 6.6c1.6-1.5 3.7-2.3 6.1-2.3.8 0 1.5.1 2.3.2v13.9c-.8-.1-1.5-.2-2.3-.2-2.4 0-4.5.8-6.1 2.3z"/>`,
  cronometro: `<circle cx="12" cy="13.4" r="7.6"/><path d="M12 9.6v4l2.4 1.7M9.4 2.6h5.2"/>`,
  ajustes: `<path d="M4 7.6h7.4M16.6 7.6H20M4 16.4h3.4M12.6 16.4H20"/><circle cx="14" cy="7.6" r="2.6"/><circle cx="10" cy="16.4" r="2.6"/>`,
  alvo: `<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4.2"/><circle cx="12" cy="12" r=".9" fill="currentColor" stroke="none"/>`,
  grafico: `<path d="M4 20V4M4 20h16"/><path d="M7.6 15.6l3.6-4.4 2.8 2.6 4.4-5.6"/>`,
  lista: `<path d="M4.4 6.4h15.2M4.4 12h15.2M4.4 17.6h9.4"/>`,
  lapis: `<path d="M4 20l.9-3.9L15.6 5.4a2 2 0 0 1 2.8 0l1.2 1.2a2 2 0 0 1 0 2.8L8.9 20.1z"/>`,
  check: `<path d="M4.8 12.4l4.6 4.6L19.2 7"/>`,
};
const iconO = (k) => (O[k] ? `<svg viewBox="0 0 24 24" ${TRACO}>${O[k]}</svg>` : '');

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

/* Cor de um painel: a do treino que gerou aqueles números. Recebendo um dia,
   usa o treino daquele dia — antes puxava sempre o último treino registrado,
   e os gráficos de terça apareciam com a cor do treino de quinta. */
function accentPainel(quando) {
  if (quando != null) {
    const doDia = sessionsOn(quando);
    if (doDia.length) return doDia[0].color;
    return contextAccent();
  }
  if (S.active) return S.active.color;
  if (S.sessions.length) return S.sessions[0].color;
  return contextAccent();
}

/* Azul da água: não é treino, então não segue a cor de nenhum. */
const AZUL_AGUA = '#2E9BF0';

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

/* Real com centavos só quando existem: numa lista de metas "R$ 1.240" lê
   melhor que "R$ 1.240,00", e o centavo aparece quando faz falta. */
function fmtBRL(v) {
  const n = Number(v) || 0;
  const casas = Math.abs(n % 1) > 0.004 ? 2 : 0;
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}

/* 45 -> "45 min"; 90 -> "1h30"; 120 -> "2h" */
function fmtMin(min) {
  const m = Math.max(0, Math.round(Number(min) || 0));
  if (m < 60) return m + ' min';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? h + 'h' + pad2(r) : h + 'h';
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MESES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/* "Setembro de 2026": maiuscula so na primeira letra. Deixar isso para o CSS
   com text-transform: capitalize maiusculiza o "de" junto. */
const fmtMesAno = (ts) => {
  const d = new Date(ts);
  const m = MESES[d.getMonth()];
  return m.charAt(0).toUpperCase() + m.slice(1) + ' de ' + d.getFullYear();
};

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
  const o = Object.assign({ w: 200, h: 78, pad: 8, fill: true, dots: false, stroke: 2.2,
    cores: null, corLinha: 'var(--accent)' }, opts || {});
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

  /* Uma cor por ponto: num gráfico que junta treinos diferentes, cada ponto
     carrega a cor do treino que o gerou. Sem cores, tudo usa o acento. */
  const dots = o.dots
    ? pts.map((p, i) => {
      const cor = (o.cores && o.cores[i]) || 'var(--accent)';
      return `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${o.raioDot || 3}" fill="${cor}"/>`;
    }).join('')
    : '';

  return `<svg viewBox="0 0 ${o.w} ${o.h}" preserveAspectRatio="none">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${o.corLinha}" stop-opacity=".45"/>
      <stop offset="100%" stop-color="${o.corLinha}" stop-opacity="0"/>
    </linearGradient></defs>
    ${o.fill ? `<path d="${area}" fill="url(#${gid})"/>` : ''}
    <path d="${line}" fill="none" stroke="${o.corLinha}" stroke-width="${o.stroke}" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
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

/* Volta até a tela de um nome, ou até a raiz se ela não estiver mais na pilha.
   Quem terminou um treino quer cair de volta na Academia, não no Início. */
function voltarPara(nome) {
  while (stack.length > 1 && currentScreen().name !== nome) {
    stack.pop().el.remove();
  }
  currentScreen().refresh();
}

function replaceRoot(builder, name) {
  while (stack.length) { stack.pop().el.remove(); }
  pushScreen(builder, { name });
}

/* Barra de topo das telas empilhadas: voltar à esquerda, título no meio e, se
   houver, um botão à direita. Sem o segundo espaçador o título deixa de ficar
   centrado quando não há botão. */
function navBar(titulo, direita) {
  const nav = h(`<div class="nav">
    <button class="icon-btn stroke" data-act="back">${icon('back')}</button>
    <div class="title${String(titulo).length > 16 ? ' long' : ''}">${esc(titulo)}</div>
    ${direita
      ? `<button class="icon-btn" data-act="dir">${icon(direita.icone)}</button>`
      : '<div style="width:44px"></div>'}
  </div>`);
  acts(nav, {
    back: () => popScreen(),
    dir: () => { if (direita) direita.aoTocar(); },
  });
  return nav;
}

/* Cabeçalho de seção: uma sobrancelha curta na cor do contexto e um título
   grande logo abaixo. Diz o que a lista é sem gastar uma barra inteira. */
function secao(sobrancelha, titulo) {
  return `<div class="sec">
    <div class="eyebrow">${esc(sobrancelha)}</div>
    <h2>${esc(titulo)}</h2>
  </div>`;
}

/* Cartão-herói: o número que importa naquela tela, pintado com a cor do item
   que o gerou — é a mesma regra de sempre, agora ocupando o topo. Os anéis do
   canto são decoração desenhada com a própria cor do texto, então acompanham
   o contraste em vez de precisarem de um tom fixo. */
function heroi(dados) {
  const d = dados || {};
  /* Um nome curto como "Push" pede corpo 40; "Quinta-feira, 03 de set." no
     mesmo corpo quebra em três linhas e engole o cartão. */
  const longo = String(d.titulo || '').length > 15 ? ' longo' : '';
  return `<div class="hero${d.classe ? ' ' + d.classe : ''}">
    <svg class="hero-aneis" viewBox="0 0 300 300" aria-hidden="true">
      <circle cx="200" cy="150" r="66"/><circle cx="200" cy="150" r="104"/>
      <circle cx="200" cy="150" r="142"/><circle cx="200" cy="150" r="180"/>
    </svg>
    <div class="hero-topo">
      <div class="hero-eyebrow">${esc(d.sobrancelha || '')}</div>
      <div class="hero-titulo${longo}">${esc(d.titulo || '')}</div>
    </div>
    <div class="hero-base">
      <div class="hero-num">${d.numero || ''}</div>
      ${d.nota ? `<div class="hero-nota">${esc(d.nota)}</div>` : ''}
    </div>
  </div>`;
}

/* Menu suspenso: um painel que aparece perto de quem o chamou, em vez de uma
   folha subindo do rodapé. Serve tanto para navegar quanto para escolher um
   valor, e é o que substitui a grade de bolinhas do seletor de cores. */
function menuSuspenso(itens, opts) {
  const o = opts || {};
  const fundo = h('<div class="pop-fundo"></div>');
  const pop = h('<div class="pop"></div>');

  itens.forEach((it) => {
    const b = h(`<button class="pop-item${it.on ? ' on' : ''}">
      ${it.cor ? `<i class="dot" style="background:${it.cor}"></i>` : (it.icone ? iconO(it.icone) : '')}
      <span class="lab">${esc(it.label)}</span>
      ${it.on ? iconO('check').replace('<svg', '<svg class="ok"') : ''}
    </button>`);
    b.addEventListener('click', () => {
      fechar();
      if (it.onClick) setTimeout(it.onClick, 110);
    });
    pop.appendChild(b);
  });

  fundo.appendChild(pop);
  APP.appendChild(fundo);

  /* Ancorado em quem abriu, preso dentro da tela. Sem o recorte, um menu
     chamado por um botão do rodapé nasceria metade fora dela. */
  const M = 12;
  const larg = APP.clientWidth;
  const alt = APP.clientHeight;
  /* Trava a altura antes de medir: uma lista de doze cores é mais alta que a
     tela, e sem isso o painel nasceria com metade dele para fora. */
  pop.style.maxHeight = (alt - 2 * M) + 'px';
  /* offsetWidth/Height, e não getBoundingClientRect: a animação de entrada
     começa com scale(.92), e o rect sai encolhido enquanto ela roda — o
     recorte então calculava com 46px a menos e deixava o painel vazar. */
  const larguraPop = pop.offsetWidth;
  const alturaPop = pop.offsetHeight;
  if (o.ancora) {
    const a = o.ancora.getBoundingClientRect();
    const acimaCabe = a.top - alturaPop - 10 >= M;
    const y = acimaCabe ? a.top - alturaPop - 10 : a.bottom + 10;
    pop.style.top = Math.max(M, Math.min(y, alt - alturaPop - M)) + 'px';
    let x = a.left + a.width / 2 - larguraPop / 2;
    x = Math.max(M, Math.min(x, larg - larguraPop - M));
    pop.style.left = x + 'px';
    pop.classList.add(acimaCabe ? 'de-baixo' : 'de-cima');
  } else {
    pop.style.left = Math.max(M, (larg - larguraPop) / 2) + 'px';
    pop.style.top = Math.max(M, (alt - alturaPop) / 2) + 'px';
  }

  function fechar() {
    pop.style.animation = 'popIn .16s reverse';
    fundo.style.animation = 'fade .16s reverse';
    setTimeout(() => fundo.remove(), 150);
    if (o.aoFechar) o.aoFechar();
  }
  fundo.addEventListener('click', (e) => { if (e.target === fundo) fechar(); });
  return { fundo, pop, fechar };
}

/* Campo de cor: mostra a escolhida e abre o menu suspenso. Substitui a grade
   de doze bolinhas, que ocupava duas fileiras e ainda deixava a folha rolando. */
function campoCor(cor, aoEscolher) {
  const campo = h(`<button class="campo-cor">
    <i class="dot" style="background:${cor}"></i>
    <span class="lab">${esc(nomeDaCor(cor))}</span>
    ${icon('caret')}
  </button>`);
  campo.addEventListener('click', () => {
    const cores = COLORS.slice();
    /* uma cor que saiu da paleta continua na lista, senão o item pareceria sem
       cor escolhida e trocaria de cor no primeiro toque */
    if (!cores.some((c) => c.hex === cor)) cores.push({ hex: cor, nome: 'Cor própria' });
    menuSuspenso(cores.map((c) => ({
      label: c.nome, cor: c.hex, on: c.hex === cor,
      onClick: () => {
        campo.querySelector('.dot').style.background = c.hex;
        campo.querySelector('.lab').textContent = c.nome;
        aoEscolher(c.hex);
      },
    })), { ancora: campo });
  });
  return campo;
}

/* Fileira de cores para escolher. Uma cor que não esteja mais na paleta — de um
   item criado antes de ela mudar — entra no fim em vez de sumir: sem isso o
   item pareceria não ter cor escolhida e trocaria de cor no primeiro toque. */
function paletaHTML(cor) {
  const cores = COLORS.map((c) => c.hex);
  if (cor && cores.indexOf(cor) < 0) cores.push(cor);
  return '<div class="swatches">' + cores.map((hex) =>
    `<button class="swatch-btn${hex === cor ? ' on' : ''}" data-cor="${hex}"><i style="background:${hex}"></i></button>`
  ).join('') + '</div>';
}

/* ---------- overlays ---------- */

/* O teclado do iOS não encolhe a página: em PWA standalone ele apenas cobre a
   parte de baixo, e o layout continua achando que tem 852px. Uma folha
   centralizada segue centrada na tela inteira e some atrás do teclado
   justamente quando se está digitando nela. A visualViewport é o único lugar
   que sabe quanto sobrou de tela visível, então a folha passa a morar nela. */
function seguirTeclado(bd) {
  const vv = window.visualViewport;
  if (!vv) return () => {};
  const ajustar = () => {
    bd.style.top = vv.offsetTop + 'px';
    bd.style.bottom = 'auto';
    bd.style.height = vv.height + 'px';
  };
  ajustar();
  vv.addEventListener('resize', ajustar);
  vv.addEventListener('scroll', ajustar);
  return () => {
    vv.removeEventListener('resize', ajustar);
    vv.removeEventListener('scroll', ajustar);
  };
}

function openSheet(content, opts) {
  const o = opts || {};
  const bd = h(`<div class="backdrop${o.center ? ' mid' : ''}"></div>`);
  const sheet = h(`<div class="sheet${o.center ? ' center' : ''}"></div>`);
  if (!o.center) sheet.appendChild(h('<div class="grabber"></div>'));
  sheet.appendChild(content);
  bd.appendChild(sheet);
  bd.addEventListener('click', (e) => { if (e.target === bd) closeSheet(bd); });
  APP.appendChild(bd);
  bd.__soltarTeclado = seguirTeclado(bd);
  return { bd, sheet, close: () => closeSheet(bd) };
}

function closeSheet(bd) {
  if (bd.__soltarTeclado) { bd.__soltarTeclado(); bd.__soltarTeclado = null; }
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
