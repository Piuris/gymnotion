/* Biblioteca de exercícios (pt-BR) */
const GRUPOS = ['Peito', 'Costas', 'Pernas', 'Ombros', 'Bíceps', 'Tríceps', 'Abdômen', 'Glúteos', 'Panturrilha', 'Antebraço', 'Cardio'];

const EQUIPAMENTOS = ['Sem equipamento', 'Barra', 'Halteres', 'Máquina', 'Cabo', 'Smith', 'Kettlebell', 'Anilha', 'Elástico', 'Barra fixa', 'Banco'];

/* [nome, grupo, equipamento padrão] */
const EX_RAW = [
  // Abdômen
  ['Abdominal', 'Abdômen', 'Sem equipamento'],
  ['Abdominal Bicicleta', 'Abdômen', 'Sem equipamento'],
  ['Abdominal Canivete', 'Abdômen', 'Sem equipamento'],
  ['Abdominal com Peso', 'Abdômen', 'Halteres'],
  ['Abdominal Infra', 'Abdômen', 'Sem equipamento'],
  ['Abdominal Oblíquo', 'Abdômen', 'Sem equipamento'],
  ['Abdominal na Máquina', 'Abdômen', 'Máquina'],
  ['Abdominal no Cabo', 'Abdômen', 'Cabo'],
  ['Elevação de Pernas', 'Abdômen', 'Sem equipamento'],
  ['Elevação de Pernas Suspenso', 'Abdômen', 'Barra fixa'],
  ['Prancha', 'Abdômen', 'Sem equipamento'],
  ['Prancha Lateral', 'Abdômen', 'Sem equipamento'],
  ['Rotação Russa', 'Abdômen', 'Anilha'],
  ['Roda Abdominal', 'Abdômen', 'Sem equipamento'],
  ['Escalador', 'Abdômen', 'Sem equipamento'],
  ['Dead Bug', 'Abdômen', 'Sem equipamento'],
  ['Hollow Hold', 'Abdômen', 'Sem equipamento'],

  // Peito
  ['Supino Reto', 'Peito', 'Barra'],
  ['Supino Reto com Halteres', 'Peito', 'Halteres'],
  ['Supino Inclinado', 'Peito', 'Barra'],
  ['Supino Inclinado com Halteres', 'Peito', 'Halteres'],
  ['Supino Declinado', 'Peito', 'Barra'],
  ['Supino na Máquina', 'Peito', 'Máquina'],
  ['Supino no Smith', 'Peito', 'Smith'],
  ['Crucifixo Reto', 'Peito', 'Halteres'],
  ['Crucifixo Inclinado', 'Peito', 'Halteres'],
  ['Crucifixo na Máquina', 'Peito', 'Máquina'],
  ['Crossover', 'Peito', 'Cabo'],
  ['Crossover Baixo', 'Peito', 'Cabo'],
  ['Flexão de Braço', 'Peito', 'Sem equipamento'],
  ['Flexão Inclinada', 'Peito', 'Sem equipamento'],
  ['Mergulho (Paralelas)', 'Peito', 'Sem equipamento'],
  ['Pullover', 'Peito', 'Halteres'],

  // Costas
  ['Puxada Frontal', 'Costas', 'Máquina'],
  ['Puxada Aberta', 'Costas', 'Máquina'],
  ['Puxada Supinada', 'Costas', 'Máquina'],
  ['Puxada Triângulo', 'Costas', 'Máquina'],
  ['Barra Fixa', 'Costas', 'Barra fixa'],
  ['Barra Fixa Supinada', 'Costas', 'Barra fixa'],
  ['Remada Sentada', 'Costas', 'Máquina'],
  ['Remada Curvada', 'Costas', 'Barra'],
  ['Remada Unilateral', 'Costas', 'Halteres'],
  ['Remada Cavalinho', 'Costas', 'Barra'],
  ['Remada Baixa', 'Costas', 'Cabo'],
  ['Remada na Máquina', 'Costas', 'Máquina'],
  ['Levantamento Terra', 'Costas', 'Barra'],
  ['Terra Romeno', 'Costas', 'Barra'],
  ['Pulldown Reto', 'Costas', 'Cabo'],
  ['Encolhimento', 'Costas', 'Halteres'],
  ['Encolhimento com Barra', 'Costas', 'Barra'],
  ['Hiperextensão Lombar', 'Costas', 'Máquina'],
  ['Good Morning', 'Costas', 'Barra'],

  // Ombros
  ['Desenvolvimento com Halteres', 'Ombros', 'Halteres'],
  ['Desenvolvimento com Barra', 'Ombros', 'Barra'],
  ['Desenvolvimento Arnold', 'Ombros', 'Halteres'],
  ['Desenvolvimento na Máquina', 'Ombros', 'Máquina'],
  ['Elevação Lateral', 'Ombros', 'Halteres'],
  ['Elevação Lateral no Cabo', 'Ombros', 'Cabo'],
  ['Elevação Lateral na Máquina', 'Ombros', 'Máquina'],
  ['Elevação Frontal', 'Ombros', 'Halteres'],
  ['Elevação Frontal com Anilha', 'Ombros', 'Anilha'],
  ['Crucifixo Invertido', 'Ombros', 'Máquina'],
  ['Crucifixo Invertido com Halteres', 'Ombros', 'Halteres'],
  ['Face Pull', 'Ombros', 'Cabo'],
  ['Remada Alta', 'Ombros', 'Barra'],

  // Bíceps
  ['Rosca Direta', 'Bíceps', 'Barra'],
  ['Rosca Direta com Halteres', 'Bíceps', 'Halteres'],
  ['Rosca Alternada', 'Bíceps', 'Halteres'],
  ['Rosca Martelo', 'Bíceps', 'Halteres'],
  ['Rosca Scott', 'Bíceps', 'Máquina'],
  ['Rosca Scott com Barra W', 'Bíceps', 'Barra'],
  ['Rosca Concentrada', 'Bíceps', 'Halteres'],
  ['Rosca no Cabo', 'Bíceps', 'Cabo'],
  ['Rosca Inversa', 'Bíceps', 'Barra'],
  ['Rosca 21', 'Bíceps', 'Barra'],

  // Tríceps
  ['Tríceps Corda', 'Tríceps', 'Cabo'],
  ['Tríceps Barra', 'Tríceps', 'Cabo'],
  ['Tríceps Testa', 'Tríceps', 'Barra'],
  ['Tríceps Francês', 'Tríceps', 'Halteres'],
  ['Tríceps Coice', 'Tríceps', 'Halteres'],
  ['Tríceps Banco', 'Tríceps', 'Sem equipamento'],
  ['Tríceps na Máquina', 'Tríceps', 'Máquina'],
  ['Mergulho nas Paralelas', 'Tríceps', 'Sem equipamento'],
  ['Supino Fechado', 'Tríceps', 'Barra'],

  // Pernas
  ['Agachamento Livre', 'Pernas', 'Barra'],
  ['Agachamento Hack', 'Pernas', 'Máquina'],
  ['Agachamento Frontal', 'Pernas', 'Barra'],
  ['Agachamento no Smith', 'Pernas', 'Smith'],
  ['Agachamento Búlgaro', 'Pernas', 'Halteres'],
  ['Agachamento Sumô', 'Pernas', 'Halteres'],
  ['Leg Press', 'Pernas', 'Máquina'],
  ['Leg Press Horizontal', 'Pernas', 'Máquina'],
  ['Cadeira Extensora', 'Pernas', 'Máquina'],
  ['Cadeira Flexora', 'Pernas', 'Máquina'],
  ['Mesa Flexora', 'Pernas', 'Máquina'],
  ['Flexora em Pé', 'Pernas', 'Máquina'],
  ['Cadeira Adutora', 'Pernas', 'Máquina'],
  ['Cadeira Abdutora', 'Pernas', 'Máquina'],
  ['Afundo', 'Pernas', 'Halteres'],
  ['Passada', 'Pernas', 'Halteres'],
  ['Stiff', 'Pernas', 'Barra'],
  ['Levantamento Terra Sumô', 'Pernas', 'Barra'],
  ['Subida no Banco', 'Pernas', 'Halteres'],

  // Glúteos
  ['Elevação Pélvica', 'Glúteos', 'Barra'],
  ['Elevação Pélvica na Máquina', 'Glúteos', 'Máquina'],
  ['Coice no Cabo', 'Glúteos', 'Cabo'],
  ['Coice na Máquina', 'Glúteos', 'Máquina'],
  ['Abdução de Quadril', 'Glúteos', 'Máquina'],
  ['Ponte de Glúteo', 'Glúteos', 'Sem equipamento'],

  // Panturrilha
  ['Panturrilha em Pé', 'Panturrilha', 'Máquina'],
  ['Panturrilha Sentado', 'Panturrilha', 'Máquina'],
  ['Panturrilha no Leg Press', 'Panturrilha', 'Máquina'],
  ['Panturrilha no Smith', 'Panturrilha', 'Smith'],

  // Antebraço
  ['Rosca de Punho', 'Antebraço', 'Barra'],
  ['Rosca de Punho Inversa', 'Antebraço', 'Barra'],
  ['Farmer Walk', 'Antebraço', 'Halteres'],

  // Cardio
  ['Esteira', 'Cardio', 'Máquina'],
  ['Bicicleta Ergométrica', 'Cardio', 'Máquina'],
  ['Elíptico', 'Cardio', 'Máquina'],
  ['Escada', 'Cardio', 'Máquina'],
  ['Remo Ergômetro', 'Cardio', 'Máquina'],
  ['Corda Naval', 'Cardio', 'Sem equipamento'],
  ['Pular Corda', 'Cardio', 'Sem equipamento'],
  ['Burpee', 'Cardio', 'Sem equipamento'],
];

function slugify(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(new RegExp('[\u0300-\u036f]', 'g'), '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const EXERCISES = EX_RAW.map(([nome, grupo, equip]) => ({
  id: 'ex_' + slugify(nome),
  nome, grupo, equip, custom: false,
}));
