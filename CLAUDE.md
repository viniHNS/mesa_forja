# MesaForja: contexto para agentes

Gerador de estruturas em metalon (tubo quadrado/retangular). Mostra preview 3D, lista de cortes, plano de corte das barras (bin packing 1D), custos e um PDF para impressão. Publicado em <https://vinihns.github.io/mesa_forja/> via GitHub Pages.

O app é **modular por tipo de projeto**. Hoje existem "Mesa 4 pés" (`mesa`, o padrão) e "Carrinho" (`carrinho`, carrinho auxiliar com bandejas e rodízios). A arquitetura foi feita para receber outros tipos (estantes e prateleiras, assentos). Veja "Como adicionar um tipo de projeto".

Tudo é em **português (pt-BR)**: UI, comentários, mensagens de commit e nomes de campos do estado. Mantenha isso.

## Regras que não são óbvias

- **Commits são do usuário.** Não faça commit nem push. Deixe as mudanças no working tree e resuma o que mudou.
- **Mantenha este arquivo atualizado.** Tudo o que for adicionado ou removido (feature, correção, convenção, ponto de atenção resolvido) deve ser refletido aqui.
- **Existem duas versões.** Esta é a avulsa (Vite + JS puro, visual skeuomórfico). A outra está no portfólio do autor (React + TS + R3F, rota `/tools/metalon`, deploy na Vercel) e tem a lógica da mesa portada para TS.
  - Mudanças no cálculo (`src/projects/mesa/generate.js` e `src/model/`) precisam ser replicadas lá. Avise o usuário sempre que mexer no cálculo.
  - A versão do portfólio **não** foi modularizada e só tem a mesa. O carrinho existe só aqui.
- **Local do projeto:** `C:\Users\UsuarioPc\Documents\projetos\metalon`. Desde 30/09/2026 ele não fica mais no Google Drive; a cópia antiga em `H:\Meu Drive\projetos\projetos-metalon` está abandonada.
- **Sem `npm install` e sem `node_modules`.** Essa regra nasceu quando a pasta ficava no Google Drive e continua valendo até o usuário decidir o contrário. Os scripts rodam o Vite via `npx --yes vite@8.3.1`, e o Three.js 0.170 vem da CDN jsDelivr. O plugin em `vite.config.js` troca `three` e `three/addons/...` pelos URLs da CDN e injeta um importmap. Não adicione dependências npm. Se precisar de uma lib, use a mesma estratégia de CDN.
- **Unidades.** O modelo trabalha em **mm**. A cena 3D usa `root.scale = 0.001` (metros).
- **Medida das peças com 45°** é sempre na **ponta maior**.
- **Preços dos perfis são por metro** (`meterPrices`). O custo de cada barra é R$/m × tamanho da barra.

## Comandos

```bash
npm run dev      # http://localhost:5173
npm test         # node --test tests/*.test.js (sem dependências)
npm run build    # dist/
npm run preview
node tests/fixtures/make-snapshot.js   # regrava o snapshot de regressão (só quando mudar o cálculo de propósito)
```

O CI (`.github/workflows/deploy.yml`, Node 22) roda `npm test` e depois `npm run build` a cada push na `main` e publica no Pages. Um teste quebrado impede o deploy.

## Arquitetura

