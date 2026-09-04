/* GymNotion — telas */

let TAB = 'inicio';
let REST = null;      // { endsAt, label, tick }
let TICK = null;      // intervalo global de 1s
let DIA_SEL = Date.now();   // dia mostrado na aba Treinos; volta para hoje ao abrir

/* =========================================================
   RAIZ / ABAS
   ========================================================= */

/* As quatro telas de uso diário ficam na cápsula de baixo; o resto mora no
   menu suspenso, que é um painel por cima e não uma quinta aba. É a diferença
   entre navegar e escolher: o botão do menu não troca de tela, abre uma lista. */
const ABAS = [
  { id: 'inicio', icone: 'casa' },
  { id: 'cronograma', icone: 'tarefas' },
  { id: 'academia', icone: 'haltere' },
  { id: 'agua', icone: 'gota' },
];

let MENU_ABERTO = null;

function tabbar() {
  const bar = h('<nav class="tabbar"></nav>');
  ABAS.forEach((a) => {
    const b = h(`<button class="tab${TAB === a.id ? ' on' : ''}">${iconO(a.icone)}</button>`);
    b.addEventListener('click', () => {
      if (MENU_ABERTO) MENU_ABERTO.fechar();
      if (TAB === a.id) { popToRoot(); return; }
      TAB = a.id; haptic();
      popToRoot();
    });
    bar.appendChild(b);
  });

  const menu = h(`<button class="tab${MENU_ABERTO ? ' aberto' : ''}">${iconO(MENU_ABERTO ? 'fechar' : 'menu')}</button>`);
  menu.addEventListener('click', () => {
    if (MENU_ABERTO) { MENU_ABERTO.fechar(); return; }
    haptic();
    abrirMenuModulos(menu);
  });
  bar.appendChild(menu);
  return bar;
}

/* O menu lista tudo, inclusive o que já está na cápsula: quem procura uma tela
   pelo nome não deveria precisar saber se ela virou ícone lá embaixo. */
function abrirMenuModulos(ancora) {
  const itens = MODULOS.map((m) => ({
    label: m.nome, icone: m.iconeO, on: m.id === TAB,
    onClick: () => m.abrir(),
  }));
  itens.push({ label: 'Plano da semana', icone: 'calendario', onClick: () => telaPlanoSemana() });
  itens.push({ label: 'Resumo da academia', icone: 'grafico', onClick: () => telaResumo() });
  if (S.sessions.length) {
    itens.push({ label: 'Todos os registros', icone: 'lista', onClick: () => openHistorico() });
  }

  ancora.classList.add('aberto');
  ancora.innerHTML = iconO('fechar');
  MENU_ABERTO = menuSuspenso(itens, {
    ancora,
    aoFechar: () => {
      MENU_ABERTO = null;
      ancora.classList.remove('aberto');
      ancora.innerHTML = iconO('menu');
    },
  });
}

function buildRoot(el, screen) {
  setAccent(contextAccent());
  el.className = 'screen com-abas';
  /* o nome da raiz acompanha a aba: quem pergunta em que tela está recebe
     'academia', não 'root' */
  screen.name = TAB;
  if (TAB === 'cronograma') renderCronograma(el, screen, true);
  else if (TAB === 'academia') renderAcademia(el, screen, true);
  else if (TAB === 'agua') renderAgua(el, screen, true);
  else renderInicio(el, screen);
  el.appendChild(tabbar());
}

/* =========================================================
   MÓDULOS

   Cada módulo se descreve aqui uma vez: o Início monta os atalhos a partir
   desta lista e o Menu monta a dele. Acrescentar um módulo é acrescentar uma
   linha, em vez de mexer em duas telas que precisam concordar.
   ========================================================= */

const MODULOS = [
  {
    id: 'academia', nome: 'Academia', icone: 'dumbbell', iconeO: 'haltere',
    cor: () => corAcademia(),            // única que herda a cor de um treino
    resumo: () => {
      if (S.active) return S.active.name + ' em andamento';
      if (sessionsOn(Date.now()).length) return 'Treino de hoje registrado';
      if (!S.workouts.length) return 'Monte o primeiro treino';
      const plano = treinoDoDia(Date.now());
      if (plano.folga) return 'Descanso marcado para hoje';
      if (plano.origem !== 'rodizio') return plano.treino.name + ' marcado para hoje';
      const f = faltamNaSemana(Date.now());
      if (!f) return 'Meta da semana batida';
      return f === 1 ? 'Falta 1 treino nesta semana' : 'Faltam ' + f + ' treinos nesta semana';
    },
    abrir: () => irParaAba('academia'),
  },
  {
    id: 'cronograma', nome: 'Cronograma', icone: 'calendario', iconeO: 'calendario',
    cor: () => COR_AGENDA,
    resumo: () => {
      const abertas = pendentesDoDia();
      const atras = tarefasAtrasadas().length;
      const partes = [];
      if (abertas) partes.push(abertas + (abertas > 1 ? ' tarefas hoje' : ' tarefa hoje'));
      if (atras) partes.push(atras + (atras > 1 ? ' atrasadas' : ' atrasada'));
      return partes.length ? partes.join(' · ') : 'Nada marcado para hoje';
    },
    abrir: () => irParaAba('cronograma'),
  },
  {
    id: 'agua', nome: 'Hidratação', icone: 'gota', iconeO: 'gota',
    cor: () => AZUL_AGUA,
    resumo: () => fmtLitros(aguaDoDia()) + ' de ' + fmtLitros(metaAgua()) + ' L',
    abrir: () => irParaAba('agua'),
  },
  {
    id: 'passos', nome: 'Passos', icone: 'passos', iconeO: 'passos',
    cor: () => COR_PASSOS,
    resumo: () => {
      const n = passosDoDia();
      if (!n) return 'Traga do app Saúde';
      return fmtPassos(n) + ' de ' + fmtPassos(metaPassos());
    },
    abrir: () => telaPassos(),
  },
  {
    id: 'metas', nome: 'Metas', icone: 'cofre', iconeO: 'cofre',
    cor: () => COR_METAS,
    resumo: () => (S.metas.length ? fmtBRL(totalGuardado()) + ' guardados' : 'Nenhum cofrinho ainda'),
    abrir: () => telaMetas(),
  },
  {
    id: 'estudos', nome: 'Estudos', icone: 'livro', iconeO: 'livro',
    cor: () => COR_ESTUDOS,
    resumo: () => (S.materias.length ? fmtMin(estudoDaSemana()) + ' nesta semana' : 'Nenhuma matéria ainda'),
    abrir: () => telaEstudos(),
  },
  {
    id: 'config', nome: 'Configurações', icone: 'engrenagem', iconeO: 'ajustes',
    cor: () => contextAccent(),
    resumo: () => 'Tema, conta e backup',
    abrir: () => telaConfig(),
  },
];

/* Trocar de aba é trocar a raiz, não empilhar mais uma tela por cima. */
/* A cor da academia é a do treino que está em pauta: o que está rolando, o que
   foi registrado hoje ou, na falta dos dois, o sugerido. O atalho do Início e o
   herói da tela precisam concordar — antes o atalho puxava o último treino
   registrado e aparecia verde enquanto o herói mostrava o amarelo de hoje. */
function corAcademia() {
  if (S.active) return S.active.color;
  const hoje = sessionsOn(Date.now());
  if (hoje.length) return hoje[0].color;
  const plano = treinoDoDia(Date.now());
  return plano.treino && !plano.folga ? plano.treino.color : contextAccent();
}

function irParaAba(id) {
  TAB = id;
  popToRoot();
}

function abrirModulo(id) {
  const m = MODULOS.find((x) => x.id === id);
  if (!m) return false;
  m.abrir();
  return true;
}

const fmtLitros = (ml) => (ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 1).replace('.', ',');

function saudacao() {
  const hora = new Date().getHours();
  if (hora < 5) return 'Boa madrugada';
  if (hora < 12) return 'Bom dia';
  if (hora < 18) return 'Boa tarde';
  return 'Boa noite';
}

/* =========================================================
   ABA INÍCIO — atalhos e o dia de hoje
   ========================================================= */

function renderInicio(el, screen) {
  const scroll = h('<div class="scroll"></div>');
  scroll.appendChild(h(secao(fmtDataLonga(Date.now()), saudacao())));

  /* Cada atalho leva a cor do seu módulo — é o que faz a grade ser reconhecida
     de relance, sem ler os nomes. */
  const grade = h('<div class="hub-grid"></div>');
  MODULOS.forEach((m) => {
    const card = h(`<button class="hub-card">
      <div class="hub-ico">${icon(m.icone)}</div>
      <b>${esc(m.nome)}</b>
      <span>${esc(m.resumo())}</span>
    </button>`);
    setAccent(m.cor(), card);
    card.addEventListener('click', () => { haptic(); m.abrir(); });
    grade.appendChild(card);
  });
  scroll.appendChild(grade);

  const abertas = tarefasDoDia().filter((t) => !t.feito);
  const atrasadas = tarefasAtrasadas();
  scroll.appendChild(h(secao('Cronograma', 'Hoje')));
  if (!abertas.length && !atrasadas.length) {
    scroll.appendChild(h('<div class="hint">Nada em aberto. O que for aparecendo entra pelo Cronograma.</div>'));
  }
  abertas.slice(0, 5).forEach((t) => scroll.appendChild(linhaTarefa(t, screen)));
  if (atrasadas.length) {
    const aviso = h(`<div class="descanso-aviso alerta">${icon('info')}<span>${atrasadas.length} tarefa${atrasadas.length > 1 ? 's' : ''} de dias anteriores continua${atrasadas.length > 1 ? 'm' : ''} aberta${atrasadas.length > 1 ? 's' : ''}. Toque para abrir o cronograma.</span></div>`);
    aviso.addEventListener('click', () => irParaAba('cronograma'));
    scroll.appendChild(aviso);
  }

  el.appendChild(scroll);
}

/* =========================================================
   ACADEMIA
   ========================================================= */

