/* Estado + persistência local (localStorage) */

/* Doze cores dando a volta no círculo cromático, na ordem do arco-íris: duas
   escolhidas em sequência nunca saem parecidas, e a fileira já se lê como uma
   escala. O verde aparece em dois tons de propósito, um claro e um escuro —
   antes havia dois verdes quase iguais (`verde` e `lima`) e nenhum verde
   fechado. Saíram o coral, que era um laranja repetido, e o gelo, que de tão
   apagado não identificava nada.

   A distância entre os pares foi medida em CIE Lab, não a olho: nenhum par
   fica abaixo de ΔE 30, contra ΔE 16 da paleta anterior (`#FF5A1E` e
   `#FF3B30` eram praticamente o mesmo laranja-vermelho). `folhas-test.js`
   refaz essa conta e falha se alguém encostar duas cores de novo. */
const COLORS = [
  { id: 'vermelho', nome: 'Vermelho', hex: '#FF3B30' },
  { id: 'laranja', nome: 'Laranja', hex: '#FF8A00' },
  { id: 'amarelo', nome: 'Amarelo', hex: '#FFD60A' },
  { id: 'lima', nome: 'Lima', hex: '#A8ED2E' },
  { id: 'verde', nome: 'Verde claro', hex: '#25E36B' },
  { id: 'esmeralda', nome: 'Verde escuro', hex: '#0B8F52' },
  { id: 'turquesa', nome: 'Turquesa', hex: '#00D2C4' },
  { id: 'azul', nome: 'Azul', hex: '#0A84FF' },
  { id: 'indigo', nome: 'Índigo', hex: '#3F4FE0' },
  { id: 'roxo', nome: 'Roxo', hex: '#A020F0' },
  { id: 'orquidea', nome: 'Orquídea', hex: '#F05BE0' },
  { id: 'magenta', nome: 'Magenta', hex: '#FF2D96' },
];

const nomeDaCor = (hex) => {
  const c = COLORS.find((x) => x.hex === hex);
  return c ? c.nome : 'Cor própria';
};

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
/* `neutro` é a cor dos detalhes fora do treino. Branco nos temas escuros;
   no claro precisa escurecer, senão o botão sumiria no fundo. */
const TEMAS = [
  { id: 'preto', nome: 'Preto', desc: 'Preto puro, o padrão', amostra: ['#000000', '#121212'], neutro: '#FFFFFF' },
  { id: 'grafite', nome: 'Grafite', desc: 'Cinza escuro, menos contraste', amostra: ['#141416', '#2A2A2E'], neutro: '#FFFFFF' },
  { id: 'meia-noite', nome: 'Meia-noite', desc: 'Azul-marinho profundo', amostra: ['#080B14', '#17203A'], neutro: '#FFFFFF' },
  { id: 'sepia', nome: 'Sépia', desc: 'Marrom quente, à noite cansa menos', amostra: ['#14100C', '#2C241B'], neutro: '#F5EDE2' },
  { id: 'claro', nome: 'Claro', desc: 'Fundo claro, para academia iluminada', amostra: ['#F2F2F7', '#FFFFFF'], neutro: '#1C1C1E' },
];

const DEFAULT_STATE = {
  version: 3,
  workouts: [],
  sessions: [],
  customExercises: [],
  tarefas: [],            // cronograma: tarefas e compromissos
  metas: [],              // cofrinho: dinheiro separado por objetivo
  materias: [],           // estudos: tópicos e horas por matéria
  agua: {},               // ml bebidos por dia, em chave AAAA-MM-DD
  aguaLog: {},            // cada gole do dia, na ordem, para o desfazer
  settings: {
    unit: 'kg', restDefault: 1, bodyweight: 75,
    lastBackup: 0, backupAvisado: 0, tema: 'preto',
    metaSemanal: 2,       // treinos por semana para a ofensiva sobreviver
    metaAgua: 0,          // ml por dia; 0 = calcula a partir do peso
  },
  active: null,
};