```
index.html          marcação estática: HUD, #viewport, #controls, #drawer, <dialog id="about">, #print-root, aviso de link
src/main.js         orquestrador: store, Viewer, Sidebar, Report, HUD, ciclo de render, projeto por link, troca de tipo
src/projects/       UM MÓDULO POR TIPO DE PROJETO
  index.js          registro: PROJECTS (o primeiro é o padrão), getProject(id)
  mesa/
    index.js        descritor da mesa (ver "Descritor de um tipo")
    generate.js     cálculo das peças da mesa (antigo model/table.js)
    sections.js     seções da barra lateral da mesa
    summary.js      título e linhas de resumo do PDF
    options.js      opções de montagem (sob/passante, 45°/reto, travessas) usadas na sidebar e no PDF
  carrinho/         mesmos arquivos. 4 colunas sobre rodízios, N bandejas (quadro entre as colunas + placa por
                    cima, distribuídas por igual), reforços por bandeja e alça em U opcional (lado +X, cantos 45°)
src/model/          cálculo GENÉRICO e puro (sem DOM, sem Three), coberto por testes
  catalog.js        PROFILES (a = lado menor, b = lado maior), CHAPAS, DEFAULT_METER_PRICES, FINISHES, TOP_MATERIALS
                    (inclui 'chapa', pintada com o acabamento no 3D), CASTERS/getCaster (rodízios 3", 4", 5"), BAR_PRESETS
  profiles.js       resolveProfiles(project, params) e usedProfiles: perfil único ou um por função (roles);
                    usedProfiles ignora funções escondidas pelo `when` (travessa desligada, sem alça)
  cutlist.js        buildCutList: agrupa peças iguais (gid = nome|perfil|comprimento|cortes), dá letras A, B, C…, ordena pelos grupos do tipo
  cutting.js        planCuts: expande as peças × qty, emenda as maiores que a barra, testa best-fit e first-fit e fica com o melhor
  costs.js          computeCosts: barras a comprar (menos `owned`), sapatas e rodízios (model.feet), tampas (openEnds),
                    linhas extras do tipo, consumíveis, peso
  index.js          derive(state) → { project, params, profiles, model, cutList, plan, costs, warnings }
src/state/
  schema.js         regras de validação: num, oneOf, bool, record; sanitizeWith(schema, raw, defaults)
  defaults.js       VERSION, DEFAULTS (type + projects + compartilhado), SCHEMA (campos compartilhados) e ruleFor(path)
  persist.js        sanitize (migra e valida), link #m=<base64url>, localStorage 'mesaforja:state', sameProject, MIGRATIONS
  store.js          store mínimo: get / set(path com ponto) / merge / replace / subscribe / rule(path) (= ruleFor)
src/three/          viewer (cena, câmera, vistas, enquadramento, picking, snapshot com cotas, dispose), rig.js (ProjectRig:
                    malhas, explodir, realce, montagem), tube.js (tubo oco com ponta em 45°), dimensions.js (cotas de
                    model.dimLines), sparks.js
src/anim/tween.js   tweens globais (cancel()), avançados dentro do loop do Viewer; respeita prefers-reduced-motion
src/ui/
  dom.js            h() (hyperscript), esc() (escape HTML), fmt, fmtMoney, fmtKg, pulse, countTo
  controls.js       fábricas slider/stepper/segmented/toggle/swatches/note/dynamic; cada uma devolve { el, update(state, derived) };
                    slider e stepper tiram os limites do schema (store.rule)
  sections.js       seções comuns a todos os tipos (presets, perfil, acabamento, barras, custos) + helpers when/money/sectionContext
  sidebar.js        monta as seções do tipo atual e refaz quando o tipo muda; seletor de tipo só com 2+ tipos; painéis abertos por tipo
  report.js         gaveta com stats e abas acessíveis (cortes / plano / custos); cutListHTML, planHTML, costsHTML (reaproveitados no PDF)
  print.js          monta #print-root (A4 deitado) a partir do summary do tipo e chama window.print(); limpa no afterprint
  options.js        PROFILE_OPTIONS, optionText, perfilText, chapaOf/chapaText, nounFor
  icons.js          strings SVG
src/styles/         main.css importa base, controls, stage, report, about e print. Tokens em :root (base.css). Só tema escuro.
tests/
  model.test.js       medidas da mesa, plano de corte, custos
  carrinho.test.js    medidas do carrinho, alça, rodízios nos custos, usedProfiles, link
  persist.test.js     validação, migração v1→v2, link (diff recursivo), ruleFor
  projects.test.js    contrato de TODO tipo registrado (roda sozinho para tipos novos)
  regression.test.js  compara com fixtures/mesa-v1.json (resultado da mesa antes da modularização)
  fixtures/           cases.js (casos + projeção comparada), make-snapshot.js, mesa-v1.json
```

### Estado (versão 2)