function renderAcademia(el, screen) {
  const hojeTs = Date.now();
  const selecionado = DIA_SEL;
  const ehHoje = dayKey(selecionado) === dayKey(hojeTs);

  setAccent(contextAccent(), el);
  const scroll = h('<div class="scroll"></div>');

  const barra = h(`<div class="acad-barra">
    <div class="streak">${icon('flame')}<span>${streak()}</span> <u>de ofensiva</u></div>
    <button class="acao" data-act="lista">${iconO('lista')}Meus treinos</button>
  </div>`);
  acts(barra, { lista: () => openWorkoutsSheet() });
  scroll.appendChild(barra);

  /* ---------- faixa da semana: navega entre os dias ---------- */
  const domingo = new Date(inicioDaSemana(selecionado));
  const nomes = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const week = h('<div class="week"></div>');
  /* o disco do dia aberto usa a cor do treino dele, casando com o herói logo
     abaixo em vez de ser um branco solto */
  const doDiaSel = treinoDoDia(selecionado);
  setAccent(sessionsOn(selecionado).length
    ? accentPainel(selecionado)
    : (doDiaSel.treino ? doDiaSel.treino.color : contextAccent()), week);

  for (let i = 0; i < 7; i++) {
    const d = new Date(domingo); d.setDate(domingo.getDate() + i);
    const ts = d.getTime();
    const hoje = dayKey(ts) === dayKey(hojeTs);
    const sel = dayKey(ts) === dayKey(selecionado);
    const futuro = ts > hojeTs && !hoje;
    const classes = [
      'day',
      sel ? 'sel' : '',
      hoje && !sel ? 'hoje' : '',
      sessionsOn(ts).length ? 'has' : '',
      !futuro && !hoje && ehDescanso(ts) ? 'descanso' : '',   // dia que ainda não acabou não é descanso
      futuro ? 'futuro' : '',
    ].filter(Boolean).join(' ');
    /* dia ainda por vir e sem registro mostra, apagadinho, a cor do que está
       marcado: dá para ler a semana inteira de relance */
    const marcado = (!sessionsOn(ts).length && ts >= hojeTs - 86400000)
      ? treinoDoDia(ts) : null;
    const pinta = marcado && marcado.treino && marcado.origem !== 'rodizio'
      ? ` style="background:${marcado.treino.color};opacity:.5"` : '';
    const dia = h(`<button class="${classes}">
      <div class="dow">${nomes[i]}</div>
      <div class="num">${d.getDate()}</div>
      <div class="dot"${pinta}></div>
    </button>`);
    if (!futuro) dia.addEventListener('click', () => { DIA_SEL = ts; haptic(); screen.refresh(); });
    week.appendChild(dia);
  }

  /* arrastar a faixa troca de semana; o futuro fica fora do alcance */
  let x0 = null;
  week.addEventListener('touchstart', (ev) => { x0 = ev.touches[0].clientX; }, { passive: true });
  week.addEventListener('touchend', (ev) => {
    if (x0 == null) return;
    const dx = ev.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) < 45) return;
    const alvo = new Date(selecionado);
    alvo.setDate(alvo.getDate() + (dx > 0 ? -7 : 7));
    DIA_SEL = alvo.getTime() > hojeTs ? hojeTs : alvo.getTime();
    haptic(); screen.refresh();
  }, { passive: true });
  scroll.appendChild(week);

  if (!ehHoje) {
    const volta = h(`<button class="voltar-hoje">${esc(fmtDataLonga(selecionado))} · voltar para hoje</button>`);
    volta.addEventListener('click', () => { DIA_SEL = hojeTs; screen.refresh(); });
    scroll.appendChild(volta);
  }

  /* ---------- o cartão do dia ----------
     Um herói só, que muda de papel conforme o estado: treino rolando, treino
     registrado ou plano à espera. Antes eram três cartões empilhados dizendo
     quase a mesma coisa. A cor sai sempre do treino em questão. */
  const doDia = sessionsOn(selecionado);
  const feitosSemana = treinosNaSemana(inicioDaSemana(selecionado));
  const meta = metaSemanal();

  if (S.active) {
    const a = S.active;
    const card = h(heroi({
      sobrancelha: 'Em andamento',
      titulo: a.name,
      numero: a.exercises.length + ' exercícios',
      nota: 'Toque para continuar de onde parou',
    }));
    setAccent(a.color, card);
    card.addEventListener('click', () => openWorkout(a.workoutId, 'session'));
    scroll.appendChild(card);
  } else if (doDia.length) {
    const sess = doDia[0];
    const card = h(heroi({
      sobrancelha: ehHoje ? 'Treino de hoje' : 'Treino do dia',
      titulo: sess.name,
      numero: sess.sets + ' séries · ' + fmtNum(sess.volume) + ' kg',
      nota: doDia.length > 1 ? doDia.length + ' treinos neste dia' : 'Registrado · toque para ver',
    }));
    setAccent(sess.color, card);
    card.addEventListener('click', () => openSessionDetail(sess.id));
    scroll.appendChild(card);
  } else if (S.workouts.length) {
    const plano = doDiaSel;
    const w = plano.treino;
    const rotulo = {
      dia: ehHoje ? 'Treino de hoje' : 'Marcado para o dia',
      semana: DIAS_SEMANA[new Date(selecionado).getDay()],
      rodizio: ehHoje ? 'Sugestão de hoje' : 'Sugestão do dia',
    }[plano.origem];

    const card = h(plano.folga
      ? heroi({
        sobrancelha: rotulo,
        titulo: 'Descanso',
        numero: 'Folga marcada no seu plano',
        nota: ehHoje ? 'Dá para treinar mesmo assim: toque para escolher' : '',
      })
      : heroi({
        sobrancelha: rotulo,
        titulo: w.name,
        numero: w.exercises.length + ' exercícios · ' + w.exercises.reduce((n, e) => n + e.sets.length, 0) + ' séries',
        nota: plano.origem === 'rodizio'
          ? 'Sem plano para este dia — este é o que está há mais tempo parado'
          : (ehHoje ? 'Seu plano está pronto para começar' : 'Nada foi registrado neste dia'),
      }));
    setAccent(plano.folga ? contextAccent() : w.color, card);

    /* Trocar só este dia sem mexer na rotina: é o caso da semana que sai do
       script, e por isso mora no próprio cartão em vez de numa tela à parte. */
    const trocar = h(`<button class="hero-menu" aria-label="Trocar treino do dia">${icon('dots')}</button>`);
    trocar.addEventListener('click', (e) => {
      e.stopPropagation();
      trocarTreinoDoDia(selecionado, screen, trocar);
    });
    card.appendChild(trocar);

    if (!plano.folga) card.addEventListener('click', () => openWorkout(w.id, 'view'));
    else card.addEventListener('click', () => trocarTreinoDoDia(selecionado, screen, trocar));
    scroll.appendChild(card);
  }

  scroll.appendChild(h(`<div class="acoes">
    <button class="acao" data-act="evolucao">${iconO('grafico')}Ver evolução</button>
    <button class="acao" data-act="semana">${iconO('calendario')}Editar semana</button>
    <button class="acao" data-act="metaSemana">${feitosSemana}/${meta} nesta semana</button>
  </div>`));
  acts(scroll, {
    evolucao: () => telaResumo(),
    semana: () => telaPlanoSemana(),
    metaSemana: () => promptSheet('Treinos por semana', String(meta), '2', (v) => {
      S.settings.metaSemanal = Math.max(1, Math.round(Number(v) || 2));
      saveNow(); screen.refresh();
    }),
  });

  /* ---------- o dia selecionado ---------- */
  if (doDia.length) {
    /* dia com treino: os números e o que foi feito */
    scroll.appendChild(h(secao('Registro do dia', 'O que você fez')));
    scroll.appendChild(ringsBlock(selecionado));
    doDia.forEach((sess) => scroll.appendChild(sessionCard(sess, screen)));
  } else {
    /* dia sem treino: o que dá para fazer */
    if (S.workouts.length) {
      const w = doDiaSel.treino;
      if (w && !doDiaSel.folga) {
        scroll.appendChild(h(secao('Plano do dia', 'Seus exercícios')));
        scroll.appendChild(linhaDoTempo(w, screen));
      }
      scroll.appendChild(h(`<div class="section-title">${w && !doDiaSel.folga ? 'Outros treinos' : 'Seus treinos'}</div>`));
      const grid = h('<div class="folders"></div>');
      S.workouts
        .filter((x) => doDiaSel.folga || !w || x.id !== w.id)
        .forEach((x) => grid.appendChild(folderCard(x, screen)));
      if (grid.children.length) scroll.appendChild(grid);
      else scroll.lastChild.remove();
    } else {
      if (cloudConfigurado() && !cloudLogado()) {
        const volta = h('<button class="pill-btn soft" style="margin:8px 16px 4px;width:calc(100% - 32px)">Já tenho conta — restaurar treinos</button>');
        volta.addEventListener('click', () => telaLogin(screen));
        scroll.appendChild(volta);
      }
      scroll.appendChild(h(`<div class="empty">${icon('dumbbell')}<b>Nenhum treino montado</b>Monte seu primeiro treino para começar a anotar cargas.</div>`));
      const criar = h('<button class="pill-btn" data-act="criar" style="margin:0 16px;width:calc(100% - 32px)">Montar meu primeiro treino</button>');
      criar.addEventListener('click', () => { haptic(); openWorkoutsSheet(); });
      scroll.appendChild(criar);
    }

    /* Não há o que marcar: o dia sem treino já é descanso. O que vale dizer é
       se a semana está de pé, porque é a meta semanal que segura a ofensiva. */
    if (S.sessions.length) {
      const faltam = faltamNaSemana(selecionado);
      const restam = faltam === 1 ? 'Falta 1 treino' : 'Faltam ' + faltam + ' treinos';
      const semana = ehHoje ? 'nesta semana' : 'na semana dele';
      /* hoje ainda pode virar treino, então não é chamado de descanso */
      const texto = faltam
        ? (ehHoje ? `${restam} nesta semana para a ofensiva não cair.`
                  : `Dia de descanso. ${restam} ${semana} — a ofensiva cai aqui.`)
        : (ehHoje ? 'A semana já bateu a meta. A ofensiva está garantida.'
                  : 'Dia de descanso. A semana bateu a meta, a ofensiva segue.');
      const aviso = h(`<div class="descanso-aviso${faltam ? ' alerta' : ''}">
        ${icon(faltam ? 'info' : 'check')}
        <span>${esc(texto)}</span>
      </div>`);
      if (!faltam) {
        const v = aviso.querySelector('svg');
        if (v) {
          v.style.fill = 'none';
          v.style.stroke = 'currentColor';
          v.style.strokeWidth = '2.6';
          v.style.strokeLinecap = 'round';
          v.style.strokeLinejoin = 'round';
        }
      }
      scroll.appendChild(aviso);
    }
  }

  /* ---------- histórico completo ---------- */
  if (S.sessions.length) {
    const todos = h(`<div class="acoes" style="padding-top:12px">
      <button class="acao" data-act="hist">${iconO('lista')}Todos os registros · ${S.sessions.length}</button>
    </div>`);
    acts(todos, { hist: () => openHistorico() });
    scroll.appendChild(todos);
  }

  el.appendChild(scroll);
}

/* Menu de escolha de treino, usado tanto pela semana quanto pela troca do dia.
   `atual` é o que está marcado; `extras` são as opções que não são treino. */
function menuDeTreinos(ancora, atual, extras, aoEscolher) {
  const itens = S.workouts.map((w) => ({
    label: w.name, cor: w.color, on: atual === w.id,
    onClick: () => aoEscolher(w.id),
  }));
  extras.forEach((x) => itens.push({
    label: x.label, icone: x.icone, on: atual === x.valor,
    onClick: () => aoEscolher(x.valor),
  }));
  menuSuspenso(itens, { ancora });
}

/* Troca o treino de UM dia, sem tocar na rotina. Voltar ao plano é apagar a
   troca, não escolher de novo o que o molde já dizia. */
function trocarTreinoDoDia(ts, screen, ancora) {
  const extras = [{ label: 'Descanso', valor: FOLGA, icone: 'gota' }];
  if (planoAvulso(ts)) extras.push({ label: 'Seguir o plano da semana', valor: '', icone: 'repeat' });
  menuDeTreinos(ancora, planoAvulso(ts), extras, (valor) => {
    definirPlanoDoDia(ts, valor);
    haptic();
    screen.refresh();
  });
}

/* =========================================================
   PLANO DA SEMANA
   ========================================================= */

function telaPlanoSemana() {
  pushScreen((el, screen) => {
    setAccent(contextAccent(), el);
    el.appendChild(navBar('Plano da semana'));

    const scroll = h('<div class="scroll"></div>');
    scroll.appendChild(h(secao('Academia', 'Sua rotina')));
    scroll.appendChild(h(`<div class="hint" style="padding-bottom:14px">Marque o treino de cada dia da semana. Vale toda semana; para mudar só um dia, use o ⋯ no cartão daquele dia.</div>`));

    if (!S.workouts.length) {
      scroll.appendChild(h(`<div class="empty">${icon('dumbbell')}<b>Nenhum treino montado</b>Monte seus treinos primeiro; depois eles aparecem aqui para você distribuir na semana.</div>`));
      el.appendChild(scroll);
      return;
    }

    const hojeDow = new Date().getDay();
    DIAS_SEMANA.forEach((nome, dow) => {
      const marcado = planoDaSemana(dow);
      const w = marcado && marcado !== FOLGA ? getWorkout(marcado) : null;
      const valor = w ? w.name : (marcado === FOLGA ? 'Descanso' : 'Livre');
      const linha = h(`<button class="plano-dia${dow === hojeDow ? ' hoje' : ''}">
        <i class="plano-cor"></i>
        <div class="plano-txt">
          <b>${esc(nome)}</b>
          <span>${esc(valor)}</span>
        </div>
        ${icon('caret')}
      </button>`);
      if (w) setAccent(w.color, linha);
      linha.querySelector('.plano-cor').style.background = w ? w.color : 'var(--fill-2)';
      linha.addEventListener('click', () => {
        menuDeTreinos(linha, marcado, [
          { label: 'Descanso', valor: FOLGA, icone: 'gota' },
          { label: 'Deixar livre', valor: '', icone: 'fechar' },
        ], (v) => { definirPlanoSemanal(dow, v); haptic(); screen.refresh(); });
      });
      scroll.appendChild(linha);
    });

    const marcados = (S.settings.planoSemanal || []).filter((v) => v && v !== FOLGA).length;
    scroll.appendChild(h(`<div class="hint" style="padding-top:16px">${marcados
      ? marcados + (marcados === 1 ? ' dia de treino marcado' : ' dias de treino marcados')
        + ' — a meta da semana continua sendo ' + metaSemanal() + ', e é ela que segura a ofensiva.'
      : 'Nenhum dia marcado ainda: o app segue sugerindo o treino que está há mais tempo parado.'}</div>`));

    const limpar = h('<button class="acao" style="margin:6px 16px">Apagar o plano</button>');
    limpar.addEventListener('click', () => confirmSheet('Apagar o plano da semana?',
      'Os treinos continuam montados; só as marcações de cada dia somem.', 'Apagar', () => {
        S.settings.planoSemanal = [];
        S.planoDias = {};
        saveNow(); screen.refresh();
      }));
    if (temPlano()) scroll.appendChild(limpar);

    el.appendChild(scroll);
  }, { name: 'plano' });
}

/* Os exercícios do treino como um roteiro: a bolha traz a foto do movimento e
   o fio liga um ao outro, deixando claro que é uma sequência. */
function linhaDoTempo(w, screen) {
  const box = h('<div class="linha-tempo"></div>');
  setAccent(w.color, box);
  if (!w.exercises.length) {
    box.appendChild(h('<div class="hint">Este treino ainda não tem exercícios.</div>'));
    return box;
  }
  w.exercises.forEach((e) => {
    const val = e.sets.filter(ehValida);
    const base = val[0] || e.sets[0] || {};
    const detalhe = [
      e.sets.length + (e.sets.length === 1 ? ' série' : ' séries'),
      base.reps ? base.reps + ' reps' : '',
    ].filter(Boolean).join(' × ');
    const carga = base.peso ? ' · ' + fmtWeight(base.peso) + ' kg' : '';
    const item = h(`<button class="lt-item">
      <div class="lt-bolha">${exThumb(e.exId, e.grupo, e.equip)}</div>
      <div class="lt-txt"><b>${esc(e.nome)}</b><span>${esc(detalhe + carga)}</span></div>
      <div class="lt-acao">${iconO('lapis')}</div>
    </button>`);
    item.addEventListener('click', () => openExercise(w.id, e.uid, false));
    box.appendChild(item);
  });
  return box;
}

/* Lista corrida de tudo que foi registrado, fora da navegação por dia. */
function openHistorico() {
  pushScreen((el, screen) => {
    setAccent(contextAccent(), el);
    const nav = h(`<div class="nav">
      <button class="icon-btn stroke" data-act="back">${icon('back')}</button>
      <div class="title">Registros</div>
      <div style="width:44px"></div>
    </div>`);
    acts(nav, { back: () => popScreen() });
    el.appendChild(nav);

    const scroll = h('<div class="scroll"></div>');
    S.sessions.forEach((sess) => scroll.appendChild(sessionCard(sess, screen)));
    el.appendChild(scroll);
  }, { name: 'historico' });
}

