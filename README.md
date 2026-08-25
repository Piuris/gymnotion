# GymNotion

Caderno de treinos em PWA (web app instalável). Roda no iPhone em tela cheia, sem
App Store, sem conta de desenvolvedor e sem custo. Os dados ficam guardados no
próprio aparelho (`localStorage`) e o app funciona offline.

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

## Estrutura

| Arquivo | O que faz |
| --- | --- |
| [index.html](index.html) | Casca do app e metatags do modo standalone do iOS |
| [css/style.css](css/style.css) | Tema escuro inteiro, com o acento dinâmico |
| [js/exercises.js](js/exercises.js) | ~130 exercícios em pt-BR, por grupo muscular |
| [js/exercise-images.js](js/exercise-images.js) | GERADO: quais exercícios têm foto |
| [img/](img/) | 122 fotos de exercício, 192×192 WebP (~660 KB no total) |
| [js/store.js](js/store.js) | Estado, persistência, sessões, estatísticas |
| [js/ui.js](js/ui.js) | Ícones, navegação em pilha, gráficos, folhas modais |
| [js/app.js](js/app.js) | As telas |
| [sw.js](sw.js) | Cache offline (rede primeiro, cache como reserva) |
| [tools/make-icons.js](tools/make-icons.js) | Gera os PNGs do ícone sem dependências |
| [tools/image-map.json](tools/image-map.json) | Liga cada exercício pt-BR ao nome no banco de fotos |
| [tools/fetch-images.js](tools/fetch-images.js) | Baixa, corta e converte as fotos para WebP |
| [tools/seed.js](tools/seed.js) | Cria `__seed.html` com dados de demonstração |
| [tools/shots.js](tools/shots.js) | Percorre as telas no Chrome headless e salva PNGs |
| [tools/flow-test.js](tools/flow-test.js) | Teste de fumaça do percurso completo, de app vazio a treino salvo |

Nenhuma dependência, nenhum build. Editar um arquivo e recarregar já basta.

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

- Montar treinos com nome, cor e ícone próprios (as pastas da tela *Treinos*).
- Adicionar exercícios da biblioteca escolhendo equipamento e número de séries,
  ou criar exercícios seus.
- Iniciar o treino: cronômetro, marcar séries feitas, temporizador de descanso
  com aviso sonoro ao terminar.
- Anotar peso, repetições e descanso por série, além de observações por exercício.
- Ver a evolução da carga estimada de cada exercício em gráfico.
- Histórico com calorias, volume, séries e repetições; sequência de dias treinados.
- Exportar e importar backup em `.json` (aba *Perfil*).
- Ver a foto da execução de cada exercício.

As abas *Amigos* e *Nutrição* estão como espaço reservado.

## Manutenção

```bash
node tools/make-icons.js                 # regerar ícones
node tools/fetch-images.js               # rebaixar e reconverter as fotos
node tools/seed.js                       # gerar dados de teste em __seed.html
python -m http.server 8099 &             # servidor local
node tools/shots.js ./__shots            # capturar as telas e checar erros
node tools/flow-test.js ./__shots        # percurso completo, com verificações
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

## Limites conhecidos

- Os dados vivem no `localStorage` do Safari daquele iPhone. Se o app ficar
  meses sem ser aberto, o iOS pode limpar o armazenamento de sites — por isso
  vale exportar o backup de vez em quando.
- As calorias são estimativa grosseira (tempo de treino ajustado pelo peso
  corporal, mais uma parcela do volume levantado), não medição.
- As fotos são genéricas: mostram o movimento, não necessariamente o aparelho da
  sua academia.
