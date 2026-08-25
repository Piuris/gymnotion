/* Estado + persistência local (localStorage) */

const COLORS = [
  { id: 'laranja', hex: '#FF5A1E' },
  { id: 'roxo', hex: '#A020F0' },
  { id: 'verde', hex: '#22E04A' },
  { id: 'azul', hex: '#0A84FF' },
  { id: 'vermelho', hex: '#FF3B30' },
  { id: 'rosa', hex: '#FF2D96' },
  { id: 'amarelo', hex: '#FFC300' },
  { id: 'ciano', hex: '#32D6E0' },
  { id: 'indigo', hex: '#5E5CE6' },
  { id: 'lima', hex: '#A8E00F' },
  { id: 'coral', hex: '#FF7A5A' },
  { id: 'gelo', hex: '#8E9AAF' },
];

const ICONS = {
  halter: '<path d="M4 9h2v6H4zM2 10.5h2v3H2zM18 9h2v6h-2zM20 10.5h2v3h-2zM6.5 11h11v2h-11z"/>',
  kettle: '<path d="M12 2c2.6 0 4.7 2.1 4.7 4.7 0 1-.3 1.9-.8 2.7 2.3 1.4 3.8 3.9 3.8 6.8 0 1.6-.4 3.1-1.1 4.4-.3.5-.8.9-1.4.9H6.8c-.6 0-1.1-.4-1.4-.9-.7-1.3-1.1-2.8-1.1-4.4 0-2.9 1.5-5.4 3.8-6.8-.5-.8-.8-1.7-.8-2.7C7.3 4.1 9.4 2 12 2zm0 2.6a2.1 2.1 0 0 0-2.1 2.1c0 .8.5 1.5 1.2 1.9h1.8c.7-.4 1.2-1.1 1.2-1.9A2.1 2.1 0 0 0 12 4.6z"/>',
  perna: '<path d="M7.2 2h9.6l-.9 6.6c-.2 1.6.1 2.6.8 4 .8 1.6 1.1 2.7 1.1 4.3V21a1 1 0 0 1-1 1h-3.4a1 1 0 0 1-1-1v-2.6c0-1.3-.3-2.2-1-3.3-.9-1.4-1.4-2.3-1.9-4z"/><path d="M6.4 12.4c.6 2 1.2 3.1 2.1 4.5.5.8.7 1.4.7 2.2V21a1 1 0 0 1-1 1H4.8a1 1 0 0 1-1-1v-1.7c0-1.3.3-2.3.9-3.6z"/>',
  banco: '<path d="M2 5.2h20v2.4H2zM4.4 9.4h15.2c1.2 0 2.2 1 2.2 2.2v1.8c0 1.2-1 2.2-2.2 2.2H4.4c-1.2 0-2.2-1-2.2-2.2v-1.8c0-1.2 1-2.2 2.2-2.2zM5 17.8h2.2V22H5zM16.8 17.8H19V22h-2.2z"/>',
  costas: '<path d="M12 1.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM7.5 8h9c1.4 0 2.5 1.1 2.5 2.5V15h-2.5l-.5 7h-3l-.5-5h-1l-.5 5h-3l-.5-7H5v-4.5C5 9.1 6.1 8 7.5 8z"/>',
  fogo: '<path d="M12 23a7 7 0 0 0 7-7c0-2-.8-3.7-2-5.2l-.5.9c-.3.5-1 .4-1.2-.1-.5-1.6-1.6-3.6-3.7-5.3-.4-.3-1-.1-1.1.4-.3 2-1 3.4-2.4 5C7.4 12.5 5 14.3 5 16a7 7 0 0 0 7 7zm0-3a2.7 2.7 0 0 1-2.7-2.7c0-1.2.7-2 1.6-2.9.4-.4.9-1 1.1-1.6.7.5 1.3 1.2 1.7 2 .5-.3.8-.8 1-1.4.7.8 1.1 1.7 1.1 2.6A3 3 0 0 1 12 20z"/>',
  raio: '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
  coracao: '<path d="M12 21C7 17 3 13.6 3 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 9 2.5c0 4.1-4 7.5-9 11.5z"/>',
  corrida: '<path d="M14 3a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM10 8l4-1 3 3 3 1-1 2-4-1-1 2 3 3-1 5-2-1 .5-3.5L11 14l-2 3-4 1-.5-2 3-1z"/>',
  alvo: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>',
  estrela: '<path d="m12 2 3 6.5 7 .8-5.2 4.7 1.5 6.9L12 17.4 5.7 20.9l1.5-6.9L2 9.3l7-.8z"/>',
  relogio: '<path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 5v5.3l4 2.4-1 1.6-5-3V7z"/>',
};