function ringsBlock(quando) {
  const ts = quando == null ? Date.now() : quando;
  const hoje = sessionsOn(ts);
  const agg = hoje.reduce((a, s) => ({
    calorias: a.calorias + s.calorias, volume: a.volume + s.volume,
    sets: a.sets + s.sets, reps: a.reps + s.reps,
  }), { calorias: 0, volume: 0, sets: 0, reps: 0 });

  /* melhor marca histórica por dia, para escalar os anéis */
  const porDia = {};
  S.sessions.forEach((s) => {
    const k = dayKey(s.date);
    porDia[k] = porDia[k] || { calorias: 0, volume: 0, sets: 0, reps: 0 };
    ['calorias', 'volume', 'sets', 'reps'].forEach((f) => { porDia[k][f] += s[f]; });
  });
  const dias = Object.keys(porDia);
  const best = (f) => Math.max(1, ...dias.map((k) => porDia[k][f]));

  const anteriores = dias.filter((k) => k !== dayKey(ts));
  const media = (f) => anteriores.length
    ? anteriores.reduce((a, k) => a + porDia[k][f], 0) / anteriores.length : 0;

  const sub = (f) => {
    if (!hoje.length) return '';
    const m = media(f);
    if (!m) return 'Primeiro treino';
    const dif = Math.round(((agg[f] - m) / m) * 100);
    return (dif >= 0 ? '+' : '') + dif + '% vs média';
  };

  const box = h('<div class="rings"></div>');
  setAccent(accentPainel(ts), box);   // a cor sai do treino daquele dia
  box.innerHTML =
    ring('Calorias', fmtNum(agg.calorias), agg.calorias / best('calorias'), sub('calorias')) +
    ring('Volume', fmtNum(agg.volume), agg.volume / best('volume'), sub('volume')) +
    ring('Séries', String(agg.sets), agg.sets / best('sets'), sub('sets')) +
    ring('Repetições', String(agg.reps), agg.reps / best('reps'), sub('reps'));
  return box;
}

function sessionCard(s, screen) {
  const card = h(`<div class="sess"></div>`);
  setAccent(s.color, card);
  const dur = Math.round(s.durationSec / 60);
  card.innerHTML = `<div class="sess-head">
      <div class="sess-ico">${svgFill(ICONS[s.icon] || ICONS.halter)}</div>
      <div class="sess-txt"><b>${esc(s.name)}</b><span>${fmtDate(s.date)} • ${dur} min • ${Math.round(s.volume).toLocaleString('pt-BR')} kg</span></div>
      <button class="round-btn dots" data-act="menu">${icon('dots')}</button>
      <button class="round-btn" data-act="open">${icon('chev')}</button>
    </div>
    <div class="sess-list">
      ${s.exercises.slice(0, 5).map((e) => `<div>${esc(e.nome)}</div>`).join('')}
      ${s.exercises.length > 5 ? `<div class="more">+${s.exercises.length - 5} exercícios</div>` : ''}
    </div>`;
  acts(card, {
    open: () => openSessionDetail(s.id),
    menu: () => actionSheet(s.name, [
      { label: 'Ver detalhes', icon: 'chart', onClick: () => openSessionDetail(s.id) },
      { label: 'Repetir este treino', icon: 'repeat', onClick: () => { const w = getWorkout(s.workoutId); if (w) { startSession(w.id); openWorkout(w.id, 'session'); } else toast('Treino não existe mais'); } },
      { label: 'Apagar registro', icon: 'trash', danger: true, onClick: () => confirmSheet('Apagar registro?', 'O treino salvo será removido do histórico.', 'Apagar', () => { S.sessions = S.sessions.filter((x) => x.id !== s.id); saveNow(); screen.refresh(); }) },
    ]),
  });
  card.addEventListener('click', (e) => { if (!e.target.closest('[data-act]')) openSessionDetail(s.id); });
  return card;
}

/* =========================================================
   RESUMO DA ACADEMIA
   ========================================================= */

function telaResumo() {
  pushScreen(renderResumo, { name: 'resumo' });
}

function renderResumo(el) {
  setAccent(contextAccent(), el);
  el.appendChild(navBar('Resumo'));
  const scroll = h('<div class="scroll"></div>');
  scroll.appendChild(h(secao('Academia', 'Sua evolução')));

  const total = S.sessions.length;
  const volTotal = S.sessions.reduce((a, s) => a + s.volume, 0);
  const tempo = S.sessions.reduce((a, s) => a + s.durationSec, 0);

  scroll.appendChild(h(`<div class="card">
    <div class="plan-foot" style="margin-bottom:14px"><span>Total de treinos</span><span>${total}</span></div>
    <div class="plan-foot" style="margin-bottom:14px"><span>Volume acumulado</span><span>${fmtNum(volTotal)} kg</span></div>
    <div class="plan-foot" style="margin-bottom:14px"><span>Tempo na academia</span><span>${Math.round(tempo / 3600)} h</span></div>
    <div class="plan-foot"><span>Sequência atual</span><span>${streak()} dia(s)</span></div>
  </div>`));

  /* volume das últimas 12 sessões */
  const ult = S.sessions.slice(0, 12).reverse();
  scroll.appendChild(h('<div class="section-title">Volume por treino</div>'));
  /* O gráfico junta treinos diferentes: a linha fica neutra e cada ponto leva a
     cor do treino que o gerou, em vez de tudo herdar a cor do último. */
  const chart = h(`<div class="chart-card">${ult.length
    ? sparkline(ult.map((s) => s.volume), {
      w: 320, h: 170, pad: 18, dots: true, raioDot: 4.5, stroke: 1.8,
      corLinha: 'var(--txt-3)',        /* a linha só liga; a cor está nos pontos */
      cores: ult.map((s) => s.color),
    })
    : `<div class="chart-empty">${icon('chart')}Sem dados ainda</div>`}</div>`);
  scroll.appendChild(chart);

  /* séries por grupo muscular na semana */
  const desde = inicioDaSemana();
  const porGrupo = seriesPorGrupo(desde);
  scroll.appendChild(h('<div class="section-title">Séries por grupo nesta semana</div>'));
  if (!porGrupo.length) {
    scroll.appendChild(h('<div class="hint" style="padding-bottom:12px">Nenhum treino registrado nesta semana ainda.</div>'));
  } else {
    scroll.appendChild(h(`<div class="hint" style="padding-bottom:10px">Só séries válidas. A faixa de ${SERIES_MIN} a ${SERIES_MAX} séries semanais por grupo é a referência mais citada para hipertrofia.</div>`));
    const caixa = h('<div class="grupos"></div>');   // agregado de vários treinos: fica neutro
    const teto = Math.max(SERIES_MAX, ...porGrupo.map((g) => g.series));
    porGrupo.forEach((g) => {
      const nivel = g.series < SERIES_MIN ? 'baixo' : (g.series > SERIES_MAX ? 'alto' : 'ok');
      const rotulo = { baixo: 'abaixo da faixa', ok: 'na faixa', alto: 'acima da faixa' }[nivel];
      caixa.appendChild(h(`<div class="grupo-row">
        <div class="grupo-nome">${esc(g.grupo)}<i>${g.frequencia}× na semana</i></div>
        <div class="grupo-barra">
          <i style="width:${(g.series / teto) * 100}%" class="${nivel}"></i>
          <u style="left:${(SERIES_MIN / teto) * 100}%"></u>
          <u style="left:${(SERIES_MAX / teto) * 100}%"></u>
        </div>
        <div class="grupo-n ${nivel}" title="${rotulo}">${g.series}</div>
      </div>`));
    });
    scroll.appendChild(caixa);
  }

  /* recordes por exercício */
  const recordes = {};
  S.sessions.forEach((s) => s.exercises.forEach((e) => {
    e.sets.forEach((st) => {
      if (!ehValida(st)) return;          // aquecimento, feeder e PAP não viram recorde
      const p = Number(st.peso) || 0;
      if (!p) return;
      if (!recordes[e.exId] || p > recordes[e.exId].peso) {
        recordes[e.exId] = { nome: e.nome, peso: p, reps: Number(st.reps) || 0, date: s.date, color: s.color };
      }
    });
  }));
  const lista = Object.values(recordes).sort((a, b) => b.date - a.date).slice(0, 12);
  if (lista.length) {
    scroll.appendChild(h('<div class="section-title">Recordes de carga</div>'));
    lista.forEach((r) => {
      const row = h(`<div class="ex-item"><div class="name">${esc(r.nome)}</div>
        <div style="font-weight:700;color:var(--accent)">${fmtWeight(r.peso)} kg × ${r.reps}</div></div>`);
      setAccent(r.color, row);
      scroll.appendChild(row);
    });
  }

  el.appendChild(scroll);
}

/* =========================================================
   CONFIGURAÇÕES
   ========================================================= */

function telaConfig() {
  pushScreen(renderConfig, { name: 'config' });
}