/* ---------- migração v1 -> v2 ----------
   Na v1 cada combinação de movimento e aparelho era um exercício separado
   ("Supino Reto com Halteres"). Na v2 há um movimento só e o aparelho é uma
   variação, então os registros antigos precisam ser reapontados. */

const MIGRACAO_V2 = {
  ex_supino_reto_com_halteres: ['ex_supino_reto', 'Halteres'],
  ex_supino_inclinado_com_halteres: ['ex_supino_inclinado', 'Halteres'],
  ex_supino_na_maquina: ['ex_supino_reto', 'Máquina'],
  ex_supino_no_smith: ['ex_supino_reto', 'Smith'],
  ex_crucifixo_na_maquina: ['ex_crucifixo_reto', 'Máquina'],
  ex_mergulho_paralelas: ['ex_mergulho', 'Peso corporal'],
  ex_remada_na_maquina: ['ex_remada_sentada', 'Máquina'],
  ex_encolhimento_com_barra: ['ex_encolhimento', 'Barra'],
  ex_desenvolvimento_com_halteres: ['ex_desenvolvimento', 'Halteres'],
  ex_desenvolvimento_com_barra: ['ex_desenvolvimento', 'Barra'],
  ex_desenvolvimento_na_maquina: ['ex_desenvolvimento', 'Máquina'],
  ex_elevacao_lateral_no_cabo: ['ex_elevacao_lateral', 'Cabo'],
  ex_elevacao_lateral_na_maquina: ['ex_elevacao_lateral', 'Máquina'],
  ex_elevacao_frontal_com_anilha: ['ex_elevacao_frontal', 'Anilha'],
  ex_crucifixo_invertido_com_halteres: ['ex_crucifixo_invertido', 'Halteres'],
  ex_rosca_direta_com_halteres: ['ex_rosca_direta', 'Halteres'],
  ex_rosca_no_cabo: ['ex_rosca_direta', 'Cabo'],
  ex_rosca_scott_com_barra_w: ['ex_rosca_scott', 'Barra'],
  ex_triceps_barra: ['ex_triceps_na_polia', 'Cabo'],
  ex_abdominal_com_peso: ['ex_abdominal', 'Anilha'],
  ex_abdominal_na_maquina: ['ex_abdominal_maquina', 'Máquina'],
  ex_abdominal_no_cabo: ['ex_abdominal_na_polia', 'Cabo'],
  ex_agachamento_no_smith: ['ex_agachamento_livre', 'Smith'],
  ex_elevacao_pelvica_na_maquina: ['ex_elevacao_pelvica', 'Máquina'],
  ex_coice_no_cabo: ['ex_coice', 'Cabo'],
  ex_coice_na_maquina: ['ex_coice', 'Máquina'],
  ex_panturrilha_no_smith: ['ex_panturrilha_em_pe', 'Smith'],
  ex_hollow_hold: ['ex_prancha', 'Peso corporal'],
};

function migrarParaV2(estado) {
  if ((estado.version || 1) >= 2) return estado;

  const arrumar = (e) => {
    const destino = MIGRACAO_V2[e.exId];
    if (destino) {
      e.exId = destino[0];
      e.equip = destino[1];
    }
    if (e.equip === 'Sem equipamento') e.equip = 'Peso corporal';
    /* o nome guardado vira o do movimento; o aparelho já aparece ao lado */
    const ex = EXERCISES.find((x) => x.id === e.exId);
    if (ex) e.nome = ex.nome;
    return e;
  };

  (estado.workouts || []).forEach((w) => (w.exercises || []).forEach(arrumar));
  (estado.sessions || []).forEach((s) => (s.exercises || []).forEach(arrumar));
  if (estado.active) (estado.active.exercises || []).forEach(arrumar);
  (estado.customExercises || []).forEach((e) => {
    if (e.equip === 'Sem equipamento') e.equip = 'Peso corporal';
  });

  estado.version = 2;
  return estado;
}

/* Campos que passaram a existir depois: um estado antigo não os tem. */
/* ---------- migração v2 -> v3 ----------
   O app deixou de ser só academia. Os módulos novos entram vazios: nada do que
   já estava salvo muda de forma, só ganha companhia. */