const ICON_KEYS = Object.keys(ICONS);

/* Tipos de série. Só a válida entra em volume, calorias, séries, repetições,
   recordes e no gráfico de evolução — as demais são preparação. */
const SET_TIPOS = [
  { id: 'v', curto: '',  nome: 'Série válida', desc: 'Conta nas estatísticas' },
  { id: 'a', curto: 'A', nome: 'Aquecimento',  desc: 'Carga leve antes das válidas' },
  { id: 'f', curto: 'F', nome: 'Feeder',       desc: 'Séries curtas de ativação' },
  { id: 'p', curto: 'P', nome: 'PAP',          desc: 'Potencialização pós-ativação' },
];

const tipoSet = (s) => (s && s.tipo) || 'v';
const ehValida = (s) => tipoSet(s) === 'v';
const infoTipo = (id) => SET_TIPOS.find((t) => t.id === id) || SET_TIPOS[0];

/* Temas disponíveis. O `amostra` é só para o quadradinho da tela de escolha. */
const TEMAS = [
  { id: 'preto', nome: 'Preto', desc: 'Preto puro, o padrão', amostra: ['#000000', '#121212'] },
  { id: 'grafite', nome: 'Grafite', desc: 'Cinza escuro, menos contraste', amostra: ['#141416', '#2A2A2E'] },
  { id: 'meia-noite', nome: 'Meia-noite', desc: 'Azul-marinho profundo', amostra: ['#080B14', '#17203A'] },
  { id: 'sepia', nome: 'Sépia', desc: 'Marrom quente, à noite cansa menos', amostra: ['#14100C', '#2C241B'] },
  { id: 'claro', nome: 'Claro', desc: 'Fundo claro, para academia iluminada', amostra: ['#F2F2F7', '#FFFFFF'] },
];

const DEFAULT_STATE = {
  version: 1,
  workouts: [],
  sessions: [],
  customExercises: [],
  settings: { unit: 'kg', restDefault: 1, bodyweight: 75, lastBackup: 0, backupAvisado: 0, tema: 'preto' },
  active: null,
};

const KEY = 'gymnotion.v1';

let S = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return Object.assign(structuredClone(DEFAULT_STATE), parsed);
  } catch (e) {
    console.warn('estado corrompido, recomeçando', e);
    return structuredClone(DEFAULT_STATE);
  }
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { console.error('falha ao salvar', e); }
  }, 120);
}

function saveNow() {
  clearTimeout(saveTimer);
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { console.error(e); }
}

const uid = (p) => p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

/* ---------- exercícios ---------- */

function allExercises() {
  return S.customExercises.concat(EXERCISES);
}

function findExercise(id) {
  return allExercises().find((e) => e.id === id);
}

function addCustomExercise(nome, grupo, equip) {
  const ex = { id: 'my_' + slugify(nome) + '_' + uid(''), nome, grupo, equip, custom: true };
  S.customExercises.unshift(ex);
  save();
  return ex;
}

/* ---------- treinos ---------- */

function newWorkout() {
  const usedColors = S.workouts.map((w) => w.color);
  const color = (COLORS.find((c) => !usedColors.includes(c.hex)) || COLORS[0]).hex;
  const w = {
    id: uid('w_'),
    name: 'Treino ' + String.fromCharCode(65 + S.workouts.length),
    color,
    icon: 'halter',
    exercises: [],
    createdAt: Date.now(),
  };
  S.workouts.push(w);
  save();
  return w;
}

function getWorkout(id) { return S.workouts.find((w) => w.id === id); }

function deleteWorkout(id) {
  S.workouts = S.workouts.filter((w) => w.id !== id);
  if (S.active && S.active.workoutId === id) S.active = null;
  save();
}

