/* GymNotion — rotina, tarefas, metas e estudos

   Estes três módulos seguem a mesma regra de cor da academia: a cor identifica
   a coisa, não a tela. Cada tarefa, cada meta e cada matéria carrega a sua, e
   as telas que somam vários itens ficam neutras. */

/* =========================================================
   CRONOGRAMA
   ========================================================= */

let DIA_AGENDA = Date.now();      // dia aberto na lista

/* A grade de horários e o calendário do mês saíram daqui.

   Eram duas maneiras de olhar o mesmo dado, e nenhuma das duas era a que se usa
   para trabalhar: a grade mostrava buraco entre compromissos e o calendário
   mostrava o mês inteiro, mas quem abre esta tela quer ver o que tem para
   fazer e riscar. O que ficou é a lista — e o que era o lugar de prestígio do
   calendário virou a Rotina, na tela inicial.

   O que sobrevive da grade é o que a lista usa: a hora de término, que a linha
   mostra como "06:30 – 08:00". */

const diaCurto = (ts) => new Date(ts)
  .toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
  .replace(/\.$/, '.');

function renderTarefas(el, screen) {
  setAccent(contextAccent(), el);

  const scroll = h('<div class="scroll"></div>');
  scroll.appendChild(h(secaoSub('Tarefas', 'O que tem para fazer', '')));
  scroll.appendChild(barraDoDia(screen));

  /* Cadastro rápido: o que é, quando e entre que horas. Cor, observação e tipo
     ficam no editor completo, que abre no toque sobre a tarefa. */
  scroll.appendChild(formBloco('Nova tarefa', [
    { id: 'titulo', label: 'O que é', placeholder: 'Consulta, prova, reunião...', cresce: true },
    { id: 'data', label: 'Data', tipo: 'date', valor: dayKey(DIA_AGENDA), mantem: true, curto: true },
    { id: 'hora', label: 'Início', tipo: 'time', curto: true },
    { id: 'fim', label: 'Fim', tipo: 'time', curto: true },
  ], 'Adicionar', (v) => {
    const titulo = String(v.titulo).trim();
    if (!titulo) { toast('Diga o que é'); return false; }
    novaTarefa({
      titulo, data: v.data || dayKey(Date.now()), hora: v.hora || '', fim: v.fim || '',
      tipo: v.hora ? 'compromisso' : 'tarefa',
    });
    if (v.data) DIA_AGENDA = tsDaData(v.data);
    haptic();
    setTimeout(() => screen.refresh(), 60);
    return true;
  }));

  /* Cada faixa de tempo em seu bloco: o dia aberto, o que vem depois, o que
     ficou para trás e o que não tem data. */
  const bloco = (rotulo, itens, vazio, mostrarData) => {
    const b = h(`<div class="bloco"><div class="bloco-rot">${esc(rotulo)}</div></div>`);
    if (!itens.length) b.appendChild(h(`<div class="vazio-tracejado">${esc(vazio)}</div>`));
    else itens.forEach((t) => b.appendChild(linhaTarefa(t, screen, mostrarData)));
    scroll.appendChild(b);
  };

  const ehHoje = dayKey(DIA_AGENDA) === dayKey(Date.now());
  bloco(ehHoje ? 'Hoje' : fmtDataLonga(DIA_AGENDA), tarefasDoDia(DIA_AGENDA), 'Nada por aqui.');

  const hojeK = dayKey(Date.now());
  const proximos = S.tarefas
    .filter((t) => !t.feito && t.data && t.data > hojeK && t.data !== dayKey(DIA_AGENDA))
    .sort(ordemNoTempo).slice(0, 8);
  bloco('Próximos', proximos, 'Nada por aqui.', true);

  bloco('Anteriores', tarefasAtrasadas().slice(0, 8), 'Nada por aqui.', true);

  const soltas = tarefasSemData();
  if (soltas.length) bloco('Sem data', soltas, 'Nada por aqui.');

  el.appendChild(scroll);
}

/* Navegação entre dias. Sem o calendário do mês, é ela que anda no tempo — e o
   campo de data do cadastro rápido continua alcançando qualquer dia de uma vez. */
function barraDoDia(screen) {
  const b = h(`<div class="crono-barra">
    <div class="crono-nav">
      <button class="icon-btn stroke" data-act="ant">${icon('back')}</button>
      <b>${esc(fmtDataLonga(DIA_AGENDA))}</b>
      <button class="icon-btn stroke" data-act="prox">${icon('chev')}</button>
    </div>
    <button class="crono-hoje" data-act="hoje">Hoje</button>
  </div>`);

  /* Sem botão de "nova tarefa" aqui: o formulário fica logo abaixo, e dois
     caminhos para a mesma coisa a uma tela de distância é um a mais. */
  acts(b, {
    ant: () => { DIA_AGENDA -= 86400000; haptic(); screen.refresh(); },
    prox: () => { DIA_AGENDA += 86400000; haptic(); screen.refresh(); },
    hoje: () => { DIA_AGENDA = Date.now(); haptic(); screen.refresh(); },
  });
  return b;
}

/* Uma tarefa na lista. A faixa da esquerda é a cor dela; o horário à direita só
   aparece quando existe, para tarefa solta não fingir ter hora marcada. */
function linhaTarefa(t, screen, mostrarData) {
  const row = h(`<div class="tarefa${t.feito ? ' feito' : ''}">
    <button class="check sm${t.feito ? ' on' : ''}" data-act="ok">${icon('check')}</button>
    <div class="tarefa-txt">
      <b>${esc(t.titulo)}</b>
      <span>${[
        t.tipo === 'compromisso' ? 'Compromisso' : '',
        t.hora ? (t.fim ? t.hora + ' – ' + t.fim : t.hora) : '',
        mostrarData && t.data ? fmtDate(tsDaData(t.data)) : '',
        t.nota || '',
      ].filter(Boolean).join(' · ')}</span>
    </div>
    <button class="kebab" data-act="menu">${icon('dots')}</button>
  </div>`);
  setAccent(corDe(t), row);
  acts(row, {
    ok: () => { alternarTarefa(t.id); haptic(); screen.refresh(); },
    menu: () => actionSheet(t.titulo, [
      { label: 'Editar', icon: 'pencil', onClick: () => editorTarefa(t, t.data, screen) },
      { label: 'Adiar um dia', icon: 'repeat', onClick: () => { adiarTarefa(t.id, 1); screen.refresh(); toast('Adiada para o dia seguinte'); } },
      { label: 'Jogar para amanhã', icon: 'clock', onClick: () => {
        const amanha = new Date(); amanha.setDate(amanha.getDate() + 1);
        const alvo = getTarefa(t.id);
        if (alvo) { alvo.data = dayKey(amanha.getTime()); saveNow(); }
        screen.refresh();
      } },
      { label: 'Apagar', icon: 'trash', danger: true, onClick: () => confirmSheet('Apagar tarefa?', esc(t.titulo), 'Apagar', () => { removerTarefa(t.id); screen.refresh(); }) },
    ]),
  });
  row.addEventListener('click', (e) => { if (!e.target.closest('[data-act]')) editorTarefa(t, t.data, screen); });
  return row;
}

/* Editor de tarefa. Usa os seletores nativos de data e hora do iOS: é o único
   jeito de ter roda de data sem escrever uma do zero. */
function editorTarefa(tarefa, dataPadrao, screen, padroes) {
  const t = tarefa || Object.assign({
    titulo: '', nota: '', data: dataPadrao || dayKey(Date.now()),
    hora: '', fim: '', tipo: 'tarefa', cor: corMarca(),
  }, padroes || {});
  let cor = t.cor;
  let tipo = t.tipo;

  const box = h(`<div class="form">
    <h3>${tarefa ? 'Editar tarefa' : 'Nova tarefa'}</h3>
    <div class="form-corpo">
    <input class="text-input" data-c="titulo" placeholder="O que precisa ser feito" value="${esc(t.titulo)}"/>
    <div class="chips">
      <button class="chip${tipo === 'tarefa' ? ' on' : ''}" data-tipo="tarefa">Tarefa</button>
      <button class="chip${tipo === 'compromisso' ? ' on' : ''}" data-tipo="compromisso">Compromisso</button>
    </div>
    <div class="form-linha">
      <label>Dia<input class="text-input" type="date" data-c="data" value="${esc(t.data || '')}"/></label>
    </div>
    <div class="form-linha">
      <label>Início<input class="text-input" type="time" data-c="hora" value="${esc(t.hora || '')}"/></label>
      <label>Término<input class="text-input" type="time" data-c="fim" value="${esc(t.fim || '')}"/></label>
    </div>
    <input class="text-input" data-c="nota" placeholder="Observação (opcional)" value="${esc(t.nota)}"/>
    <div class="lugar-cor"></div>
    </div>
    <div class="sheet-actions">
      <button class="pill-btn grey" data-x="no">Cancelar</button>
      <button class="pill-btn" data-x="yes">Salvar</button>
    </div>
  </div>`);

  const r = openSheet(box, { center: true });
  r.sheet.classList.add('com-form');
  const campo = (n) => box.querySelector(`[data-c="${n}"]`);
  /* o próprio editor já veste a cor escolhida, em vez de só revelá-la depois
     de salvar: botão, chip e foco dos campos mudam junto com a paleta */
  setAccent(cor, box);

  on(box, '[data-tipo]', 'click', (e) => {
    tipo = e.currentTarget.dataset.tipo;
    box.querySelectorAll('[data-tipo]').forEach((x) => x.classList.toggle('on', x.dataset.tipo === tipo));
  });
  box.querySelector('.lugar-cor').replaceWith(campoCor(cor, (nova) => {
    cor = nova;
    setAccent(cor, box);
  }));

  box.querySelector('[data-x="no"]').addEventListener('click', r.close);
  box.querySelector('[data-x="yes"]').addEventListener('click', () => {
    const titulo = campo('titulo').value.trim();
    if (!titulo) { toast('Dê um nome para a tarefa'); return; }
    const dados = {
      titulo, nota: campo('nota').value.trim(),
      data: campo('data').value || null,
      hora: campo('hora').value || '',
      fim: campo('fim').value || '',
      tipo, cor,
    };
    if (tarefa) Object.assign(tarefa, dados);
    else novaTarefa(dados);
    saveNow();
    r.close();
    if (dados.data) DIA_AGENDA = tsDaData(dados.data);
    setTimeout(() => screen.refresh(), 120);
  });
  setTimeout(() => { if (!tarefa) campo('titulo').focus(); }, 250);
}