function renderConfig(el, screen) {
  setAccent(contextAccent(), el);
  el.appendChild(navBar('Configurações'));
  const scroll = h('<div class="scroll"></div>');

  const row = (label, value, act, nota) => {
    const r = h(`<button class="ex-item" style="width:100%;align-items:flex-start;text-align:left">
      <div class="name" style="white-space:normal">${esc(label)}
        ${nota ? `<i style="display:block;font-style:normal;font-size:13px;color:var(--txt-3);margin-top:2px">${esc(nota)}</i>` : ''}
      </div>
      <div style="color:var(--txt-2);padding-top:1px">${esc(value)}</div>${icon('chev').replace('<svg', '<svg class="chev" style="margin-top:3px"')}</button>`);
    r.addEventListener('click', act);
    return r;
  };

  scroll.appendChild(h('<div class="section-title">Aparência</div>'));
  scroll.appendChild(row('Tema', temaAtual().nome, () => telaTemas(screen), temaAtual().desc));

  scroll.appendChild(h('<div class="section-title">Ajustes</div>'));
  scroll.appendChild(row('Peso corporal', S.settings.bodyweight + ' kg', () =>
    promptSheet('Peso corporal (kg)', String(S.settings.bodyweight),
      '75', (v) => {
        S.settings.bodyweight = Number(String(v).replace(',', '.')) || 75; saveNow(); screen.refresh();
      }), 'Usado só para estimar as calorias do treino'));
  scroll.appendChild(row('Meta semanal', metaSemanal() + ' treinos', () =>
    promptSheet('Treinos por semana', String(metaSemanal()), '2', (v) => {
      S.settings.metaSemanal = Math.max(1, Math.round(Number(v) || 2)); saveNow(); screen.refresh();
    }), 'Semana fechada abaixo disso quebra a ofensiva'));
  scroll.appendChild(row('Meta de água', metaAgua() + ' ml', () =>
    promptSheet('Meta diária (ml)', String(metaAgua()), '2600', (v) => {
      S.settings.metaAgua = Math.max(0, Math.round(Number(String(v).replace(',', '.')) || 0));
      saveNow(); screen.refresh();
    }), '0 recalcula pelo peso: 35 ml por quilo'));
  scroll.appendChild(row('Descanso padrão', S.settings.restDefault + ' min', () =>
    promptSheet('Descanso padrão (min)', String(S.settings.restDefault), '1', (v) => {
      S.settings.restDefault = Number(String(v).replace(',', '.')) || 1; saveNow(); screen.refresh();
    }), 'Preenche o descanso de cada série nova'));

  /* ---- nuvem ---- */
  if (cloudConfigurado()) {
    scroll.appendChild(h('<div class="section-title">Conta</div>'));
    if (cloudLogado()) {
      const quando = CLOUD.ultimoEnvio ? fmtDate(CLOUD.ultimoEnvio) + ' às '
        + new Date(CLOUD.ultimoEnvio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        : 'ainda não enviado';
      scroll.appendChild(row('Sair da conta', '', () => confirmSheet('Sair da conta?',
        'Os treinos continuam neste aparelho. A cópia na nuvem também continua lá.',
        'Sair', () => { cloudEsquecer(); screen.refresh(); toast('Você saiu da conta'); }),
        CLOUD.email));
      scroll.appendChild(row('Enviar para a nuvem', '', () => enviarNuvem(screen), 'Último envio: ' + quando));
      scroll.appendChild(row('Restaurar da nuvem', '', () => restaurarNuvem(screen),
        'Substitui o que está neste aparelho'));
    } else {
      scroll.appendChild(row('Entrar ou criar conta', '', () => telaLogin(screen),
        'Guarda uma cópia dos treinos fora do aparelho'));
    }
  }

  scroll.appendChild(h('<div class="section-title">Dados</div>'));
  const pendentes = treinosDesdeBackup();
  scroll.appendChild(row('Exportar backup', '.json', () => doExport(),
    S.settings.lastBackup
      ? (pendentes ? `${pendentes} treino(s) desde o último, em ${fmtDate(S.settings.lastBackup)}` : `Em dia — último em ${fmtDate(S.settings.lastBackup)}`)
      : 'Nunca feito. Salve no iCloud Drive para sair do aparelho'));
  scroll.appendChild(row('Importar backup', '', () => doImport(screen)));
  const del = row('Apagar tudo', '', () => confirmSheet('Apagar tudo?', 'Treinos, registros e exercícios personalizados serão perdidos. Faça um backup antes.', 'Apagar tudo', () => { resetAll(); popToRoot(); currentScreen().refresh(); toast('Tudo apagado'); }));
  del.querySelector('.name').style.color = '#FF453A';
  scroll.appendChild(del);

  const naNuvem = cloudConfigurado() && cloudLogado();
  scroll.appendChild(h(`<div class="hint" style="padding-top:24px">GymNotion • ${naNuvem
    ? 'treinos neste aparelho, com cópia na sua conta.'
    : 'dados guardados apenas neste aparelho.'}<br/>Adicione à Tela de Início para abrir em tela cheia.</div>`));
  el.appendChild(scroll);
}

function doExport() {
  const blob = new Blob([exportJSON()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'gymnotion-' + dayKey(Date.now()) + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  marcarBackupFeito();
  toast('Backup gerado');
}

/* Anotar carga é o sinal de que o treino começou: quem registra peso ou
   repetição está treinando, então o cronômetro não deveria depender de um
   toque a mais em "Iniciar". Devolve true se há sessão deste treino rodando. */
function iniciarAoAnotar(workoutId) {
  if (S.active) return S.active.workoutId === workoutId;
  startSession(workoutId);
  ajustarTravaTela();
  const pai = stack[stack.length - 2];
  if (pai) pai.refresh();
  toast('Treino iniciado');
  return true;
}

/* Troca só o aparelho: mesmo movimento, mesmas séries, e a foto acompanha.
   É o caso de chegar na academia e a máquina do costume estar ocupada. */
function trocarEquipamento(e, aoMudar) {
  const ex = findExercise(e.exId);
  const opcoes = (e.equips && e.equips.length) ? e.equips : equipsDe(ex);
  const box = h(`<div><h3>${esc(e.nome)}</h3><p class="desc">Mesmo exercício, outro aparelho.</p></div>`);
  let ov;
  opcoes.forEach((q) => {
    const b = h(`<button class="sheet-item">
      ${exThumb(e.exId, e.grupo, q, 'round')}
      <span style="flex:1">${esc(q)}</span>
      ${q === e.equip ? icon('check').replace('<svg', '<svg style="fill:none;stroke:var(--accent);stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round"') : ''}
    </button>`);
    b.addEventListener('click', () => { e.equip = q; haptic(); ov.close(); setTimeout(aoMudar, 120); });
    box.appendChild(b);
  });
  ov = openSheet(box);
}

/* ---------- água ---------- */

/* 800 ml é a garrafa que ele leva; os outros dois são para completar. */
const COPOS = [300, 500, 800];
const COPO_PADRAO = 800;

function renderAgua(el, screen) {
  setAccent(contextAccent(), el);
  const scroll = h('<div class="scroll"></div>');
  scroll.appendChild(h(secao('Nutrição', 'Hidratação')));
  /* água não é treino: tem cor própria, e o anel enche em azul */
  setAccent(AZUL_AGUA, scroll);

  const meta = metaAgua();
  const hoje = aguaDoDia();
  const pct = Math.min(1, hoje / meta);
  const falta = Math.max(0, meta - hoje);

  const R = 52;
  const C = 2 * Math.PI * R;
  scroll.appendChild(h(`<div class="agua-topo">
    <div class="agua-anel">
      <svg viewBox="0 0 120 120">
        <circle class="ring-bg" cx="60" cy="60" r="${R}" stroke-width="9"/>
        <circle class="ring-fg" cx="60" cy="60" r="${R}" stroke-width="9"
          stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - Math.max(0.02, pct))).toFixed(1)}"/>
      </svg>
      <div class="agua-valor">
        <b>${(hoje / 1000).toFixed(hoje % 1000 === 0 ? 0 : 1).replace('.', ',')}</b>
        <span>de ${(meta / 1000).toFixed(meta % 1000 === 0 ? 0 : 1).replace('.', ',')} L</span>
      </div>
    </div>
    <div class="agua-falta">${falta
      ? 'Faltam ' + falta + ' ml hoje'
      : 'Meta batida hoje'}</div>
  </div>`));

  const botoes = h('<div class="agua-copos"></div>');
  COPOS.forEach((ml) => {
    const b = h(`<button class="agua-copo"><b>+${ml}</b><span>ml</span></button>`);
    b.addEventListener('click', () => { beberAgua(ml); haptic(); screen.refresh(); });
    botoes.appendChild(b);
  });
  scroll.appendChild(botoes);

  const desfazer = aguaUltimo() || COPO_PADRAO;
  const extras = h(`<div class="agua-extras">
    <button data-act="menos" ${hoje ? '' : 'disabled'}>Desfazer ${desfazer} ml</button>
    <button data-act="meta">Ajustar meta</button>
  </div>`);
  acts(extras, {
    menos: () => { desfazerAgua(COPO_PADRAO); haptic(); screen.refresh(); },
    meta: () => promptSheet('Meta diária (ml)', String(meta), '2600', (v) => {
      S.settings.metaAgua = Math.max(0, Math.round(Number(String(v).replace(',', '.')) || 0));
      saveNow(); screen.refresh();
    }),
  });
  scroll.appendChild(extras);

  /* últimos 7 dias */
  scroll.appendChild(h('<div class="section-title">Últimos 7 dias</div>'));
  const barras = h('<div class="agua-semana"></div>');
  const nomes = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ml = aguaDoDia(d.getTime());
    const alt = Math.min(100, (ml / meta) * 100);
    barras.appendChild(h(`<div class="agua-dia${ml >= meta ? ' bateu' : ''}">
      <div class="agua-barra"><i style="height:${alt}%"></i></div>
      <div class="agua-rotulo">${nomes[d.getDay()]}</div>
    </div>`));
  }
  scroll.appendChild(barras);

  scroll.appendChild(h(`<div class="hint" style="padding-top:16px">Sem meta definida, o app usa 35 ml por quilo — ${S.settings.bodyweight} kg dá ${metaAgua()} ml. O registro de refeições chega numa próxima versão.</div>`));
  el.appendChild(scroll);
}

/* ---------- aquecimento e feeder ---------- */

/* Percentuais da carga de trabalho. Aquecimento sobe de leve até quase a série
   válida; feeder são séries curtas mais perto do peso real. */
const FAIXA_AQUECIMENTO = [0.35, 0.50];
const FAIXA_FEEDER = [0.60, 0.75];

/* Anilha de 1,25 kg de cada lado é o menor salto comum numa barra, então 2,5 kg
   é o degrau que dá para montar de verdade. */
const arredondaCarga = (v) => Math.round(v / 2.5) * 2.5;

/* Distribui n séries dentro da faixa: com uma só, usa o meio; com várias, sobe
   do início ao fim, que é como se aquece na prática. */
function escalonar(peso, faixa, n) {
  const [a, b] = faixa;
  if (n <= 1) return [arredondaCarga(peso * (a + b) / 2)];
  return Array.from({ length: n }, (_, i) =>
    arredondaCarga(peso * (a + ((b - a) * i) / (n - 1))));
}

/* Carga de trabalho de referência: a maior série válida deste exercício, ou a
   do último treino, se ainda não houver nada anotado hoje. */
function pesoDeTrabalho(e) {
  const daTela = Math.max(0, ...e.sets.filter(ehValida).map((x) => Number(x.peso) || 0));
  if (daTela > 0) return daTela;
  const ultima = ultimaExecucao(e.exId);
  if (!ultima) return 0;
  return Math.max(0, ...ultima.sets.map((x) => Number(x.peso) || 0));
}

/* Quantas séries de aquecimento e feeder já existem no exercício. */
const contaTipo = (e, tipo) => e.sets.filter((x) => tipoSet(x) === tipo).length;

/* Ajusta o exercício para ter exatamente `n` séries de um tipo, com as cargas
   dadas. Sobrando, tira as últimas; faltando, cria — herdando repetições e
   descanso da série de trabalho, porque inventar número aqui só daria trabalho
   de corrigir depois. */
function ajustarSeries(e, tipo, cargas) {
  const n = cargas.length;
  const doTipo = e.sets.filter((x) => tipoSet(x) === tipo);

  if (doTipo.length > n) {
    const sobra = doTipo.slice(n);
    e.sets = e.sets.filter((x) => sobra.indexOf(x) < 0);
  }

  const molde = e.sets.find((x) => ehValida(x)) || e.sets[0] || {};
  for (let i = doTipo.length; i < n; i++) {
    e.sets.push({
      peso: 0,
      reps: molde.reps || 0,
      desc: molde.desc || S.settings.restDefault,
      tipo,
      done: false,
    });
  }

  e.sets.filter((x) => tipoSet(x) === tipo).forEach((st, i) => { st.peso = cargas[i]; });
  return n - doTipo.length;   // quantas foram criadas (negativo = removidas)
}

/* Calculadora de aquecimento e feeder.

   Antes ela só preenchia séries que já estivessem marcadas como A ou F — e num
   exercício recém-montado, onde todas são válidas, o botão nascia desabilitado
   e parecia quebrado. Agora ela também cria e remove as séries, que é o que
   "calcular o aquecimento" quer dizer na prática. */
function calculadoraAquecimento(e, aoAplicar, cor) {
  const inicial = pesoDeTrabalho(e);
  let ov;

  /* Começa no que já existe; sem nada marcado, dois aquecimentos são o palpite
     que serve para quase todo mundo, e o feeder fica em zero por ser o mais
     específico dos dois. */
  const temAlgum = contaTipo(e, 'a') + contaTipo(e, 'f') > 0;
  const n = {
    a: temAlgum ? contaTipo(e, 'a') : 2,
    f: temAlgum ? contaTipo(e, 'f') : 0,
  };
  /* Quantos feeders havia antes de desligá-los: voltar para "com feeder" tem
     de devolver o número escolhido, não recomeçar do um. */
  let feederLembrado = n.f || 1;

  const box = h(`<div>
    <h3>Aquecimento e feeder</h3>
    <p class="desc">A partir da carga de trabalho, em cima das faixas que você usa.</p>
    <div class="calc-peso">
      <span>Carga de trabalho</span>
      <div class="field"><input type="number" inputmode="decimal" step="0.5" value="${inicial || ''}" placeholder="0"/><u>kg</u></div>
    </div>
    <div class="chips calc-modo">
      <button class="chip" data-modo="a">Só aquecimento</button>
      <button class="chip" data-modo="af">Aquecimento + feeder</button>
    </div>
    <div class="calc-linhas"></div>
    <div class="hint calc-nota"></div>
    <div class="sheet-actions">
      <button class="pill-btn grey" data-x="fechar">Fechar</button>
      <button class="pill-btn" data-x="aplicar">Aplicar</button>
    </div>
  </div>`);

  const campo = box.querySelector('input');
  const modo = box.querySelector('.calc-modo');
  const linhas = box.querySelector('.calc-linhas');
  const nota = box.querySelector('.calc-nota');
  const aplicar = box.querySelector('[data-x="aplicar"]');

  const pesoAtual = () => Number(String(campo.value).replace(',', '.')) || 0;
  const cargasDe = (tipo) => {
    const faixa = tipo === 'a' ? FAIXA_AQUECIMENTO : FAIXA_FEEDER;
    return n[tipo] ? escalonar(pesoAtual(), faixa, n[tipo]) : [];
  };

  const desenhar = () => {
    const peso = pesoAtual();

    const bloco = (rotulo, tipo, faixa) => {
      const pct = Math.round(faixa[0] * 100) + '–' + Math.round(faixa[1] * 100) + '%';
      const valores = peso > 0 && n[tipo]
        ? cargasDe(tipo).map((v) => fmtWeight(v) + ' kg').join('  ·  ')
        : (n[tipo] ? '—' : 'nenhuma série');
      return `<div class="calc-linha">
        <div class="calc-topo">
          <div class="calc-rot"><b>${esc(rotulo)}</b><i>${pct} da carga</i></div>
          <div class="calc-passo">
            <button data-menos="${tipo}" ${n[tipo] ? '' : 'disabled'}>−</button>
            <span>${n[tipo]}</span>
            <button data-mais="${tipo}" ${n[tipo] >= 6 ? 'disabled' : ''}>+</button>
          </div>
        </div>
        <div class="calc-val${n[tipo] ? '' : ' vazio'}">${esc(valores)}</div>
      </div>`;
    };

    /* O feeder é a parte que nem todo mundo usa; escondê-lo no modo simples
       deixa a folha com uma decisão só em vez de dois contadores. */
    const comFeeder = n.f > 0;
    modo.querySelectorAll('[data-modo]').forEach((b) => {
      b.classList.toggle('on', (b.dataset.modo === 'af') === comFeeder);
    });

    linhas.innerHTML = bloco('Aquecimento', 'a', FAIXA_AQUECIMENTO)
      + (comFeeder ? bloco('Feeder', 'f', FAIXA_FEEDER) : '');

    on(linhas, '[data-menos]', 'click', (ev) => {
      const t = ev.currentTarget.dataset.menos;
      n[t] = Math.max(t === 'f' ? 1 : 0, n[t] - 1);
      if (t === 'f') feederLembrado = n.f;
      haptic(); desenhar();
    });
    on(linhas, '[data-mais]', 'click', (ev) => {
      const t = ev.currentTarget.dataset.mais;
      n[t] = Math.min(6, n[t] + 1);
      if (t === 'f') feederLembrado = n.f;
      haptic(); desenhar();
    });

    const criar = Math.max(0, n.a - contaTipo(e, 'a')) + Math.max(0, n.f - contaTipo(e, 'f'));
    const tirar = Math.max(0, contaTipo(e, 'a') - n.a) + Math.max(0, contaTipo(e, 'f') - n.f);
    const partes = [];
    if (criar) partes.push('cria ' + criar + (criar > 1 ? ' séries' : ' série'));
    if (tirar) partes.push('tira ' + tirar);
    nota.textContent = peso > 0
      ? (partes.length
        ? 'Aplicar ' + partes.join(' e ') + ', antes das séries de trabalho.'
        : 'Aplicar preenche as cargas das séries que já existem.')
      : 'Informe a carga de trabalho para calcular.';

    aplicar.disabled = !(peso > 0 && (n.a + n.f) > 0);
  };

  on(modo, '[data-modo]', 'click', (ev) => {
    const alvo = ev.currentTarget.dataset.modo;
    if (alvo === 'af') n.f = feederLembrado;
    else { if (n.f) feederLembrado = n.f; n.f = 0; }
    haptic();
    desenhar();
  });

  campo.addEventListener('input', desenhar);
  desenhar();
  setTimeout(() => { if (!inicial) campo.focus(); }, 250);

  box.querySelector('[data-x="fechar"]').addEventListener('click', () => ov.close());
  aplicar.addEventListener('click', () => {
    if (pesoAtual() <= 0) return;

    /* Antes de mexer: no meio do treino, remexer no que já foi marcado seria
       pior que a bagunça, então a reordenação só vale com tudo intocado. */
    const intocado = e.sets.every((x) => !x.done);

    const criadas = ajustarSeries(e, 'a', cargasDe('a')) + ajustarSeries(e, 'f', cargasDe('f'));

    if (intocado) {
      /* aquecimento, depois feeder, depois o resto: é a ordem em que se faz */
      const ordem = { a: 0, f: 1 };
      e.sets = e.sets.slice().sort((x, y) =>
        (ordem[tipoSet(x)] == null ? 2 : ordem[tipoSet(x)])
        - (ordem[tipoSet(y)] == null ? 2 : ordem[tipoSet(y)]));
    }

    const total = n.a + n.f;
    haptic();
    ov.close();
    setTimeout(() => {
      aoAplicar();
      toast(criadas > 0
        ? criadas + (criadas > 1 ? ' séries criadas' : ' série criada')
        : total + (total > 1 ? ' séries preenchidas' : ' série preenchida'));
    }, 120);
  });

  /* A folha nasce fora da tela do treino, entao nao herda a cor dele sozinha:
     sem isto, as cargas calculadas sairiam no neutro. */
  if (cor) setAccent(cor, box);
  ov = openSheet(box);
}

/* ---------- aparência ---------- */

function telaTemas(paiScreen) {
  pushScreen((el, screen) => {
    setAccent(contextAccent(), el);
    const nav = h(`<div class="nav">
      <button class="icon-btn stroke" data-act="back">${icon('back')}</button>
      <div class="title">Tema</div>
      <div style="width:44px"></div>
    </div>`);
    acts(nav, { back: () => { paiScreen.refresh(); popScreen(); } });
    el.appendChild(nav);

    const scroll = h('<div class="scroll"></div>');
    scroll.appendChild(h('<div class="hint" style="padding:0 16px 14px">Toque para ver na hora. A cor de cada treino continua mandando nos botões e gráficos.</div>'));

    TEMAS.forEach((t) => {
      const on = S.settings.tema === t.id;
      const linha = h(`<button class="tema-row${on ? ' on' : ''}">
        <span class="tema-amostra" style="background:${t.amostra[0]}">
          <i style="background:${t.amostra[1]}"></i>
          <u style="background:var(--accent)"></u>
        </span>
        <span class="tema-txt"><b>${esc(t.nome)}</b><i>${esc(t.desc)}</i></span>
        ${on ? icon('check').replace('<svg', '<svg class="tema-ok"') : ''}
      </button>`);
      linha.addEventListener('click', () => {
        S.settings.tema = t.id;
        saveNow();
        aplicarTema(t.id);
        haptic();
        screen.refresh();
      });
      scroll.appendChild(linha);
    });

    if (S.settings.tema === 'claro') {
      scroll.appendChild(h('<div class="hint" style="padding:16px">No iPhone, o relógio e a bateria são desenhados em branco pelo sistema e isso não muda depois de instalado. Por isso o tema claro reserva uma faixa escura no topo.</div>'));
    }

    el.appendChild(scroll);
  }, { name: 'temas' });
}

/* ---------- nuvem ---------- */

/* Tela de login. O app não exige conta: quem não quiser continua usando tudo
   offline, então a saída "Agora não" é tão visível quanto o botão principal. */
function telaLogin(paiScreen, aoEntrar) {
  let criando = false;

  pushScreen((el, screen) => {
    setAccent(contextAccent(), el);
    const nav = h(`<div class="nav">
      <button class="icon-btn stroke" data-act="back">${icon('down')}</button>
      <div class="title"></div>
      <div style="width:44px"></div>
    </div>`);
    acts(nav, { back: () => popScreen() });
    el.appendChild(nav);

    const scroll = h('<div class="scroll"></div>');
    scroll.appendChild(h(`<div class="login">
      <img class="login-logo" src="icons/icon-192.png?v=3" alt=""/>
      <h1>${criando ? 'Criar conta' : 'Entrar'}</h1>
      <p>${criando
        ? 'Uma conta guarda seus treinos fora do aparelho. Serve só para isso: nada é compartilhado com ninguém.'
        : 'Entre para trazer de volta os treinos guardados na sua conta.'}</p>

      <input class="login-campo" id="lg-email" type="email" inputmode="email"
        autocomplete="username" autocapitalize="none" autocorrect="off"
        placeholder="E-mail" value="${esc(CLOUD.email || '')}"/>
      <input class="login-campo" id="lg-senha" type="password"
        autocomplete="${criando ? 'new-password' : 'current-password'}"
        placeholder="${criando ? 'Senha (mínimo 6 caracteres)' : 'Senha'}"/>

      <button class="pill-btn login-principal" data-act="ok">${criando ? 'Criar conta' : 'Entrar'}</button>
      <button class="login-alternar" data-act="alternar">${criando
        ? 'Já tenho conta'
        : 'Ainda não tenho conta'}</button>

      <div class="login-rodape">
        <button data-act="pular">Agora não</button>
        <span>Você pode usar o app inteiro sem conta. Os treinos ficam no aparelho.</span>
      </div>
    </div>`));
    el.appendChild(scroll);

    const email = scroll.querySelector('#lg-email');
    const senha = scroll.querySelector('#lg-senha');
    const principal = scroll.querySelector('[data-act="ok"]');

    const enviar = async () => {
      if (!email.value.trim() || !senha.value) { toast('Preencha e-mail e senha'); return; }
      principal.disabled = true;
      principal.textContent = criando ? 'Criando...' : 'Entrando...';
      try {
        await cloudEntrar(email.value, senha.value, criando);
        haptic();
        popScreen();
        if (paiScreen) paiScreen.refresh();
        toast(criando ? 'Conta criada' : 'Conectado');
        if (criando) cloudEnviarEmSegundoPlano();
        else setTimeout(() => ofertaRestaurar(paiScreen), 500);
        if (aoEntrar) aoEntrar();
      } catch (e) {
        toast(e.message);
        principal.disabled = false;
        principal.textContent = criando ? 'Criar conta' : 'Entrar';
      }
    };

    acts(scroll, {
      ok: enviar,
      alternar: () => { criando = !criando; screen.refresh(); },
      pular: () => popScreen(),
    });
    senha.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') enviar(); });
  }, { mode: 'sheet', name: 'login' });
}

/* Depois de entrar num aparelho novo, pergunta se quer puxar o que está lá. */
async function ofertaRestaurar(screen) {
  let remoto;
  try { remoto = await cloudBaixar(); } catch (e) { return; }
  if (!remoto) return;
  const local = S.sessions.length;
  confirmSheet('Restaurar da nuvem?',
    'Há um backup de ' + fmtDate(remoto.atualizadoEm) + ' na sua conta. Restaurar substitui os '
    + local + ' treino(s) deste aparelho.',
    'Restaurar', () => aplicarRestauracao(remoto.texto, screen));
}

async function enviarNuvem(screen) {
  toast('Enviando...');
  try {
    const r = await cloudEnviar();
    marcarBackupFeito();
    screen.refresh();
    toast('Enviado (' + Math.round(r.bytes / 1024) + ' KB)');
  } catch (e) { toast(e.message); }
}

async function restaurarNuvem(screen) {
  toast('Buscando...');
  let remoto;
  try { remoto = await cloudBaixar(); } catch (e) { toast(e.message); return; }
  if (!remoto) { toast('Nenhum backup na sua conta ainda'); return; }
  confirmSheet('Restaurar da nuvem?',
    'Backup de ' + fmtDate(remoto.atualizadoEm) + '. Tudo que está neste aparelho será substituído.',
    'Restaurar', () => aplicarRestauracao(remoto.texto, screen));
}

function aplicarRestauracao(texto) {
  try {
    importJSON(texto);
    popToRoot();
    currentScreen().refresh();
    toast('Restaurado da nuvem');
  } catch (e) {
    toast('Backup da nuvem ilegível');
  }
}

/* Os treinos existem só neste aparelho: sem conta e sem servidor, o backup é a
   única cópia. Cutuca a cada 10 treinos, no máximo uma vez por semana. */
const BACKUP_A_CADA = 10;

function lembrarBackup() {
  /* com a nuvem em dia, o backup em arquivo vira redundância: não incomoda */
  if (cloudConfigurado() && cloudLogado()
    && Date.now() - CLOUD.ultimoEnvio < 7 * 86400000) return;
  const pendentes = treinosDesdeBackup();
  if (pendentes < BACKUP_A_CADA) return;
  const avisado = S.settings.backupAvisado || 0;
  if (Date.now() - avisado < 7 * 86400000) return;

  S.settings.backupAvisado = Date.now();
  saveNow();

  const nunca = !S.settings.lastBackup;
  const box = h(`<div>
    <h3>Guardar uma cópia?</h3>
    <p class="desc">${nunca
      ? `Você já registrou ${pendentes} treinos e ainda não tem backup.`
      : `${pendentes} treinos desde o último backup.`}
      Seus dados existem só neste iPhone — trocar de aparelho ou limpar os dados do Safari apaga tudo. Salve o arquivo no iCloud Drive.</p>
    <div class="sheet-actions">
      <button class="pill-btn grey" data-x="depois">Depois</button>
      <button class="pill-btn" data-x="agora">Exportar</button>
    </div></div>`);
  const r = openSheet(box, { center: true });
  box.querySelector('[data-x="depois"]').addEventListener('click', r.close);
  box.querySelector('[data-x="agora"]').addEventListener('click', () => { r.close(); setTimeout(doExport, 150); });
}

function doImport(screen) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'application/json,.json';
  inp.addEventListener('change', () => {
    const f = inp.files && inp.files[0];
    if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try { importJSON(String(rd.result)); popToRoot(); currentScreen().refresh(); toast('Backup restaurado'); }
      catch (e) { toast('Arquivo inválido'); }
    };
    rd.readAsText(f);
  });
  inp.click();
}

