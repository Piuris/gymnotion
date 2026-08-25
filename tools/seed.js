/* Gera dados de demonstração para testar a interface (não vai para o app). */
const fs = require('fs');
const path = require('path');

const day = 86400000;
const now = Date.parse('2026-08-24T21:00:00');

/* mesmo slug usado em js/exercises.js, para as fotos casarem */
const slug = (s) => s.toLowerCase()
  .normalize('NFD').replace(new RegExp('[\u0300-\u036f]', 'g'), '')
  .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const mk = (nome, exs) => exs.map((e, i) => ({
  uid: 'we' + nome + i, exId: 'ex_' + slug(e[0]), nome: e[0], grupo: e[1], equip: 'Máquina', notas: '',
  sets: [1, 2, 3].map(() => ({ peso: e[2], reps: e[3], desc: 1, done: true })),
}));

const pull = mk('pull', [['Puxada Frontal', 'Costas', 60, 10], ['Remada Sentada', 'Costas', 55, 10],
  ['Crucifixo Invertido', 'Ombros', 30, 12], ['Rosca Scott', 'Bíceps', 25, 12], ['Abdominal', 'Abdômen', 10, 20]]);
const push = mk('push', [['Supino Reto', 'Peito', 70, 8], ['Desenvolvimento com Halteres', 'Ombros', 22, 10],
  ['Tríceps Corda', 'Tríceps', 30, 12]]);
const perna = mk('perna', [['Agachamento Hack', 'Pernas', 100, 10], ['Cadeira Extensora', 'Pernas', 55, 12],
  ['Cadeira Flexora', 'Pernas', 45, 12], ['Cadeira Adutora', 'Pernas', 50, 15],
  ['Cadeira Abdutora', 'Pernas', 50, 15], ['Panturrilha em Pé', 'Panturrilha', 80, 15]]);

const stats = (exs, dur) => {
  let volume = 0, sets = 0, reps = 0;
  exs.forEach((e) => e.sets.forEach((s) => { sets++; reps += s.reps; volume += s.peso * s.reps; }));
  return { volume, sets, reps, calorias: Math.round((dur / 60) * 5 + volume * 0.0035) };
};

/* escala as cargas para que o histórico tenha variação real */
const scaled = (exs, k) => exs.map((e) => ({
  ...e, sets: e.sets.map((s) => ({ ...s, peso: Math.round(s.peso * k) })),
}));

const sess = (id, name, color, icon, exs, ago, dur, k) => {
  const ex = scaled(exs, k == null ? 1 : k);
  return {
    id, workoutId: 'w_' + name.toLowerCase(), name, color, icon,
    date: now - ago * day, durationSec: dur, exercises: ex, ...stats(ex, dur),
  };
};

const state = {
  version: 1,
  workouts: [
    { id: 'w_pull', name: 'Pull', color: '#A020F0', icon: 'kettle', exercises: pull, createdAt: now },
    { id: 'w_push', name: 'Push', color: '#FF5A1E', icon: 'banco', exercises: push, createdAt: now },
    { id: 'w_perna', name: 'Perna', color: '#22E04A', icon: 'perna', exercises: perna, createdAt: now },
  ],
  sessions: [
    sess('s1', 'Pull', '#A020F0', 'kettle', pull, 0, 1740, 1.00),
    sess('s2', 'Push', '#FF5A1E', 'banco', push, 2, 1500, 1.06),
    sess('s3', 'Perna', '#22E04A', 'perna', perna, 3, 2100, 1.04),
    sess('s4', 'Pull', '#A020F0', 'kettle', pull, 5, 1680, 0.94),
    sess('s5', 'Push', '#FF5A1E', 'banco', push, 6, 1440, 0.98),
    sess('s6', 'Perna', '#22E04A', 'perna', perna, 8, 1980, 0.96),
    sess('s7', 'Pull', '#A020F0', 'kettle', pull, 10, 1620, 0.90),
    sess('s8', 'Perna', '#22E04A', 'perna', perna, 12, 1860, 0.88),
    sess('s9', 'Push', '#FF5A1E', 'banco', push, 13, 1380, 0.90),
  ],
  customExercises: [],
  settings: { unit: 'kg', restDefault: 1, bodyweight: 75 },
  active: null,
};

const html = `<!DOCTYPE html><meta charset="utf-8"><script>
localStorage.setItem('gymnotion.v1', ${JSON.stringify(JSON.stringify(state))});
location.replace('index.html');
</` + `script>`;

fs.writeFileSync(path.join(__dirname, '..', '__seed.html'), html);
console.log('seed pronto');