/* =========================================================
   CRONOGRAMA — a semana em grade

   Esta grade já tinha saído do app uma vez, e voltou por um bom motivo:
   mostrando só tarefas avulsas, era um calendário quase sempre vazio. Com a
   rotina em horários fixos ela mostra a semana de verdade — é a diferença
   entre "o que marquei" e "como meus dias são".

   Ela não edita: rotina se monta na Rotina, tarefa se monta em Tarefas. Aqui
   se confere. O toque abre o que já existe, e o toque no vazio cria uma tarefa
   naquela hora, que é o gesto que uma grade promete só por existir.
   ========================================================= */

const ALTURA_HORA = 54;
let SEMANA_AGENDA = inicioSemanaSeg();
let CRONO_MODO = '';

/* Semana no computador, dia no celular: sete colunas em 390px dariam 47px cada
   e nenhum nome caberia. A escolha à mão fica guardada e vale nos dois. */
function modoCronograma() {
  if (!CRONO_MODO) {
    CRONO_MODO = S.settings.cronoModo || (window.innerWidth >= 900 ? 'semana' : 'dia');
  }
  return CRONO_MODO;
}

function definirModoCronograma(m) {
  CRONO_MODO = m;
  S.settings.cronoModo = m;
  saveNow();
}

function telaCronograma() {
  pushScreen((el, screen) => {
    setAccent(contextAccent(), el);
    el.appendChild(navBar('Cronograma'));

    const modo = modoCronograma();
    const scroll = h('<div class="scroll"></div>');
    scroll.appendChild(h(secaoSub(modo === 'semana' ? 'Visão semanal' : 'Visão do dia',
      'Como o dia está', '')));
    scroll.appendChild(barraCronograma(screen, modo));
    scroll.appendChild(gradeCronograma(screen, modo));
    el.appendChild(scroll);
  }, { name: 'cronograma' });
}

function barraCronograma(screen, modo) {
  const semana = modo === 'semana';
  const faixa = semana
    ? diaCurto(SEMANA_AGENDA) + ' – ' + diaCurto(SEMANA_AGENDA + 6 * 86400000)
    : fmtDataLonga(DIA_AGENDA);

  const b = h(`<div class="crono-barra">
    <div class="crono-nav">
      <button class="icon-btn stroke" data-act="ant">${icon('back')}</button>
      <b>${esc(faixa)}</b>
      <button class="icon-btn stroke" data-act="prox">${icon('chev')}</button>
    </div>
    <button class="crono-hoje" data-act="hoje">Hoje</button>
    <div class="seg">
      <button data-m="semana"${semana ? ' class="on"' : ''}>Semana</button>
      <button data-m="dia"${semana ? '' : ' class="on"'}>Dia</button>
    </div>
  </div>`);

  const andar = (passo) => {
    if (semana) {
      SEMANA_AGENDA += passo * 7 * 86400000;
      DIA_AGENDA = SEMANA_AGENDA;
    } else {
      DIA_AGENDA += passo * 86400000;
      SEMANA_AGENDA = inicioSemanaSeg(DIA_AGENDA);
    }
    haptic();
    screen.refresh();
  };

  acts(b, {
    ant: () => andar(-1),
    prox: () => andar(1),
    hoje: () => {
      DIA_AGENDA = Date.now();
      SEMANA_AGENDA = inicioSemanaSeg();
      haptic();
      screen.refresh();
    },
  });
  on(b, '[data-m]', 'click', (ev) => {
    definirModoCronograma(ev.currentTarget.dataset.m);
    haptic();
    screen.refresh();
  });
  return b;
}

function gradeCronograma(screen, modo) {
  const semana = modo === 'semana';
  const base = semana ? SEMANA_AGENDA : new Date(DIA_AGENDA).setHours(0, 0, 0, 0);
  const n = semana ? 7 : 1;
  const hojeK = dayKey(Date.now());

  const dias = [];
  for (let i = 0; i < n; i++) {
    const ts = base + i * 86400000;
    dias.push(Object.assign({ ts }, agendaDoDia(ts)));
  }
  /* Sem fim marcado o bloco vale uma hora, mas o rótulo mostra só o começo: a
     altura é necessidade de desenho, e escrever "08:15 – 09:15" num item que
     termina quando terminar seria inventar dado. */
  const faixa = faixaDeHoras(dias.reduce((a, d) => a.concat(d.comHora), []));
  const horas = faixa.fim - faixa.ini;

  const box = h(`<div class="grade-crono"><div class="gc-rolo">
    <div class="gc-tabela" style="--cols:${n};--alt:${ALTURA_HORA}px"></div>
  </div></div>`);
  const tab = box.querySelector('.gc-tabela');

  /* cabeçalho: dia da semana e número, com hoje aceso */
  const cab = h('<div class="gc-cab"><div class="gc-canto"></div></div>');
  dias.forEach((d) => {
    const dt = new Date(d.ts);
    const cel = h(`<div class="gc-dia${dayKey(d.ts) === hojeK ? ' hoje' : ''}${dayKey(d.ts) === dayKey(DIA_AGENDA) ? ' sel' : ''}">
      <i>${esc(DIAS_SEMANA_SEG[(dt.getDay() + 6) % 7])}</i><b>${dt.getDate()}</b>
    </div>`);
    cel.addEventListener('click', () => { DIA_AGENDA = d.ts; haptic(); screen.refresh(); });
    cab.appendChild(cel);
  });
  tab.appendChild(cab);

  /* faixa de dia inteiro: o que não tem hora não some da grade */
  if (dias.some((d) => d.semHora.length)) {
    const linha = h('<div class="gc-todo-dia"><div class="gc-canto"><span>dia inteiro</span></div></div>');
    dias.forEach((d) => {
      const cel = h('<div class="gc-avulsos"></div>');
      d.semHora.forEach((x) => {
        const chip = h(`<button class="gc-chip${x.feito ? ' feito' : ''}${x.fonte === 'rotina' ? ' rotina' : ''}">${esc(x.titulo)}</button>`);
        setAccent(x.cor, chip);
        chip.addEventListener('click', () => abrirDaGrade(x, d.ts, screen));
        cel.appendChild(chip);
      });
      linha.appendChild(cel);
    });
    tab.appendChild(linha);
  }

  /* corpo: régua de horas à esquerda e uma coluna por dia */
  const corpo = h('<div class="gc-corpo"></div>');
  const regua = h('<div class="gc-horas"></div>');
  for (let hh = faixa.ini; hh < faixa.fim; hh++) {
    regua.appendChild(h(`<div class="gc-hora"><span>${pad2(hh)}:00</span></div>`));
  }
  corpo.appendChild(regua);

  dias.forEach((d) => {
    const col = h(`<div class="gc-col${dayKey(d.ts) === hojeK ? ' hoje' : ''}" style="height:${horas * ALTURA_HORA}px"></div>`);
    d.comHora.forEach((x) => {
      const f = faixaDeHora(x.hora, x.fim);
      const topo = ((f.ini - faixa.ini * 60) / 60) * ALTURA_HORA;
      const alto = Math.max(24, ((f.fim - f.ini) / 60) * ALTURA_HORA);
      const bl = h(`<button class="gc-bloco${x.feito ? ' feito' : ''}${alto < 40 ? ' baixo' : ''}${x.fonte === 'rotina' ? ' rotina' : ''}"
        style="top:${topo.toFixed(1)}px;height:${alto.toFixed(1)}px">
        <b>${esc(x.titulo)}</b>
        <span>${esc(x.fim ? x.hora + ' – ' + x.fim : x.hora)}</span>
      </button>`);
      setAccent(x.cor, bl);
      bl.addEventListener('click', (e) => { e.stopPropagation(); abrirDaGrade(x, d.ts, screen); });
      col.appendChild(bl);
    });

    /* tocar no vazio cria tarefa, e não item de rotina: rotina é decisão de
       "isso se repete", que se toma na tela dela e não num toque de passagem */
    col.addEventListener('click', (e) => {
      if (e.target.closest('.gc-bloco')) return;
      const y = e.clientY - col.getBoundingClientRect().top;
      const meia = Math.round((faixa.ini * 60 + (y / ALTURA_HORA) * 60) / 30) * 30;
      DIA_AGENDA = d.ts;
      editorTarefa(null, dayKey(d.ts), screen, { hora: horaDeMinutos(Math.max(0, Math.min(1410, meia))) });
    });
    corpo.appendChild(col);
  });
  tab.appendChild(corpo);
  return box;
}