const LISTAS_V3 = ['tarefas', 'metas', 'materias'];

function migrarParaV3(estado) {
  if ((estado.version || 1) >= 3) return estado;
  LISTAS_V3.forEach((k) => { if (!Array.isArray(estado[k])) estado[k] = []; });
  estado.version = 3;
  return estado;
}

function completarCampos(estado) {
  LISTAS_V3.forEach((k) => { if (!Array.isArray(estado[k])) estado[k] = []; });
  delete estado.descansos;   // o descanso passou a ser automático
  if (!estado.agua || typeof estado.agua !== 'object') estado.agua = {};
  if (!estado.aguaLog || typeof estado.aguaLog !== 'object') estado.aguaLog = {};
  const p = DEFAULT_STATE.settings;
  Object.keys(p).forEach((k) => {
    if (estado.settings[k] === undefined) estado.settings[k] = p[k];
  });
  return estado;
}

const KEY = 'gymnotion.v1';

let S = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return completarCampos(migrarParaV3(migrarParaV2(Object.assign(structuredClone(DEFAULT_STATE), parsed))));
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

/* Treino sugerido para hoje: o que está há mais tempo sem ser feito. É um
   rodízio simples, que funciona sem exigir que ele monte uma agenda fixa. */
function treinoSugerido() {
  if (!S.workouts.length) return null;
  const ultimo = {};
  /* S.sessions vem do mais novo para o mais velho, então o primeiro que
     aparece de cada treino já é a última vez que ele foi feito */
  S.sessions.forEach((sess) => {
    if (ultimo[sess.workoutId] == null) ultimo[sess.workoutId] = sess.date;
  });
  return S.workouts.slice().sort((a, b) => (ultimo[a.id] || 0) - (ultimo[b.id] || 0))[0];
}

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
    equips: ex.equips || null,
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

/* Troca o exercício mantendo a estrutura das séries (quantidade, tipo e
   descanso). Peso e repetições zeram, porque são de outro movimento. */
