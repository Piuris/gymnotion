/* GymNotion — telas */

let TAB = 'treinos';
let REST = null;      // { endsAt, label, tick }
let TICK = null;      // intervalo global de 1s

/* =========================================================
   RAIZ / ABAS
   ========================================================= */

function tabbar() {
  const items = [
    ['inicio', 'home'],
    ['treinos', 'dumbbell'],
    ['nutricao', 'cookie'],
    ['perfil', 'user'],
  ];
  const bar = h('<nav class="tabbar"></nav>');
  items.forEach(([id, ic]) => {
    const b = h(`<button class="tab${TAB === id ? ' on' : ''}">${icon(ic)}</button>`);
    b.addEventListener('click', () => {
      if (TAB === id) return;
      TAB = id; haptic();
      currentScreen().refresh();
    });
    bar.appendChild(b);
  });
  return bar;
}

function buildRoot(el, screen) {
  setAccent(contextAccent());
  el.className = 'screen';
  if (TAB === 'treinos') renderTreinos(el, screen);
  else if (TAB === 'inicio') renderInicio(el, screen);
  else if (TAB === 'perfil') renderPerfil(el, screen);
  else renderEmBreve(el);
  el.appendChild(tabbar());
}

function renderEmBreve(el) {
  el.appendChild(h(`<div class="top-bar"><div style="width:44px"></div><div class="title">Nutrição</div><div style="width:44px"></div></div>`));
  el.appendChild(h(`<div class="scroll"><div class="empty">${icon('clock')}<b>Em breve</b>${esc('Registro de refeições e macros chega numa próxima versão.')}</div></div>`));
}

/* =========================================================
   ABA TREINOS
   ========================================================= */

function renderTreinos(el, screen) {
  const top = h(`<div class="top-bar">
    <div class="streak">${icon('flame')}<span>${streak()}</span></div>
    <div class="title">Treinos</div>
    <button class="burger">${icon('burger')}</button>
  </div>`);
  top.querySelector('.burger').addEventListener('click', () => openWorkoutsSheet());
  el.appendChild(top);

  const scroll = h('<div class="scroll"></div>');

  /* semana */
  const week = h('<div class="week"></div>');
  const now = new Date();
  const sunday = new Date(now); sunday.setDate(now.getDate() - now.getDay());
  const nomes = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday); d.setDate(sunday.getDate() + i);
    const isToday = dayKey(d.getTime()) === dayKey(now.getTime());
    const has = sessionsOn(d.getTime()).length > 0;
    week.appendChild(h(`<div class="day${isToday ? ' today' : ''}${has ? ' has' : ''}">
      <div class="dow">${nomes[i]}</div>
      <div class="num">${d.getDate()}</div>
      <div class="dot"></div>
    </div>`));
  }
  scroll.appendChild(week);

  /* sessão em andamento */
  if (S.active) {
    const a = S.active;
    const card = h(`<button class="card plan-card" style="text-align:left">
      <div class="plan-row">
        <div class="plan-ico">${icon('play')}</div>
        <div class="plan-txt"><b>${esc(a.name)} em andamento</b><span>Toque para continuar</span></div>
        ${icon('chev').replace('<svg', '<svg class="chev"')}
      </div></button>`);
    card.addEventListener('click', () => openWorkout(a.workoutId, 'session'));
    scroll.appendChild(card);
  }

  /* plano da semana */
  const inicioSemana = new Date(sunday); inicioSemana.setHours(0, 0, 0, 0);
  const feitosSemana = S.sessions.filter((s) => s.date >= inicioSemana.getTime()).length;
  const meta = Math.max(S.workouts.length, 1);
  const plan = h(`<button class="card plan-card">
    <div class="plan-row">
      <div class="plan-ico">${icon('dumbbell')}</div>
      <div class="plan-txt"><b>Meus treinos</b><span>${S.workouts.length ? 'Ver todos os treinos montados' : 'Monte seu primeiro treino'}</span></div>
      ${icon('chev').replace('<svg', '<svg class="chev"')}
    </div>
    <div class="progress"><i style="width:${Math.min(100, (feitosSemana / meta) * 100)}%"></i></div>
    <div class="plan-foot"><span>Esta semana</span><span>${feitosSemana}/${meta}</span></div>
  </button>`);
  setAccent(accentPainel(), plan.querySelector('.progress'));
  plan.addEventListener('click', () => openWorkoutsSheet());
  scroll.appendChild(plan);

  /* anéis do dia */
  scroll.appendChild(ringsBlock());

  /* histórico */
  if (!S.sessions.length) {
    /* aparelho novo: o caminho de volta precisa estar à vista, e acima do
       estado vazio para não esbarrar no botão de ação */
    if (cloudConfigurado() && !cloudLogado()) {
      const volta = h(`<button class="pill-btn soft" style="margin:8px 16px 4px;width:calc(100% - 32px)">Já tenho conta — restaurar treinos</button>`);
      volta.addEventListener('click', () => telaLogin(screen));
      scroll.appendChild(volta);
    }
    scroll.appendChild(h(`<div class="empty">${icon('chart')}<b>Nenhum treino registrado</b>Toque no botão para montar um treino e começar a anotar suas cargas.</div>`));
  } else {
    scroll.appendChild(h('<div class="section-title">Registros</div>'));
    S.sessions.slice(0, 40).forEach((s) => scroll.appendChild(sessionCard(s, screen)));
  }

  el.appendChild(scroll);

  const fab = h(`<button class="fab">${icon('dumbbell')}</button>`);
  fab.addEventListener('click', () => { haptic(); openWorkoutsSheet(); });
  el.appendChild(fab);
}