/* O toque abre o que aquilo é: tarefa vai para o editor de tarefa, item de
   rotina para o menu dele. */
function abrirDaGrade(x, ts, screen) {
  if (x.fonte === 'tarefa') editorTarefa(x.ref, x.ref.data, screen);
  else menuItemRotina(x.ref, screen, ts);
}

/* =========================================================
   ROTINA
   ========================================================= */

function telaRotina() {
  pushScreen((el, screen) => {
    setAccent(contextAccent(), el);
    el.appendChild(navBar('Rotina'));

    const scroll = h('<div class="scroll"></div>');
    const doDia = rotinaDoDia();
    const feitos = rotinaFeitos();
    scroll.appendChild(h(secaoSub('Rotina', 'O que se repete',
      doDia.length ? feitos + ' de ' + doDia.length + ' cumpridos hoje' : 'Nada marcado para hoje')));

    /* A hora é opcional: item sem hora continua valendo o dia inteiro e some da
       grade, que é o certo — "beber água" não tem horário. */
    scroll.appendChild(formBloco('Novo item', [
      { id: 'titulo', label: 'O que é', placeholder: 'Tomar creatina, alongar...', cresce: true },
      { id: 'hora', label: 'Início', tipo: 'time', curto: true },
      { id: 'fim', label: 'Fim', tipo: 'time', curto: true },
    ], 'Adicionar', (v) => {
      const titulo = String(v.titulo).trim();
      if (!titulo) { toast('Diga o que é'); return false; }
      novoItemRotina(titulo, [], '', v.hora || '', v.fim || '');
      haptic();
      setTimeout(() => screen.refresh(), 60);
      return true;
    }));

    const bloco = h('<div class="bloco"><div class="bloco-rot">Hoje</div></div>');
    if (!doDia.length) {
      bloco.appendChild(h('<div class="vazio-tracejado">Nada marcado para hoje. Um item de rotina vale nos dias da semana que você escolher.</div>'));
    } else {
      doDia.forEach((i) => bloco.appendChild(linhaRotina(i, screen)));
    }
    scroll.appendChild(bloco);

    /* Os que não valem hoje continuam à vista, apagados: sumir do app no dia
       de folga faria parecer que sumiram de vez. */
    const fora = S.rotina.filter((i) => !valeNoDia(i));
    if (fora.length) {
      const b = h('<div class="bloco"><div class="bloco-rot">Outros dias</div></div>');
      fora.forEach((i) => b.appendChild(linhaRotina(i, screen, true)));
      scroll.appendChild(b);
    }

    /* Espelho da semana: quantos dos dias em que cada item valia ele cumpriu. */
    if (S.rotina.length) {
      const b = h('<div class="bloco"><div class="bloco-rot">Nesta semana</div></div>');
      S.rotina.forEach((i) => {
        const { valia, feitos: f } = rotinaNaSemana(i);
        const pct = valia ? f / valia : 0;
        const linha = h(`<div class="meta-card" style="cursor:default">
          <div class="meta-head">
            <div class="meta-txt"><b>${esc(i.titulo)}</b><span>${esc(descricaoDoItem(i))}</span></div>
            <div class="meta-pct">${valia ? f + '/' + valia : '—'}</div>
          </div>
          <div class="progress alto"><i style="width:${pct * 100}%"></i></div>
        </div>`);
        setAccent(corDe(i), linha);
        b.appendChild(linha);
      });
      scroll.appendChild(b);
    }

    el.appendChild(scroll);
  }, { name: 'rotina' });
}

/* "todo dia", ou os dias em que ele vale, na ordem da semana. */
function diasDoItem(i) {
  if (!i.dias.length) return 'todo dia';
  return i.dias.slice().sort().map((d) => DIAS_ROTINA[d]).join(' · ');
}

/* A hora primeiro, porque é o que ordena a linha; os dias depois. */
function descricaoDoItem(i) {
  const h1 = i.hora ? (i.fim ? i.hora + ' – ' + i.fim : i.hora) : '';
  return [h1, diasDoItem(i)].filter(Boolean).join(' · ');
}

/* Uma linha da rotina. É a mesma peça da tarefa — círculo, texto, kebab — para
   marcar coisa feita ser sempre o mesmo gesto no app inteiro. */
function linhaRotina(i, screen, apagada) {
  const feito = feitoNoDia(i);
  const row = h(`<div class="tarefa${feito ? ' feito' : ''}${apagada ? ' fora' : ''}">
    <button class="check sm${feito ? ' on' : ''}" data-act="ok"${apagada ? ' disabled' : ''}>${icon('check')}</button>
    <div class="tarefa-txt">
      <b>${esc(i.titulo)}</b>
      <span>${esc(descricaoDoItem(i))}</span>
    </div>
    <button class="kebab" data-act="menu">${icon('dots')}</button>
  </div>`);
  setAccent(corDe(i), row);
  acts(row, {
    ok: () => { alternarItemRotina(i.id); haptic(); screen.refresh(); },
    menu: () => menuItemRotina(i, screen),
  });
  if (!apagada) {
    row.addEventListener('click', (e) => {
      if (!e.target.closest('[data-act]')) { alternarItemRotina(i.id); haptic(); screen.refresh(); }
    });
  }
  return row;
}

/* O menu do item. Vive fora da linha porque a grade do cronograma abre o mesmo
   menu: o item é o mesmo, e ter dois jeitos de mexer nele seria ter dois. */
function menuItemRotina(i, screen, ts) {
  const feito = feitoNoDia(i, ts);
  actionSheet(i.titulo, [
    { label: feito ? 'Desmarcar' : 'Marcar como feito', icon: 'check',
      onClick: () => { alternarItemRotina(i.id, ts); haptic(); screen.refresh(); } },
    { label: 'Horário', icon: 'clock', onClick: () => horaDaRotina(i, screen) },
    { label: 'Dias da semana', icon: 'calendario', onClick: () => diasDaRotina(i, screen) },
    { label: 'Renomear', icon: 'pencil', onClick: () => promptSheet('Nome do item', i.titulo, '', (v) => {
      const nome = String(v).trim();
      if (nome) { i.titulo = nome; saveNow(); screen.refresh(); }
    }) },
    { label: 'Apagar', icon: 'trash', danger: true, onClick: () => confirmSheet('Apagar da rotina?',
      esc(i.titulo) + ' sai da lista, e o que já foi cumprido sai com ele.', 'Apagar',
      () => { removerItemRotina(i.id); screen.refresh(); }) },
  ]);
}

/* Início e fim. Limpar os dois devolve o item ao dia inteiro — é a saída de
   quem marcou hora por engano, e ela precisa existir dentro da mesma folha. */
function horaDaRotina(i, screen) {
  const box = h(`<div class="form">
    <h3>Horário</h3>
    <p class="desc">Sem horário, o item vale o dia inteiro e não aparece na grade do cronograma.</p>
    <div class="form-corpo">
      <div class="form-linha">
        <label>Início<input class="text-input" type="time" data-c="hora" value="${esc(i.hora || '')}"/></label>
        <label>Fim<input class="text-input" type="time" data-c="fim" value="${esc(i.fim || '')}"/></label>
      </div>
    </div>
    <div class="sheet-actions">
      <button class="pill-btn grey" data-x="limpar">Sem horário</button>
      <button class="pill-btn" data-x="ok">Pronto</button>
    </div>
  </div>`);
  const r = openSheet(box, { center: true });
  r.sheet.classList.add('com-form');
  setAccent(corDe(i), box);

  const guardar = (hora, fim) => {
    i.hora = hora;
    i.fim = fim;
    saveNow();
    r.close();
    setTimeout(() => screen.refresh(), 120);
  };
  box.querySelector('[data-x="limpar"]').addEventListener('click', () => guardar('', ''));
  box.querySelector('[data-x="ok"]').addEventListener('click', () => guardar(
    box.querySelector('[data-c="hora"]').value || '',
    box.querySelector('[data-c="fim"]').value || ''));
}

/* Os sete dias como chips. Nenhum marcado quer dizer todo dia — e a folha diz
   isso, em vez de deixar a lista vazia parecer um item quebrado. */
function diasDaRotina(i, screen) {
  const box = h(`<div>
    <h3>Dias da semana</h3>
    <p class="desc">Sem nenhum dia marcado, ele vale todo dia.</p>
    <div class="chips dias-chips">
      ${DIAS_ROTINA.map((d, n) => `<button class="chip${i.dias.indexOf(n) >= 0 ? ' on' : ''}" data-d="${n}">${esc(d)}</button>`).join('')}
    </div>
    <div class="sheet-actions"><button class="pill-btn" data-x="ok">Pronto</button></div>
  </div>`);
  const r = openSheet(box, { center: true });
  setAccent(corDe(i), box);
  on(box, '[data-d]', 'click', (ev) => {
    const n = Number(ev.currentTarget.dataset.d);
    const pos = i.dias.indexOf(n);
    if (pos >= 0) i.dias.splice(pos, 1);
    else i.dias.push(n);
    i.dias.sort();
    saveNow();
    haptic();
    ev.currentTarget.classList.toggle('on', i.dias.indexOf(n) >= 0);
  });
  box.querySelector('[data-x="ok"]').addEventListener('click', () => { r.close(); screen.refresh(); });
}

