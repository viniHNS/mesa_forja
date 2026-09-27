# MesaForja

**No ar:** <https://vinihns.github.io/mesa_forja/>

> Existem duas versões. Esta é a **avulsa** (Vite + JS puro, visual skeuomórfico), publicada no
> GitHub Pages. A outra vive no portfólio (React + TypeScript + R3F, deploy na Vercel), na rota
> `/tools/metalon`, com o visual neo-brutalista do site. A lógica de cálculo é a mesma nas duas
> (lá foi portada para TypeScript): uma correção no cálculo precisa ir para os dois lados.

Gerador de estruturas de mesa em metalon (tubo quadrado/retangular), com preview 3D, lista de cortes, plano de corte das barras e custo estimado.

## O que faz

- **Mesa 4 pés**: comprimento, largura, altura total e quantidade de mesas.
- **Perfis**: 20×20, 20×30, 30×30, 20×40, 30×40, 40×40, 30×50 e 50×50, nas chapas #20, #18, #16 e #14. Dá para usar um perfil só ou um perfil diferente para pernas, quadro e travessas.
- **Montagem e união**: quadro sobre as pernas com cantos a 45° (meia-esquadria) ou retos (topo), ou pernas até o tampo. Também tem reforços sob o tampo e travessa inferior (laterais, U, H ou perímetro).
- **Plano de corte**: barras de 2 m por padrão, com opção de 1; 1,5; 3; 6 m ou outro tamanho. Desconta a espessura do disco, o refilo e a perda do primeiro corte a 45°, emenda as peças maiores que a barra e desconta as barras que você já tem.
- **Custos**: preço por barra de cada perfil, sapatas, tampas de ponta, consumíveis e tampo.
- **Extras**: vista explodida, animação de montagem com faíscas de solda, cotas, vistas (3D/frente/lado/topo), link compartilhável (o projeto fica salvo na URL) e impressão/PDF.
- **Link do projeto**: abrir ou colar o link de outra pessoa carrega o projeto dela sem apagar o seu. O seu projeto só é substituído quando você edita o do link, e até lá o botão "Voltar ao meu projeto" traz o seu de volta.

As medidas das peças com 45° são sempre na **ponta maior**.

## Rodar localmente

Precisa de Node 20 ou mais novo.

```bash
npm run dev      # servidor de desenvolvimento em http://localhost:5173
npm test         # testes do cálculo (node:test)
npm run build    # gera o site estático em dist/
npm run preview  # serve o dist/
```

Não há `npm install`: os scripts rodam o Vite via `npx` (que fica no cache do npm, fora da pasta do projeto) e o Three.js vem da CDN jsDelivr. Isso evita um `node_modules` dentro do Google Drive.

## Stack

- Vite (build), JavaScript puro, CSS puro
- Three.js 0.170 via CDN (import map injetado pelo `vite.config.js`)

```
src/
  model/   cálculo puro: geração das peças, lista de cortes, bin packing, custos
  three/   cena 3D, geometria dos tubos (ocos, com corte 45°), faíscas, cotas
  ui/      barra lateral, controles, relatório, impressão
  state/   estado, padrões e persistência (URL + localStorage)
  styles/  visual skeuomórfico (painéis de metal, LCDs, teclas)
```

## Publicar no GitHub Pages

1. Crie o repositório e envie o código para a branch `main`.
2. No GitHub, vá em **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. O workflow `.github/workflows/deploy.yml` roda os testes, faz o build e publica.

O `base: './'` do Vite faz o site funcionar em qualquer nome de repositório.