function substituirExercicio(workoutId, uid, ex, equip) {
  const trocar = (lista) => {
    const alvo = lista.find((e) => e.uid === uid);
    if (!alvo) return false;
    alvo.exId = ex.id;
    alvo.nome = ex.nome;
    alvo.grupo = ex.grupo;
    alvo.equip = equip || ex.equip;
    alvo.notas = '';
    alvo.sets = alvo.sets.map((st) => ({
      peso: 0, reps: 0, desc: st.desc, tipo: tipoSet(st), done: false,
    }));
    return true;
  };
  const w = getWorkout(workoutId);
  const ok = w ? trocar(w.exercises) : false;
  if (S.active && S.active.workoutId === workoutId) trocar(S.active.exercises);
  saveNow();
  return ok;
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

/* ---------- ofensiva e dias de descanso ---------- */

const metaSemanal = () => Math.max(1, S.settings.metaSemanal || 2);

/* Contagem de dias distintos com treino numa semana. O cache evita recontar a
   mesma semana a cada dia percorrido pela ofensiva. */
function treinosNaSemana(inicio, cache) {
  if (cache && cache.has(inicio)) return cache.get(inicio);
  const fim = inicio + 7 * 86400000;
  const dias = new Set();
  S.sessions.forEach((s) => {
    if (s.date >= inicio && s.date < fim) dias.add(dayKey(s.date));
  });
  if (cache) cache.set(inicio, dias.size);
  return dias.size;
}

/* Dia sem treino é descanso automaticamente — não há nada a marcar. Ele
   sustenta a corrente enquanto a semana dele tiver batido a meta de treinos;
   é a meta semanal que segura a ofensiva, não o dia isolado. A semana em curso
   é poupada, porque ela ainda pode bater. */
function descansoCobre(ts, cache) {
  const ini = inicioDaSemana(ts);
  if (ini === inicioDaSemana(Date.now())) return true;
  return treinosNaSemana(ini, cache) >= metaSemanal();
}

/* Descanso "de verdade" para a interface: dia sem treino que segura a corrente. */
function ehDescanso(ts) {
  return sessionsOn(ts).length === 0 && descansoCobre(ts);
}

/* O que interrompe a corrente: um dia sem treino numa semana fechada que não
   bateu a meta. */
function diaMantemOfensiva(ts, cache) {
  return sessionsOn(ts).length > 0 || descansoCobre(ts, cache);
}

/* A ofensiva conta DIAS TREINADOS. Os dias de descanso costuram a corrente sem
   entrar na conta, então o número segue significando "quantas vezes eu treinei
   em sequência". */
function streak() {
  if (!S.sessions.length) return 0;
  const cache = new Map();
  let n = 0;
  const d = new Date();
  /* hoje ainda pode ser preenchido: não conta contra, nem soma */
  if (!diaMantemOfensiva(d.getTime(), cache)) d.setDate(d.getDate() - 1);
  while (diaMantemOfensiva(d.getTime(), cache)) {
    if (sessionsOn(d.getTime()).length) n += 1;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/* Quantos treinos ainda faltam nesta semana para a ofensiva sobreviver à
   virada. Zero quando a meta já foi batida. */
function faltamNaSemana(ts) {
  return Math.max(0, metaSemanal() - treinosNaSemana(inicioDaSemana(ts)));
}

/* ---------- água ---------- */

/* Sem meta definida, usa 35 ml por kg — a referência mais comum — arredondado
   para a centena mais próxima. */
function metaAgua() {
  if (S.settings.metaAgua > 0) return S.settings.metaAgua;
  return Math.round((S.settings.bodyweight || 75) * 35 / 100) * 100;
}

const aguaDoDia = (ts) => S.agua[dayKey(ts == null ? Date.now() : ts)] || 0;

function beberAgua(ml, ts) {
  const k = dayKey(ts == null ? Date.now() : ts);
  S.agua[k] = Math.max(0, (S.agua[k] || 0) + ml);
  if (!S.agua[k]) delete S.agua[k];
  if (ml > 0) (S.aguaLog[k] = S.aguaLog[k] || []).push(ml);
  saveNow();
  return S.agua[k] || 0;
}

/* Quanto entrou por último no dia. O desfazer tira exatamente esse valor:
   descontar um número fixo erraria sempre que o copo anterior foi outro. */
function aguaUltimo(ts) {
  const l = S.aguaLog[dayKey(ts == null ? Date.now() : ts)];
  return (l && l.length) ? l[l.length - 1] : 0;
}

function desfazerAgua(padrao, ts) {
  const k = dayKey(ts == null ? Date.now() : ts);
  const l = S.aguaLog[k];
  const ml = (l && l.length) ? l.pop() : (padrao || 0);
  if (l && !l.length) delete S.aguaLog[k];
  beberAgua(-ml, ts);
  return ml;
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

/* Devolve séries e frequência: volume e número de vezes treinado são coisas
   diferentes — 15 séries num dia só não é o mesmo que 15 em três dias. */
function seriesPorGrupo(desde, ate) {
  const fim = ate == null ? Infinity : ate;
  const contagem = {};
  S.sessions.forEach((sess) => {
    if (sess.date < desde || sess.date > fim) return;
    const dia = dayKey(sess.date);
    sess.exercises.forEach((e) => {
      const g = e.grupo || 'Outros';
      const n = e.sets.filter(ehValida).length;
      if (!n) return;
      if (!contagem[g]) contagem[g] = { series: 0, dias: new Set() };
      contagem[g].series += n;
      contagem[g].dias.add(dia);
    });
  });
  return Object.entries(contagem)
    .map(([grupo, v]) => ({ grupo, series: v.series, frequencia: v.dias.size }))
    .sort((a, b) => b.series - a.series);
}

/* Quanto a melhor carga estimada mudou numa janela de dias. */
function tendenciaCarga(exId, dias) {
  const corte = Date.now() - dias * 86400000;
  const h = exerciseHistory(exId);
  if (h.length < 2) return null;
  const recentes = h.filter((x) => x.date >= corte);
  const antigos = h.filter((x) => x.date < corte);
  if (!recentes.length || !antigos.length) return null;
  const antes = Math.max(...antigos.map((x) => x.rm));
  const agora = Math.max(...recentes.map((x) => x.rm));
  return { antes, agora, delta: agora - antes, dias };
}

/* Compara um registro com o anterior do mesmo treino. */
function compararComAnterior(sess) {
  const i = S.sessions.findIndex((x) => x.id === sess.id);
  if (i < 0) return null;
  const anterior = S.sessions.slice(i + 1).find((x) => x.workoutId === sess.workoutId);
  if (!anterior) return null;

  const maiorCarga = (ex) => Math.max(0, ...ex.sets.filter(ehValida).map((st) => Number(st.peso) || 0));
  const porExercicio = [];
  sess.exercises.forEach((e) => {
    const a = anterior.exercises.find((x) => x.exId === e.exId);
    if (!a) return;
    const antes = maiorCarga(a);
    const agora = maiorCarga(e);
    if (antes || agora) porExercicio.push({ nome: e.nome, antes, agora, delta: agora - antes });
  });

  return {
    anterior,
    volume: sess.volume - anterior.volume,
    sets: sess.sets - anterior.sets,
    reps: sess.reps - anterior.reps,
    porExercicio,
  };
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


/* =========================================================
   CORES DOS MÓDULOS

   A regra da cor continua a mesma: cor identifica a coisa, não decora a tela.
   A academia herda a cor do treino; água, cronograma, metas e estudos têm cor
   própria. Em metas e matérias a cor é por item, como nos treinos, porque são
   várias coisas disputando a mesma tela.
   ========================================================= */

const COR_AGENDA = '#3F4FE0';
const COR_METAS = '#25E36B';
const COR_ESTUDOS = '#FFD60A';

/* Primeira cor da paleta ainda não usada na lista, para dois itens novos não
   saírem iguais. */
function corLivre(lista) {
  const usadas = (lista || []).map((x) => x.cor || x.color);
  return (COLORS.find((c) => !usadas.includes(c.hex)) || COLORS[0]).hex;
}

/* =========================================================
   CRONOGRAMA

   A data de uma tarefa é guardada como chave de dia ('AAAA-MM-DD'), não como
   instante: "dia 3" precisa continuar sendo dia 3 depois de exportar, importar
   e abrir noutro fuso. De quebra, comparar e ordenar viram comparação de texto.
   ========================================================= */

const tsDaData = (k) => new Date(k + 'T00:00:00').getTime();

function novaTarefa(dados) {
  const t = Object.assign({
    id: uid('t_'),
    titulo: 'Nova tarefa',
    nota: '',
    data: dayKey(Date.now()),   // null = sem dia marcado
    hora: '',                   // 'HH:MM' quando tem hora marcada
    tipo: 'tarefa',             // 'tarefa' | 'compromisso'
    cor: COR_AGENDA,
    feito: false,
    feitoEm: 0,
    criada: Date.now(),
  }, dados || {});
  S.tarefas.unshift(t);
  save();
  return t;
}

const getTarefa = (id) => S.tarefas.find((t) => t.id === id);

/* Quem tem hora vem primeiro, na ordem do relógio; depois o que é só tarefa;
   o que já foi feito desce para o fim em vez de sumir. */
function ordemTarefa(a, b) {
  if (a.feito !== b.feito) return a.feito ? 1 : -1;
  if (!!a.hora !== !!b.hora) return a.hora ? -1 : 1;
  if (a.hora && b.hora && a.hora !== b.hora) return a.hora < b.hora ? -1 : 1;
  return a.criada - b.criada;
}

const tarefasDoDia = (ts) => S.tarefas
  .filter((t) => t.data === dayKey(ts == null ? Date.now() : ts))
  .sort(ordemTarefa);

const tarefasSemData = () => S.tarefas.filter((t) => !t.data).sort(ordemTarefa);

const pendentesDoDia = (ts) => tarefasDoDia(ts).filter((t) => !t.feito).length;

/* Aberta num dia que já passou. Fica visível em vez de sumir silenciosamente
   no passado, que é onde tarefa esquecida costuma morrer. */
function tarefasAtrasadas(ts) {
  const hoje = dayKey(ts == null ? Date.now() : ts);
  return S.tarefas
    .filter((t) => !t.feito && t.data && t.data < hoje)
    .sort(ordemTarefa);
}

/* Marcas do mês para o calendário: as cores das tarefas de cada dia e quantas
   continuam abertas. Uma passada só na lista, em vez de varrê-la 31 vezes. */
function marcasDoMes(ts) {
  const d = new Date(ts == null ? Date.now() : ts);
  const prefixo = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  const marcas = {};
  S.tarefas.forEach((t) => {
    if (!t.data || t.data.slice(0, 7) !== prefixo) return;
    const m = marcas[t.data] || (marcas[t.data] = { cores: [], abertas: 0, total: 0 });
    if (m.cores.indexOf(t.cor) < 0 && m.cores.length < 3) m.cores.push(t.cor);
    m.total += 1;
    if (!t.feito) m.abertas += 1;
  });
  return marcas;
}

function alternarTarefa(id) {
  const t = getTarefa(id);
  if (!t) return null;
  t.feito = !t.feito;
  t.feitoEm = t.feito ? Date.now() : 0;
  saveNow();
  return t;
}

function removerTarefa(id) {
  S.tarefas = S.tarefas.filter((t) => t.id !== id);
  saveNow();
}

/* Empurra uma tarefa para outro dia sem ter que reabrir e reescrever tudo. */
function adiarTarefa(id, dias) {
  const t = getTarefa(id);
  if (!t) return null;
  const base = new Date(t.data ? tsDaData(t.data) : Date.now());
  base.setDate(base.getDate() + dias);
  t.data = dayKey(base.getTime());
  saveNow();
  return t;
}

/* =========================================================
   METAS — o cofrinho
   ========================================================= */

function novaMeta(nome, alvo, cor) {
  const m = {
    id: uid('meta_'),
    nome: nome || 'Nova meta',
    alvo: Math.max(0, Number(alvo) || 0),
    cor: cor || corLivre(S.metas),
    prazo: null,
    depositos: [],
    criada: Date.now(),
  };
  S.metas.unshift(m);
  save();
  return m;
}

const getMeta = (id) => S.metas.find((m) => m.id === id);

/* O saldo é a soma dos lançamentos, e retirada entra como valor negativo. Com
   isso o extrato mostra o que saiu e quando, em vez de o saldo encolher sem
   deixar rastro. */
const metaGuardado = (m) => (m ? m.depositos.reduce((a, d) => a + d.valor, 0) : 0);
const metaPct = (m) => (m && m.alvo > 0 ? Math.min(1, metaGuardado(m) / m.alvo) : 0);
const metaFalta = (m) => Math.max(0, (m ? m.alvo : 0) - metaGuardado(m));
const metaBatida = (m) => !!m && m.alvo > 0 && metaGuardado(m) >= m.alvo;
const totalGuardado = () => S.metas.reduce((a, m) => a + metaGuardado(m), 0);
const totalDasMetas = () => S.metas.reduce((a, m) => a + m.alvo, 0);

function guardarNaMeta(id, valor, nota) {
  const m = getMeta(id);
  const v = Number(valor) || 0;
  if (!m || !v) return null;
  /* não deixa o cofrinho ficar negativo: retira no máximo o que tem dentro */
  const lancado = v < 0 ? -Math.min(-v, metaGuardado(m)) : v;
  if (!lancado) return null;
  const d = { id: uid('d_'), valor: lancado, nota: nota || '', data: Date.now() };
  m.depositos.unshift(d);
  saveNow();
  return d;
}

function removerDeposito(metaId, depId) {
  const m = getMeta(metaId);
  if (!m) return;
  m.depositos = m.depositos.filter((d) => d.id !== depId);
  saveNow();
}

function removerMeta(id) {
  S.metas = S.metas.filter((m) => m.id !== id);
  saveNow();
}

/* =========================================================
   ESTUDOS — matérias, tópicos e horas
   ========================================================= */

function novaMateria(nome, cor, metaSemanal) {
  const m = {
    id: uid('mat_'),
    nome: nome || 'Nova matéria',
    cor: cor || corLivre(S.materias),
    metaSemanal: Math.max(0, Math.round(Number(metaSemanal) || 120)),   // minutos
    topicos: [],
    sessoes: [],
    criada: Date.now(),
  };
  S.materias.unshift(m);
  save();
  return m;
}

const getMateria = (id) => S.materias.find((m) => m.id === id);
const topicosFeitos = (m) => (m ? m.topicos.filter((t) => t.feito).length : 0);
const progressoMateria = (m) => (m && m.topicos.length ? topicosFeitos(m) / m.topicos.length : 0);

function addTopico(matId, nome) {
  const m = getMateria(matId);
  if (!m || !nome) return null;
  const t = { id: uid('tp_'), nome, feito: false, feitoEm: 0 };
  m.topicos.push(t);
  saveNow();
  return t;
}

function alternarTopico(matId, topId) {
  const m = getMateria(matId);
  const t = m && m.topicos.find((x) => x.id === topId);
  if (!t) return null;
  t.feito = !t.feito;
  t.feitoEm = t.feito ? Date.now() : 0;
  saveNow();
  return t;
}

function removerTopico(matId, topId) {
  const m = getMateria(matId);
  if (!m) return;
  m.topicos = m.topicos.filter((t) => t.id !== topId);
  saveNow();
}

function registrarEstudo(matId, minutos, nota, ts) {
  const m = getMateria(matId);
  const min = Math.round(Number(minutos) || 0);
  if (!m || min <= 0) return null;
  const s = { id: uid('es_'), min, nota: nota || '', data: ts == null ? Date.now() : ts };
  m.sessoes.unshift(s);
  saveNow();
  return s;
}

function removerSessaoEstudo(matId, sesId) {
  const m = getMateria(matId);
  if (!m) return;
  m.sessoes = m.sessoes.filter((s) => s.id !== sesId);
  saveNow();
}

function removerMateria(id) {
  S.materias = S.materias.filter((m) => m.id !== id);
  saveNow();
}

/* Minutos estudados numa semana. Sem `ini`, a semana corrente. */
function minutosNaSemana(m, ini) {
  const i = ini == null ? inicioDaSemana() : ini;
  const fim = i + 7 * 86400000;
  return (m ? m.sessoes : []).reduce((a, s) => a + (s.data >= i && s.data < fim ? s.min : 0), 0);
}

const minutosTotais = (m) => (m ? m.sessoes.reduce((a, s) => a + s.min, 0) : 0);
const estudoDaSemana = (ini) => S.materias.reduce((a, m) => a + minutosNaSemana(m, ini), 0);
const metaEstudoSemana = () => S.materias.reduce((a, m) => a + (m.metaSemanal || 0), 0);

/* Minutos por dia nos últimos `n` dias, do mais antigo para o mais novo, junto
   com a cor da matéria que mais rendeu no dia — o gráfico junta matérias, e a
   cor de cada barra diz de quem foi o dia. */
function estudoPorDia(n, ate) {
  const fim = new Date(ate == null ? Date.now() : ate);
  fim.setHours(0, 0, 0, 0);
  const dias = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(fim);
    d.setDate(d.getDate() - i);
    const k = dayKey(d.getTime());
    let min = 0;
    let melhor = 0;
    let cor = COR_ESTUDOS;
    S.materias.forEach((m) => {
      const soma = m.sessoes.reduce((a, s) => a + (dayKey(s.data) === k ? s.min : 0), 0);
      min += soma;
      if (soma > melhor) { melhor = soma; cor = m.cor; }
    });
    dias.push({ ts: d.getTime(), min, cor });
  }
  return dias;
}

/* ---------- import / export ---------- */

function exportJSON() {
  return JSON.stringify(S, null, 2);
}

function importJSON(text) {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.workouts)) throw new Error('Arquivo inválido');
  S = completarCampos(migrarParaV3(migrarParaV2(Object.assign(structuredClone(DEFAULT_STATE), data))));
  saveNow();
}

function resetAll() {
  S = structuredClone(DEFAULT_STATE);
  saveNow();
}