function ringsBlock() {
  const hoje = sessionsOn(Date.now());
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

  const anteriores = dias.filter((k) => k !== dayKey(Date.now()));
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
  setAccent(accentPainel(), box);
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
   ABA INÍCIO (resumo)
   ========================================================= */

function renderInicio(el) {
  el.appendChild(h(`<div class="top-bar"><div style="width:44px"></div><div class="title">Resumo</div><div style="width:44px"></div></div>`));
  const scroll = h('<div class="scroll"></div>');

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
  const chart = h(`<div class="chart-card">${ult.length
    ? sparkline(ult.map((s) => s.volume), { w: 320, h: 170, pad: 18, dots: true })
    : `<div class="chart-empty">${icon('chart')}Sem dados ainda</div>`}</div>`);
  setAccent(accentPainel(), chart);
  scroll.appendChild(chart);

  /* séries por grupo muscular na semana */
  const desde = inicioDaSemana();
  const porGrupo = seriesPorGrupo(desde);
  scroll.appendChild(h('<div class="section-title">Séries por grupo nesta semana</div>'));
  if (!porGrupo.length) {
    scroll.appendChild(h('<div class="hint" style="padding-bottom:12px">Nenhum treino registrado nesta semana ainda.</div>'));
  } else {
    scroll.appendChild(h(`<div class="hint" style="padding-bottom:10px">Só séries válidas. A faixa de ${SERIES_MIN} a ${SERIES_MAX} séries semanais por grupo é a referência mais citada para hipertrofia.</div>`));
    const caixa = h('<div class="grupos"></div>');
    setAccent(accentPainel(), caixa);
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
   ABA PERFIL / AJUSTES
   ========================================================= */

function renderPerfil(el, screen) {
  el.appendChild(h(`<div class="top-bar"><div style="width:44px"></div><div class="title">Perfil</div><div style="width:44px"></div></div>`));
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
      cor: () => pickColor(w, screen),
      icone: () => pickIcon(w, screen),
    });
    el.appendChild(tools);
  }, { name: 'editor' });
}

function pickColor(w, screen) {
  const box = h('<div><h3>Cor do treino</h3><div class="swatches"></div></div>');
  const grid = box.querySelector('.swatches');
  let ov;
  COLORS.forEach((c) => {
    const b = h(`<button class="swatch-btn${w.color === c.hex ? ' on' : ''}"><i style="background:${c.hex}"></i></button>`);
    b.addEventListener('click', () => {
      w.color = c.hex; saveNow(); haptic();
      ov.close(); screen.refresh();
    });
    grid.appendChild(b);
  });
  ov = openSheet(box);
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
    const inSession = MODE === 'session' && S.active && S.active.workoutId === workoutId;
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
          } else {
            toast('Inicie o treino para marcar');
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
    if (REST) el.appendChild(restBar(screen));

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
      cancelSession(); ajustarTravaTela(); popScreen();
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
    ajustarTravaTela();
    cloudEnviarEmSegundoPlano();
    setTimeout(() => {
      popToRoot(); currentScreen().refresh();
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
    const left = (REST.endsAt - Date.now()) / 1000;
    if (left <= 0) {
      REST = null; beep(); haptic();
      toast('Descanso terminado');
      sc.refresh();
    } else {
      const b = sc.el.querySelector('.rest-bar b');
      if (b) b.textContent = fmtClock(left);
      else sc.refresh();
    }
  }
}

function restBar(screen) {
  const bar = h(`<div class="rest-bar">
    <b>${fmtClock(Math.max(0, (REST.endsAt - Date.now()) / 1000))}</b>
    <span>Descanso • ${esc(REST.label)}</span>
    <button data-act="skip">Pular</button>
  </div>`);
  acts(bar, { skip: () => { REST = null; screen.refresh(); } });
  return bar;
}

/* =========================================================
   DETALHE DO EXERCÍCIO (séries)
   ========================================================= */

function openExercise(workoutId, uid, inSession) {
  pushScreen((el, screen) => {
    const w = getWorkout(workoutId);
    const live = inSession && S.active && S.active.workoutId === workoutId;
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

      on(row, 'input[data-f]', 'change', (ev) => {
        const f = ev.target.dataset.f;
        st[f] = Number(String(ev.target.value).replace(',', '.')) || 0;
        save();
      });
      on(row, 'input[data-f]', 'focus', (ev) => ev.target.select());

      acts(row, {
        done: () => {
          st.done = !st.done;
          haptic(); save();
          if (st.done) {
            if (valida) checarRecorde(e, st);
            if (live && st.desc > 0) {
              const parent = stack[stack.length - 2];
              REST = { endsAt: Date.now() + Math.round(st.desc * 60) * 1000, label: e.nome };
              if (parent) parent.refresh();
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
    if (REST) el.appendChild(restBar(screen));
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
    const search = h(`<div class="search">${icon('search')}<input placeholder="Buscar exercício..." value="${esc(query)}"/></div>`);
    const input = search.querySelector('input');
    input.addEventListener('input', () => {
      query = input.value;
      renderList();
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
        on(row, 'input[data-f]', 'focus', (ev) => ev.target.select());
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

function boot() {
  aplicarTema(S.settings.tema);
  ajustarTravaTela();   /* treino retomado depois de fechar o app */
  replaceRoot(buildRoot, 'root');

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