```js
{
  v: 2,
  type: 'mesa',                        // tipo atual (precisa existir no registro)
  projects: { mesa: { length, ... } }, // parâmetros de cada tipo; cada tipo lembra os seus
  qty, chapa, finish, showPanels,      // compartilhado entre os tipos
  barLength, kerf, trim, owned, meterPrices, feetPrice, casterPrice, capPrice, extras,
}
```

- Os controles gravam com `store.set('projects.mesa.length', v)`. Nas seções, use `ctx.p('length')` para montar o caminho e `ctx.P(state)` para ler os parâmetros do tipo.
- **Link** (`#m=`): leva só `v`, o tipo atual, o compartilhado e `projects[tipoAtual]`, sempre como diff contra os padrões. O diff é recursivo: de objetos como `meterPrices`, `owned` e `roleProfiles` vão só os itens que mudaram, e `sanitize` completa o resto com o padrão. Com o projeto padrão, a URL fica limpa.
- **localStorage**: guarda todos os tipos.
- **Tudo o que vem de fora passa por `sanitize`**: migra, descarta chaves desconhecidas e aplica `SCHEMA` e o `schema` de cada tipo. Números são limitados às faixas; strings fora do catálogo voltam ao padrão. Isso protege os `innerHTML`.
- **Mudou o formato?** Suba `VERSION` em `defaults.js` e acrescente `MIGRATIONS[versãoAntiga]` em `persist.js`. Dados sem `v` são da v1: campos da mesa soltos, `showTop`, `frameProfile/legProfile/stretcherProfile` e, mais antigo ainda, `prices` por barra.

### Fluxo de dados

1. Um controle chama `store.set(caminho, valor)`.
2. O `subscribe` em `main.js` agenda `render()` no próximo `requestAnimationFrame`, uma vez por frame.
3. `render()` faz `derive(state)` e passa o resultado para `viewer.update`, `sidebar.update` e `report.render`. Depois salva a URL e o localStorage com debounce de 300 ms.
4. O viewer anima a entrada das peças novas quando a estrutura muda (a lista de `piece.key`). Quando o *tipo* muda, reenquadra a câmera e toca a montagem.

Qualquer ação que dependa da geometria nova (reenquadrar, `playAssembly`) precisa rodar **depois** do render. Use `afterRender` (um rAF) em `main.js`.

### Enquadramento da câmera (viewer.js)

- **`fitDistance(dir, alvo, { w, h })`:** projeta na câmera os cantos de `bounds.size` e os pontos das `dimLines` e devolve a distância em que tudo cabe na área w × h, com margens em px para os rótulos. Serve para qualquer proporção de tela (celular incluso).
- **Área visível:** é o canvas menos o que cobre a parte de baixo. `main.js` (`updateInset`) soma a gaveta, inteira quando aberta ou só a faixa `--peek` (report.css) quando fechada, e, até 1180 px, o grupo de vistas do HUD que fica acima dela. `report.js` lê `--peek` do CSS, não da posição atual, que pode estar no meio da transição. As faixas de largura repetem as de `stage.css`.
- **`keepFit`:** quando a área visível muda (gaveta, janela), a distância é multiplicada pela razão entre o encaixe novo e o antigo. O zoom do usuário é mantido e nada sai da tela. Uma troca de vista em andamento recalcula o destino a cada quadro.
- **Snapshot do PDF:** `frameFor` também desloca o alvo para centralizar o desenho na imagem. As linhas das cotas do WebGL (sempre 1 px) são escondidas e redesenhadas no canvas 2D, grossas e em laranja escuro, junto com os rótulos.

### Descritor de um tipo (`src/projects/<id>/index.js`)