function duplicateWorkout(id) {
  const w = getWorkout(id);
  if (!w) return null;
  const copy = structuredClone(w);
  copy.id = uid('w_');
  copy.name = w.name + ' (cópia)';
  copy.createdAt = Date.now();
  copy.exercises.forEach((e) => { e.uid = uid('we_'); });
  S.workouts.push(copy);
  save();
  return copy;
}

function makeWorkoutExercise(ex, nSets, equip) {
  const rest = S.settings.restDefault;
  return {
    uid: uid('we_'),
    exId: ex.id,
    nome: ex.nome,
    grupo: ex.grupo,
    equip: equip || ex.equip,
    notas: '',
    sets: Array.from({ length: nSets || 1 }, () => ({ peso: 0, reps: 0, desc: rest, tipo: 'v', done: false })),
  };
}

function addExerciseToWorkout(workoutId, ex, nSets, equip) {
  const w = getWorkout(workoutId);
  if (!w) return null;
  const we = makeWorkoutExercise(ex, nSets, equip);
  w.exercises.push(we);
  save();
  return we;
}

/* ---------- sessão ativa ---------- */

function startSession(workoutId) {
  const w = getWorkout(workoutId);
  if (!w) return null;
  S.active = {
    workoutId,
    name: w.name,
    color: w.color,
    icon: w.icon,
    startedAt: Date.now(),
    accumMs: 0,
    running: true,
    exercises: structuredClone(w.exercises).map((e) => {
      e.sets.forEach((s) => { s.done = false; });
      return e;
    }),
  };
  save();
  return S.active;
}

function activeElapsedMs() {
  if (!S.active) return 0;
  return S.active.accumMs + (S.active.running ? Date.now() - S.active.startedAt : 0);
}

function pauseSession() {
  if (!S.active || !S.active.running) return;
  S.active.accumMs += Date.now() - S.active.startedAt;
  S.active.running = false;
  save();
}

function resumeSession() {
  if (!S.active || S.active.running) return;
  S.active.startedAt = Date.now();
  S.active.running = true;
  save();
}

function cancelSession() { S.active = null; save(); }

function sessionStats(exercises, durationSec, bodyweight) {
  let volume = 0, sets = 0, reps = 0;
  exercises.forEach((e) => {
    e.sets.forEach((s) => {
      if (!s.done || !ehValida(s)) return;
      sets += 1;
      reps += Number(s.reps) || 0;
      volume += (Number(s.peso) || 0) * (Number(s.reps) || 0);
    });
  });
  // estimativa simples: ~5 kcal por minuto de treino de força + 0.35 kcal / (kg levantado * 100)
  const mins = durationSec / 60;
  const calorias = Math.round(mins * (bodyweight / 75) * 5 + volume * 0.0035);
  return { volume: Math.round(volume), sets, reps, calorias };
}

function finishSession() {
  if (!S.active) return null;
  const a = S.active;
  const durationSec = Math.round(activeElapsedMs() / 1000);
  const done = a.exercises
    .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
    .filter((e) => e.sets.length > 0);
  const stats = sessionStats(a.exercises, durationSec, S.settings.bodyweight);
  const sess = {
    id: uid('s_'),
    workoutId: a.workoutId,
    name: a.name,
    color: a.color,
    icon: a.icon,
    date: Date.now(),
    durationSec,
    exercises: done,
    ...stats,
  };
  S.sessions.unshift(sess);

  // grava as cargas usadas de volta no molde do treino
  const w = getWorkout(a.workoutId);
  if (w) {
    a.exercises.forEach((ae) => {
      const target = w.exercises.find((x) => x.uid === ae.uid);
      if (!target) return;
      target.sets = ae.sets.map((s) => ({ peso: s.peso, reps: s.reps, desc: s.desc, tipo: tipoSet(s), done: false }));
      target.notas = ae.notas;
    });
  }

  S.active = null;
  saveNow();
  return sess;
}

/* ---------- consultas ---------- */

