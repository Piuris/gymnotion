/* GymNotion — cronograma, metas e estudos

   Estes três módulos seguem a mesma regra de cor da academia: a cor identifica
   a coisa, não a tela. Cada tarefa, cada meta e cada matéria carrega a sua, e
   as telas que somam vários itens ficam neutras. */

/* =========================================================
   CRONOGRAMA
   ========================================================= */

let DIA_AGENDA = Date.now();    // dia aberto na lista
let MES_AGENDA = Date.now();    // mês desenhado na grade

const DOW_CURTO = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function renderCronograma(el, screen) {
  setAccent(COR_AGENDA, el);

  const scroll = h('<div class="scroll"></div>');
  const abertas = pendentesDoDia(DIA_AGENDA);
  const doDia = tarefasDoDia(DIA_AGENDA);

  /* O herói responde à única pergunta que se faz abrindo a agenda: o que tem
     para hoje. A cor é a do módulo, porque o dia junta tarefas de cores
     diferentes e nenhuma delas manda sozinha. */
  const atrasadas = tarefasAtrasadas();
  const ehHoje = dayKey(DIA_AGENDA) === dayKey(Date.now());
  scroll.appendChild(h(heroi({
    sobrancelha: (ehHoje ? 'Hoje · ' : '') + fmtDataLonga(DIA_AGENDA),
    titulo: abertas
      ? abertas + (abertas > 1 ? ' tarefas' : ' tarefa')
      : (doDia.length ? 'Tudo feito' : 'Dia livre'),
    numero: doDia.length ? doDia.length + (doDia.length > 1 ? ' marcadas no dia' : ' marcada no dia') : 'Nada marcado',
    nota: atrasadas.length
      ? atrasadas.length + (atrasadas.length > 1 ? ' atrasadas de outros dias' : ' atrasada de outro dia')
      : '',
  })));

  scroll.appendChild(calendarioMes(screen));

  scroll.appendChild(h(secao('Plano do dia', 'Suas tarefas')));
  if (!doDia.length) {
    scroll.appendChild(h('<div class="hint">Nada marcado para este dia.</div>'));
  } else {
    doDia.forEach((t) => scroll.appendChild(linhaTarefa(t, screen)));
  }

  /* ---------- o que ficou para trás ---------- */
  if (atrasadas.length) {
    scroll.appendChild(h(secao('Ficou para trás', 'Atrasadas · ' + atrasadas.length)));
    scroll.appendChild(h('<div class="hint" style="padding-bottom:8px">Abertas em dias que já passaram.</div>'));
    atrasadas.slice(0, 8).forEach((t) => scroll.appendChild(linhaTarefa(t, screen, true)));
  }

  /* ---------- sem dia marcado ---------- */
  const soltas = tarefasSemData();
  if (soltas.length) {
    scroll.appendChild(h(secao('Quando der', 'Sem data')));
    soltas.forEach((t) => scroll.appendChild(linhaTarefa(t, screen)));
  }

  el.appendChild(scroll);

  const fab = h(`<button class="fab">${icon('plus')}</button>`);
  fab.addEventListener('click', () => editorTarefa(null, dayKey(DIA_AGENDA), screen));
  el.appendChild(fab);
}

/* Grade do mês. Cada dia mostra até três pontinhos com a cor das tarefas dele,
   que é o que permite reconhecer um mês cheio sem abrir dia por dia. */