/* =========================================================
   CADERNOS E ANOTAÇÕES
   ========================================================= */

function telaCadernos() {
  pushScreen((el, screen) => {
    setAccent(contextAccent(), el);
    el.appendChild(navBar('Cadernos'));

    const scroll = h('<div class="scroll"></div>');
    const n = contaNotas();
    scroll.appendChild(h(secaoSub('Cadernos', 'Anotações',
      n ? n + (n > 1 ? ' anotações guardadas' : ' anotação guardada') : 'Nada anotado ainda')));

    scroll.appendChild(formBloco('Novo caderno', [
      { id: 'nome', label: 'Nome', placeholder: 'Claude Code, AWS, receitas...', cresce: true },
    ], 'Criar', (v) => {
      const nome = String(v.nome).trim();
      if (!nome) { toast('Dê um nome ao caderno'); return false; }
      novoCaderno(nome);
      haptic();
      setTimeout(() => screen.refresh(), 60);
      return true;
    }));

    const bloco = h('<div class="bloco"><div class="bloco-rot">Seus cadernos</div></div>');
    if (!S.cadernos.length) {
      bloco.appendChild(h('<div class="vazio-tracejado">Um caderno guarda texto que não é tarefa nem meta: o resumo de uma aula, o passo a passo de um comando.</div>'));
    } else {
      bloco.appendChild(estanteDeCadernos(cadernosRecentes(), screen));
    }
    scroll.appendChild(bloco);

    el.appendChild(scroll);
  }, { name: 'cadernos' });
}

/* A mesma grade serve à tela do módulo e ao painel do Início: capa com o ícone
   no alto à direita, nome embaixo e a contagem de anotações. */
function estanteDeCadernos(lista, screen, aoAbrir) {
  const g = h('<div class="cadernos"></div>');
  lista.forEach((c) => {
    const b = h(`<button class="caderno">
      <span class="caderno-ico">${iconO('caderno')}</span>
      <span class="caderno-txt">
        <b>${esc(c.nome)}</b>
        <i>${c.notas.length} ${c.notas.length === 1 ? 'anotação' : 'anotações'}</i>
      </span>
    </button>`);
    setAccent(corDe(c), b);
    b.addEventListener('click', () => { haptic(); (aoAbrir || telaCaderno)(c.id); });
    g.appendChild(b);
  });
  return g;
}

function telaCaderno(id) {
  pushScreen((el, screen) => {
    const c = getCaderno(id);
    if (!c) { popScreen(); return; }
    setAccent(corDe(c), el);

    el.appendChild(navBar(c.nome, {
      icone: 'dots',
      aoTocar: () => actionSheet(c.nome, [
        { label: 'Renomear', icon: 'pencil', onClick: () => promptSheet('Nome do caderno', c.nome, '', (v) => {
          const nome = String(v).trim();
          if (nome) { c.nome = nome; saveNow(); screen.refresh(); }
        }) },
        { label: 'Trocar a cor', icon: 'text', onClick: () => corDoCaderno(c, screen) },
        { label: 'Apagar caderno', icon: 'trash', danger: true, onClick: () => confirmSheet('Apagar caderno?',
          c.notas.length + ' anotação(ões) somem junto.', 'Apagar',
          () => { removerCaderno(id); popScreen(); }) },
      ]),
    }));

    const scroll = h('<div class="scroll"></div>');
    scroll.appendChild(formBloco('Nova anotação', [
      { id: 'titulo', label: 'Título', placeholder: 'Do que se trata', cresce: true },
    ], 'Anotar', (v) => {
      const titulo = String(v.titulo).trim();
      if (!titulo) { toast('Dê um título'); return false; }
      const n = novaNota(id, titulo, '');
      haptic();
      setTimeout(() => { screen.refresh(); editorNota(id, n.id, screen); }, 80);
      return true;
    }));

    const bloco = h('<div class="bloco"><div class="bloco-rot">Anotações</div></div>');
    if (!c.notas.length) {
      bloco.appendChild(h('<div class="vazio-tracejado">Caderno vazio.</div>'));
    } else {
      c.notas.forEach((n) => {
        const primeira = String(n.texto || '').split('\n').find((x) => x.trim()) || 'sem texto ainda';
        const row = h(`<div class="tarefa">
          <div class="tarefa-txt">
            <b>${esc(n.titulo)}</b>
            <span>${esc(fmtDate(n.editada) + ' · ' + primeira)}</span>
          </div>
          <button class="kebab" data-act="menu">${icon('dots')}</button>
        </div>`);
        setAccent(corDe(c), row);
        acts(row, {
          menu: () => actionSheet(n.titulo, [
            { label: 'Apagar anotação', icon: 'trash', danger: true,
              onClick: () => { removerNota(id, n.id); screen.refresh(); } },
          ]),
        });
        row.addEventListener('click', (e) => {
          if (!e.target.closest('[data-act]')) editorNota(id, n.id, screen);
        });
        bloco.appendChild(row);
      });
    }
    scroll.appendChild(bloco);
    el.appendChild(scroll);
  }, { name: 'caderno' });
}

function corDoCaderno(c, screen) {
  const box = h('<div><h3>Cor do caderno</h3><div class="lugar-cor"></div>'
    + '<div class="sheet-actions"><button class="pill-btn" data-x="ok">Pronto</button></div></div>');
  const r = openSheet(box, { center: true });
  setAccent(corDe(c), box);
  box.querySelector('.lugar-cor').replaceWith(campoCor(corDe(c), (nova) => {
    c.cor = nova; saveNow(); setAccent(nova, box);
  }));
  box.querySelector('[data-x="ok"]').addEventListener('click', () => { r.close(); screen.refresh(); });
}

/* O editor é uma tela e não uma folha: anotação é texto longo, e folha com
   teclado aberto deixa três linhas visíveis. */
function editorNota(cadernoId, notaId, pai) {
  pushScreen((el, screen) => {
    const c = getCaderno(cadernoId);
    const n = c && c.notas.find((x) => x.id === notaId);
    if (!n) { popScreen(); return; }
    setAccent(corDe(c), el);

    const nav = h(`<div class="nav">
      <button class="icon-btn stroke" data-act="back">${icon('back')}</button>
      <div class="title">${esc(c.nome)}</div>
      <div style="width:44px"></div>
    </div>`);
    acts(nav, { back: () => { guardar(); popScreen(); setTimeout(() => pai && pai.refresh(), 120); } });
    el.appendChild(nav);

    const scroll = h(`<div class="scroll">
      <div class="nota">
        <input class="nota-titulo" data-c="titulo" value="${esc(n.titulo)}" placeholder="Título"/>
        <textarea class="nota-texto" data-c="texto" placeholder="Escreva aqui.">${esc(n.texto)}</textarea>
      </div>
    </div>`);
    el.appendChild(scroll);

    const campo = (k) => scroll.querySelector(`[data-c="${k}"]`);
    const guardar = () => {
      const titulo = campo('titulo').value.trim();
      salvarNota(cadernoId, notaId, { titulo: titulo || 'Sem título', texto: campo('texto').value });
    };
    /* guarda sozinho enquanto se escreve: sair sem salvar não pode existir
       numa tela cujo único trabalho é guardar texto */
    let espera = null;
    scroll.addEventListener('input', () => {
      clearTimeout(espera);
      espera = setTimeout(guardar, 600);
    });
    setTimeout(() => campo('texto').focus(), 250);
  }, { name: 'nota' });
}

/* =========================================================
   METAS — o cofrinho
   ========================================================= */

const VALORES_RAPIDOS = [50, 100, 200];

function telaMetas() {
  pushScreen((el, screen) => {
    setAccent(corMarca(), el);
    el.appendChild(navBar('Metas'));

    const scroll = h('<div class="scroll"></div>');
    const guardado = totalGuardado();
    const alvo = totalDasMetas();

    scroll.appendChild(h(secaoSub('Metas', 'Cofrinhos',
      alvo ? fmtBRL(guardado) + ' guardados de ' + fmtBRL(alvo) : 'Separe dinheiro por objetivo')));

    scroll.appendChild(formBloco('Nova meta', [
      { id: 'nome', label: 'Objetivo', placeholder: 'Viagem, notebook...', cresce: true },
      { id: 'alvo', label: 'Quanto juntar', tipo: 'number', modo: 'decimal', passo: '0.01', placeholder: '0,00' },
    ], 'Adicionar', (v) => {
      const nome = String(v.nome).trim();
      if (!nome) { toast('Dê um nome à meta'); return false; }
      novaMeta(nome, Number(String(v.alvo).replace(',', '.')) || 0);
      haptic();
      setTimeout(() => screen.refresh(), 60);
      return true;
    }));

    scroll.appendChild(h(`<div class="bloco">
      <div class="bloco-rot">Total guardado</div>
      <div class="meta-linha">${fmtBRL(guardado)}${alvo ? ' de ' + fmtBRL(alvo) : ''}</div>
      <div class="progress mini"><i style="width:${alvo ? Math.min(100, (guardado / alvo) * 100) : 0}%"></i></div>
    </div>`));

    if (!S.metas.length) {
      scroll.appendChild(h('<div class="vazio-tracejado">Nenhuma meta ainda.</div>'));
    }

    S.metas.forEach((m) => {
      const g = metaGuardado(m);
      const card = h(`<div class="meta-card${metaBatida(m) ? ' batida' : ''}">
        <div class="meta-head">
          <div class="meta-txt">
            <b>${esc(m.nome)}</b>
            <span>${fmtBRL(g)} de ${fmtBRL(m.alvo)}</span>
          </div>
          <div class="meta-pct">${Math.round(metaPct(m) * 100)}%</div>
        </div>
        <div class="progress"><i style="width:${metaPct(m) * 100}%"></i></div>
        <div class="meta-foot">${metaBatida(m) ? 'Meta batida' : 'Faltam ' + fmtBRL(metaFalta(m))}</div>
      </div>`);
      setAccent(corDe(m), card);        // cada cofrinho pode ter a sua cor
      card.addEventListener('click', () => telaMeta(m.id));
      scroll.appendChild(card);
    });

    el.appendChild(scroll);
  }, { name: 'metas' });
}