/* =========================================================
   LISTA DE TREINOS (pastas)
   ========================================================= */

function openWorkoutsSheet() {
  pushScreen((el, screen) => {
    setAccent(contextAccent(), el);
    const nav = h(`<div class="nav">
      <button class="icon-btn stroke" data-act="close">${icon('down')}</button>
      <div class="title">Treinos</div>
      <button class="icon-btn" data-act="new">${icon('plus')}</button>
    </div>`);
    acts(nav, {
      close: () => popScreen(),
      new: () => { const w = newWorkout(); openWorkoutEditor(w.id, true); },
    });
    el.appendChild(nav);

    const scroll = h('<div class="scroll"></div>');
    scroll.appendChild(h('<div class="big-title">Treinos</div>'));

    if (!S.workouts.length) {
      scroll.appendChild(h(`<div class="empty">${icon('dumbbell')}<b>Nenhum treino ainda</b>Toque em + para montar seu primeiro treino: escolha o nome, a cor e os exercícios.</div>`));
    } else {
      const grid = h('<div class="folders"></div>');
      S.workouts.forEach((w) => grid.appendChild(folderCard(w, screen)));
      scroll.appendChild(grid);
    }
    el.appendChild(scroll);
  }, { mode: 'sheet', name: 'workouts' });
}

function workoutSpark(w) {
  const vals = S.sessions
    .filter((s) => s.workoutId === w.id)
    .slice(0, 10).reverse()
    .map((s) => s.volume);
  return sparkline(vals, { w: 180, h: 78, pad: 6 });
}

function folderCard(w, screen, opts) {
  const o = opts || {};
  const card = h(`<div class="folder${o.big ? ' big' : ''}" style="--fc:${w.color}">
    <div class="folder-body">
      <div class="folder-strip"></div>
      <div class="folder-head">
        <b>${esc(w.name)}</b>
        ${o.noMenu ? '' : `<button class="kebab" data-act="menu">${icon('dots')}</button>`}
      </div>
      <div class="folder-graph">${workoutSpark(w)}</div>
      <div class="folder-foot" data-act="start">${o.footLabel || 'Iniciar treino'}</div>
    </div>
  </div>`);
  setAccent(w.color, card);

  if (o.static) return card;

  acts(card, {
    menu: () => actionSheet(w.name, [
      { label: 'Editar exercícios', icon: 'pencil', onClick: () => openWorkout(w.id, 'edit') },
      { label: 'Nome, cor e ícone', icon: 'text', onClick: () => openWorkoutEditor(w.id) },
      { label: 'Duplicar', icon: 'copy', onClick: () => { duplicateWorkout(w.id); screen.refresh(); toast('Treino duplicado'); } },
      { label: 'Apagar treino', icon: 'trash', danger: true, onClick: () => confirmSheet('Apagar ' + w.name + '?', 'Os registros já salvos no histórico continuam lá.', 'Apagar', () => { deleteWorkout(w.id); screen.refresh(); }) },
    ]),
    start: () => {
      if (!w.exercises.length) { openWorkout(w.id, 'view'); toast('Adicione exercícios primeiro'); return; }
      if (S.active && S.active.workoutId !== w.id) {
        confirmSheet('Trocar de treino?', 'Existe um treino em andamento. Iniciar outro descarta o atual.', 'Trocar', () => { startSession(w.id); openWorkout(w.id, 'session'); });
        return;
      }
      if (!S.active) startSession(w.id);
      openWorkout(w.id, 'session');
    },
  });
  card.addEventListener('click', (e) => { if (!e.target.closest('[data-act]')) openWorkout(w.id, 'view'); });
  return card;
}

/* =========================================================
   EDITOR DE NOME / COR / ÍCONE
   ========================================================= */

