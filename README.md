<div align="center">

# MesaForja

Gerador de estruturas em metalon (tubo quadrado/retangular) com preview 3D, lista de cortes, plano de corte das barras e custo estimado.

![Version](https://img.shields.io/badge/version-0.1.0-orange?style=flat)
![Deploy](https://img.shields.io/github/actions/workflow/status/viniHNS/mesa_forja/deploy.yml?branch=main&label=deploy&style=flat)
![Node](https://img.shields.io/badge/Node-20+-339933?style=flat&logo=nodedotjs)
![Three.js](https://img.shields.io/badge/Three.js-0.170-black?style=flat&logo=threedotjs)
![License](https://img.shields.io/github/license/viniHNS/mesa_forja?style=flat&color=green)

[Abrir o app](https://vinihns.github.io/mesa_forja/) · [Mesa e carrinho](#tipos-de-projeto) · [8 perfis · 4 chapas](#perfis-e-chapas) · [Plano de corte](#plano-de-corte) · [Rodar localmente](#rodar-localmente)

</div>

---

## Uso

Abra <https://vinihns.github.io/mesa_forja/> no navegador. Não tem cadastro nem instalação: tudo roda no seu navegador e nenhum dado é enviado para servidor.

1. Escolha o tipo de projeto (mesa ou carrinho) e um modelo rápido, ou digite as medidas.
2. Defina o perfil, a chapa e a montagem.
3. Confira o plano de barras e ajuste o tamanho da barra e os preços.
4. Gere o PDF ou copie o link do projeto.

A barra lateral é dividida em painéis (os da mesa; o carrinho troca montagem, travessa e tampo por bandejas, rodízios e alça):

| Painel | O que define |
|---|---|
| Modelos rápidos | Medidas prontas para começar (jantar, escrivaninha, bancada...) |
| Dimensões | Comprimento, largura, altura total (do chão ao topo do tampo) e quantidade de mesas |
| Perfil do metalon | Chapa, um perfil só ou perfis diferentes para pernas, quadro e travessas, lado maior do quadro em pé, pernas giradas 90° |
| Montagem e união | Quadro sobre as pernas ou pernas até o tampo, união dos cantos, reforços sob o tampo |
| Travessa inferior | Formato da travessa e altura do chão |
| Tampo | Material, espessura e sobra (beiral); a espessura entra no cálculo da altura das pernas |
| Acabamento | Cor da pintura do metalon no 3D |
| Barras e corte | Tamanho da barra, espessura do disco, refilo e barras que você já tem |
| Custos | Preço por metro de cada perfil, sapatas ou rodízios, tampas de ponta, consumíveis e tampo |

O resultado aparece na gaveta de relatório, com as abas **cortes**, **plano** e **custos**, e pode ser impresso em A4 deitado (ou salvo em PDF) para levar à oficina.

> Os valores são estimativas. Confira as medidas antes de cortar.

---

## Tipos de projeto

Cada tipo de projeto tem suas medidas, modelos rápidos e opções. O seletor **Tipo de projeto** fica no topo da barra lateral, e cada tipo lembra as próprias medidas. Hoje existem dois: **Mesa 4 pés** e **Carrinho**.

### Mesa 4 pés

**Modelos rápidos**

| Modelo | Medidas (cm) |
|---|---|
| Jantar 4 | 120 × 80 |
| Jantar 6 | 160 × 90 |
| Escrivaninha | 120 × 60 |
| Bancada | 150 × 60 |
| Bistrô | 70 × 70 |
| Centro | 100 × 50 |

**Montagem e união**

| Opção | Valores |
|---|---|
| Montagem | Quadro sobre as pernas · Pernas até o tampo |
| Cantos do quadro | 45° (meia-esquadria) · Reto (topo), escolhendo o lado que passa inteiro |
| Reforços sob o tampo | 0 a 8 travessas internas no quadro |
| Travessa inferior | Sem · Laterais · U (deixa a frente livre) · H · Perímetro |

> As medidas das peças com corte a 45° são sempre tiradas na **ponta maior**.

### Carrinho

Carrinho auxiliar (oficina, cozinha, salão): 4 colunas sobre rodízios e bandejas iguais. Cada bandeja é um quadro de metalon soldado entre as colunas, com a placa por cima. A de baixo fica rente ao pé das colunas, a de cima rente ao topo, e as do meio se distribuem por igual.

**Modelos rápidos**

| Modelo | Medidas (cm) | Bandejas |
|---|---|---|
| Oficina | 75 × 40 × 85 | 3, chapa |
| Compacto | 60 × 35 × 75 | 2, chapa |
| Grande | 90 × 50 × 95 | 4, chapa |
| Cozinha | 70 × 45 × 85 | 3, madeira |
| Salão | 45 × 35 × 85 | 4, MDF branco, sem alça |

**Opções**

| Opção | Valores |
|---|---|
| Bandejas | 1 a 6, placa de chapa de aço, madeira, MDF ou vidro, espessura e 0 a 3 reforços por bandeja |
| Rodízios | 3", 4" ou 5"; a altura do rodízio entra na altura total |
| Alça | Em U, de metalon, no lado direito, com cantos a 45° e saída ajustável (opcional) |

> A altura total vai do chão ao topo da bandeja de cima, com os rodízios. As placas das bandejas de baixo e do meio levam recorte nos 4 cantos para passar as colunas.

### Perfis e chapas

| Perfis (mm) | Chapas |
|---|---|
| 20×20, 20×30, 30×30, 20×40, 30×40, 40×40, 30×50, 50×50 | #20 (0,9 mm) · #18 (1,2 mm) · #16 (1,5 mm) · #14 (1,9 mm) |

Dá para usar um perfil só na estrutura toda (menos tipos de barra para comprar) ou um perfil diferente para cada função: pernas, quadro e travessas na mesa; colunas, quadros e alça no carrinho.

### Plano de corte

As peças são distribuídas nas barras gastando o mínimo possível. A barra padrão é de 2 m, com atalhos para 1; 1,5; 3 e 6 m ou qualquer tamanho entre 0,5 e 6 m.

| Regra | Como entra no cálculo |
|---|---|
| Disco | Cada corte consome a espessura do disco |
| Refilo | Descarte no início de cada barra (ponta amassada ou torta) |
| Perda do 45° | A primeira peça com 45° de cada barra perde um triângulo; as seguintes aproveitam o ângulo |
| Emendas | Peças maiores que a barra são divididas em partes iguais e geram um aviso |
| Barras que você já tem | Descontadas das barras a comprar |

> Entre as combinações testadas, fica a que usa menos barras. No empate, vence a que deixa a maior sobra reaproveitável.

### Custos

Os preços dos perfis são **por metro**. O custo de cada barra é `R$/m × tamanho da barra`, então trocar o tamanho da barra não exige rever os preços. O relatório também mostra peso do aço, metros de tubo e pontos de solda.

### Link do projeto

O projeto inteiro fica salvo na URL (`#m=...`) e no navegador.

- Abrir ou colar o link de outra pessoa carrega o projeto dela **sem apagar o seu**. O seu só é substituído quando você edita o projeto do link; até lá, o botão **Voltar ao meu projeto** traz o seu de volta.
- Links são validados: campos desconhecidos e valores fora do catálogo são descartados, e números fora da faixa são trazidos para dentro dela.

> Links antigos, de quando o preço era por barra, são convertidos para preço por metro ao abrir.

### Extras

Vista explodida, animação de montagem com faíscas de solda, cotas, vistas 3D / frente / lado / topo e impressão em PDF.

---

## Duas versões

| Versão | Stack | Visual | Deploy |
|---|---|---|---|
| Avulsa (este repositório) | Vite + JavaScript puro + Three.js | Skeuomórfico | GitHub Pages |
| Portfólio (rota `/tools/metalon`) | React + TypeScript + R3F | Neo-brutalista | Vercel |

A lógica de cálculo é a mesma nas duas (no portfólio ela foi portada para TypeScript).

> Uma correção no cálculo precisa ir para os dois lados.

---

## Rodar localmente

**Requisitos:** Node 20+

```sh
git clone https://github.com/viniHNS/mesa_forja
cd mesa_forja
```

```sh
npm run dev      # servidor de desenvolvimento em http://localhost:5173
npm test         # testes do cálculo e da persistência (node:test)
npm run build    # gera o site estático em dist/
npm run preview  # serve o dist/
```

> Não há `npm install`. Os scripts rodam o Vite via `npx` (que fica no cache do npm, fora da pasta do projeto) e o Three.js 0.170 vem da CDN jsDelivr, por um import map que o `vite.config.js` injeta. Isso evita um `node_modules` dentro do Google Drive.

---

## Estrutura

```
mesa_forja/
├── index.html
├── vite.config.js
├── src/
│   ├── projects/     um módulo por tipo de projeto (mesa/, carrinho/) e o registro dos tipos
│   ├── model/        cálculo genérico: lista de cortes, plano de corte, custos
│   ├── three/        cena 3D, tubos ocos com corte 45°, placas, rodízios, faíscas, cotas
│   ├── ui/           barra lateral, seções comuns, controles, relatório, impressão
│   ├── state/        estado, validação, migração e persistência (URL + localStorage)
│   ├── anim/         tweens
│   └── styles/       visual skeuomórfico (painéis de metal, LCDs, teclas)
└── tests/            testes com node:test, sem dependências (inclui regressão e contrato dos tipos)
```

> Para adicionar um tipo de projeto, crie `src/projects/<id>/` seguindo a mesa e registre em `src/projects/index.js`. O passo a passo está no [CLAUDE.md](CLAUDE.md#como-adicionar-um-tipo-de-projeto).

---

## Publicar no GitHub Pages

### 1. Envie o código

Crie o repositório e envie o código para a branch `main`.

### 2. Ative o Pages

No GitHub, vá em **Settings → Pages → Build and deployment → Source: GitHub Actions**.

### 3. Deixe o workflow publicar

O workflow **Deploy no GitHub Pages** (`.github/workflows/deploy.yml`) roda a cada push na `main`:

- [x] `npm test`
- [x] `npm run build`
- [x] publica o `dist/` no Pages

> Um teste quebrado impede o deploy. O `base: './'` do Vite faz o site funcionar com qualquer nome de repositório.

---

## Links

| Recurso | URL |
|---|---|
| App no ar | https://vinihns.github.io/mesa_forja/ |
| Código-fonte | https://github.com/viniHNS/mesa_forja |
| Autor (Vinicius Hissayoshi Nishida) | https://github.com/viniHNS |
| Three.js | https://threejs.org/ |
| Vite | https://vite.dev/ |