function telaMeta(id) {
  pushScreen((el, screen) => {
    const m = getMeta(id);
    if (!m) { popScreen(); return; }
    setAccent(corDe(m), el);

    el.appendChild(navBar(m.nome, {
      icone: 'dots',
      aoTocar: () => actionSheet(m.nome, [
        { label: 'Editar meta', icon: 'pencil', onClick: () => editorMeta(m, screen) },
        { label: 'Apagar meta', icon: 'trash', danger: true, onClick: () => confirmSheet('Apagar meta?', 'O extrato dela também some.', 'Apagar', () => { removerMeta(id); popScreen(); }) },
      ]),
    }));

    const scroll = h('<div class="scroll"></div>');
    const g = metaGuardado(m);
    const pct = metaPct(m);
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
          <b style="font-size:30px">${fmtBRL(g)}</b>
          <span>de ${fmtBRL(m.alvo)}</span>
        </div>
      </div>
      <div class="agua-falta">${metaBatida(m) ? 'Meta batida' : 'Faltam ' + fmtBRL(metaFalta(m))}</div>
    </div>`));

    const botoes = h('<div class="agua-copos"></div>');
    VALORES_RAPIDOS.forEach((v) => {
      const b = h(`<button class="agua-copo"><b>+${v}</b><span>reais</span></button>`);
      b.addEventListener('click', () => { guardarNaMeta(id, v); haptic(); screen.refresh(); });
      botoes.appendChild(b);
    });
    scroll.appendChild(botoes);

    const extras = h(`<div class="agua-extras">
      <button data-act="outro">Guardar outro valor</button>
      <button data-act="tirar" ${g ? '' : 'disabled'}>Retirar</button>
    </div>`);
    acts(extras, {
      outro: () => promptSheet('Quanto guardar (R$)', '', '150', (v) => {
        guardarNaMeta(id, Number(String(v).replace(',', '.')));
        screen.refresh();
      }),
      tirar: () => promptSheet('Quanto retirar (R$)', '', '100', (v) => {
        guardarNaMeta(id, -Math.abs(Number(String(v).replace(',', '.'))), 'retirada');
        screen.refresh();
      }),
    });
    scroll.appendChild(extras);

    scroll.appendChild(h('<div class="section-title">Extrato</div>'));
    if (!m.depositos.length) {
      scroll.appendChild(h('<div class="hint">Nada guardado ainda.</div>'));
    }
    m.depositos.forEach((d) => {
      const row = h(`<div class="ex-item">
        <div class="name">${d.valor < 0 ? 'Retirada' : 'Guardado'}
          <span style="display:block;color:var(--txt-3)">${esc(fmtDate(d.data))}${d.nota ? ' · ' + esc(d.nota) : ''}</span>
        </div>
        <div style="font-weight:700;color:${d.valor < 0 ? 'var(--txt-2)' : 'var(--accent)'}">${d.valor < 0 ? '−' : '+'}${fmtBRL(Math.abs(d.valor))}</div>
        <button class="kebab" data-act="menu">${icon('dots')}</button>
      </div>`);
      acts(row, {
        menu: () => actionSheet(fmtBRL(d.valor), [
          { label: 'Apagar lançamento', icon: 'trash', danger: true, onClick: () => { removerDeposito(id, d.id); screen.refresh(); } },
        ]),
      });
      scroll.appendChild(row);
    });

    el.appendChild(scroll);
  }, { name: 'meta' });
}

function editorMeta(meta, screen) {
  const m = meta || { nome: '', alvo: 0, cor: corLivre(S.metas) };
  let cor = m.cor;

  const box = h(`<div class="form">
    <h3>${meta ? 'Editar meta' : 'Nova meta'}</h3>
    <div class="form-corpo">
    <input class="text-input" data-c="nome" placeholder="Ex.: viagem, notebook" value="${esc(m.nome)}"/>
    <input class="text-input" data-c="alvo" inputmode="decimal" placeholder="Quanto quer juntar (R$)" value="${m.alvo || ''}"/>
    <div class="lugar-cor"></div>
    </div>
    <div class="sheet-actions">
      <button class="pill-btn grey" data-x="no">Cancelar</button>
      <button class="pill-btn" data-x="yes">Salvar</button>
    </div>
  </div>`);
  const r = openSheet(box, { center: true });
  r.sheet.classList.add('com-form');
  const campo = (n) => box.querySelector(`[data-c="${n}"]`);
  setAccent(cor, box);

  box.querySelector('.lugar-cor').replaceWith(campoCor(cor, (nova) => {
    cor = nova;
    setAccent(cor, box);
  }));
  box.querySelector('[data-x="no"]').addEventListener('click', r.close);
  box.querySelector('[data-x="yes"]').addEventListener('click', () => {
    const nome = campo('nome').value.trim();
    const alvo = Math.max(0, Number(String(campo('alvo').value).replace(',', '.')) || 0);
    if (!nome) { toast('Dê um nome para a meta'); return; }
    if (meta) { meta.nome = nome; meta.alvo = alvo; meta.cor = cor; saveNow(); }
    else novaMeta(nome, alvo, cor);
    r.close();
    setTimeout(() => screen.refresh(), 120);
  });
  setTimeout(() => { if (!meta) campo('nome').focus(); }, 250);
}

/* =========================================================
   ESTUDOS
   ========================================================= */

const MINUTOS_RAPIDOS = [25, 50, 90];

function telaEstudos() {
  pushScreen((el, screen) => {
    setAccent(corMarca(), el);
    el.appendChild(navBar('Estudos'));

    const scroll = h('<div class="scroll"></div>');
    const semana = estudoDaSemana();
    const meta = metaEstudoSemana();

    const total = S.materias.reduce((a, m) => a + minutosTotais(m), 0);
    scroll.appendChild(h(secaoSub('Estudos', 'Matérias',
      total ? fmtMin(total) + ' estudadas no total' : 'Nada estudado ainda')));

    /* O relógio vem primeiro porque é o que se usa todo dia; cadastrar matéria
       acontece uma vez. Ele é o mesmo cartão do Início e divide o mesmo
       relógio: começar aqui e conferir lá mostra o mesmo tempo. */
    scroll.appendChild(cartaoCronometro(screen, { semLink: true }));

    scroll.appendChild(h(`<div class="bloco">
      <div class="bloco-rot">Nesta semana</div>
      <div class="meta-linha">${fmtMin(semana)}${meta ? ' de ' + fmtMin(meta) : ''}</div>
      <div class="progress mini"><i style="width:${meta ? Math.min(100, (semana / meta) * 100) : 0}%"></i></div>
    </div>`));

    scroll.appendChild(formBloco('Nova matéria', [
      { id: 'nome', label: 'Nome', placeholder: 'Cálculo, Inglês...', cresce: true },
    ], 'Adicionar', (v) => {
      const nome = String(v.nome).trim();
      if (!nome) { toast('Dê um nome à matéria'); return false; }
      novaMateria(nome);
      haptic();
      setTimeout(() => screen.refresh(), 60);
      return true;
    }));

    /* Barras dos últimos 14 dias. Cada uma leva a cor da matéria que mais
       rendeu naquele dia — o gráfico junta matérias e não teria cor própria. */
    const dias = estudoPorDia(14);
    const teto = Math.max(30, ...dias.map((d) => d.min));
    if (dias.some((d) => d.min)) {
      scroll.appendChild(h(secao('Ritmo', 'Últimos 14 dias')));
      const barras = h('<div class="dias-barras"></div>');
      dias.forEach((d, i) => {
        /* piso de 8%: um dia de 10 minutos virava um risco invisível, e o que
           importa no gráfico é ver que houve estudo, não medir no milímetro */
        const alt = d.min ? Math.max(8, (d.min / teto) * 100) : 0;
        const bar = h(`<div class="dias-col${d.min ? ' tem' : ''}" title="${fmtMin(d.min)}">
          <div class="dias-barra"><i style="height:${alt}%;background:${d.cor}"></i></div>
          <div class="dias-rotulo">${i === dias.length - 1 ? 'hoje' : DIAS_CURTO[new Date(d.ts).getDay()].charAt(0)}</div>
        </div>`);
        barras.appendChild(bar);
      });
      scroll.appendChild(barras);
    }

    if (!S.materias.length) {
      scroll.appendChild(h('<div class="vazio-tracejado">Nenhuma matéria ainda.</div>'));
    }

    S.materias.forEach((m) => {
      const min = minutosNaSemana(m);
      const prog = progressoMateria(m);
      /* o numero e a barra tem de contar a mesma coisa: com meta semanal, o
         que importa e o tempo; sem meta, sobra o avanco nos topicos */
      const pctBarra = m.metaSemanal ? Math.min(1, min / m.metaSemanal) : prog;
      /* A cor da matéria estava só num contorno de 1px e num número pequeno.
         Agora ela ocupa um selo cheio com a inicial e a barra inteira, que é o
         que faz dar para achar a matéria certa sem ler nome por nome. */
      const card = h(`<div class="mat-card">
        <div class="meta-head">
          <div class="mat-ico">${esc(m.nome.trim().charAt(0).toUpperCase())}</div>
          <div class="meta-txt">
            <b>${esc(m.nome)}</b>
            <span>${m.topicos.length ? topicosFeitos(m) + ' de ' + m.topicos.length + ' tópicos' : 'sem tópicos'} · ${fmtMin(min)} nesta semana</span>
          </div>
          <div class="meta-pct">${Math.round(pctBarra * 100)}%</div>
        </div>
        <div class="progress alto"><i style="width:${pctBarra * 100}%"></i></div>
        <div class="meta-foot">${m.metaSemanal ? 'Meta de ' + fmtMin(m.metaSemanal) + ' por semana' : 'Sem meta semanal'}</div>
      </div>`);
      setAccent(corDe(m), card);
      card.addEventListener('click', () => telaMateria(m.id));
      scroll.appendChild(card);
    });

    el.appendChild(scroll);
  }, { name: 'estudos' });
}

function telaMateria(id) {
  pushScreen((el, screen) => {
    const m = getMateria(id);
    if (!m) { popScreen(); return; }
    setAccent(corDe(m), el);

    el.appendChild(navBar(m.nome, {
      icone: 'dots',
      aoTocar: () => actionSheet(m.nome, [
        { label: 'Editar matéria', icon: 'pencil', onClick: () => editorMateria(m, screen) },
        { label: 'Apagar matéria', icon: 'trash', danger: true, onClick: () => confirmSheet('Apagar matéria?', 'Tópicos e horas registradas somem junto.', 'Apagar', () => { removerMateria(id); popScreen(); }) },
      ]),
    }));

    const scroll = h('<div class="scroll"></div>');
    const min = minutosNaSemana(m);

    /* dentro da matéria, a cor dela toma a tela: é o mesmo herói das outras
       telas, e some a dúvida de qual matéria está aberta */
    scroll.appendChild(h(heroi({
      sobrancelha: 'Nesta semana',
      titulo: fmtMin(min),
      classe: 'compacto',
      numero: m.metaSemanal ? 'de ' + fmtMin(m.metaSemanal) + ' de meta' : 'Sem meta semanal',
      nota: 'Total acumulado: ' + fmtMin(minutosTotais(m)),
    })));

    /* Aqui o relógio já sai carimbado com a matéria: encerrar registra nela sem
       perguntar. Os botões de tempo redondo continuam para quem estudou com o
       app fechado e só quer lançar o que já passou. */
    scroll.appendChild(cartaoCronometro(screen, { materiaId: id, semLink: true }));

    const botoes = h('<div class="agua-copos"></div>');
    MINUTOS_RAPIDOS.forEach((v) => {
      const b = h(`<button class="agua-copo"><b>+${v}</b><span>min</span></button>`);
      b.addEventListener('click', () => { registrarEstudo(id, v); haptic(); screen.refresh(); });
      botoes.appendChild(b);
    });
    scroll.appendChild(botoes);

    const extras = h(`<div class="agua-extras">
      <button data-act="outro">Outro tempo</button>
      <button data-act="topico">Novo tópico</button>
    </div>`);
    acts(extras, {
      outro: () => promptSheet('Minutos estudados', '', '40', (v) => {
        registrarEstudo(id, Number(v));
        screen.refresh();
      }),
      topico: () => promptSheet('Novo tópico', '', 'Ex.: capítulo 3', (v) => {
        const nome = String(v).trim();
        if (nome) addTopico(id, nome);
        screen.refresh();
      }),
    });
    scroll.appendChild(extras);

    /* ---------- tópicos ---------- */
    scroll.appendChild(h(`<div class="section-title">Tópicos${m.topicos.length ? ' · ' + topicosFeitos(m) + '/' + m.topicos.length : ''}</div>`));
    if (!m.topicos.length) {
      scroll.appendChild(h('<div class="hint">Quebre a matéria em tópicos para ver o quanto já venceu.</div>'));
    }
    m.topicos.forEach((t) => {
      const row = h(`<div class="tarefa${t.feito ? ' feito' : ''}">
        <button class="check sm${t.feito ? ' on' : ''}" data-act="ok">${icon('check')}</button>
        <div class="tarefa-txt"><b>${esc(t.nome)}</b></div>
        <button class="kebab" data-act="menu">${icon('dots')}</button>
      </div>`);
      acts(row, {
        ok: () => { alternarTopico(id, t.id); haptic(); screen.refresh(); },
        menu: () => actionSheet(t.nome, [
          { label: 'Apagar tópico', icon: 'trash', danger: true, onClick: () => { removerTopico(id, t.id); screen.refresh(); } },
        ]),
      });
      scroll.appendChild(row);
    });

    /* ---------- horas registradas ---------- */
    if (m.sessoes.length) {
      scroll.appendChild(h('<div class="section-title">Horas registradas</div>'));
      m.sessoes.slice(0, 20).forEach((s) => {
        const row = h(`<div class="ex-item">
          <div class="name">${esc(fmtDate(s.data))}${s.nota ? ' · ' + esc(s.nota) : ''}</div>
          <div style="font-weight:700;color:var(--accent)">${fmtMin(s.min)}</div>
          <button class="kebab" data-act="menu">${icon('dots')}</button>
        </div>`);
        acts(row, {
          menu: () => actionSheet(fmtMin(s.min), [
            { label: 'Apagar registro', icon: 'trash', danger: true, onClick: () => { removerSessaoEstudo(id, s.id); screen.refresh(); } },
          ]),
        });
        scroll.appendChild(row);
      });
    }

    el.appendChild(scroll);
  }, { name: 'materia' });
}

function editorMateria(materia, screen) {
  const m = materia || { nome: '', cor: corLivre(S.materias), metaSemanal: 120 };
  let cor = m.cor;

  const box = h(`<div class="form">
    <h3>${materia ? 'Editar matéria' : 'Nova matéria'}</h3>
    <div class="form-corpo">
    <input class="text-input" data-c="nome" placeholder="Ex.: cálculo, inglês" value="${esc(m.nome)}"/>
    <input class="text-input" data-c="meta" inputmode="numeric" placeholder="Minutos por semana" value="${m.metaSemanal || ''}"/>
    <div class="lugar-cor"></div>
    </div>
    <div class="sheet-actions">
      <button class="pill-btn grey" data-x="no">Cancelar</button>
      <button class="pill-btn" data-x="yes">Salvar</button>
    </div>
  </div>`);
  const r = openSheet(box, { center: true });
  r.sheet.classList.add('com-form');
  const campo = (n) => box.querySelector(`[data-c="${n}"]`);
  setAccent(cor, box);

  box.querySelector('.lugar-cor').replaceWith(campoCor(cor, (nova) => {
    cor = nova;
    setAccent(cor, box);
  }));
  box.querySelector('[data-x="no"]').addEventListener('click', r.close);
  box.querySelector('[data-x="yes"]').addEventListener('click', () => {
    const nome = campo('nome').value.trim();
    const meta = Math.max(0, Math.round(Number(campo('meta').value) || 0));
    if (!nome) { toast('Dê um nome para a matéria'); return; }
    if (materia) { materia.nome = nome; materia.cor = cor; materia.metaSemanal = meta; saveNow(); }
    else novaMateria(nome, cor, meta);
    r.close();
    setTimeout(() => screen.refresh(), 120);
  });
  setTimeout(() => { if (!materia) campo('nome').focus(); }, 250);
}

/* =========================================================
   JOGOS — a estante

   O jogo se reconhece pela capa antes do nome, então a capa é o item e o
   estado é um selo por cima dela. A capa entra do rolo de fotos e é
   comprimida na hora: o localStorage é pequeno, e uma foto crua de câmera
   estoura o limite sozinha.
   ========================================================= */

let FILTRO_JOGOS = '';   // '' = a estante inteira

function telaJogos() {
  pushScreen((el, screen) => {
    setAccent(corMarca(), el);
    el.appendChild(navBar('Jogos'));

    const scroll = h('<div class="scroll"></div>');
    const total = S.jogos.length;
    const jogando = contaJogos('jogando');
    const zerados = contaJogos('zerado');

    scroll.appendChild(h(secaoSub('Jogos', 'Estante',
      total ? jogando + ' jogando · ' + zerados + ' zerados de ' + total : 'O que você joga e o que falta')));

    /* Título e plataforma bastam para o jogo existir; a capa entra no editor
       completo, que abre no toque sobre ele. */
    scroll.appendChild(formBloco('Adicionar jogo', [
      { id: 'nome', label: 'Título', cresce: true },
      { id: 'plat', label: 'Plataforma', placeholder: 'PC, PS5, Switch...' },
    ], 'Adicionar', (v) => {
      const nome = String(v.nome).trim();
      if (!nome) { toast('Dê um nome ao jogo'); return false; }
      novoJogo({ nome, plataforma: String(v.plat).trim() });
      haptic();
      setTimeout(() => screen.refresh(), 60);
      return true;
    }));

    if (total) {
      const chips = h(`<div class="chips" style="padding:2px 16px 10px">
        <button class="chip${FILTRO_JOGOS ? '' : ' on'}" data-f="">Todos · ${total}</button>
        ${ESTADOS_JOGO.map((e) => {
          const n = contaJogos(e.id);
          return n ? `<button class="chip${FILTRO_JOGOS === e.id ? ' on' : ''}" data-f="${e.id}">${esc(e.nome)} · ${n}</button>` : '';
        }).join('')}
      </div>`);
      on(chips, '[data-f]', 'click', (ev) => {
        FILTRO_JOGOS = ev.currentTarget.dataset.f;
        haptic(); screen.refresh();
      });
      scroll.appendChild(chips);
    }

    const lista = jogosPorEstado(FILTRO_JOGOS);
    const bloco = h('<div class="bloco"><div class="bloco-rot">Sua lista</div></div>');
    if (!lista.length) {
      bloco.appendChild(h(`<div class="vazio-tracejado">${total
        ? 'Nenhum jogo neste estado. Toque em Todos para ver a estante inteira.'
        : 'Estante vazia.'}</div>`));
    } else {
      const grade = h('<div class="estante"></div>');
      lista.forEach((j) => grade.appendChild(capaDoJogo(j, screen)));
      bloco.appendChild(grade);
    }
    scroll.appendChild(bloco);

    el.appendChild(scroll);
  }, { name: 'jogos' });
}

/* Um item da estante: a capa, um selo de estado e o nome embaixo. Sem capa,
   as iniciais preenchem o lugar dela — o buraco cinza é pior que a inicial. */
function capaDoJogo(j, screen) {
  const info = infoEstado(j.estado);
  const cel = h(`<button class="jogo estado-${esc(j.estado)}">
    <div class="jogo-capa">
      ${j.capa
        ? `<img src="${esc(j.capa)}" alt="" loading="lazy"/>`
        : `<span class="jogo-iniciais">${esc(iniciaisDe(j.nome))}</span>`}
      <span class="jogo-selo">${esc(info.curto)}</span>
    </div>
    <div class="jogo-nome">${esc(j.nome)}</div>
    ${j.plataforma ? `<div class="jogo-plat">${esc(j.plataforma)}</div>` : ''}
  </button>`);
  cel.addEventListener('click', () => menuDoJogo(j, screen, cel));
  return cel;
}

const iniciaisDe = (nome) => String(nome || '?')
  .split(/\s+/).filter(Boolean).slice(0, 2)
  .map((p) => p.charAt(0).toUpperCase()).join('');

/* Tocar num jogo abre o que se faz com ele: mudar o estado é o gesto do dia a
   dia, então vem primeiro, e editar e apagar ficam no fim. */
function menuDoJogo(j, screen, ancora) {
  const itens = ESTADOS_JOGO.map((e) => ({
    label: e.nome, on: j.estado === e.id,
    icone: e.id === 'zerado' ? 'check' : (e.id === 'jogando' ? 'haltere' : 'lista'),
    onClick: () => { definirEstadoJogo(j.id, e.id); haptic(); screen.refresh(); },
  }));
  itens.push({ label: 'Editar', icone: 'lapis', onClick: () => editorJogo(j, screen) });
  itens.push({
    label: 'Tirar da estante',
    icone: 'fechar',
    onClick: () => confirmSheet('Tirar da estante?', esc(j.nome), 'Tirar', () => {
      removerJogo(j.id); screen.refresh();
    }),
  });
  menuSuspenso(itens, { ancora });
}

/* A capa vai para o localStorage como data URL, então precisa caber lá. 360px
   de largura em WebP a 0.72 dá cerca de 25 KB — uma estante inteira cabe no
   mesmo espaço que uma única foto de câmera crua ocuparia. */
const CAPA_LARGURA = 360;

function comprimirCapa(file, aoPronto, aoFalhar) {
  const leitor = new FileReader();
  leitor.onerror = () => aoFalhar('Não consegui ler o arquivo');
  leitor.onload = () => {
    const img = new Image();
    img.onerror = () => aoFalhar('Isso não parece uma imagem');
    img.onload = () => {
      const escala = Math.min(1, CAPA_LARGURA / img.width);
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * escala);
      c.height = Math.round(img.height * escala);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      /* WebP quando o navegador sabe; o iOS sabe desde o Safari 14 */
      let url = c.toDataURL('image/webp', 0.72);
      if (url.indexOf('data:image/webp') !== 0) url = c.toDataURL('image/jpeg', 0.72);
      aoPronto(url);
    };
    img.src = leitor.result;
  };
  leitor.readAsDataURL(file);
}

function editorJogo(jogo, screen) {
  const j = jogo || { nome: '', capa: '', estado: 'fila', plataforma: '', nota: '' };
  let capa = j.capa;
  let estado = j.estado;

  const box = h(`<div class="form">
    <h3>${jogo ? 'Editar jogo' : 'Novo jogo'}</h3>
    <div class="form-corpo">
      <div class="capa-escolha">
        <div class="capa-previa"></div>
        <div class="capa-botoes">
          <button class="acao" data-act="foto">${iconO('lista')}Escolher imagem</button>
          <button class="acao" data-act="link">Colar link</button>
          <button class="acao" data-act="tirar">Tirar capa</button>
        </div>
      </div>
      <input class="text-input" data-c="nome" placeholder="Nome do jogo" value="${esc(j.nome)}"/>
      <input class="text-input" data-c="plat" placeholder="Plataforma (opcional)" value="${esc(j.plataforma)}"/>
      <div class="chips" style="padding:0 20px 14px">
        ${ESTADOS_JOGO.map((e) => `<button class="chip" data-e="${e.id}">${esc(e.nome)}</button>`).join('')}
      </div>
      <input class="text-input" data-c="nota" placeholder="Anotação (opcional)" value="${esc(j.nota)}"/>
    </div>
    <div class="sheet-actions">
      <button class="pill-btn grey" data-x="no">Cancelar</button>
      <button class="pill-btn" data-x="yes">Salvar</button>
    </div>
  </div>`);

  const r = openSheet(box, { center: true });
  r.sheet.classList.add('com-form');
  setAccent(corMarca(), box);
  const campo = (n) => box.querySelector(`[data-c="${n}"]`);
  const previa = box.querySelector('.capa-previa');

  const pintarPrevia = () => {
    previa.innerHTML = capa
      ? `<img src="${esc(capa)}" alt=""/>`
      : `<span class="jogo-iniciais">${esc(iniciaisDe(campo('nome').value || '?'))}</span>`;
  };
  const marcarEstado = () => {
    box.querySelectorAll('[data-e]').forEach((b) => b.classList.toggle('on', b.dataset.e === estado));
  };
  pintarPrevia();
  marcarEstado();
  campo('nome').addEventListener('input', () => { if (!capa) pintarPrevia(); });
  on(box, '[data-e]', 'click', (ev) => { estado = ev.currentTarget.dataset.e; marcarEstado(); });

  /* o seletor de arquivo vive fora da folha: o iOS abre a galeria por ele */
  const arquivo = h('<input type="file" accept="image/*" style="display:none"/>');
  box.appendChild(arquivo);
  arquivo.addEventListener('change', () => {
    const f = arquivo.files && arquivo.files[0];
    if (!f) return;
    comprimirCapa(f, (url) => { capa = url; pintarPrevia(); }, (msg) => toast(msg));
    arquivo.value = '';
  });

  acts(box, {
    foto: () => arquivo.click(),
    link: () => promptSheet('Endereço da capa', capa && capa.indexOf('data:') !== 0 ? capa : '',
      'https://...', (v) => {
        const url = String(v).trim();
        if (url) { capa = url; pintarPrevia(); }
      }),
    tirar: () => { capa = ''; pintarPrevia(); },
  });

  box.querySelector('[data-x="no"]').addEventListener('click', r.close);
  box.querySelector('[data-x="yes"]').addEventListener('click', () => {
    const nome = campo('nome').value.trim();
    if (!nome) { toast('Dê um nome ao jogo'); return; }
    const dados = { nome, capa, plataforma: campo('plat').value.trim(), nota: campo('nota').value.trim() };

    try {
      if (jogo) {
        Object.assign(jogo, dados);
        definirEstadoJogo(jogo.id, estado);
      } else {
        const novo = novoJogo(dados);
        definirEstadoJogo(novo.id, estado);
      }
    } catch (err) {
      /* capa grande demais para o armazenamento do navegador */
      toast('Não coube no aparelho. Tente uma capa menor.');
      return;
    }

    r.close();
    setTimeout(() => screen.refresh(), 120);
  });
  setTimeout(() => { if (!jogo) campo('nome').focus(); }, 250);
}

/* =========================================================
   FINANCEIRO

   O mês é a unidade: entradas, saídas e o saldo entre as duas. O lançamento é
   feito num formulário que fica na própria tela, e não numa folha modal — aqui
   se lança várias coisas seguidas, e abrir e fechar uma folha a cada uma seria
   trabalho a mais.
   ========================================================= */

let MES_FIN = Date.now();
let RASCUNHO_FIN = { tipo: 'saida', categoria: 'outros' };

function telaFinanceiro() {
  MES_FIN = Date.now();
  RASCUNHO_FIN = { tipo: 'saida', categoria: 'outros' };
  pushScreen((el, screen) => {
    setAccent(corMarca(), el);
    el.appendChild(navBar('Financeiro', {
      icone: 'dots',
      aoTocar: () => actionSheet('Financeiro', [
        { label: orcamento() ? 'Mudar o teto de gastos' : 'Definir um teto de gastos', icon: 'target',
          onClick: () => promptSheet('Teto de saídas no mês (R$)', String(orcamento() || ''), '2000', (v) => {
            S.settings.orcamento = Math.max(0, Number(String(v).replace(/\./g, '').replace(',', '.')) || 0);
            saveNow(); screen.refresh();
          }) },
        { label: 'Voltar para o mês atual', icon: 'repeat',
          onClick: () => { MES_FIN = Date.now(); screen.refresh(); } },
      ]),
    }));

    const scroll = h('<div class="scroll"></div>');
    scroll.appendChild(h(secaoSub('Financeiro', 'Controle do mês', 'Para onde o seu dinheiro está indo')));

    const ehCorrente = mesKey(MES_FIN) === mesKey(Date.now());
    const topo = h(`<div class="cal-topo mes-troca">
      <button class="icon-btn stroke" data-act="ant">${icon('back')}</button>
      <b>${esc(fmtMesAno(MES_FIN))}</b>
      <button class="icon-btn stroke" data-act="prox" ${ehCorrente ? 'disabled' : ''}>${icon('chev')}</button>
    </div>`);
    acts(topo, {
      ant: () => { const d = new Date(MES_FIN); MES_FIN = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime(); haptic(); screen.refresh(); },
      prox: () => { const d = new Date(MES_FIN); MES_FIN = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime(); haptic(); screen.refresh(); },
    });
    scroll.appendChild(topo);

    /* ---------- entradas, saídas, saldo ---------- */
    const entradas = entradasDoMes(MES_FIN);
    const saidas = saidasDoMes(MES_FIN);
    const saldo = entradas - saidas;
    const stats = h('<div class="stats"></div>');
    [
      /* Aqui a cor não decora: verde e vermelho são o sinal do número, e um
         saldo negativo em branco esconderia justamente o que precisa saltar.
         `sinal` é a exceção declarada à regra de número branco. */
      ['Entradas', fmtBRL(entradas), COR_ENTRADA, '', true],
      ['Saídas', fmtBRL(saidas), COR_SAIDA, orcamento() ? 'de ' + fmtBRL(orcamento()) + ' de teto' : '', false],
      ['Saldo', fmtBRL(saldo), saldo < 0 ? COR_SAIDA : corMarca(), '', true],
    ].forEach(([rot, val, cor, sub, sinal]) => {
      const c = h(`<div class="stat${sinal ? ' sinal' : ''}">
        <div class="stat-rot">${esc(rot)}</div>
        <b>${esc(val)}</b>
        ${sub ? `<span>${esc(sub)}</span>` : ''}
      </div>`);
      setAccent(cor, c);
      stats.appendChild(c);
    });
    scroll.appendChild(stats);

    /* ---------- novo lançamento ---------- */
    scroll.appendChild(formLancamento(screen));

    /* ---------- para onde foi ---------- */
    const porCat = saidaPorCategoria(MES_FIN);
    scroll.appendChild(h(`<div class="bloco"><div class="bloco-rot">Gastos por categoria (mês)</div>${
      porCat.length ? '<div class="cat-lista"></div>' : '<div class="vazio-tracejado">Nenhuma saída registrada neste mês.</div>'
    }</div>`));
    if (porCat.length) {
      const cats = scroll.querySelector('.bloco:last-child .cat-lista');
      porCat.forEach((c) => {
        const linha = h(`<div class="cat-linha">
          <div class="cat-nome"><i></i>${esc(c.cat.nome)}</div>
          <div class="cat-barra"><u style="width:${(c.fatia * 100).toFixed(1)}%"></u></div>
          <div class="cat-valor">${fmtBRL(c.total)}</div>
        </div>`);
        setAccent(c.cat.cor, linha);
        cats.appendChild(linha);
      });
    }

    /* ---------- lançamentos ---------- */
    const lista = lancamentosDoMes(MES_FIN);
    const bloco = h(`<div class="bloco"><div class="bloco-rot">Lançamentos${lista.length ? ' · ' + lista.length : ''}</div></div>`);
    if (!lista.length) {
      bloco.appendChild(h('<div class="vazio-tracejado">Nada lançado ainda.</div>'));
    } else {
      let ultimoDia = '';
      lista.forEach((l) => {
        if (l.data !== ultimoDia) {
          ultimoDia = l.data;
          bloco.appendChild(h(`<div class="gasto-dia">${esc(fmtDataLonga(tsDaData(l.data)))}</div>`));
        }
        bloco.appendChild(linhaLancamento(l, screen));
      });
    }
    scroll.appendChild(bloco);

    el.appendChild(scroll);
  }, { name: 'financeiro' });
}

/* Formulário na própria tela. Guardar o rascunho fora dele deixa a tela ser
   redesenhada sem perder o que estava sendo digitado — e ela é redesenhada a
   cada troca de tipo, porque a lista de categorias muda junto. */
function formLancamento(screen) {
  const r = RASCUNHO_FIN;
  const cats = categoriasDe(r.tipo);
  if (!cats.some((c) => c.id === r.categoria)) r.categoria = cats[cats.length - 1].id;

  const box = h(`<div class="bloco">
    <div class="bloco-rot">Novo lançamento</div>
    <div class="form-linhas">
      <label class="campo cresce">Descrição
        <input class="text-input" data-c="desc" placeholder="Mercado, salário..." value="${esc(r.descricao || '')}"/>
      </label>
      <label class="campo">Valor
        <input class="text-input" type="number" inputmode="decimal" step="0.01" data-c="valor" placeholder="0,00" value="${r.valor || ''}"/>
      </label>
      <label class="campo">Tipo
        <select class="text-input" data-c="tipo">
          <option value="saida"${r.tipo === 'saida' ? ' selected' : ''}>Saída</option>
          <option value="entrada"${r.tipo === 'entrada' ? ' selected' : ''}>Entrada</option>
        </select>
      </label>
      <label class="campo">Categoria
        <select class="text-input" data-c="cat">
          ${cats.map((c) => `<option value="${c.id}"${r.categoria === c.id ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}
        </select>
      </label>
      <label class="campo">Data
        <input class="text-input" type="date" data-c="data" value="${esc(r.data || dayKey(Date.now()))}"/>
      </label>
    </div>
    <button class="pill-btn sm" data-act="lancar">Lançar</button>
  </div>`);

  const campo = (n) => box.querySelector(`[data-c="${n}"]`);
  const guardar = () => {
    RASCUNHO_FIN = {
      descricao: campo('desc').value,
      valor: campo('valor').value,
      tipo: campo('tipo').value,
      categoria: campo('cat').value,
      data: campo('data').value,
    };
  };
  ['desc', 'valor', 'data', 'cat'].forEach((n) => campo(n).addEventListener('input', guardar));

  /* trocar o tipo troca a lista de categorias: salário não é uma saída */
  campo('tipo').addEventListener('change', () => {
    guardar();
    RASCUNHO_FIN.categoria = '';
    screen.refresh();
  });

  acts(box, {
    lancar: () => {
      guardar();
      const valor = Number(String(RASCUNHO_FIN.valor).replace(',', '.')) || 0;
      if (valor <= 0) { toast('Informe o valor'); campo('valor').focus(); return; }
      novoLancamento({
        valor,
        tipo: RASCUNHO_FIN.tipo,
        categoria: RASCUNHO_FIN.categoria,
        descricao: String(RASCUNHO_FIN.descricao || '').trim(),
        data: RASCUNHO_FIN.data,
      });
      /* o mês aberto acompanha o lançamento, senão ele some da tela ao salvar */
      MES_FIN = tsDaData(RASCUNHO_FIN.data || dayKey(Date.now()));
      /* o tipo e a categoria ficam: quem lança mercado costuma lançar de novo */
      RASCUNHO_FIN = { tipo: RASCUNHO_FIN.tipo, categoria: RASCUNHO_FIN.categoria, data: RASCUNHO_FIN.data };
      haptic();
      screen.refresh();
    },
  });
  return box;
}

/* Um lançamento. A faixa da esquerda é a cor da categoria; o valor sai em verde
   quando entra e em vermelho quando sai, com o sinal na frente. */
function linhaLancamento(l, screen) {
  const cat = infoCategoria(l.categoria, l.tipo);
  const row = h(`<div class="gasto ${l.tipo}">
    <div class="gasto-txt">
      <b>${esc(l.descricao || cat.nome)}</b>
      <span>${esc(l.descricao ? cat.nome : (l.tipo === 'entrada' ? 'Entrada' : 'Saída'))}</span>
    </div>
    <div class="gasto-valor">${l.tipo === 'entrada' ? '+' : '−'}${fmtBRL(l.valor)}</div>
    <button class="kebab" data-act="menu">${icon('dots')}</button>
  </div>`);
  setAccent(cat.cor, row);
  acts(row, {
    menu: () => actionSheet(l.descricao || cat.nome, [
      { label: 'Apagar', icon: 'trash', danger: true,
        onClick: () => confirmSheet('Apagar lançamento?', fmtBRL(l.valor) + ' em ' + cat.nome, 'Apagar', () => {
          removerLancamento(l.id); screen.refresh();
        }) },
    ]),
  });
  return row;
}