function calendarioMes(screen) {
  const box = h('<div class="cal"></div>');
  const base = new Date(MES_AGENDA);
  const ano = base.getFullYear();
  const mes = base.getMonth();
  const marcas = marcasDoMes(MES_AGENDA);

  const topo = h(`<div class="cal-topo">
    <button class="icon-btn stroke" data-act="ant">${icon('back')}</button>
    <b>${esc(fmtMesAno(MES_AGENDA))}</b>
    <button class="icon-btn stroke" data-act="prox">${icon('chev')}</button>
  </div>`);
  acts(topo, {
    ant: () => { MES_AGENDA = new Date(ano, mes - 1, 1).getTime(); haptic(); screen.refresh(); },
    prox: () => { MES_AGENDA = new Date(ano, mes + 1, 1).getTime(); haptic(); screen.refresh(); },
  });
  box.appendChild(topo);

  const grade = h('<div class="cal-grade"></div>');
  DOW_CURTO.forEach((d) => grade.appendChild(h(`<div class="cal-dow">${d}</div>`)));

  const primeiro = new Date(ano, mes, 1);
  const dias = new Date(ano, mes + 1, 0).getDate();
  for (let i = 0; i < primeiro.getDay(); i++) grade.appendChild(h('<div class="cal-vazio"></div>'));

  for (let d = 1; d <= dias; d++) {
    const ts = new Date(ano, mes, d).getTime();
    const k = dayKey(ts);
    const m = marcas[k];
    const classes = ['cal-dia',
      k === dayKey(DIA_AGENDA) ? 'sel' : '',
      k === dayKey(Date.now()) ? 'hoje' : '',
    ].filter(Boolean).join(' ');
    const cel = h(`<button class="${classes}">
      <span class="n">${d}</span>
      <span class="pontos">${m ? m.cores.map((c) => `<i style="background:${c}"></i>`).join('') : ''}</span>
    </button>`);
    cel.addEventListener('click', () => { DIA_AGENDA = ts; haptic(); screen.refresh(); });
    grade.appendChild(cel);
  }
  box.appendChild(grade);
  return box;
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
        t.hora || '',
        mostrarData && t.data ? fmtDate(tsDaData(t.data)) : '',
        t.nota || '',
      ].filter(Boolean).join(' · ')}</span>
    </div>
    <button class="kebab" data-act="menu">${icon('dots')}</button>
  </div>`);
  setAccent(t.cor, row);
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
function editorTarefa(tarefa, dataPadrao, screen) {
  const t = tarefa || {
    titulo: '', nota: '', data: dataPadrao || dayKey(Date.now()),
    hora: '', tipo: 'tarefa', cor: COR_AGENDA,
  };
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
      <label>Hora<input class="text-input" type="time" data-c="hora" value="${esc(t.hora || '')}"/></label>
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
   METAS — o cofrinho
   ========================================================= */

const VALORES_RAPIDOS = [50, 100, 200];

function telaMetas() {
  pushScreen((el, screen) => {
    setAccent(COR_METAS, el);
    el.appendChild(navBar('Metas'));

    const scroll = h('<div class="scroll"></div>');
    const guardado = totalGuardado();
    const alvo = totalDasMetas();

    /* O herói junta metas de cores diferentes, então fica no tom do módulo. */
    scroll.appendChild(h(heroi({
      sobrancelha: 'Cofrinho',
      titulo: fmtBRL(guardado),
      classe: 'compacto',
      numero: alvo ? 'de ' + fmtBRL(alvo) + ' somados' : 'Nenhuma meta ainda',
      nota: alvo ? Math.round((guardado / alvo) * 100) + '% do total guardado' : '',
    })));

    if (!S.metas.length) {
      scroll.appendChild(h('<div class="hint">Cada meta é um cofrinho: você separa um valor por vez e acompanha o quanto falta. Toque no + para criar a primeira.</div>'));
    } else {
      scroll.appendChild(h(secao('Seus objetivos', 'Metas')));
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
      setAccent(m.cor, card);           // cada cofrinho tem a sua cor
      card.addEventListener('click', () => telaMeta(m.id));
      scroll.appendChild(card);
    });

    el.appendChild(scroll);

    const fab = h(`<button class="fab">${icon('plus')}</button>`);
    fab.addEventListener('click', () => editorMeta(null, screen));
    el.appendChild(fab);
  }, { name: 'metas' });
}

function telaMeta(id) {
  pushScreen((el, screen) => {
    const m = getMeta(id);
    if (!m) { popScreen(); return; }
    setAccent(m.cor, el);

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
    setAccent(COR_ESTUDOS, el);
    el.appendChild(navBar('Estudos'));

    const scroll = h('<div class="scroll"></div>');
    const semana = estudoDaSemana();
    const meta = metaEstudoSemana();

    scroll.appendChild(h(heroi({
      sobrancelha: 'Nesta semana',
      titulo: fmtMin(semana),
      classe: 'compacto',
      numero: meta ? 'de ' + fmtMin(meta) + ' de meta' : 'Sem meta definida',
      nota: meta ? Math.round((semana / meta) * 100) + '% da meta somada' : '',
    })));

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

    scroll.appendChild(h(secao('O que você estuda', 'Matérias')));
    if (!S.materias.length) {
      scroll.appendChild(h('<div class="hint">Uma matéria guarda os tópicos que você precisa vencer e as horas que já colocou nela. Toque no + para criar a primeira.</div>'));
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
      setAccent(m.cor, card);
      card.addEventListener('click', () => telaMateria(m.id));
      scroll.appendChild(card);
    });

    el.appendChild(scroll);

    const fab = h(`<button class="fab">${icon('plus')}</button>`);
    fab.addEventListener('click', () => editorMateria(null, screen));
    el.appendChild(fab);
  }, { name: 'estudos' });
}

function telaMateria(id) {
  pushScreen((el, screen) => {
    const m = getMateria(id);
    if (!m) { popScreen(); return; }
    setAccent(m.cor, el);

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
    setAccent(COR_JOGOS, el);
    el.appendChild(navBar('Jogos'));

    const scroll = h('<div class="scroll"></div>');
    const total = S.jogos.length;
    const jogando = contaJogos('jogando');
    const zerados = contaJogos('zerado');

    scroll.appendChild(h(heroi({
      sobrancelha: 'Biblioteca',
      titulo: total ? total + (total > 1 ? ' jogos' : ' jogo') : 'Estante vazia',
      classe: 'compacto',
      numero: total
        ? jogando + ' jogando · ' + zerados + ' zerados'
        : 'Toque no + para colocar o primeiro',
      nota: total && zerados ? Math.round((zerados / total) * 100) + '% da estante concluída' : '',
    })));

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
    if (!lista.length) {
      scroll.appendChild(h(`<div class="empty">${icon('jogos')}<b>${total ? 'Nada aqui' : 'Estante vazia'}</b>${total
        ? 'Nenhum jogo neste estado. Toque em Todos para ver a estante inteira.'
        : 'Coloque os jogos que você pretende jogar, marque quando começar e quando zerar.'}</div>`));
    } else {
      const grade = h('<div class="estante"></div>');
      lista.forEach((j) => grade.appendChild(capaDoJogo(j, screen)));
      scroll.appendChild(grade);
    }

    el.appendChild(scroll);

    const fab = h(`<button class="fab">${icon('plus')}</button>`);
    fab.addEventListener('click', () => editorJogo(null, screen));
    el.appendChild(fab);
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
  setAccent(COR_JOGOS, box);
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