| Campo | Para quê |
|---|---|
| `id`, `label`, `noun: ['mesa', 'mesas']` | identificação e textos ("Quantidade de mesas", "Por mesa") |
| `defaults`, `schema` | parâmetros do tipo e a validação deles; as chaves precisam ser iguais nos dois |
| `roles: [{ id, label, short, when? }]` | funções de perfil. Com "mesmo perfil" desligado, a sidebar mostra um seletor por função (`when(params)` esconde); `defaults.roleProfiles` tem um perfil por função |
| `groups: { id: { label, color, explode? } }` | grupos de peças: a ordem define a ordem na lista de cortes; a cor aparece no relatório; `explode: { spread, lift }` define a direção na vista explodida |
| `assembly?: [...]` | ordem da animação de montagem (grupos + `'sapata'` + `'placa'`) |
| `presets: [{ id, label, sub, values }]` | "Modelos rápidos" (valores parciais dos parâmetros) |
| `generate(params, { profiles, chapa })` | devolve o modelo (abaixo) |
| `costs?(params, model, qty)` | linhas extras de custo (ex.: tampo) |
| `sections(ctx)` | lista ordenada de seções da sidebar (reaproveite `src/ui/sections.js`) |
| `summary(params, derived)` | `{ title, rows: [[rótulo, valor]] }` para o PDF (texto puro) |

**Modelo devolvido por `generate`:**
- `pieces`: tubos retos em mm. Coordenadas: X = comprimento, Y = altura (chão = 0), Z = largura (frente = +Z).
  - `key` estável;
  - `name`, `group` e `profile`;
  - `axis`, `start` (centro da seção na ponta de menor coordenada) e `length`;
  - `sec` (medida da seção nos outros dois eixos);
  - `ends`: `{ cut: 90, weld, foot?, open? }` ou `{ cut: 45, plane, long }`.
- `panels: [{ key, name, size, center, material }]`: tampo, prateleiras, assento. `material` é um id de `TOP_MATERIALS`.
- `feet: [{ x, z, sx, sz, kind?, caster? }]`: pés, que também contam no custo.
  - Sem `kind`: sapata (bloco preto no 3D, preço `feetPrice`).
  - `kind: 'rodizio'` com `caster` (id de `CASTERS`): rodízio desenhado pelo rig, preço `casterPrice`. A altura do rodízio (`h`) é descontada pelo próprio tipo no `generate`.
  - A seção de custos só mostra o preço de sapata ou de rodízio quando o modelo tem aquele pé.
- `bounds: { size: [X, Y, Z], base?: [bx, bz] }`: `size` serve para o enquadramento e a sombra; `base` é a pegada da estrutura, usada na vista explodida.
- `dimLines: [{ from, to, tick, value, ext? }]`: as cotas desenhadas no 3D e no PDF.
- `welds`, `openEnds`, `warnings`.
- Campos extras próprios do tipo são permitidos (a mesa devolve `dims`, usado no `summary`). Nada genérico pode depender deles.

`buildCutList` acrescenta `gid` e `letter` às peças, mutando-as.

### Plano de corte (cutting.js)

- **Disco:** cada corte consome `kerf`.
- **Refilo:** `trim` é descartado no início da barra.
- **Perda do 45°:** a primeira peça com 45° de cada barra perde um triângulo (`miterDepth` = seção no plano do corte). As seguintes aproveitam o ângulo.
- **Emendas:** peças maiores que `barLength - trim` são divididas em partes iguais e geram um aviso.
- **Critério de escolha:** menos barras; no empate, a maior sobra reaproveitável.

### Link do projeto (main.js + persist.js)

- **Abrir um link:** o projeto de `#m=...` carrega em modo `viewingLink` e **não** grava no localStorage até a primeira edição. Assim o projeto salvo do visitante não é apagado.
- **Voltar:** o botão "Voltar ao meu projeto" restaura o projeto do localStorage.
- **Trocas internas:** `applying = true` marca trocas feitas pelo próprio app (`applyProject`) para que não contem como edição.
- **Link colado na mesma aba:** tratado pelo evento `hashchange`. `saveState` usa `replaceState`, que não dispara `hashchange`.

## Como adicionar um tipo de projeto