const dayKey = (ts) => {
  const d = new Date(ts);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

function sessionsOn(ts) {
  const k = dayKey(ts);
  return S.sessions.filter((s) => dayKey(s.date) === k);
}

function streak() {
  if (!S.sessions.length) return 0;
  const days = new Set(S.sessions.map((s) => dayKey(s.date)));
  let n = 0;
  const d = new Date();
  if (!days.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
  while (days.has(dayKey(d.getTime()))) { n += 1; d.setDate(d.getDate() - 1); }
  return n;
}

/* histórico de um exercício: [{date, volume, best1rm, topSet}] mais antigo -> mais novo */
function exerciseHistory(exId) {
  const out = [];
  for (let i = S.sessions.length - 1; i >= 0; i--) {
    const s = S.sessions[i];
    s.exercises.forEach((e) => {
      if (e.exId !== exId) return;
      let volume = 0, best = 0, topPeso = 0, topReps = 0;
      e.sets.forEach((st) => {
        if (!ehValida(st)) return;
        const p = Number(st.peso) || 0, r = Number(st.reps) || 0;
        volume += p * r;
        const rm = p * (1 + r / 30);
        if (rm > best) { best = rm; topPeso = p; topReps = r; }
      });
      out.push({ date: s.date, volume: Math.round(volume), rm: Math.round(best), topPeso, topReps, color: s.color });
    });
  }
  return out;
}

function lastPerformance(exId) {
  const h = exerciseHistory(exId);
  return h.length ? h[h.length - 1] : null;
}

/* Última execução de um exercício, série a série (só as válidas), para
   preencher a linha da série com o que foi feito da última vez. */
function ultimaExecucao(exId, ignorarId) {
  for (const sess of S.sessions) {
    if (ignorarId && sess.id === ignorarId) continue;
    const e = sess.exercises.find((x) => x.exId === exId);
    if (!e) continue;
    const validas = e.sets.filter(ehValida);
    if (!validas.length) continue;
    return { date: sess.date, sets: validas };
  }
  return null;
}

/* Melhor carga estimada (1RM de Epley) já registrada para o exercício. */
function melhorRM(exId, ignorarId) {
  let melhor = 0;
  S.sessions.forEach((sess) => {
    if (ignorarId && sess.id === ignorarId) return;
    sess.exercises.forEach((e) => {
      if (e.exId !== exId) return;
      e.sets.forEach((st) => {
        if (!ehValida(st)) return;
        const p = Number(st.peso) || 0, r = Number(st.reps) || 0;
        if (p > 0 && r > 0) melhor = Math.max(melhor, p * (1 + r / 30));
      });
    });
  });
  return melhor;
}

/* Domingo 00:00 da semana de um instante. */
function inicioDaSemana(ts) {
  const d = new Date(ts == null ? Date.now() : ts);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/* Séries válidas por grupo muscular num intervalo. A faixa usada como
   referência (10 a 20 séries semanais por grupo) é a citada com mais
   frequência na literatura de hipertrofia. */
const SERIES_MIN = 10;
const SERIES_MAX = 20;

function seriesPorGrupo(desde, ate) {
  const fim = ate == null ? Infinity : ate;
  const contagem = {};
  S.sessions.forEach((sess) => {
    if (sess.date < desde || sess.date > fim) return;
    sess.exercises.forEach((e) => {
      const g = e.grupo || 'Outros';
      const n = e.sets.filter(ehValida).length;
      if (n) contagem[g] = (contagem[g] || 0) + n;
    });
  });
  return Object.entries(contagem)
    .map(([grupo, series]) => ({ grupo, series }))
    .sort((a, b) => b.series - a.series);
}

/* Recalcula os números de um registro depois de editado à mão. */
function recalcSession(sess) {
  const st = sessionStats(
    sess.exercises.map((e) => ({ sets: e.sets.map((x) => ({ ...x, done: true })) })),
    sess.durationSec, S.settings.bodyweight
  );
  Object.assign(sess, st);
  return sess;
}

/* ---------- backup ---------- */

/* Quantos treinos foram registrados desde o último backup exportado. */
function treinosDesdeBackup() {
  const t = S.settings.lastBackup || 0;
  return S.sessions.filter((s) => s.date > t).length;
}

function marcarBackupFeito() {
  S.settings.lastBackup = Date.now();
  S.settings.backupAvisado = Date.now();
  saveNow();
}

/* ---------- import / export ---------- */

function exportJSON() {
  return JSON.stringify(S, null, 2);
}

function importJSON(text) {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.workouts)) throw new Error('Arquivo inválido');
  S = Object.assign(structuredClone(DEFAULT_STATE), data);
  saveNow();
}

function resetAll() {
  S = structuredClone(DEFAULT_STATE);
  saveNow();
}
