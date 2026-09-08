# GymNotion

Assistente pessoal em PWA (web app instalável). Roda no iPhone em tela cheia, sem
App Store, sem conta de desenvolvedor e sem custo. Os dados ficam guardados no
próprio aparelho (`localStorage`) e o app funciona offline.

Começou como caderno de treinos e virou o lugar onde a organização inteira mora.
São seis módulos, cada um com a sua tela:

| Módulo | Para quê |
| --- | --- |
| **Academia** | Treinos, cargas, séries, plano da semana, recordes e análises |
| **Cronograma** | Tarefas e compromissos num calendário de mês |
| **Hidratação** | Meta diária de água |
| **Financeiro** | Entradas, saídas e saldo do mês, por categoria |
| **Jogos** | Estante do que jogar, do que está jogando e do que zerou |
| **Metas** | Cofrinhos: dinheiro separado por objetivo |
| **Estudos** | Matérias com tópicos e horas estudadas |
| **Configurações** | Tema, peso, metas, conta e backup |

No celular a navegação é a cápsula flutuante de baixo; **a partir de 900px de
largura ela vira uma coluna fixa à esquerda**, e o app serve igual no
computador. Ver [Duas navegações, um app](#duas-navegações-um-app).

## A regra da cor

Cada treino tem uma cor. Essa cor vira a variável CSS `--accent` do bloco em que
o treino aparece — e **tudo** que é colorido deriva dela: botões, cronômetro,
marcadores de série, anéis de estatística, gráficos, chips de filtro, FAB e a
faixa da pasta. Um cartão de treino roxo desenha seu próprio gráfico em roxo ao
lado de um cartão verde, na mesma tela.

Onde isso está implementado:

- [ui.js:setAccent](js/ui.js) grava `--accent` e os componentes RGB no elemento.
- [style.css](css/style.css) define `--a10 … --a60` num seletor universal, para
  que cada elemento recalcule os tons a partir do `--accent` que ele herdou.
- `--on-accent` é preto ou branco conforme a luminância da cor, para o texto
  dentro de botões preenchidos continuar legível em amarelo ou verde-limão.

## Como usar no iPhone

O app precisa ser servido por **HTTPS** (ou `localhost`) para instalar e ficar
offline. Duas opções gratuitas:

**GitHub Pages**

```bash
git init && git add . && git commit -m "GymNotion"
git branch -M main
git remote add origin https://github.com/<seu-usuario>/gymnotion.git
git push -u origin main
```

Em *Settings → Pages*, escolha a branch `main` e a pasta `/ (root)`. O endereço
sai como `https://<seu-usuario>.github.io/gymnotion/`.

**Netlify Drop** — arraste a pasta inteira em <https://app.netlify.com/drop>.

Depois, no iPhone: abra o endereço no **Safari** (não funciona pelo Chrome),
toque em *Compartilhar* → **Adicionar à Tela de Início**. O app abre em tela
cheia, com ícone próprio e sem a barra do navegador.

### Teste na rede local

```bash
python -m http.server 8099
```

e acesse `http://<ip-do-pc>:8099` pelo celular. Nesse modo o service worker não
registra (não é HTTPS), mas a interface toda funciona.

## Backup na nuvem (Firebase)

Opcional e desligado por padrão. Sem configurar, o app funciona exatamente como
antes: tudo local, sem conta, sem rede. Com configurado, o estado inteiro vai
para o Firestore ao concluir cada treino, e você recupera tudo entrando com a
mesma conta em outro aparelho.

**Não usa o SDK do Firebase.** O SDK modular pesaria 300–400 KB e exigiria
empacotador ou script de CDN — que quebraria o funcionamento offline. Para
backup, a API REST faz o mesmo com zero dependência: veja [js/cloud.js](js/cloud.js).

O estado é compactado com gzip antes de subir (cerca de 10x menor), porque um
documento do Firestore tem teto de 1 MiB e alguns anos de treino chegariam perto
disso sem compactar.

### Entrar num aparelho novo tem de falar

Entrar com a mesma conta no computador e não ver nada era o comportamento antigo,
e ele mentia por omissão: `ofertaRestaurar()` devolvia calada tanto quando a
leitura falhava quanto quando a conta estava vazia. Como as duas coisas parecem
iguais na tela — nada acontece —, não dava para saber se o problema era a conta,
a rede ou as regras do banco.

Agora ela fala nos três casos: **achou** (pergunta se quer substituir, dizendo
quantos treinos, tarefas e lançamentos deste aparelho serão trocados), **conta
vazia** (avisa que não há backup e manda enviar do aparelho que tem os dados) e
**erro** (mostra o motivo — quase sempre `firestore.rules` ainda não publicado).
O aviso fica na tela até ser lido, e não some sozinho como um `toast`: é
justamente a explicação que diz o que fazer em seguida.

### Enviar sozinho, mas só depois de sincronizar uma vez

Antes só o fim de um treino, a criação da conta e o envio manual subiam dados.
Quem passou a semana anotando tarefa, gasto e jogo ficava sem backup nenhum.
Agora `cloudAutoEnviar()` sobe quando o app é escondido — o momento em que o
estado acabou de parar de mudar — com trava de um minuto entre os envios.

A trava importante, porém, é outra: **ele se recusa a enviar até este aparelho
ter enviado ou restaurado uma vez** (`cloudJaSincronizou()`). Sem isso, entrar
com a conta num computador vazio e trocar de aba subiria o vazio por cima do
backup feito no celular — apagando tudo sem um clique sequer. Restaurar marca a
sincronização; sair da conta desmarca.

### Como ligar

1. Em <https://console.firebase.google.com>, crie um projeto. Pode recusar o
   Google Analytics. O plano **Spark** é gratuito e não pede cartão.
2. **Authentication → Get started → Sign-in method → Email/Password → Ativar.**
   Só esse: login por Google usa popup ou redirecionamento, e os dois se
   comportam mal em PWA no Safari.
3. **Firestore Database → Criar banco de dados** → modo de produção → escolha a
   região (`southamerica-east1` para São Paulo).
4. **Engrenagem → Configurações do projeto → Seus apps → ícone da Web (`</>`)**,
   registre o app e copie `apiKey` e `projectId`.
5. Cole os dois em [js/firebase-config.js](js/firebase-config.js).
6. Publique as regras de segurança — sem isso o banco fica aberto:
   ```bash
   npm i -g firebase-tools
   firebase login
   # troque o id do projeto em .firebaserc
   firebase deploy --only firestore:rules
   ```
7. No app: **Menu → Configurações → Entrar ou criar conta**.

### Hospedar no próprio Firebase

Faz diferença: se um dia você trocar o login por Google, o domínio
`<projeto>.firebaseapp.com` é o único que **não** sofre com o bloqueio de
armazenamento de terceiros do Safari. Também dispensa repositório público.

```bash
firebase deploy --only hosting
```

O [firebase.json](firebase.json) já está pronto — inclusive mandando `sw.js` e
`index.html` sem cache, para as atualizações chegarem no aparelho.

### Sobre a apiKey ser pública

É assim mesmo: a chave da Web identifica o projeto, não autoriza acesso. Quem
protege os dados são as regras em [firestore.rules](firestore.rules), que só
deixam cada conta ler e escrever o próprio documento. Pode versionar sem medo.

## Estrutura

| Arquivo | O que faz |
| --- | --- |
| [index.html](index.html) | Casca do app e metatags do modo standalone do iOS |
| [css/style.css](css/style.css) | Tema escuro inteiro, com o acento dinâmico |
| [js/exercises.js](js/exercises.js) | 110 movimentos em pt-BR, cada um com suas variações de aparelho |
| [js/exercise-images.js](js/exercise-images.js) | GERADO: quais exercícios têm foto |
| [img/](img/) | 173 fotos, 192×192 WebP (~940 KB) — uma por variação de aparelho |
| [js/store.js](js/store.js) | Estado, persistência, sessões, estatísticas e as regras dos seis módulos |
| [js/cloud.js](js/cloud.js) | Backup na nuvem pela API REST do Firebase |
| [js/firebase-config.js](js/firebase-config.js) | Suas chaves do Firebase (vazio = nuvem desligada) |
| [js/ui.js](js/ui.js) | Ícones, navegação em pilha, gráficos, folhas modais, menu suspenso e as peças visuais |
| [js/organizacao.js](js/organizacao.js) | Telas de cronograma, metas e estudos |
| [js/app.js](js/app.js) | Início, Menu, academia, água, resumo e configurações |
| [sw.js](sw.js) | Cache offline (rede primeiro, cache como reserva) |
| [firebase.json](firebase.json) / [firestore.rules](firestore.rules) | Hospedagem e regras de segurança |
| [tools/make-icons.js](tools/make-icons.js) | Recorta `icons/icone.jpeg` e gera os ícones do app |
| [tools/image-map.json](tools/image-map.json) | Liga cada exercício pt-BR ao nome no banco de fotos |
| [tools/fetch-images.js](tools/fetch-images.js) | Baixa, corta e converte as fotos para WebP |
| [tools/seed.js](tools/seed.js) | Cria `__seed.html` com dados de demonstração |
| [tools/shots.js](tools/shots.js) | Percorre as telas no Chrome headless e salva PNGs |
| [tools/flow-test.js](tools/flow-test.js) | Teste de fumaça do percurso completo, de app vazio a treino salvo |
| [tools/features-test.js](tools/features-test.js) | Testa tipos de série, última execução, séries por grupo, recorde, correção e backup |
| [tools/cloud-test.js](tools/cloud-test.js) | Testa o backup na nuvem contra um servidor falso, sem tocar num projeto real |
| [tools/theme-test.js](tools/theme-test.js) | Testa a tela de login e os temas, e fotografa os cinco |
| [tools/gym-test.js](tools/gym-test.js) | Testa tela acesa, substituir exercício, reordenar e as análises |
| [tools/catalog-test.js](tools/catalog-test.js) | Testa o catálogo, a foto por aparelho, a migração e a cor neutra |
| [tools/logging-test.js](tools/logging-test.js) | Testa limpar a busca e o início automático do treino ao anotar |
| [tools/habits-test.js](tools/habits-test.js) | Testa a barra de abas, o dia de descanso e a meta de água |
| [tools/dias-test.js](tools/dias-test.js) | Testa a navegação por dia, o descanso automático e a cor dos painéis |
| [tools/calc-test.js](tools/calc-test.js) | Testa a barra de descanso global e a calculadora de aquecimento |
| [tools/vida-test.js](tools/vida-test.js) | Testa os atalhos, o Menu, o cronograma, as metas, os estudos e a água |
| [tools/folhas-test.js](tools/folhas-test.js) | Testa as folhas de cadastro e o seletor de cores num iPhone 15 Pro, com e sem teclado |
| [tools/plano-test.js](tools/plano-test.js) | Testa o plano da semana, a troca avulsa de um dia e o rodízio |
| [tools/jogos-test.js](tools/jogos-test.js) | Testa a estante de jogos: estados, filtro, capa e compressão |
| [tools/financeiro-test.js](tools/financeiro-test.js) | Testa entradas e saídas, categorias, média, projeção e o formulário na tela |
| [tools/desktop-test.js](tools/desktop-test.js) | Testa a coluna lateral e o alinhamento do conteúdo em tela larga |

Nenhuma dependência, nenhum build. Editar um arquivo e recarregar já basta.

## Catálogo: movimento e variação

Cada entrada é um **movimento**, não uma combinação de movimento e aparelho.
"Supino Reto" é um só; barra, halteres, máquina e Smith são variações que o
usuário escolhe no seletor — e **a foto acompanha a escolha**. São 110
movimentos e mais de 230 combinações, contra 124 entradas achatadas antes.

A foto é procurada em três níveis: `img/<movimento>__<aparelho>.webp`, depois
`img/<movimento>.webp`, e por fim o ícone do grupo muscular. Assim uma variação
sem foto própria mostra a do movimento em vez de nada — ou, pior, a de outro
exercício.

Dados de versões anteriores são migrados na abertura (`migrarParaV2` em
[js/store.js](js/store.js)): os `exId` antigos como `ex_supino_reto_com_halteres`
viram `ex_supino_reto` com `equip: 'Halteres'`, e as cargas anotadas continuam
onde estavam.

## Cor: neutro fora, cor do treino dentro

Os detalhes do app — botão de ação, ícones, biblioteca, ajustes — são
**neutros**. A cor de um treino aparece só onde pertence a ele: no cartão do
treino, dentro do treino, no registro salvo e nos painéis de números e gráficos.
Assim a cor significa sempre a mesma coisa, em vez de tingir a interface inteira.

O neutro é branco nos temas escuros e escuro no tema Claro (campo `neutro` em
`TEMAS`) — branco sobre fundo claro sumiria.

Nos painéis, a cor sai **do dia que está sendo visto**, não do último treino
registrado: `accentPainel(quando)` recebe o dia e pega a cor do treino daquele
dia. Sem isso, navegando para trás os números de terça apareciam com a cor do
treino de quinta.

Um gráfico que junta treinos diferentes não tem uma cor só. No *Volume por
treino*, a linha fica neutra (`--txt-3`) e **cada ponto leva a cor do seu
treino** — é o parâmetro `cores` do `sparkline`, uma cor por ponto.

A água não é treino, então não segue a cor de nenhum: usa um azul próprio
(`AZUL_AGUA`, `#2E9BF0`) no anel, nos botões e nas barras dos sete dias. A barra
enche no azul a 60% e vai para o tom cheio no dia em que a meta foi batida.

Com o app virando assistente, a regra escalou para os outros módulos sem mudar de
ideia — cor identifica a coisa, não decora a tela:

| Onde | De onde vem a cor |
| --- | --- |
| Academia | Do treino, como sempre |
| Cronograma | Cor por tarefa, escolhida na paleta; o módulo é indigo (`COR_AGENDA`) |
| Hidratação | Azul próprio (`AZUL_AGUA`) |
| Metas | Cor por cofrinho, como as pastas de treino |
| Estudos | Cor por matéria |
| Configurações | Neutra |

Onde uma tela soma coisas de cores diferentes — o resumo das metas, o total de
estudo da semana, a barra semanal da academia — ela fica no tom neutro ou no do
módulo, nunca na cor de um item só. O editor de tarefa, meta ou matéria já veste
a cor escolhida enquanto se escolhe, em vez de revelá-la depois de salvar.

## A paleta

Doze cores dando a volta no círculo cromático, na ordem do arco-íris, com o
verde em dois tons de propósito: um claro (`#25E36B`) e um escuro (`#0B8F52`).

A paleta antiga tinha o problema oposto — dois verdes quase iguais (`verde` e
`lima`), três laranjas-avermelhados e um cinza-azulado tão apagado que não
identificava nada. Medindo em **CIE Lab**, o par mais próximo dela ficava em
**ΔE 16** (`#FF5A1E` e `#FF3B30`, o mesmo laranja para o olho); na nova, o par
mais próximo está em **ΔE 30**. Matiz sozinho não serve como medida: do
vermelho ao amarelo cabem quatro cores em 45 graus e todas passariam.

[tools/folhas-test.js](tools/folhas-test.js) refaz essa conta e falha se alguém
encostar duas cores de novo, além de conferir que os dois verdes continuam
separados em luminosidade.

Trocar a paleta deixa de fora hexadecimais que itens antigos já usam.
`paletaHTML()` resolve isso acrescentando a cor atual ao fim da fileira quando
ela não está mais na lista — sem isso o item pareceria não ter cor escolhida e
trocaria de cor no primeiro toque.

O seletor deixou de ser uma grade. Doze bolinhas ocupavam duas fileiras, não
diziam o nome de nada e ainda faziam a folha rolar. No lugar delas há um
**campo com menu suspenso** (`campoCor()`): uma linha só, da altura dos outros
campos, que mostra a cor escolhida pelo nome e abre a lista ao ser tocada. Uma
cor que saiu da paleta aparece como *Cor própria*, no fim da lista e já marcada
— sem isso o item pareceria não ter cor escolhida e trocaria de cor no primeiro
toque.

## As fotos dos exercícios

Cada exercício mostra uma foto da execução, na biblioteca, na lista do treino e
no topo da tela de séries. São **122 dos 124 exercícios** (faltam *Hollow Hold* e
*Burpee*, que caem no ícone do grupo muscular).

As fotos vêm do [free-exercise-db](https://github.com/yuhonas/free-exercise-db),
que está sob **Unlicense** — domínio público, sem exigência de crédito. Ainda
assim fica aqui o crédito, porque é justo. O `tools/fetch-images.js` baixa o
original, corta no quadrado central, reduz para 192×192 e grava em WebP: dá
cerca de **5,4 KB por foto, 660 KB no total**. Nada é buscado em servidor de
terceiros em tempo de uso — tudo mora no repositório e funciona offline.

O casamento entre o nome em português e o nome em inglês do banco está em
[tools/image-map.json](tools/image-map.json), feito à mão e conferido contra os
873 nomes reais do catálogo. Para trocar a foto de um exercício, mude o nome
inglês nesse arquivo e rode `node tools/fetch-images.js` de novo.

### Por que foto, e não desenho anatômico

O traço que a maioria dos apps de treino usa — figura cinza com o músculo em
vermelho — vem da [Gym visual](https://gymvisual.com), que é **comercial**. A
licença deles permite usar em app, mas proíbe redistribuir: um repositório
público com os arquivos soltos já conta como redistribuição. Para adotar esse
estilo é preciso comprar o pacote **e** tirar o projeto do GitHub Pages, que no
plano grátis exige repo público. Existe um repositório que redistribui essas
imagens com permissão do titular, mas ele avisa em letras claras que *"cloning
this repo is not a license"* — não serve.

Os conjuntos abertos foram medidos contra esta lista de 124 exercícios:

| Fonte | Estilo | Cobertura | Licença |
| --- | --- | --- | --- |
| [free-exercise-db](https://github.com/yuhonas/free-exercise-db) | foto de academia | **122/124** | Unlicense (domínio público) |
| [RepDB](https://github.com/sergei-argutin/exercise-dataset) grátis | desenho chapado, fundo azul | 74/124 | uso comercial com atribuição |
| [Everkinetic](https://github.com/everkinetic/data) | linha preta, sem o vermelho | 62/124 | CC-BY-SA 4.0 |
| [wger](https://wger.de) | linha preta | 23/124 | CC-BY-SA |

Nenhum conjunto aberto tem o estilo desejado *e* cobre a lista. Usar desenho em
metade dos exercícios e foto na outra metade fica pior do que só foto, então a
escolha foi o único conjunto que cobre tudo com um estilo só.

Nota sobre CC-BY-SA: o *share-alike* recai sobre as imagens e suas modificações,
não sobre o código do app — licença de imagem não contamina o código. Isso não
foi o que barrou o Everkinetic aqui; foi a cobertura de metade da lista.

### Trocar por outro conjunto

A estrutura não depende da fonte. Cada exercício procura `img/<slug>.webp`, onde
o slug é o id sem o prefixo `ex_` (veja `exThumb` em [js/ui.js](js/ui.js)). Para
usar imagens compradas, basta gravar os arquivos com esses nomes em `img/` e
listar os slugs em `js/exercise-images.js`. Quem não tiver arquivo cai no ícone
do grupo muscular, sem quebrar nada.

## O que dá para fazer

- Montar treinos com nome, cor e ícone próprios (as pastas da tela *Academia*).
- Adicionar exercícios da biblioteca escolhendo equipamento e número de séries,
  ou criar exercícios seus.
- **Anotar carga inicia o treino**: tocar no campo de peso ou repetições, ou
  marcar uma série, liga o cronômetro sozinho — quem registra carga está
  treinando. O botão *Iniciar* continua ali para quem quiser começar antes.
- Iniciar o treino: cronômetro, marcar séries feitas, temporizador de descanso
  com aviso sonoro ao terminar. **A tela fica acesa enquanto o treino roda**
  (Wake Lock, Safari 16.4+), e é liberada ao pausar ou concluir.
- Substituir um exercício no meio do treino (máquina ocupada) mantendo a
  quantidade de séries e o descanso; e reordenar exercícios arrastando pela alça
  no modo de edição.
- Anotar peso, repetições e descanso por série, além de observações por exercício.
- **Calculadora de aquecimento e feeder**: a partir da carga de trabalho,
  sugere 35–50% para aquecimento e 60–75% para feeder, e preenche as séries.
- Classificar cada série: **válida**, **aquecimento**, **feeder** ou **PAP**. Só a
  válida entra em volume, calorias, séries, repetições, recordes e no gráfico de
  evolução — as outras ficam no histórico como preparação.
- Ver o que você fez naquele exercício no treino anterior, série a série, como
  sugestão dentro do campo, com um botão para preencher tudo de uma vez.
- Acompanhar as **séries por grupo muscular na semana**, com a faixa de 10 a 20
  séries marcada na barra e a **frequência** (quantos dias distintos) — volume e
  frequência são coisas diferentes.
- Ver, ao abrir um registro, a **comparação com o treino anterior** do mesmo
  molde: diferença de volume, séries, repetições e carga por exercício.
- Ver a **tendência de carga dos últimos 30 dias** no gráfico do exercício.
- Receber aviso na hora em que uma série supera seu melhor 1RM estimado.
- Corrigir um treino já salvo em vez de só apagar; os números são recalculados.
- Ver a evolução da carga estimada de cada exercício em gráfico.
- Histórico com calorias, volume, séries e repetições.
- **Navegar pelos dias**: a faixa da semana seleciona o dia. Dia sem treino
  mostra os treinos disponíveis para começar; dia com treino mostra os números
  e o que foi feito. Arraste a faixa para trocar de semana.
- **Ofensiva com descanso automático**: dias sem treino não quebram a sequência,
  desde que a semana bata a meta de treinos.
- **Meta diária de água** no módulo *Hidratação*, com copos rápidos e os 7 dias.
- Escolher entre cinco temas (*Configurações → Tema*), do preto puro ao claro.
- Exportar e importar backup em `.json` (*Configurações*).
- Guardar uma cópia na nuvem e restaurá-la em outro aparelho, se o Firebase
  estiver configurado.
- Ver a foto da execução de cada exercício.

O registro de refeições ainda não existe: por ora a nutrição é só a água.

O **peso corporal** (*Configurações*) serve só para escalar a estimativa de calorias
em `sessionStats` — nada mais depende dele. A conta equivale a cerca de 3,8 METs,
próxima do valor de 3,5 que o [Compendium of Physical Activities](https://cdn-links.lww.com/permalink/mss/a/mss_43_8_2011_06_13_ainsworth_202093_sdc1.pdf)
atribui a musculação de 8–15 repetições. Altura, sexo e idade não entram: o
método MET depende de peso, tempo e intensidade.

### Fora da academia

- **Cronograma**: tarefas e compromissos num calendário de mês, cada um com cor,
  hora opcional e observação. Marcar como feito, adiar um dia, jogar para amanhã.
  O que ficou aberto em dias passados aparece como *Atrasadas*.
- **Metas**: cofrinhos com alvo em reais. Guardar por botão rápido (50, 100, 200)
  ou valor livre, retirar, e um extrato de cada lançamento.
- **Estudos**: matérias com lista de tópicos e registro de horas, com meta
  semanal por matéria e um gráfico dos últimos 14 dias.
- **Início**: atalho para tudo, com uma linha de estado em cada cartão (o treino
  de hoje, quantas tarefas faltam, quanto de água, quanto guardado, quanto
  estudado) e as tarefas de hoje logo abaixo.

## Manutenção

```bash
node tools/make-icons.js                 # regerar ícones (suba o ?v= depois)
node tools/fetch-images.js               # rebaixar e reconverter as fotos
node tools/seed.js                       # gerar dados de teste em __seed.html
python -m http.server 8099 &             # servidor local
node tools/shots.js ./__shots            # capturar as telas e checar erros
node tools/flow-test.js ./__shots        # percurso completo, com verificações
node tools/features-test.js ./__shots    # recursos avançados, com verificações
node tools/cloud-test.js ./__shots       # backup na nuvem, com Firebase simulado
node tools/theme-test.js ./__shots       # login e temas, com fotos de cada tema
node tools/gym-test.js ./__shots         # trio da academia e análises
node tools/catalog-test.js ./__shots     # catálogo, fotos por aparelho e migração
node tools/logging-test.js ./__shots     # busca e início automático
node tools/habits-test.js ./__shots      # abas, descanso e água
node tools/dias-test.js ./__shots        # navegação por dia e cores
node tools/calc-test.js ./__shots        # descanso global e calculadora
node tools/vida-test.js ./__shots        # módulos de organização e navegação
node tools/folhas-test.js ./__shots      # folhas de cadastro com o teclado aberto
node tools/plano-test.js ./__shots       # plano da semana e troca de um dia
node tools/jogos-test.js ./__shots       # estante de jogos
node tools/financeiro-test.js ./__shots  # entradas, saídas e saldo
node tools/desktop-test.js ./__shots     # coluna lateral e alinhamento em tela larga
```

Os dois usam um perfil do Chrome em caminho curto (`%TEMP%\gymnotion-chrome`)
de propósito: o `CacheStorage` acrescenta cerca de 100 caracteres ao caminho do
perfil e, numa pasta funda, o Windows estoura o limite de 260 — toda escrita em
cache passa a falhar com *"Entry already exists"* e o service worker parece
quebrado sem estar. Se for mudar a pasta do perfil, mantenha o caminho curto.

Os dois saem com código diferente de zero se qualquer erro ou aviso aparecer no
console. O `flow-test.js` ainda verifica o comportamento: cria um treino do zero,
busca exercícios, anota 60 kg x 10, conclui o treino e confere que o volume, a
sequência de dias e o `localStorage` bateram.

## Temas

Cinco: **Preto** (padrão), **Grafite**, **Meia-noite**, **Sépia** e **Claro**. O
tema muda só a base — fundo, cartões e texto. A cor de cada treino continua
mandando em botões, cronômetro, anéis, gráficos e marcadores, em qualquer tema.

Cada tema é um bloco `:root[data-tema="..."]` em [css/style.css](css/style.css)
que redefine as variáveis de base. As camadas neutras (`--fill-1` a
`--fill-forte`) são brancos translúcidos nos temas escuros e **pretos**
translúcidos no claro — senão sumiriam sobre fundo claro.

O tema claro tem uma limitação do iOS: o app é instalado com a barra de status
translúcida e texto branco, e isso não muda depois. Sobre fundo claro o relógio
sumiria, então esse tema reserva uma faixa escura na altura da barra de status.

Para adicionar um tema: crie o bloco no CSS e acrescente uma entrada em `TEMAS`
(em [js/store.js](js/store.js)). Para remover, apague os dois.

## A academia é um dia, não uma lista

A faixa da semana navega: tocar num dia o seleciona, e o conteúdo abaixo muda.

- **Dia sem treino** (o caso de hoje, antes de treinar): a grade de treinos
  montados, para escolher e começar. Gráfico de zeros não serve para nada.
- **Dia com treino**: os anéis daquele dia e os registros dele.

Hoje ganha um anel quando não é o dia selecionado, para você não se perder. Dias
futuros ficam apagados e não respondem ao toque. Arrastar a faixa troca de
semana, sem passar de hoje. O histórico corrido continua acessível em *Todos os
registros*.

## A meta da semana e os dias de descanso

A sequência de dias saiu da tela: contar dias seguidos é inútil para quem treina
três ou quatro vezes por semana — o número ficava sempre em 1 e não dizia nada.
**O que a academia mostra agora é a meta semanal**: quantos treinos foram feitos
de quantos, e é ela que o cartão do painel repete.

O descanso é **automático**: um dia sem treino já é descanso, não há nada a
marcar. Quem decide se ele conta é a **meta semanal** (`metaSemanal`, padrão 2,
ajustável nas *Configurações*): os dias vazios de uma semana só valem como
descanso se aquela semana tiver batido a meta.

Dois cuidados na interface:

- **Hoje não é descanso.** O dia ainda pode virar treino, então não recebe a
  marca nem é chamado assim; o aviso olha para a frente ("faltam N treinos nesta
  semana"). Dias futuros também não são marcados.
- **A semana em curso é poupada** da regra da meta, porque ela ainda pode bater.

Na faixa da semana, ponto cheio é dia treinado — na cor do treino daquele dia — e
anel vazado é descanso coberto. `streak()` continua no código, alimentando essa
regra de cobertura; o que saiu foi mostrar o número.

## Meta de água

Copos de 300, 500 e **800 ml** (o tamanho da garrafa levada para a academia), o
percentual da meta, cada gole do dia listado e o gráfico dos **últimos 7 dias** —
é por ele que se vê a meta batida ou não em cada dia, e por isso ele fica: o
número de hoje sozinho não conta a semana.

Sem meta definida, usa **35 ml por quilo** de peso corporal — a referência mais
citada — arredondado para a centena.

O desfazer não desconta um número fixo: cada gole entra em `aguaLog` na ordem em
que foi registrado, e desfazer tira **exatamente o último**. Descontar sempre 800
erraria toda vez que o toque anterior tivesse sido um copo de 300 — e é esse
mesmo registro que a lista de goles do dia mostra.

O anel, os botões e as barras usam um azul próprio (`AZUL_AGUA`): água não é
treino, então não herda a cor de nenhum.

## O desenho das telas

Toda tela abre com **sobrancelha, título e uma frase de apoio** (`secaoSub`),
seguida de **blocos** — cartões com rótulo em maiúsculas. O vazio de um bloco é
uma área tracejada: ela diz "aqui vai aparecer algo" em vez de deixar um buraco.

**Cadastrar acontece na própria tela.** `formBloco()` monta o mesmo bloco de
campos no cronograma, nos estudos, nos jogos, nas metas e no financeiro: rótulo,
etiquetas em cima dos campos e o botão no fim da linha, com Enter fazendo o
mesmo que ele. Ele pede só o que o item precisa para existir; **cor, capa,
observação e estado ficam no editor completo, que abre no toque sobre o item**.
Foi por isso que o botão flutuante saiu dessas telas — havia dois caminhos para
a mesma coisa, e um deles cobria a lista.

O formulário só limpa os campos quando o chamador **aceita** o que foi digitado:
recusando (nome vazio, por exemplo), o texto fica na tela para ser corrigido em
vez de sumir. Campos marcados com `mantem` — a data, no cronograma —
sobrevivem ao envio, porque quem lança três compromissos do mesmo dia não quer
redigitar a data três vezes.

A academia é a exceção que confirma a regra: ela **manteve tudo** — faixa da
semana, cartão do treino do dia, pílulas de ação, linha do tempo dos exercícios,
pastas dos outros treinos e o registro do dia — e ganhou só o cabeçalho e o
bloco de meta semanal. Lá o "cadastro" é montar um treino inteiro, que não cabe
numa linha de campos.

## O painel do Início

O Início abre com a data em corpo pequeno e a saudação em corpo de manchete,
com **o nome em destaque na cor do dia**. Sem nome cadastrado — ele fica em
Configurações → Seu nome — o destaque cai sobre a hora ("Boa **tarde!**"), para
o título nunca ficar de uma cor só e o cabeçalho não depender de um dado que
talvez ninguém preencha. A cor do destaque é `COR_AGENDA`, a mesma dos cartões
logo abaixo: `contextAccent()` é branco fora do treino, e um destaque branco
sobre título branco não destaca nada.

Abaixo vêm os três cartões de número que já existiam — hidratação, academia,
saldo do mês — e o painel: **Hoje**, **Próximos dias** e **Tempo de estudo**,
lado a lado no computador e um embaixo do outro no celular. Cada um responde
uma pergunta e nada mais, e cada um termina numa ação: adicionar tarefa, abrir a
semana, abrir os estudos. Os três dividem a altura da linha, com o rodapé
descendo até o pé (`margin-top: auto`) — três cartões de alturas diferentes
deixariam os botões em degrau.

O gráfico de estudo usa `graficoArea()`: curva com tangente horizontal em cada
ponto, e não retas ligando os pontos. Sete dias em zigue-zague viram um serrote,
e o desenho passa a chamar atenção para os bicos em vez do movimento.

**Próximos dias** revelou um erro antigo: a lista era ordenada por
`ordemTarefa`, que só sabe comparar duas tarefas **do mesmo dia**. Numa lista
que atravessa dias, quinta de manhã aparecia antes de quarta à tarde. Agora
existe `ordemNoTempo()` — data primeiro, depois a regra de dentro do dia — e ela
também conserta as listas "Próximos" e "Anteriores" do cronograma.

### O cronômetro de estudo

O relógio vive fora da tela, como a barra de descanso: montado dentro dela, um
refresh por segundo destruiria o campo em foco e fecharia o teclado. A tela só
desenha o visor, e `globalTick()` troca o texto dele.

Encerrar não joga o tempo fora — ele vira minutos numa matéria, que é para onde
esse número serve. Abaixo de um minuto não há o que registrar; sem matéria
nenhuma cadastrada, o app diz isso em vez de perder o tempo em silêncio.

O mesmo cartão aparece em três lugares — Início, Estudos e dentro de uma
matéria — e todos dividem **um** relógio: começar em Cálculo e conferir no
Início mostra o mesmo tempo correndo. Começando dentro de uma matéria, o tempo
já sai **carimbado** com ela (`CRONO_ESTUDO.materia`): encerrar em qualquer tela
depois disso vem com ela marcada, sem perguntar de novo qual era. Ainda dá para
trocar na hora de registrar, porque quem começou errado precisa de conserto e
não de aviso.

Na tela de Estudos o relógio vem **antes** do cadastro de matéria: cronometrar é
diário, cadastrar matéria acontece uma vez. Dentro de uma matéria ele veste a
cor dela, e não o amarelo do módulo — a mesma regra de sempre.

## A meta de água muda onde ela aparece

Ela morava num botão no fim da tela da hidratação, depois do gráfico dos sete
dias. Quem abre essa tela abre para beber água e não desce até lá, então mudar a
meta virava caso de ir às Configurações — que é exatamente o caminho que o botão
existia para evitar.

Agora ela fica encostada no número que governa, com passo de **100 ml** nos dois
sentidos, e resolve sem teclado. "Outro valor" abre o campo livre para quem quer
um número redondo de uma vez.

O piso é 500 ml, e o `−` apaga ao chegar nele. Não é preciosismo: **zero não é
"sem meta"** — é a meta voltar a ser calculada pelo peso (35 ml por quilo), e
alguém descendo de 100 em 100 cairia nesse modo sem entender por quê. Quem quer
o cálculo automático de volta tem a frase "voltar a calcular pelo peso" logo
abaixo, dizendo o que faz.

O botão do fim da tela saiu junto: dois caminhos para a mesma coisa era o que
tínhamos acabado de tirar das outras telas.

## Cronograma: a semana como grade

A lista responde "o que tem hoje". A grade responde "como o dia está
distribuído", que é outra pergunta — é ela que mostra o buraco entre um
compromisso e o outro.

Para desenhar um retângulo é preciso começo e fim, e a maioria das tarefas só
tem começo. Por isso a tarefa ganhou `fim`, opcional: **sem término marcado o
bloco vale uma hora**, o palpite que menos erra, e a grade nunca fica com bloco
de altura zero. No editor, o dia ficou sozinho na linha e as duas horas dividem
a de baixo — com os três lado a lado, em 390px cada campo sobrava com pouco mais
de 100px e o seletor nativo do iOS cortava o próprio texto.

**Quem não tem hora não some.** Vai para a faixa de *dia inteiro* no alto da
grade, como etiqueta clicável. Um planejador que engole tarefa é pior que
planejador nenhum.

Cada bloco leva a cor da própria tarefa, a mesma regra da lista. Hoje é a única
coluna pintada, com `--a10` de fundo. Tocar num bloco abre o editor; tocar no
vazio abre o editor **já naquela hora**, arredondada para a meia hora mais
próxima — é o gesto que a grade promete só por existir.

A régua de horas não mostra as 24: `faixaDeHoras()` abre das 7 às 21 e cresce só
o necessário para caber o que está marcado, com uma hora de folga nas pontas.
Mostrar o dia inteiro faria tudo caber na tela e nenhum bloco ficar legível.

### Semana no computador, dia no celular

A grade de sete colunas é o desenho certo numa janela larga e ilegível em 390px,
onde cada coluna sobraria com 47 pixels. Então o computador abre na **Semana** e
o celular no **Dia**; a chave de duas posições troca a qualquer momento, e a
escolha feita à mão fica guardada e passa a valer nos dois. Em janela estreita a
grade rola de lado, com coluna mínima de 92px.

Na Semana a grade é a tela inteira, como no desenho de referência. No **Dia**
ela é só o começo: embaixo continuam o cadastro rápido, o calendário do mês e as
listas de sempre — é onde o cronograma vira trabalho, não vista.

A semana da grade começa na **segunda**, como o calendário de parede. A da
academia continua começando no domingo, porque é assim que a meta semanal fecha:
são duas semanas diferentes e cada uma tem a sua razão.

## Duas navegações, um app

O mesmo app com a navegação trocada de lugar. **No celular**, uma cápsula
flutuante de cinco botões — Início, Cronograma, Academia, Hidratação e um menu
que abre um painel por cima e vira ✕ enquanto está aberto. **A partir de 900px**,
uma coluna fixa à esquerda com todos os módulos, o item aberto aceso, e a
cápsula some.

A coluna vive fora da pilha de telas, então sobrevive a empilhar e desempilhar;
`atualizarLateral()` é chamada de `pushScreen`, de `popScreen` e do fim de
`buildRoot` — do fim, e não do começo, porque é ali que `screen.name` já vale o
da aba nova; chamada antes, ela acendia o item da tela anterior. Com uma tela
empilhada, quem manda é ela: marcar a aba junto acendia **dois** itens, o módulo
aberto e a aba que ficou embaixo.

As telas começam depois da coluna (`.screen { left: var(--lateral) }`) e o
conteúdo fica numa faixa de 1120px — sem o limite, uma tela de 27 polegadas
esticaria uma lista de tarefas de ponta a ponta.

**A faixa é centrada com recuo no container, não com `margin: auto` nos
filhos.** A primeira versão usava `max-width` mais `margin: auto` em cada filho
do `.scroll`, e quase todo cartão traz o próprio `margin: 0 16px` — que vence o
`auto`. O resultado era o título no meio e o cartão grudado à esquerda, 92px
fora do eixo numa janela de 1568px. Com o recuo no `.scroll` (e o mesmo recuo na
barra de topo, senão o título dela sai do eixo), todo filho se alinha, tenha
margem própria ou não.

O botão do menu **não navega**: abre um painel e o painel se ancora em quem o
chamou. `menuSuspenso()` trava a altura antes de medir e recorta nos dois eixos;
mede com `offsetHeight` e não com `getBoundingClientRect`, porque a animação de
entrada começa em `scale(.92)` e o rect sai encolhido enquanto ela roda.

A cápsula fica num `z-index` acima do painel, senão o ✕ sumiria justamente
quando é preciso tocá-lo.

Concluir um treino chama `voltarPara('academia')`, não `popToRoot()`: quem
acabou de treinar quer cair de volta na academia.

## O tema Ardósia

O desenho novo trouxe uma base cinza-azulada — fundo `#0B0E12`, cartão `#151A20`
e uma borda visível, que é o que separa cartão de fundo sem precisar de sombra.
Ela entrou como um tema a mais, **Ardósia**, e virou o padrão.

Trocar o padrão não bastaria: quem já usava o app tem o tema gravado, e ficaria
para trás. Por isso existe `settings.temaEscolhido`, ligado só quando alguém
escolhe um tema na mão — até lá, o app acompanha o padrão quando ele muda. Quem
tinha escolhido Preto de propósito continua no Preto.

## A academia em um cartão

O topo da tela é um herói só, que muda de papel conforme o estado — treino
rolando, treino registrado ou plano à espera. Antes eram três cartões empilhados
dizendo quase a mesma coisa.

Quando não há registro no dia, o herói mostra o **treino sugerido**:
`treinoSugerido()` devolve o que está há mais tempo sem ser feito. É um rodízio
simples, que funciona sem exigir uma agenda fixa. Os exercícios dele aparecem na
linha do tempo logo abaixo, e os outros treinos viram pastas.

O disco do dia aberto na faixa da semana usa a mesma cor do herói
(`corAcademia()`), em vez do branco neutro — o atalho do Início lê a mesma
função, senão ele apareceria verde enquanto o herói mostrava amarelo.

O botão flutuante saiu: *Meus treinos*, no topo, abre a mesma folha, e a tela
vazia traz o próprio botão de montar o primeiro treino.

## Cronograma

Grade do mês, com até três pontinhos por dia nas cores das tarefas dele — é o que
permite reconhecer um mês cheio sem abrir dia por dia. Tocar num dia abre a lista
embaixo; as setas trocam de mês sem mudar o dia aberto.

A data de uma tarefa é guardada como **chave de dia** (`'2026-09-03'`), não como
instante: "dia 3" precisa continuar sendo dia 3 depois de exportar, importar e
abrir noutro fuso. De quebra, comparar e ordenar viram comparação de texto.

Na lista, quem tem hora vem primeiro na ordem do relógio, depois as tarefas
soltas; o que foi feito **desce para o fim em vez de sumir**. Tarefa aberta num
dia que já passou aparece numa seção *Atrasadas*, tanto no cronograma quanto no
Início — é onde tarefa esquecida costuma morrer sem aviso.

O editor usa os seletores nativos de data e hora do iOS (`input type="date"` e
`type="time"`): é o único jeito de ter roda de data sem escrever uma do zero.

## Metas: o cofrinho

Cada meta tem nome, alvo e cor. O saldo é a **soma dos lançamentos**, e retirada
entra como valor negativo: assim o extrato mostra o que saiu e quando, em vez de
o saldo encolher sem deixar rastro. Retirar mais do que existe esvazia o
cofrinho, mas não deixa saldo negativo — `guardarNaMeta` corta a retirada no que
há dentro. A barra para em 100% mesmo com o guardado passando do alvo.

## Financeiro

O **mês é a unidade**: entradas, saídas e o saldo entre as duas, nos três
cartões do topo. A divisão por categoria diz para onde as saídas foram, e a
lista mostra cada lançamento agrupado por dia. Navegar de mês é o mesmo gesto do
calendário, e avançar para o futuro fica desligado — não há lançamento a ver lá.

O lançamento é feito num **formulário que fica na própria tela**, não numa folha
modal: aqui se lança várias coisas seguidas, e abrir e fechar uma folha a cada
uma seria trabalho a mais. O rascunho vive fora do formulário (`RASCUNHO_FIN`),
porque a tela é redesenhada a cada troca de tipo — a lista de categorias muda
junto, já que salário não é uma saída. Depois de lançar, tipo e categoria ficam
escolhidos e o valor limpa: quem lança mercado costuma lançar de novo, e repetir
o valor sem querer seria pior.

A data é chave de dia (`'2026-09-08'`), a mesma escolha do cronograma e pelo
mesmo motivo; agrupar por mês vira um `slice(0, 7)`. As **categorias são listas
fechadas com cor própria, uma para cada lado**: a fatia se lê pelo comprimento
da barra e a categoria pela cor. Só as saídas entram na divisão — misturar
salário com mercado não responde "para onde foi".

Duas contas que valem a explicação:

- **A média diária divide pelos dias já vividos**, não pelo mês inteiro. No dia
  3, dividir por 30 diria que ele gasta dez vezes menos do que gasta.
- **A projeção** estende esse ritmo até o fim do mês, e só existe no mês
  corrente: num mês fechado ela é o próprio total, sem inventar futuro.

Quem já tinha lançado gastos na versão anterior não perde nada: `migrarGastos`
converte a lista antiga em lançamentos de saída. Ela roda em `completarCampos`,
e não em `migrarParaV3` — um backup que já esteja na v3 pode ter gastos antigos,
e a migração de versão sai cedo nesse caso.

## Jogos: a estante

Uma biblioteca é feita de **capas**, não de linhas de texto — o jogo se
reconhece pela arte antes do nome. Por isso a capa é o item, numa grade de três
colunas na proporção 3:4, e o estado é um selo sobre ela: *Jogando*, *Na fila*,
*Zerado*. Sem capa, as iniciais preenchem o lugar dela; um retângulo cinza vazio
seria pior.

Trocar de estado carimba a data — começar guarda quando começou, zerar guarda
quando zerou — e voltar para a fila **limpa as duas**, senão um jogo recomeçado
continuaria dizendo que foi concluído.

A capa entra do rolo de fotos e é comprimida na hora, para **360px de largura em
WebP a 0.72**: o `localStorage` é pequeno e uma foto crua de câmera estoura o
limite sozinha. Nos testes, uma imagem de 1200×1600 cai de 57 KB para 1 KB. Um
endereço de imagem também serve, para quem prefere colar um link.

## Estudos

Matéria com cor, tópicos e horas. A cor da matéria estava só num contorno de 1px
e num número pequeno; agora ela ocupa um **selo cheio de 46px com a inicial** e
a barra de progresso inteira, que é o que faz achar a matéria certa sem ler nome
por nome. Dentro dela, o cartão-herói assume a mesma cor. Os tópicos são uma lista de check, e a fração
concluída vira a porcentagem do cartão. As horas entram por botões de 25, 50 e 90
minutos ou por valor livre, contra uma meta semanal em minutos.

O número ao lado do nome conta a mesma coisa que a barra: com meta semanal, o
tempo; sem meta, o avanço nos tópicos. Antes o número mostrava tópicos e a barra
mostrava minutos, e os dois discordavam lado a lado.

O gráfico de 14 dias junta matérias, então não tem uma cor só: **cada barra leva
a cor da matéria que mais rendeu naquele dia**, pela mesma regra do gráfico de
volume da academia. As barras têm piso de 8% de altura — um dia de 10 minutos
virava um risco invisível, e o que importa ali é ver que houve estudo.

## Barra de abas: o que sobrou de duas correções antigas

Dois problemas diferentes, com causas diferentes, resolvidos quando a barra
ainda era uma faixa colada na borda. As duas correções continuam valendo para a
cápsula que a substituiu.

**O último registro ficava escondido.** A barra é `position: absolute`, logo sai
do fluxo e a lista ia até o fim da tela por baixo dela. A classe `com-abas` nas
telas de aba reserva a altura da barra no `padding-bottom` da lista; só elas
pagam esse espaço. Nas telas empilhadas, que não têm barra, o botão flutuante
também desce (`.screen:not(.com-abas) .fab`).

**Sobrava uma faixa vazia embaixo, mas só no iPhone.** O `safe-area-inset-bottom`
vale 34px no aparelho e **0 no navegador**, então o defeito era invisível em
teste. Reservar os 34px inteiros empurrava os ícones para cima e deixava a faixa
preta à mostra. Agora `--tabbar-pb` reserva metade disso, o que mantém o
indicador de gesto livre sem o vazio: a barra caiu de 82px para 61px e os ícones
chegaram a 27px da borda, contra 46px antes.

Para ver isso em teste é preciso simular o inset — `habits-test.js` injeta
`--safe-b: 34px` antes de medir, senão a folga daria zero e o teste passaria com
o defeito no lugar.

## O teclado do iOS cobre a tela, não a encolhe

Num PWA em tela cheia, abrir o teclado **não muda o tamanho da página**: o
layout continua achando que tem os 852px do iPhone 15 Pro, e o teclado
simplesmente se deita por cima dos ~336px de baixo. Uma folha centralizada
segue centrada na tela inteira — e some atrás do teclado justamente quando se
está digitando nela.

Medido no editor de tarefa, no código anterior: o botão *Salvar* ficava em
y=665 com apenas 516px visíveis, ou seja, **149px atrás do teclado**.

A `visualViewport` é a única API que enxerga o que sobrou. Ao abrir qualquer
folha, `seguirTeclado()` prende o fundo escuro a ela (`top`, `height`) e
acompanha `resize`/`scroll`; a folha passa a se centrar no espaço visível, não
na tela. Vale para todas as folhas, inclusive as de ajuste que já existiam.

Duas correções vieram junto, das que só aparecem no aparelho:

- **`-webkit-appearance: none` nos campos.** Sem isso o iOS ignora altura e
  recuo em `input[type="date"]` e `[type="time"]` e os desenha com a largura
  intrínseca dele, estourando a linha que divide dia e hora ao meio. No Chrome
  o defeito não aparece, porque lá o controle nativo já obedece à caixa.
- **Folha em três faixas.** Título fixo, miolo que rola (`.form-corpo`) e botões
  fixos embaixo. A primeira tentativa foi grudar os botões com
  `position: sticky`, e eles passaram a flutuar **por cima** da paleta de cores,
  cortando-a — sticky tira o elemento do lugar sem abrir espaço para ele.

[tools/folhas-test.js](tools/folhas-test.js) sombreia `visualViewport.height` e
dispara o evento de `resize`, que é exatamente o que o Safari faz, e verifica
que a folha inteira, os botões e a última cor da paleta continuam alcançáveis.
Rodado contra o código anterior, ele acusa 11 falhas.

## Calculadora de aquecimento e feeder

Na tela do exercício. Pega a carga de trabalho — a maior série válida, ou a do
último treino — e aplica as faixas: **35–50%** para aquecimento, **60–75%** para
feeder.

Com mais de uma série do mesmo tipo, os valores **escalonam dentro da faixa** em
vez de repetir o mesmo número: dois aquecimentos com 100 kg de trabalho viram
35 e 50 kg, três viram 35, 42,5 e 50. As cargas caem no múltiplo de 2,5 kg mais
próximo, que é o menor salto montável com anilhas de 1,25 de cada lado.

**Ela cria as séries, não só preenche.** Na primeira versão o botão apenas
gravava a carga nas séries já marcadas como A ou F — e num exercício recém
montado, onde todas são válidas, ele nascia desabilitado e parecia quebrado: só
funcionava para quem tivesse marcado cada série na mão antes de abrir a
calculadora, que é justamente o trabalho que ela deveria poupar.

São **duas receitas fechadas**, e a decisão que interessa é só quanta
preparação:

| | Aquecimento | Feeder | PAP |
| --- | --- | --- | --- |
| **Completo** | 1 × 12 reps, 35–50% | 1 × 5 reps, 60–75% | 1 × 1 rep, carga de trabalho |
| **Feeder + PAP** | — | 1 × 5 reps, 60–75% | 1 × 1 rep, carga de trabalho |

O PAP sobe com a **carga de trabalho** e uma repetição só: o objetivo dele é
potencializar com a carga real, não somar volume.

*Aplicar* deixa o exercício exatamente com a receita escolhida — cria o que
falta, **tira o que não faz parte dela** e grava cargas e repetições. A nota
acima do botão diz de antemão o que vai acontecer, e a folha veste a cor do
treino: ela nasce fora da tela dele e não herdaria o acento sozinha.

As séries criadas herdam o descanso da série de trabalho e vão para a frente da
lista, na ordem em que se faz: aquecimento, feeder, PAP, trabalho. Essa
reordenação **só acontece com o exercício intocado**: se alguma série já foi
marcada como feita, remexer na ordem do que já passou seria pior que a bagunça,
então a série nova entra no fim.

## As três colunas da série não pedem a mesma largura

Peso, repetições e descanso dividiam a linha em partes iguais, e um peso de três
dígitos com meio quilo — `127,5` — **não cabia**: o texto pedia 42px e o campo
tinha 41. Repetição quase nunca passa de dois dígitos, então a divisão igual
gastava no lugar errado. Agora o peso leva `flex: 1.35` e as repetições `.85`,
com recuo e rótulo de unidade mais apertados.

Os espaçadores do cabeçalho passaram a copiar o que existe antes e depois dos
campos na linha — o check mais a marca do tipo de um lado, o kebab do outro —,
senão os títulos ficavam até 31px fora das colunas que nomeiam.

`logging-test.js` mede a **largura real do texto** num canvas com a fonte do
campo. `scrollWidth` não serve aqui: num input ele nunca fica abaixo do
`clientWidth`, então um texto quase estourando lê igual a um que sobra.

## A barra de descanso vive fora das telas

Ela era montada dentro de cada tela, e o relógio precisava **reconstruir a tela**
para atualizar o número. Na biblioteca não havia barra nenhuma, então o
`globalTick` reconstruía a tela inteira a cada segundo — o que destruía o campo
de busca em foco e fechava o teclado do iPhone no meio da digitação.

Agora ela é um elemento único preso ao `#app`: troca só o próprio texto, nunca
reconstrói nada, e de quebra acompanha o usuário para qualquer tela.

## Início automático ao anotar

Tocar no campo de peso ou de repetições de um exercício, quando não há treino
rodando, inicia a sessão. A sutileza está em **não reconstruir a tela** nesse
momento: no iPhone isso fecharia e reabriria o teclado no meio da digitação. Em
vez disso, a série de destino é resolvida na hora da escrita (`alvoSet` em
[js/app.js](js/app.js)) — se a sessão começou com a tela aberta, o valor cai na
sessão em vez do molde do treino, sem nada piscar.

Não inicia sozinho em dois casos: tocar no campo de **descanso** (não é registro
de esforço) e quando **outro treino** já está em andamento.

Nota para quem for testar: o Chrome headless não dispara o evento `focus` quando
o documento não tem foco — `.focus()` muda o `activeElement` em silêncio. Os
utilitários usam `Emulation.setFocusEmulationEnabled` por causa disso.

## Trocar o ícone

A arte fica em `icons/icone.jpeg`. O gerador detecta o retângulo do desenho e
recorta a margem preta em volta — o iOS aplica a própria máscara arredondada, e
sem o recorte o desenho ficaria pequeno dentro de uma moldura dupla. O
`apple-touch-icon` sai em PNG; os tamanhos grandes, que só o manifest usa, saem
em WebP, porque a arte tem gradiente e o PNG de 512 pesava 179 KB contra 12 KB.

Depois de rodar `node tools/make-icons.js`, **suba o `?v=` em três lugares**: [index.html](index.html), [manifest.webmanifest](manifest.webmanifest)
e a lista `ASSETS` do [sw.js](sw.js). O Safari guarda o `apple-touch-icon` por
muito tempo e ignora `Cache-Control`, então trocar o arquivo sem trocar a URL faz
o iPhone continuar exibindo o ícone antigo ao adicionar à tela de início.

## Limites conhecidos

- Os dados vivem só naquele iPhone: não há conta nem servidor. Trocar de
  aparelho, perdê-lo, limpar os dados de site no Safari ou remover o app da tela
  de início apaga tudo — por isso o backup existe. A regra dos 7 dias do iOS
  (ITP), que apaga `localStorage` de sites parados, **não** se aplica: a Apple
  isenta apps adicionados à tela de início ([WebKit](https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/)).
- O app instalado tem armazenamento separado do Safari. Anotar pelo navegador e
  depois abrir pelo ícone mostra dados diferentes — use sempre pelo ícone.
- As calorias são estimativa grosseira (tempo de treino ajustado pelo peso
  corporal, mais uma parcela do volume levantado), não medição.
- As fotos são genéricas: mostram o movimento, não necessariamente o aparelho da
  sua academia.
