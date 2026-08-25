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
| [js/store.js](js/store.js) | Estado, persistência, sessões, estatísticas |
| [js/ui.js](js/ui.js) | Ícones, navegação em pilha, gráficos, folhas modais |
| [js/app.js](js/app.js) | As telas |
| [sw.js](sw.js) | Cache offline (rede primeiro, cache como reserva) |
| [tools/make-icons.js](tools/make-icons.js) | Gera os PNGs do ícone sem dependências |
| [tools/seed.js](tools/seed.js) | Cria `__seed.html` com dados de demonstração |
| [tools/shots.js](tools/shots.js) | Percorre as telas no Chrome headless e salva PNGs |
| [tools/flow-test.js](tools/flow-test.js) | Teste de fumaça do percurso completo, de app vazio a treino salvo |

Nenhuma dependência, nenhum build. Editar um arquivo e recarregar já basta.

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

As abas *Amigos* e *Nutrição* estão como espaço reservado.

## Manutenção

```bash
node tools/make-icons.js                 # regerar ícones
node tools/seed.js                       # gerar dados de teste em __seed.html
python -m http.server 8099 &             # servidor local
node tools/shots.js ./__shots            # capturar as telas e checar erros
node tools/flow-test.js ./__shots        # percurso completo, com verificações
```

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
- As miniaturas dos exercícios são ícones por grupo muscular, não ilustrações
  de execução.