function openWorkoutEditor(workoutId, isNew) {
  pushScreen((el, screen) => {
    const w = getWorkout(workoutId);
    if (!w) { popScreen(); return; }
    setAccent(w.color, el);

    const nav = h(`<div class="nav">
      <button class="icon-btn stroke" data-act="back">${icon('back')}</button>
      <div class="title"></div>
      <button class="pill-btn sm" data-act="done">Concluir</button>
    </div>`);
    acts(nav, {
      back: () => { if (isNew && !w.exercises.length) { /* mantém o treino criado */ } popScreen(); },
      done: () => { saveNow(); popScreen(); if (isNew) setTimeout(() => openWorkout(w.id, 'edit'), 260); },
    });
    el.appendChild(nav);

    const scroll = h('<div class="scroll" style="display:flex;align-items:center;justify-content:center"></div>');
    const prev = h('<div class="folder-preview"></div>');
    prev.appendChild(folderCard(w, screen, { static: true, noMenu: true }));
    scroll.appendChild(prev);
    el.appendChild(scroll);

    const tools = h(`<div class="editor-tools">
      <button class="tool" data-act="nome"><span class="bub">${icon('text')}</span>Nome</button>
      <button class="tool" data-act="cor"><span class="bub"><i class="swatch"></i></span>Cor</button>
      <button class="tool" data-act="icone"><span class="bub">${svgFill(ICONS[w.icon] || ICONS.halter)}</span>Ícone</button>
    </div>`);
    acts(tools, {
      nome: () => promptSheet('Nome do treino', w.name, 'Ex.: Push, Pull, Perna', (v) => { w.name = v; saveNow(); screen.refresh(); }),
      cor: (btn) => pickColor(w, screen, btn),
      icone: () => pickIcon(w, screen),
    });
    el.appendChild(tools);
  }, { name: 'editor' });
}

function pickColor(w, screen, ancora) {
  const cores = COLORS.slice();
  if (!cores.some((c) => c.hex === w.color)) cores.push({ hex: w.color, nome: 'Cor própria' });
  menuSuspenso(cores.map((c) => ({
    label: c.nome, cor: c.hex, on: c.hex === w.color,
    onClick: () => { w.color = c.hex; saveNow(); haptic(); screen.refresh(); },
  })), { ancora });
}

function pickIcon(w, screen) {
  const box = h('<div><h3>Ícone</h3><div class="icon-grid"></div></div>');
  const grid = box.querySelector('.icon-grid');
  let ov;
  ICON_KEYS.forEach((k) => {
    const b = h(`<button class="icon-cell${w.icon === k ? ' on' : ''}">${svgFill(ICONS[k])}</button>`);
    b.addEventListener('click', () => { w.icon = k; saveNow(); haptic(); ov.close(); screen.refresh(); });
    grid.appendChild(b);
  });
  ov = openSheet(box);
}

/* =========================================================
   TELA DO TREINO  (view | session | edit)
   ========================================================= */

function openWorkout(workoutId, mode) {
  let MODE = mode || 'view';
  const selection = new Set();

  pushScreen((el, screen) => {
    const w = getWorkout(workoutId);
    if (!w) { popScreen(); return; }
    /* Sai do estado, e não só do MODE: a sessão pode ter começado ao anotar uma
       carga dentro da tela do exercício. Em edição a lista continua sendo o
       molde do treino. */
    const inSession = !!(S.active && S.active.workoutId === workoutId) && MODE !== 'edit';
    const src = inSession ? S.active.exercises : w.exercises;
    setAccent(w.color, el);

    /* ---- nav ---- */
    let right = '';
    if (MODE === 'edit') right = `<button class="pill-btn sm" data-act="doneEdit">Pronto</button>`;
    else if (inSession) right = `<button class="pill-btn sm" data-act="finish">Concluir</button>`;
    else right = `<button class="pill-btn sm" data-act="start">Iniciar</button>`;

    const nav = h(`<div class="nav">
      <button class="icon-btn stroke" data-act="close">${icon('down')}</button>
      <div class="title">${esc(w.name)}</div>
      ${right}
    </div>`);
    el.appendChild(nav);

    const scroll = h('<div class="scroll"></div>');

    /* ---- cronômetro ---- */
    if (inSession) {
      const t = h(`<div class="timer${S.active.running ? '' : ' paused'}">${fmtClock(activeElapsedMs() / 1000)}</div>`);
      t.addEventListener('click', () => {
        if (S.active.running) { pauseSession(); toast('Pausado'); } else { resumeSession(); toast('Retomado'); }
        ajustarTravaTela();
        screen.refresh();
      });
      scroll.appendChild(t);
    } else if (MODE === 'view') {
      const totalSets = w.exercises.reduce((a, e) => a + e.sets.length, 0);
      scroll.appendChild(h(`<div class="hint" style="text-align:center;padding:6px 16px 16px">${w.exercises.length} exercícios • ${totalSets} séries</div>`));
    }

    /* ---- lista de exercícios ---- */
    src.forEach((e, idx) => {
      const doneSets = e.sets.filter((s) => s.done).length;
      const all = doneSets === e.sets.length && e.sets.length > 0;
      const some = doneSets > 0 && !all;

      let checkCls = '';
      if (MODE === 'edit') checkCls = selection.has(e.uid) ? ' on' : '';
      else if (all) checkCls = ' on';
      else if (some) checkCls = ' partial';

      const row = h(`<div class="ex-item" data-arrastavel>
        ${MODE === 'edit'
          ? `<button class="alca" data-alca>${icon('arrastar')}</button>`
          : `<button class="check${checkCls}" data-act="check">${icon('check')}</button>`}
        ${exThumb(e.exId, e.grupo, e.equip, 'round')}
        <div class="name">${esc(e.nome)}${e.equip && e.equip !== 'Sem equipamento' ? ` <span style="color:var(--txt-2)">(${esc(e.equip)})</span>` : ''}</div>
        ${MODE === 'edit' ? '' : `<button class="kebab" data-act="menu">${icon('dots')}</button>`}
        ${icon('chev').replace('<svg', '<svg class="chev"')}
      </div>`);

      acts(row, {
        check: () => {
          haptic();
          if (MODE === 'edit') {
            if (selection.has(e.uid)) selection.delete(e.uid); else selection.add(e.uid);
          } else if (inSession) {
            const marcar = !all;
            e.sets.forEach((s) => { s.done = marcar; });
            save();
          } else if (!S.active && iniciarAoAnotar(workoutId)) {
            const alvo = S.active.exercises.find((x) => x.uid === e.uid);
            if (alvo) alvo.sets.forEach((s) => { s.done = true; });
            saveNow();
          } else {
            toast('Há outro treino em andamento');
            return;
          }
          screen.refresh();
        },
        menu: () => actionSheet(e.nome, [
          { label: 'Abrir séries', icon: 'chart', onClick: () => openExercise(workoutId, e.uid, inSession) },
          { label: 'Trocar equipamento', icon: 'copy', onClick: () => trocarEquipamento(e, () => { saveNow(); screen.refresh(); }) },
          { label: 'Substituir exercício', icon: 'repeat', onClick: () => openLibrary(workoutId, () => screen.refresh(), { substituirUid: e.uid, nomeAtual: e.nome }) },
          { label: 'Mover para cima', icon: 'upload', onClick: () => { moveEx(src, idx, -1); save(); screen.refresh(); } },
          { label: 'Mover para baixo', icon: 'download', onClick: () => { moveEx(src, idx, 1); save(); screen.refresh(); } },
          { label: 'Remover do treino', icon: 'trash', danger: true, onClick: () => { removeEx(workoutId, e.uid); screen.refresh(); } },
        ]),
      });
      row.addEventListener('click', (ev) => {
        if (ev.target.closest('[data-act]') || ev.target.closest('[data-alca]')) return;
        if (MODE === 'edit') { if (selection.has(e.uid)) selection.delete(e.uid); else selection.add(e.uid); screen.refresh(); return; }
        openExercise(workoutId, e.uid, inSession);
      });
      if (MODE === 'edit') {
        const alca = row.querySelector('[data-alca]');
        if (alca) tornarArrastavel(src, alca, () => { saveNow(); screen.refresh(); });
      }
      scroll.appendChild(row);
    });

    if (!src.length) {
      scroll.appendChild(h(`<div class="empty">${icon('dumbbell')}<b>Treino vazio</b>Adicione exercícios da biblioteca para começar.</div>`));
    }

    /* ---- adicionar exercício ---- */
    const add = h(`<button class="add-row" style="width:100%">
      <span class="add-circle filled">+</span>
      <span class="name" style="text-align:left">Adicionar Exercício</span>
      ${icon('chev').replace('<svg', '<svg class="chev" style="width:20px;height:20px"')}
    </button>`);
    add.addEventListener('click', () => openLibrary(workoutId, () => screen.refresh()));
    scroll.appendChild(add);

    el.appendChild(scroll);

    /* ---- rodapé no modo edição ---- */
    if (MODE === 'edit') {
      const foot = h(`<div class="foot-actions">
        <button class="pill-btn grey" data-act="del">${icon('trash')}<span>Apagar</span></button>
        <button class="pill-btn" data-act="save">${icon('check').replace('<svg', '<svg style="fill:none;stroke:currentColor;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round"')}<span>Salvar</span></button>
      </div>`);
      foot.querySelectorAll('svg').forEach((s) => { s.style.width = '20px'; s.style.height = '20px'; });
      acts(foot, {
        del: () => {
          if (!selection.size) {
            confirmSheet('Apagar ' + w.name + '?', 'O treino inteiro será removido.', 'Apagar treino', () => { deleteWorkout(workoutId); popScreen(); });
            return;
          }
          confirmSheet('Remover ' + selection.size + ' exercício(s)?', '', 'Remover', () => {
            w.exercises = w.exercises.filter((x) => !selection.has(x.uid));
            selection.clear(); saveNow(); screen.refresh();
          });
        },
        save: () => { saveNow(); selection.clear(); MODE = 'view'; screen.refresh(); toast('Treino salvo'); },
      });
      el.appendChild(foot);
    }

    /* ---- barra de descanso ---- */

    /* ---- ações do nav ---- */
    acts(nav, {
      close: () => popScreen(),
      start: () => {
        if (!w.exercises.length) { toast('Adicione exercícios primeiro'); return; }
        if (S.active && S.active.workoutId !== workoutId) {
          confirmSheet('Trocar de treino?', 'Existe um treino em andamento.', 'Trocar', () => { startSession(workoutId); MODE = 'session'; screen.refresh(); });
          return;
        }
        if (!S.active) startSession(workoutId);
        MODE = 'session';
        haptic();
        ajustarTravaTela();
        screen.refresh();
      },
      finish: () => finishFlow(screen),
      doneEdit: () => { saveNow(); MODE = 'view'; screen.refresh(); },
    });
  }, { mode: 'sheet', name: 'workout' });
}

function moveEx(arr, idx, dir) {
  const j = idx + dir;
  if (j < 0 || j >= arr.length) return;
  const [x] = arr.splice(idx, 1);
  arr.splice(j, 0, x);
}

function removeEx(workoutId, uid) {
  const w = getWorkout(workoutId);
  if (w) w.exercises = w.exercises.filter((e) => e.uid !== uid);
  if (S.active && S.active.workoutId === workoutId) {
    S.active.exercises = S.active.exercises.filter((e) => e.uid !== uid);
  }
  saveNow();
}

function finishFlow(screen) {
  const a = S.active;
  if (!a) return;
  const feitas = a.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  if (!feitas) {
    confirmSheet('Encerrar sem séries?', 'Nenhuma série foi marcada como feita. O treino não será salvo no histórico.', 'Encerrar', () => {
      cancelSession(); REST = null; atualizarBarraDescanso(); ajustarTravaTela(); popScreen();
    });
    return;
  }
  const stats = sessionStats(a.exercises, activeElapsedMs() / 1000, S.settings.bodyweight);
  const box = h(`<div>
    <h3>Concluir ${esc(a.name)}?</h3>
    <p class="desc">${fmtClock(activeElapsedMs() / 1000)} • ${stats.sets} séries • ${stats.reps} repetições • ${fmtNum(stats.volume)} kg</p>
    <div class="sheet-actions">
      <button class="pill-btn grey" data-x="no">Voltar</button>
      <button class="pill-btn" data-x="yes">Concluir</button>
    </div></div>`);
  const r = openSheet(box, { center: true });
  box.querySelector('[data-x="no"]').addEventListener('click', r.close);
  box.querySelector('[data-x="yes"]').addEventListener('click', () => {
    r.close();
    const s = finishSession();
    REST = null;
    atualizarBarraDescanso();
    ajustarTravaTela();
    cloudEnviarEmSegundoPlano();
    setTimeout(() => {
      voltarPara('academia');
      if (s) openSessionDetail(s.id);
      setTimeout(lembrarBackup, 900);
    }, 160);
  });
}

/* cronômetro global: atualiza cronômetro e descanso na tela visível */
function globalTick() {
  const sc = currentScreen();
  if (!sc) return;

  if (S.active && S.active.running) {
    const t = sc.el.querySelector('.timer:not([data-static])');
    if (t) t.textContent = fmtClock(activeElapsedMs() / 1000);
  }

  if (REST) {
    if (REST.endsAt - Date.now() <= 0) {
      REST = null; beep(); haptic();
      toast('Descanso terminado');
    }
    atualizarBarraDescanso();
  }
}

/* A barra de descanso vive fora das telas, presa ao app.
   Antes ela era montada dentro de cada tela, e o relógio precisava reconstruir
   a tela para atualizar — o que, na biblioteca, destruía a busca em foco e
   fechava o teclado a cada segundo. Sendo global, ela só troca o próprio texto
   e acompanha o usuário para qualquer tela. */
