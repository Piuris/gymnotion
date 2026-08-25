/* Biblioteca de exercícios (pt-BR).
 *
 * Cada entrada é um MOVIMENTO, não uma combinação de movimento e aparelho.
 * "Supino Reto" é um só; barra, halteres, máquina e Smith são variações que o
 * usuário escolhe no seletor — e a foto acompanha a escolha.
 *
 * O primeiro equipamento da lista é o padrão do movimento.
 */

const GRUPOS = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Bíceps', 'Tríceps', 'Abdômen', 'Glúteos', 'Panturrilha', 'Antebraço', 'Cardio'];

const EQUIPAMENTOS = ['Peso corporal', 'Barra', 'Halteres', 'Máquina', 'Cabo', 'Smith', 'Kettlebell', 'Anilha', 'Elástico', 'Barra fixa', 'Banco'];

/* [nome, grupo, [equipamentos, o primeiro é o padrão]] */
const EX_RAW = [
  // ---------- Peito ----------
  ['Supino Reto', 'Peito', ['Barra', 'Halteres', 'Máquina', 'Smith']],
  ['Supino Inclinado', 'Peito', ['Barra', 'Halteres', 'Máquina', 'Smith']],
  ['Supino Declinado', 'Peito', ['Barra', 'Halteres', 'Máquina']],
  ['Supino Fechado', 'Peito', ['Barra', 'Halteres', 'Smith']],
  ['Crucifixo Reto', 'Peito', ['Halteres', 'Máquina', 'Cabo']],
  ['Crucifixo Inclinado', 'Peito', ['Halteres', 'Cabo']],
  ['Crossover', 'Peito', ['Cabo']],
  ['Crossover Baixo', 'Peito', ['Cabo']],
  ['Pullover', 'Peito', ['Halteres', 'Cabo', 'Barra']],
  ['Flexão de Braço', 'Peito', ['Peso corporal']],
  ['Flexão Inclinada', 'Peito', ['Peso corporal']],
  ['Flexão Diamante', 'Peito', ['Peso corporal']],
  ['Mergulho', 'Peito', ['Peso corporal', 'Máquina']],

  // ---------- Costas ----------
  ['Puxada Frontal', 'Costas', ['Máquina', 'Cabo']],
  ['Puxada Aberta', 'Costas', ['Máquina', 'Cabo']],
  ['Puxada Supinada', 'Costas', ['Máquina', 'Cabo']],
  ['Puxada Triângulo', 'Costas', ['Máquina', 'Cabo']],
  ['Puxada Unilateral', 'Costas', ['Cabo', 'Máquina']],
  ['Barra Fixa', 'Costas', ['Barra fixa', 'Máquina']],
  ['Barra Fixa Supinada', 'Costas', ['Barra fixa']],
  ['Remada Sentada', 'Costas', ['Máquina', 'Cabo']],
  ['Remada Baixa', 'Costas', ['Cabo', 'Máquina']],
  ['Remada Curvada', 'Costas', ['Barra', 'Halteres', 'Smith', 'Máquina']],
  ['Remada Unilateral', 'Costas', ['Halteres', 'Cabo', 'Máquina']],
  ['Remada Cavalinho', 'Costas', ['Barra', 'Máquina']],
  ['Remada Pronada', 'Costas', ['Barra', 'Máquina']],
  ['Pulldown Reto', 'Costas', ['Cabo']],
  ['Levantamento Terra', 'Costas', ['Barra', 'Halteres', 'Smith']],
  ['Terra Romeno', 'Costas', ['Barra', 'Halteres', 'Smith']],
  ['Hiperextensão Lombar', 'Costas', ['Máquina', 'Peso corporal', 'Anilha']],
  ['Good Morning', 'Costas', ['Barra', 'Smith']],
  ['Encolhimento', 'Costas', ['Halteres', 'Barra', 'Máquina', 'Smith', 'Cabo']],

  // ---------- Ombros ----------
  ['Desenvolvimento', 'Ombros', ['Halteres', 'Barra', 'Máquina', 'Smith']],
  ['Desenvolvimento Arnold', 'Ombros', ['Halteres']],
  ['Elevação Lateral', 'Ombros', ['Halteres', 'Cabo', 'Máquina', 'Elástico']],
  ['Elevação Lateral Inclinada', 'Ombros', ['Halteres', 'Cabo']],
  ['Elevação Frontal', 'Ombros', ['Halteres', 'Anilha', 'Cabo', 'Barra']],
  ['Crucifixo Invertido', 'Ombros', ['Máquina', 'Halteres', 'Cabo']],
  ['Face Pull', 'Ombros', ['Cabo', 'Elástico']],
  ['Remada Alta', 'Ombros', ['Barra', 'Halteres', 'Cabo', 'Smith']],

  // ---------- Bíceps ----------
  ['Rosca Direta', 'Bíceps', ['Barra', 'Halteres', 'Cabo', 'Máquina']],
  ['Rosca Alternada', 'Bíceps', ['Halteres']],
  ['Rosca Martelo', 'Bíceps', ['Halteres', 'Cabo']],
  ['Rosca Scott', 'Bíceps', ['Máquina', 'Barra', 'Halteres', 'Cabo']],
  ['Rosca Concentrada', 'Bíceps', ['Halteres', 'Cabo']],
  ['Rosca Inversa', 'Bíceps', ['Barra', 'Cabo', 'Halteres']],
  ['Rosca Spider', 'Bíceps', ['Halteres', 'Barra']],
  ['Rosca 21', 'Bíceps', ['Barra', 'Halteres']],

  // ---------- Tríceps ----------
  ['Tríceps na Polia', 'Tríceps', ['Cabo']],
  ['Tríceps Corda', 'Tríceps', ['Cabo']],
  ['Tríceps Unilateral', 'Tríceps', ['Cabo', 'Halteres']],
  ['Tríceps Testa', 'Tríceps', ['Barra', 'Halteres', 'Cabo']],
  ['Tríceps Francês', 'Tríceps', ['Halteres', 'Barra', 'Cabo']],
  ['Tríceps Coice', 'Tríceps', ['Halteres', 'Cabo']],
  ['Tríceps Banco', 'Tríceps', ['Peso corporal', 'Banco']],
  ['Tríceps na Máquina', 'Tríceps', ['Máquina']],
  ['Mergulho nas Paralelas', 'Tríceps', ['Peso corporal', 'Máquina']],

  // ---------- Pernas ----------
  ['Agachamento Livre', 'Pernas', ['Barra', 'Halteres', 'Smith', 'Kettlebell']],
  ['Agachamento Frontal', 'Pernas', ['Barra', 'Smith']],
  ['Agachamento Hack', 'Pernas', ['Máquina']],
  ['Agachamento Búlgaro', 'Pernas', ['Halteres', 'Barra', 'Smith', 'Peso corporal']],
  ['Agachamento Sumô', 'Pernas', ['Halteres', 'Barra', 'Kettlebell']],
  ['Agachamento Sissy', 'Pernas', ['Peso corporal', 'Máquina']],
  ['Leg Press', 'Pernas', ['Máquina']],
  ['Leg Press Horizontal', 'Pernas', ['Máquina']],
  ['Cadeira Extensora', 'Pernas', ['Máquina']],
  ['Cadeira Flexora', 'Pernas', ['Máquina']],
  ['Mesa Flexora', 'Pernas', ['Máquina']],
  ['Flexora em Pé', 'Pernas', ['Máquina', 'Cabo']],
  ['Cadeira Adutora', 'Pernas', ['Máquina']],
  ['Cadeira Abdutora', 'Pernas', ['Máquina']],
  ['Afundo', 'Pernas', ['Halteres', 'Barra', 'Smith', 'Peso corporal']],
  ['Passada', 'Pernas', ['Halteres', 'Barra', 'Peso corporal']],
  ['Subida no Banco', 'Pernas', ['Halteres', 'Barra', 'Peso corporal']],
  ['Stiff', 'Pernas', ['Barra', 'Halteres', 'Smith']],
  ['Levantamento Terra Sumô', 'Pernas', ['Barra', 'Halteres']],

  // ---------- Glúteos ----------
  ['Elevação Pélvica', 'Glúteos', ['Barra', 'Máquina', 'Halteres', 'Peso corporal']],
  ['Coice', 'Glúteos', ['Cabo', 'Máquina', 'Peso corporal', 'Elástico']],
  ['Abdução de Quadril', 'Glúteos', ['Máquina', 'Cabo', 'Elástico']],
  ['Ponte de Glúteo', 'Glúteos', ['Peso corporal', 'Barra', 'Halteres']],

  // ---------- Panturrilha ----------
  ['Panturrilha em Pé', 'Panturrilha', ['Máquina', 'Smith', 'Halteres', 'Peso corporal']],
  ['Panturrilha Sentado', 'Panturrilha', ['Máquina']],
  ['Panturrilha no Leg Press', 'Panturrilha', ['Máquina']],

  // ---------- Abdômen ----------
  ['Abdominal', 'Abdômen', ['Peso corporal', 'Anilha', 'Máquina']],
  ['Abdominal na Polia', 'Abdômen', ['Cabo']],
  ['Abdominal Máquina', 'Abdômen', ['Máquina']],
  ['Abdominal Bicicleta', 'Abdômen', ['Peso corporal']],
  ['Abdominal Canivete', 'Abdômen', ['Peso corporal']],
  ['Abdominal Infra', 'Abdômen', ['Peso corporal', 'Banco']],
  ['Abdominal Oblíquo', 'Abdômen', ['Peso corporal', 'Anilha']],
  ['Abdominal Remador', 'Abdômen', ['Peso corporal']],
  ['Elevação de Pernas', 'Abdômen', ['Peso corporal', 'Banco']],
  ['Elevação de Pernas Suspenso', 'Abdômen', ['Barra fixa', 'Máquina']],
  ['Prancha', 'Abdômen', ['Peso corporal']],
  ['Prancha Lateral', 'Abdômen', ['Peso corporal']],
  ['Rotação Russa', 'Abdômen', ['Anilha', 'Peso corporal', 'Kettlebell']],
  ['Roda Abdominal', 'Abdômen', ['Peso corporal']],
  ['Escalador', 'Abdômen', ['Peso corporal']],
  ['Dead Bug', 'Abdômen', ['Peso corporal']],

  // ---------- Antebraço ----------
  ['Rosca de Punho', 'Antebraço', ['Barra', 'Halteres', 'Cabo']],
  ['Rosca de Punho Inversa', 'Antebraço', ['Barra', 'Halteres']],
  ['Farmer Walk', 'Antebraço', ['Halteres', 'Kettlebell']],

  // ---------- Cardio ----------
  ['Esteira', 'Cardio', ['Máquina']],
  ['Bicicleta Ergométrica', 'Cardio', ['Máquina']],
  ['Elíptico', 'Cardio', ['Máquina']],
  ['Escada', 'Cardio', ['Máquina']],
  ['Remo Ergômetro', 'Cardio', ['Máquina']],
  ['Corda Naval', 'Cardio', ['Peso corporal']],
  ['Pular Corda', 'Cardio', ['Peso corporal']],
  ['Burpee', 'Cardio', ['Peso corporal']],
];

function slugify(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(new RegExp('[\u0300-\u036f]', 'g'), '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const EXERCISES = EX_RAW.map(([nome, grupo, equips]) => ({
  id: 'ex_' + slugify(nome),
  nome,
  grupo,
  equips,
  equip: equips[0],
  custom: false,
}));

/* Equipamentos de um exercício, com folga para os personalizados. */
function equipsDe(ex) {
  if (ex && ex.equips && ex.equips.length) return ex.equips;
  return EQUIPAMENTOS;
}