1. Crie `src/projects/<id>/` com `index.js` (descritor), `generate.js`, `sections.js` e `summary.js`. Copie a estrutura da mesa.
2. Registre em `src/projects/index.js` (`PROJECTS = [mesa, novo]`). Com dois ou mais tipos, o seletor "Tipo de projeto" aparece sozinho na sidebar.
3. Reaproveite em `sections(ctx)` as seções de `src/ui/sections.js`: `presetsSection`, `perfilSection(ctx, extras)`, `acabamentoSection`, `barrasSection`, `custosSection(ctx, extras)` e `qtyControl`. Escreva só as seções próprias.
4. Opções com texto usado na sidebar e no PDF ficam em `src/projects/<id>/options.js`.
5. Rode `npm test`: `tests/projects.test.js` valida o contrato do tipo novo (defaults × schema, presets, modelo bem formado sem avisos, summary). Acrescente testes das medidas em um `tests/<id>.test.js`.
6. O formato do estado não muda (é só uma chave nova em `projects`), então não precisa de migração.
7. Atualize este arquivo e o README.

**Fora do escopo por enquanto:** cortes em ângulos diferentes de 45° e 90° (ex.: encosto inclinado). O formato de `ends` deixa espaço para isso, mas nem `tube.js` nem o plano de corte tratam outros ângulos.

## Convenções

- Estilo do código: ES modules, 2 espaços, aspas simples, com ponto e vírgula, arrow functions, comentários curtos em pt-BR explicando o *porquê*.
- HTML é montado com template strings e `innerHTML`. **Todo texto variável deve passar por `esc()`** (`src/ui/dom.js`). Números passam por `fmt*`. Para perfil e chapa, use `perfilText` e `chapaText` (`src/ui/options.js`), que não quebram com valores inválidos.
- Um campo compartilhado novo entra em `DEFAULTS` e em `SCHEMA` (`defaults.js`). Um campo de um tipo entra em `defaults` e em `schema` do descritor. Os links só gravam o diff contra os padrões, então mudar um padrão muda o resultado de links antigos que não definiam aquele campo. Isso vale também para itens de objetos: um link que só mudou o preço do 20x30 pega o preço padrão novo dos outros perfis.
- **Os limites dos controles vêm do `schema`.** `slider` e `stepper` consultam `store.rule(path)` e nunca gravam valor fora da faixa validada.
  - Nas seções, passe `min`/`max` só para estreitar o trilho do slider (ex.: comprimento 400–2800).
  - Passe `hardMax` só quando o teto digitável depender do estado (ex.: altura da travessa).
  - O visor aceita até o máximo do schema.
  - Para mudar uma faixa, mude o `schema`.
- Um perfil novo exige mudanças em `PROFILES` e `DEFAULT_METER_PRICES` (`catalog.js`).
- Acessibilidade:
  - controles com label ligado ao input;
  - grupos com `aria-labelledby`;
  - `aria-pressed` e `aria-selected` nos estados;
  - `inert` em conteúdo recolhido;
  - elementos clicáveis focáveis e ativáveis por Enter/Espaço.

  Mantenha esse padrão ao criar controles.
- Não há linter nem formatter configurado. Siga o estilo do arquivo.
- Mensagens de commit (escritas pelo usuário) em pt-BR.

## Pontos de atenção conhecidos (setembro de 2026)

- No snapshot do PDF, as linhas das cotas são desenhadas no 2D por cima de tudo, sem teste de profundidade. Hoje as cotas ficam fora da estrutura e isso não aparece, mas uma cota que passe atrás de uma peça seria desenhada por cima dela.
- Mudar as medidas não reenquadra a câmera. Só a altura do alvo acompanha a altura do projeto. Uma mesa muito maior pode sair da tela até o usuário escolher uma vista ou aplicar um modelo rápido.
- As faixas de largura do HUD (900 e 1180 px) estão em `stage.css` e em `updateInset` (`main.js`). Se mudar uma, confira a outra.
- Plano de barras: a palavra "sobra" some abaixo de 86 px e o número abaixo de 34 px (container query em `report.css`). O valor completo fica no `title`.
- Carrinho: no 3D as placas das bandejas de baixo e do meio são caixas inteiras que atravessam as colunas. O recorte dos cantos só aparece no texto (sidebar e PDF).
- Carrinho: a alça sai sempre para o lado direito (+X). Como `bounds.size` é centrado, o enquadramento conta a saída dos dois lados e sobra um pouco de espaço à esquerda.
- Carrinho: na vista explodida, todos os quadros sobem juntos (o `explode` é por grupo, não por nível).