function atualizarBarraDescanso() {
  let bar = APP.querySelector('.rest-bar');

  if (!REST) {
    if (bar) bar.remove();
    return;
  }

  const falta = Math.max(0, (REST.endsAt - Date.now()) / 1000);
  if (!bar) {
    bar = h(`<div class="rest-bar">
      <b></b>
      <span>Descanso • ${esc(REST.label)}</span>
      <button data-act="skip">Pular</button>
    </div>`);
    acts(bar, { skip: () => { REST = null; atualizarBarraDescanso(); } });
    APP.appendChild(bar);
  }
  setAccent(S.active ? S.active.color : contextAccent(), bar);
  bar.querySelector('b').textContent = fmtClock(falta);
}

/* =========================================================
   DETALHE DO EXERCÍCIO (séries)
   ========================================================= */

function openExercise(workoutId, uid, inSession) {
  pushScreen((el, screen) => {
    const w = getWorkout(workoutId);
    /* sai do estado, não do parâmetro: a sessão pode começar com a tela aberta */
    const live = !!(S.active && S.active.workoutId === workoutId);
    const src = live ? S.active.exercises : (w ? w.exercises : []);
    const e = src.find((x) => x.uid === uid);
    if (!w || !e) { popScreen(); return; }
    setAccent(w.color, el);
    const tituloEx = e.nome + (e.equip && e.equip !== 'Sem equipamento' ? ` (${e.equip})` : '');

    const nav = h(`<div class="nav">
      <button class="icon-btn stroke" data-act="back">${icon('back')}</button>
      <div class="title${tituloEx.length > 22 ? ' long' : ''}">${esc(tituloEx)}</div>
      ${exThumb(e.exId, e.grupo, e.equip, 'round')}
    </div>`);
    acts(nav, { back: () => popScreen() });
    el.appendChild(nav);

    const scroll = h('<div class="scroll"></div>');

    /* gráfico de evolução */
    const hist = exerciseHistory(e.exId);
    if (hist.length >= 2) {
      const tend = tendenciaCarga(e.exId, 30);
      const seta = tend ? (tend.delta > 0 ? '+' : '') + fmtWeight(Math.round(tend.delta * 10) / 10) + ' kg em 30 dias' : '';
      const card = h(`<div class="chart-card">
        ${sparkline(hist.map((x) => x.rm), { w: 320, h: 170, pad: 20, dots: true })}
        <div class="chart-badge">Carga estimada • ${hist[hist.length - 1].rm} kg</div>
        ${tend ? `<div class="chart-tend ${tend.delta >= 0 ? 'sobe' : 'desce'}">${esc(seta)}</div>` : ''}
      </div>`);
      scroll.appendChild(card);
    } else {
      const last = lastPerformance(e.exId);
      scroll.appendChild(h(`<div class="chart-card"><div class="chart-empty">${icon('chart')}
        ${last ? `Último: ${fmtWeight(last.topPeso)} kg × ${last.topReps}` : 'Registre 2 treinos para ver a evolução'}</div></div>`));
    }

    /* o que foi feito da última vez, série válida a série válida */
    const anterior = ultimaExecucao(e.exId);
    if (anterior) {
      const resumo = anterior.sets
        .map((x) => `${fmtWeight(x.peso)}×${x.reps}`).join('  ·  ');
      const barra = h(`<button class="prev-bar">
        <span><b>${esc(fmtDate(anterior.date))}</b> ${esc(resumo)}</span>
        <em>Usar</em>
      </button>`);
      barra.addEventListener('click', () => {
        let n = 0;
        const validas = e.sets.filter(ehValida);
        validas.forEach((alvo, k) => {
          const ref = anterior.sets[k];
          if (!ref) return;
          alvo.peso = ref.peso; alvo.reps = ref.reps; n += 1;
        });
        if (!n) { toast('Nenhuma série válida para preencher'); return; }
        haptic(); save(); screen.refresh();
        toast('Preenchido com o treino anterior');
      });
      scroll.appendChild(barra);
    }

    /* cabeçalho das colunas */
    scroll.appendChild(h(`<div class="sets-head">
      <div class="sp"></div><div class="h">Peso</div><div class="h">Reps</div><div class="h">Descanso</div><div class="sp-end"></div>
    </div>`));

    /* séries */
    let nValida = 0;
    e.sets.forEach((st, i) => {
      const tipo = tipoSet(st);
      const valida = tipo === 'v';
      if (valida) nValida += 1;
      /* referência: a n-ésima série válida do treino anterior */
      const ref = valida && anterior ? anterior.sets[nValida - 1] : null;
      const marca = valida ? String(nValida) : infoTipo(tipo).curto;

      const row = h(`<div class="set-row${st.done ? ' done' : ''}${valida ? '' : ' aux'}">
        <button class="check sm${st.done ? ' on' : ''}" data-act="done">${icon('check')}</button>
        <button class="set-tipo${valida ? '' : ' aux'}" data-act="tipo">${esc(marca)}</button>
        <div class="field"><input type="number" inputmode="decimal" step="0.5" value="${st.peso || ''}" placeholder="${ref ? fmtWeight(ref.peso) : '0'}" data-f="peso"/><u>kg</u></div>
        <div class="field"><input type="number" inputmode="numeric" value="${st.reps || ''}" placeholder="${ref ? ref.reps : '0'}" data-f="reps"/></div>
        <div class="field"><input type="number" inputmode="decimal" step="0.5" value="${st.desc || ''}" placeholder="${S.settings.restDefault}" data-f="desc"/><u>m</u></div>
        <button class="kebab" data-act="menu">${icon('dots')}</button>
      </div>`);

      /* A sessão pode começar com a tela já aberta, e aí `st` passa a apontar
         para o molde do treino em vez da série da sessão. Resolver o alvo na
         hora da escrita evita reconstruir a tela — o que no iPhone fecharia e
         reabriria o teclado no meio da digitação. */
      const alvoSet = () => {
        const lista = (S.active && S.active.workoutId === workoutId) ? S.active.exercises : src;
        const ex = lista.find((x) => x.uid === e.uid);
        return (ex && ex.sets[i]) || st;
      };

      on(row, 'input[data-f]', 'change', (ev) => {
        const f = ev.target.dataset.f;
        alvoSet()[f] = Number(String(ev.target.value).replace(',', '.')) || 0;
        save();
      });
      on(row, 'input[data-f]', 'focus', (ev) => {
        ev.target.select();
        const campo = ev.target.dataset.f;
        if (live || S.active || (campo !== 'peso' && campo !== 'reps')) return;
        /* nada é reconstruído aqui: o cursor e o teclado ficam onde estão, e
           o que for digitado já cai na sessão por causa de alvoSet() */
        iniciarAoAnotar(workoutId);
      });

      acts(row, {
        done: () => {
          if (!live && !S.active) iniciarAoAnotar(workoutId);
          const marcado = alvoSet();
          marcado.done = !marcado.done;
          haptic(); save();
          if (marcado.done) {
            if (valida) checarRecorde(e, marcado);
            if (S.active && marcado.desc > 0) {
              REST = { endsAt: Date.now() + Math.round(marcado.desc * 60) * 1000, label: e.nome };
              atualizarBarraDescanso();
            }
          }
          screen.refresh();
        },
        tipo: () => escolherTipo(st, () => { save(); screen.refresh(); }),
        menu: () => actionSheet(valida ? 'Série ' + nValida : infoTipo(tipo).nome, [
          { label: 'Tipo da série', icon: 'repeat', onClick: () => escolherTipo(st, () => { save(); screen.refresh(); }) },
          { label: 'Duplicar série', icon: 'copy', onClick: () => { e.sets.splice(i + 1, 0, { ...st, done: false }); save(); screen.refresh(); } },
          { label: 'Repetir da última vez', icon: 'upload', onClick: () => {
            if (!ref) { toast('Sem histórico para esta série'); return; }
            st.peso = ref.peso; st.reps = ref.reps; save(); screen.refresh();
          } },
          { label: 'Remover série', icon: 'trash', danger: true, onClick: () => { e.sets.splice(i, 1); save(); screen.refresh(); } },
        ]),
      });
      scroll.appendChild(row);
    });

    /* calculadora de aquecimento e feeder */
    const calc = h(`<button class="calc-abrir">
      ${icon('alvo')}
      <span>Calcular aquecimento e feeder</span>
      ${icon('chev').replace('<svg', '<svg class="chev"')}
    </button>`);
    calc.addEventListener('click', () => calculadoraAquecimento(e, () => { save(); screen.refresh(); }, w.color));
    scroll.appendChild(calc);

    /* adicionar série */
    const add = h(`<button class="add-row" style="width:100%">
      <span class="add-circle filled">+</span><span class="name" style="text-align:left">Adicionar Série</span></button>`);
    add.addEventListener('click', () => {
      const ult = e.sets[e.sets.length - 1];
      e.sets.push(ult
        ? { peso: ult.peso, reps: ult.reps, desc: ult.desc, tipo: tipoSet(ult), done: false }
        : { peso: 0, reps: 0, desc: S.settings.restDefault, tipo: 'v', done: false });
      save(); haptic(); screen.refresh();
    });
    scroll.appendChild(add);

    /* anotações */
    const notes = h(`<textarea class="notes" placeholder="Adicione anotações sobre o exercício...">${esc(e.notas || '')}</textarea>`);
    notes.addEventListener('input', () => { e.notas = notes.value; save(); });
    scroll.appendChild(notes);

    el.appendChild(scroll);
  }, { name: 'exercise' });
}

/* Folha para escolher o tipo da série. */
function escolherTipo(st, aoMudar) {
  const atual = tipoSet(st);
  const box = h('<div><h3>Tipo da série</h3></div>');
  let ov;
  SET_TIPOS.forEach((t) => {
    const b = h(`<button class="sheet-item">
      <span class="set-tipo${t.id === 'v' ? '' : ' aux'}" style="pointer-events:none">${esc(t.curto || '•')}</span>
      <span style="flex:1">${esc(t.nome)}<i style="display:block;font-style:normal;font-size:13px;color:var(--txt-3)">${esc(t.desc)}</i></span>
      ${t.id === atual ? icon('check').replace('<svg', '<svg style="fill:none;stroke:var(--accent);stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round"') : ''}
    </button>`);
    b.addEventListener('click', () => {
      st.tipo = t.id; haptic();
      ov.close();
      setTimeout(aoMudar, 120);
    });
    box.appendChild(b);
  });
  ov = openSheet(box);
}

/* Avisa na hora quando a série bate o melhor 1RM estimado do exercício. */
function checarRecorde(e, st) {
  const peso = Number(st.peso) || 0;
  const reps = Number(st.reps) || 0;
  if (peso <= 0 || reps <= 0) return;
  const anterior = melhorRM(e.exId);
  if (anterior <= 0) return;                 // sem histórico: nada a bater
  const agora = peso * (1 + reps / 30);
  if (agora <= anterior * 1.001) return;     // margem para erro de arredondamento
  toast('Recorde em ' + e.nome + ' — ' + fmtWeight(peso) + ' kg × ' + reps);
}

/* =========================================================
   BIBLIOTECA DE EXERCÍCIOS
   ========================================================= */

function openLibrary(workoutId, onDone, opts) {
  const o = opts || {};
  const substituindo = !!o.substituirUid;
  let query = '';
  let filtro = 'Todos';
  const escolhas = {};   // exId -> { equip, sets }

  pushScreen((el, screen) => {
    const w = getWorkout(workoutId);
    /* a biblioteca é catálogo, não treino: fica neutra */
    setAccent(contextAccent(), el);

    const nav = h(`<div class="nav">
      <button class="icon-btn stroke" data-act="back">${icon('back')}</button>
      <div class="title${substituindo ? ' long' : ''}">${substituindo ? 'Substituir ' + esc(o.nomeAtual || 'exercício') : 'Adicionar Exercício'}</div>
      <button class="icon-btn" data-act="novo">${icon('plus')}</button>
    </div>`);
    acts(nav, {
      back: () => { if (onDone) onDone(); popScreen(); },
      novo: () => novoExercicio(screen),
    });
    el.appendChild(nav);

    /* busca */
    const search = h(`<div class="search">
      ${icon('search')}
      <input placeholder="Buscar exercício..." value="${esc(query)}"/>
      <button class="search-limpar${query ? '' : ' oculto'}" aria-label="Limpar busca">${icon('fechar')}</button>
    </div>`);
    const input = search.querySelector('input');
    const limpar = search.querySelector('.search-limpar');
    const sincronizar = () => limpar.classList.toggle('oculto', !input.value);
    input.addEventListener('input', () => {
      query = input.value;
      sincronizar();
      renderList();
    });
    limpar.addEventListener('click', () => {
      input.value = '';
      query = '';
      sincronizar();
      renderList();
      input.focus();
    });
    el.appendChild(search);

    /* filtros */
    const chips = h('<div class="chips"></div>');
    ['Todos', 'Meus Exercícios'].concat(GRUPOS).forEach((g) => {
      const c = h(`<button class="chip${filtro === g ? ' on' : ''}">${esc(g)}</button>`);
      c.addEventListener('click', () => { filtro = g; screen.refresh(); });
      chips.appendChild(c);
    });
    el.appendChild(chips);

    const scroll = h('<div class="scroll"><div class="exlist"></div></div>');
    el.appendChild(scroll);
    const list = scroll.querySelector('.exlist');

    function renderList() {
      const q = query.trim().toLowerCase()
        .normalize('NFD').replace(new RegExp('[\u0300-\u036f]', 'g'), '');
      let itens = allExercises();
      if (filtro === 'Meus Exercícios') itens = itens.filter((x) => x.custom);
      else if (filtro !== 'Todos') itens = itens.filter((x) => x.grupo === filtro);
      if (q) {
        itens = itens.filter((x) => x.nome.toLowerCase()
          .normalize('NFD').replace(new RegExp('[\u0300-\u036f]', 'g'), '').includes(q));
      }
      itens = itens.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

      list.innerHTML = '';
      if (!itens.length) {
        list.appendChild(h(`<div class="empty">${icon('search')}<b>Nada encontrado</b>Toque em + no topo para criar um exercício seu.</div>`));
        return;
      }
      itens.forEach((ex) => list.appendChild(libRow(ex)));
    }

    function libRow(ex) {
      const sel = escolhas[ex.id] || (escolhas[ex.id] = { equip: ex.equip, sets: 3 });
      const row = h(`<div class="exrow">
        <div class="exrow-top">
          ${exThumb(ex.id, ex.grupo, sel.equip)}
          <div class="exrow-name"><b>${esc(ex.nome)}</b><span>${esc(ex.grupo)}</span></div>
          <button class="add-circle" data-act="add">+</button>
        </div>
        <div class="exrow-opts${substituindo ? ' so-equip' : ''}">
          <div class="opt">
            <svg class="lead" viewBox="0 0 24 24">${ICONS.halter}</svg>
            <label>${esc(sel.equip)}</label>
            ${icon('caret')}
            <select data-f="equip">${equipsDe(ex).map((q) => `<option${q === sel.equip ? ' selected' : ''}>${esc(q)}</option>`).join('')}</select>
          </div>
          <div class="opt">
            <svg class="lead" viewBox="0 0 24 24">${I.repeat.replace(/<\/?svg[^>]*>/g, '')}</svg>
            <label>${sel.sets} séries</label>
            ${icon('caret')}
            <select data-f="sets">${[1, 2, 3, 4, 5, 6, 7, 8].map((n) => `<option value="${n}"${n === sel.sets ? ' selected' : ''}>${n} série${n > 1 ? 's' : ''}</option>`).join('')}</select>
          </div>
        </div>
      </div>`);

      on(row, 'select[data-f="equip"]', 'change', (ev) => {
        sel.equip = ev.target.value;
        row.querySelectorAll('.opt label')[0].textContent = sel.equip;
        /* a foto acompanha o aparelho escolhido */
        const antiga = row.querySelector('.thumb');
        if (antiga) antiga.replaceWith(h(exThumb(ex.id, ex.grupo, sel.equip)));
      });
      on(row, 'select[data-f="sets"]', 'change', (ev) => {
        sel.sets = Number(ev.target.value);
        row.querySelectorAll('.opt label')[1].textContent = sel.sets + ' séries';
      });

      acts(row, {
        add: (btn) => {
          if (substituindo) {
            substituirExercicio(workoutId, o.substituirUid, ex, sel.equip);
            haptic();
            if (onDone) onDone();
            popScreen();
            toast('Trocado para ' + ex.nome);
            return;
          }
          addExerciseToWorkout(workoutId, ex, sel.sets, sel.equip);
          if (S.active && S.active.workoutId === workoutId) {
            const w2 = getWorkout(workoutId);
            S.active.exercises.push(structuredClone(w2.exercises[w2.exercises.length - 1]));
            save();
          }
          haptic();
          btn.classList.add('filled');
          btn.textContent = '✓';
          setTimeout(() => { btn.classList.remove('filled'); btn.textContent = '+'; }, 900);
          toast(ex.nome + ' adicionado');
        },
      });
      return row;
    }

    renderList();
  }, { name: 'library' });
}

function grupoIcon(g) {
  const map = {
    'Peito': 'banco', 'Costas': 'costas', 'Pernas': 'perna', 'Glúteos': 'perna',
    'Panturrilha': 'perna', 'Ombros': 'halter', 'Bíceps': 'kettle', 'Tríceps': 'kettle',
    'Antebraço': 'kettle', 'Abdômen': 'alvo', 'Cardio': 'coracao',
  };
  return map[g] || 'halter';
}

function novoExercicio(screen) {
  const box = h(`<div>
    <h3>Novo exercício</h3>
    <input class="text-input" id="ne-nome" placeholder="Nome do exercício"/>
    <div style="display:flex;gap:12px;margin:0 20px 16px">
      <select class="text-input" id="ne-grupo" style="margin:0;flex:1;width:auto">${GRUPOS.map((g) => `<option>${esc(g)}</option>`).join('')}</select>
      <select class="text-input" id="ne-equip" style="margin:0;flex:1;width:auto">${EQUIPAMENTOS.map((q) => `<option>${esc(q)}</option>`).join('')}</select>
    </div>
    <div class="sheet-actions">
      <button class="pill-btn grey" data-x="no">Cancelar</button>
      <button class="pill-btn" data-x="yes">Criar</button>
    </div></div>`);
  const r = openSheet(box, { center: true });
  box.querySelector('[data-x="no"]').addEventListener('click', r.close);
  box.querySelector('[data-x="yes"]').addEventListener('click', () => {
    const nome = box.querySelector('#ne-nome').value.trim();
    if (!nome) { toast('Dê um nome ao exercício'); return; }
    addCustomExercise(nome, box.querySelector('#ne-grupo').value, box.querySelector('#ne-equip').value);
    r.close();
    setTimeout(() => { screen.refresh(); toast('Exercício criado'); }, 120);
  });
}

/* =========================================================
   DETALHE DE UM REGISTRO
   ========================================================= */

function openSessionDetail(id) {
  let editando = false;

  pushScreen((el, screen) => {
    const s = S.sessions.find((x) => x.id === id);
    if (!s) { popScreen(); return; }
    setAccent(s.color, el);

    const nav = h(`<div class="nav">
      <button class="icon-btn stroke" data-act="back">${icon('back')}</button>
      <div class="title">${esc(s.name)}</div>
      ${editando
        ? `<button class="pill-btn sm" data-act="salvar">Salvar</button>`
        : `<button class="icon-btn" data-act="menu">${icon('dots')}</button>`}
    </div>`);
    acts(nav, {
      back: () => { if (editando) { editando = false; screen.refresh(); } else popScreen(); },
      salvar: () => {
        s.exercises = s.exercises.filter((e) => e.sets.length);
        recalcSession(s); saveNow();
        editando = false; screen.refresh();
        toast('Registro atualizado');
      },
      menu: () => actionSheet(s.name, [
        { label: 'Corrigir este registro', icon: 'pencil', onClick: () => { editando = true; screen.refresh(); } },
        { label: 'Repetir este treino', icon: 'repeat', onClick: () => { const w = getWorkout(s.workoutId); if (!w) { toast('Treino não existe mais'); return; } startSession(w.id); popScreen(); setTimeout(() => openWorkout(w.id, 'session'), 200); } },
        { label: 'Apagar registro', icon: 'trash', danger: true, onClick: () => confirmSheet('Apagar registro?', '', 'Apagar', () => { S.sessions = S.sessions.filter((x) => x.id !== id); saveNow(); popScreen(); }) },
      ]),
    });
    el.appendChild(nav);

    const scroll = h('<div class="scroll"></div>');
    scroll.appendChild(h(`<div class="timer" data-static>${fmtClock(s.durationSec)}</div>`));
    scroll.appendChild(h(`<div class="hint" style="text-align:center;margin-top:-14px;padding-bottom:18px">${fmtDate(s.date)} • ${new Date(s.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>`));

    const box = h('<div class="rings"></div>');
    box.innerHTML =
      ring('Calorias', fmtNum(s.calorias), 1, '') +
      ring('Volume', fmtNum(s.volume), 1, 'kg') +
      ring('Séries', String(s.sets), 1, '') +
      ring('Repetições', String(s.reps), 1, '');
    scroll.appendChild(box);

    /* comparação com o treino anterior do mesmo molde */
    const comp = editando ? null : compararComAnterior(s);
    if (comp) {
      const sinal = (n, sufixo) => (n > 0 ? '+' : '') + fmtWeight(n) + (sufixo || '');
      const classe = (n) => (n > 0 ? 'sobe' : (n < 0 ? 'desce' : 'igual'));
      const subiram = comp.porExercicio.filter((x) => x.delta > 0);
      const cairam = comp.porExercicio.filter((x) => x.delta < 0);

      const caixa = h(`<div class="card comparacao">
        <div class="comp-topo">Comparado com ${esc(fmtDate(comp.anterior.date))}</div>
        <div class="comp-linha">${[
          [comp.volume, ' kg de volume'],
          [comp.sets, ' séries'],
          [comp.reps, ' repetições'],
        ]
          .filter(([n]) => n !== 0)   /* zero não é informação, é ruído */
          .map(([n, rotulo]) => `<span class="${classe(n)}">${esc(sinal(n))}</span>${esc(rotulo)}`)
          .join(' · ') || 'Mesmos números do treino anterior'}</div>
        ${subiram.length ? `<div class="comp-ex sobe">↑ ${subiram.map((x) => esc(x.nome) + ' ' + sinal(x.delta, ' kg')).join(' · ')}</div>` : ''}
        ${cairam.length ? `<div class="comp-ex desce">↓ ${cairam.map((x) => esc(x.nome) + ' ' + sinal(x.delta, ' kg')).join(' · ')}</div>` : ''}
        ${!subiram.length && !cairam.length ? '<div class="comp-ex igual">Mesmas cargas do treino anterior</div>' : ''}
      </div>`);
      scroll.appendChild(caixa);
    }

    if (editando) {
      scroll.appendChild(h('<div class="hint" style="padding:0 16px 12px">Ajuste peso e repetições. As estatísticas são recalculadas ao salvar.</div>'));
    }

    s.exercises.forEach((e) => {
      scroll.appendChild(h(`<div class="section-title" style="color:var(--txt)">${esc(e.nome)}</div>`));
      let nv = 0;
      e.sets.forEach((st, i) => {
        const tipo = tipoSet(st);
        const valida = tipo === 'v';
        if (valida) nv += 1;
        const marca = valida ? String(nv) : infoTipo(tipo).curto;

        if (!editando) {
          scroll.appendChild(h(`<div class="ex-item${valida ? '' : ' aux'}" style="padding:10px 16px">
            <div class="set-tipo${valida ? '' : ' aux'}" style="pointer-events:none">${esc(marca)}</div>
            <div class="name">${fmtWeight(st.peso)} kg × ${st.reps}</div>
            <div style="color:var(--txt-2);font-size:15px">${valida ? fmtWeight(st.peso * st.reps) + ' kg' : esc(infoTipo(tipo).nome)}</div>
          </div>`));
          return;
        }

        const row = h(`<div class="set-row${valida ? '' : ' aux'}">
          <button class="set-tipo${valida ? '' : ' aux'}" data-act="tipo">${esc(marca)}</button>
          <div class="field"><input type="number" inputmode="decimal" step="0.5" value="${st.peso || ''}" placeholder="0" data-f="peso"/><u>kg</u></div>
          <div class="field"><input type="number" inputmode="numeric" value="${st.reps || ''}" placeholder="0" data-f="reps"/></div>
          <button class="kebab" data-act="remover">${icon('trash')}</button>
        </div>`);
        on(row, 'input[data-f]', 'change', (ev) => {
          st[ev.target.dataset.f] = Number(String(ev.target.value).replace(',', '.')) || 0;
        });
        on(row, 'input[data-f]', 'focus', (ev) => {
        ev.target.select();
        const campo = ev.target.dataset.f;
        if (live || S.active || (campo !== 'peso' && campo !== 'reps')) return;
        /* nada é reconstruído aqui: o cursor e o teclado ficam onde estão, e
           o que for digitado já cai na sessão por causa de alvoSet() */
        iniciarAoAnotar(workoutId);
      });
        acts(row, {
          tipo: () => escolherTipo(st, () => screen.refresh()),
          remover: () => { e.sets.splice(i, 1); screen.refresh(); },
        });
        scroll.appendChild(row);
      });
      if (e.notas && !editando) scroll.appendChild(h(`<div class="hint" style="padding:8px 16px 4px">${esc(e.notas)}</div>`));
    });

    el.appendChild(scroll);
  }, { name: 'session' });
}

/* =========================================================
   BOOT
   ========================================================= */

/* Quando o app é aberto por um endereço com `?passos=`, o número entra e a
   URL é limpa — senão recarregar a página importaria de novo o valor velho.
   A tabela deixa acrescentar outros dados do Saúde numa linha só. */
const IMPORTES_URL = {
  passos: (v) => importarPassos(v),
};

function importarDaURL() {
  const q = new URLSearchParams(location.search);
  let veio = 0;
  Object.keys(IMPORTES_URL).forEach((chave) => {
    const v = q.get(chave);
    if (v && IMPORTES_URL[chave](v)) veio += 1;
  });
  if (!veio) return 0;
  try { history.replaceState(null, '', location.pathname); } catch (e) { /* nada a fazer */ }
  return veio;
}

function boot() {
  aplicarTema(S.settings.tema);
  ajustarTravaTela();   /* treino retomado depois de fechar o app */
  const veioDaURL = importarDaURL();
  replaceRoot(buildRoot, 'root');
  if (veioDaURL) setTimeout(() => toast('Dados do Saúde importados'), 400);

  clearInterval(TICK);
  TICK = setInterval(globalTick, 1000);

  /* mantém o cronômetro coerente ao voltar do segundo plano */
  document.addEventListener('visibilitychange', () => {
    ajustarTravaTela();   /* o sistema solta a trava ao esconder o app */
    if (!document.hidden) {
      const sc = currentScreen();
      if (sc) sc.refresh();
    }
  });

  /* evita zoom por duplo toque */
  let lastTouch = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouch < 300) e.preventDefault();
    lastTouch = now;
  }, { passive: false });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => {
      /* pede ao service worker que guarde as fotos depois que o app abriu,
         para elas estarem disponíveis offline na academia */
      navigator.serviceWorker.ready.then((reg) => {
        if (!reg.active || typeof EX_IMG === 'undefined') return;
        reg.active.postMessage({
          tipo: 'guardar-fotos',
          fotos: Array.from(EX_IMG, (slug) => 'img/' + slug + '.webp'),
        });
      });
    }).catch(() => { });
  }
}

document.addEventListener('DOMContentLoaded', boot);
