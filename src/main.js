import './styles/main.css';
import { createStore } from './state/store.js';
import { DEFAULTS, ruleFor } from './state/defaults.js';
import { loadState, readLink, readLocal, saveState, sameProject } from './state/persist.js';
import { derive } from './model/index.js';
import { Viewer } from './three/viewer.js';
import { Sidebar } from './ui/sidebar.js';
import { Report } from './ui/report.js';
import { printReport } from './ui/print.js';
import { ICONS } from './ui/icons.js';
import { esc, fmt } from './ui/dom.js';
import { perfilText } from './ui/options.js';

// o store nunca muta o estado, mas o padrão é compartilhado: cada uso ganha uma cópia
const defaults = () => structuredClone(DEFAULTS);

const $ = (sel) => document.querySelector(sel);

const initial = loadState();
const store = createStore(initial.state, { rule: ruleFor });

// Projeto aberto por link: fica só na URL até a primeira edição, para não apagar o
// projeto que o visitante tinha salvo neste navegador.
let viewingLink = initial.source === 'link';
// Verdadeiro enquanto o próprio app troca o projeto (link colado, voltar): não é edição.
let applying = false;
const viewer = new Viewer($('#viewport'));
const sidebar = new Sidebar($('#controls'), store);

let selected = null;
const select = (gid) => {
  selected = gid;
  viewer.rig.setSelected(gid);
  report.setSelected(gid);
};
// Altura do 3D coberta embaixo: a gaveta e, em telas até 1180 px, o grupo de vistas do HUD,
// que fica logo acima dela (no celular ele some com a gaveta aberta). Mesmas faixas do
// stage.css. O 3D enquadra o projeto e as cotas só na área que sobra.
const hudBottom = { narrow: matchMedia('(max-width: 900px)'), mid: matchMedia('(max-width: 1180px)') };
let drawer = { open: false, covered: 0 };
const updateInset = () => {
  const { open, covered } = drawer;
  const hudShown = hudBottom.mid.matches && !(open && hudBottom.narrow.matches);
  viewer.setBottomInset(covered + (hudShown ? $('.hud-right').offsetHeight + 14 : 0));
};
Object.values(hudBottom).forEach((mq) => mq.addEventListener('change', updateInset));
const report = new Report($('#drawer'), {
  onSelect: select,
  onHover: (gid) => viewer.rig.setHover(gid),
  onToggle: (open, covered) => {
    drawer = { open, covered };
    updateInset();
  },
});

// ---- HUD
document.querySelectorAll('[data-icon]').forEach((el) => (el.innerHTML = ICONS[el.dataset.icon] + el.innerHTML));

const viewBtns = document.querySelectorAll('[data-view]');
const setView = (name) => {
  viewer.setView(name);
  viewBtns.forEach((b) => b.classList.toggle('is-on', b.dataset.view === name));
};
viewBtns.forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));

const dimsBtn = $('#btn-dims');
dimsBtn.addEventListener('click', () => {
  const on = !dimsBtn.classList.contains('is-on');
  dimsBtn.classList.toggle('is-on', on);
  viewer.dims.setVisible(on);
});

const explode = $('#explode');
explode.addEventListener('input', () => {
  const v = Number(explode.value) / 100;
  explode.style.setProperty('--p', `${explode.value}%`);
  viewer.rig.setExplode(v);
});

$('#btn-assemble').addEventListener('click', () => {
  explode.value = 0;
  explode.style.setProperty('--p', '0%');
  viewer.rig.setExplode(0);
  viewer.rig.playAssembly();
});

$('#btn-print').addEventListener('click', () => {
  printReport(store.get(), current, viewer.snapshot());
});

const toast = (msg) => {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.remove('is-on');
  void t.offsetWidth;
  t.classList.add('is-on');
};

$('#btn-link').addEventListener('click', async () => {
  saveState(store.get(), { local: !viewingLink });
  try {
    await navigator.clipboard.writeText(location.href);
    toast('Link do projeto copiado');
  } catch {
    prompt('Copie o link do projeto:', location.href);
  }
});

// Reenquadrar depende do tamanho novo da mesa, que só existe depois do render agendado
// pelo store. Um rAF pedido depois do store.* roda depois desse render.
const afterRender = (fn) => requestAnimationFrame(fn);

$('#btn-reset').addEventListener('click', () => {
  if (!confirm('Voltar todas as opções para o padrão?')) return;
  store.replace(defaults());
  afterRender(() => setView('perspectiva'));
});

// Sobre: <dialog> nativo (Esc e foco já vêm prontos). A classe is-closing segura o
// elemento aberto até a animação de saída terminar.
const about = $('#about');
const closeAbout = () => {
  if (!about.open || about.classList.contains('is-closing')) return;
  about.classList.add('is-closing');
  const done = () => {
    about.classList.remove('is-closing');
    about.close();
  };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) done();
  else about.addEventListener('animationend', done, { once: true });
};
$('#btn-about').addEventListener('click', () => about.showModal());
about.addEventListener('cancel', (e) => {
  e.preventDefault();
  closeAbout();
});
about.addEventListener('click', (e) => {
  // clique no fundo escurecido (fora da placa) ou no botão de fechar
  if (e.target === about || e.target.closest('[data-close]')) closeAbout();
});

// disparado pelos presets da sidebar logo depois do store.merge
document.addEventListener('mf:reframe', () => afterRender(() => setView(viewer.view)));

// Tooltip sobre as peças no 3D
const tip = $('#tooltip');
viewer.addEventListener('hover', (e) => {
  const { piece, x, y } = e.detail;
  report.setHover(piece?.gid ?? null);
  if (!piece) {
    tip.classList.remove('is-on');
    return;
  }
  const r = $('#stage').getBoundingClientRect();
  tip.innerHTML = `<b>${esc(piece.letter)}</b> ${esc(piece.name)}<span>${esc(perfilText(piece.profile))} · ${fmt(piece.length)} mm · ${piece.ends.map((e) => esc(e.cut) + '°').join(' / ')}</span>`;
  tip.style.transform = `translate(${x - r.left + 14}px, ${y - r.top + 14}px)`;
  tip.classList.add('is-on');
});
viewer.addEventListener('select', (e) => {
  const gid = e.detail.gid;
  select(gid && gid === selected ? null : gid);
  if (gid) report.setTab('cortes', true);
});

// ---- Ciclo de atualização
let current = null;
let queued = false;
let saveTimer;
let lastStructure = '';
let lastType = null;

function render(first = false) {
  queued = false;
  const state = store.get();
  // outro tipo de projeto: as peças antigas (e a seleção) não fazem mais sentido
  const typeChanged = !first && state.type !== lastType;
  if (typeChanged && selected) select(null);
  current = derive(state);
  const structure = `${state.type}:${current.model.pieces.map((p) => p.key).join()}`;
  viewer.update(current, state, { animate: !first && !typeChanged && structure !== lastStructure, reframe: first || typeChanged });
  if (typeChanged) viewer.rig.playAssembly();
  lastStructure = structure;
  lastType = state.type;
  sidebar.update(state, current);
  report.render(current, state);
  $('#hud-warn').classList.toggle('is-on', current.warnings.length > 0);
  $('#hud-warn').title = current.warnings.join('\n');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveState(state, { local: !viewingLink }), 300);
}

store.subscribe(() => {
  if (viewingLink && !applying) {
    // primeira edição: o projeto do link passa a ser o do visitante
    viewingLink = false;
    hideLinkNotice();
  }
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => render());
});

$('#hud-warn').addEventListener('click', () => report.setTab('cortes', true));

// ---- Projeto aberto por link
const notice = $('#link-notice');
const backBtn = $('#link-back');
let noticeTimer;

function showLinkNotice() {
  const local = readLocal();
  const canGoBack = Boolean(local) && !sameProject(local, store.get());
  backBtn.hidden = !canGoBack;
  notice.hidden = false;
  notice.classList.remove('is-leaving');
  clearTimeout(noticeTimer);
  // sem projeto salvo para onde voltar, o aviso é só informativo: some sozinho
  if (!canGoBack) noticeTimer = setTimeout(hideLinkNotice, 6000);
}

function hideLinkNotice() {
  clearTimeout(noticeTimer);
  if (notice.hidden || notice.classList.contains('is-leaving')) return;
  notice.classList.add('is-leaving');
  setTimeout(() => {
    notice.hidden = true;
    notice.classList.remove('is-leaving');
  }, 250);
}

// Troca o projeto inteiro sem contar como edição, reenquadra e remonta a mesa.
function applyProject(state, { fromLink }) {
  select(null);
  applying = true;
  store.replace(state);
  applying = false;
  viewingLink = fromLink;
  afterRender(() => {
    setView(viewer.view);
    viewer.rig.playAssembly();
  });
}

// Link colado na mesma aba: só o trecho depois do # muda e a página não recarrega.
window.addEventListener('hashchange', () => {
  const link = readLink();
  if (!link || sameProject(link, store.get())) return;
  applyProject(link, { fromLink: true });
  showLinkNotice();
});

backBtn.addEventListener('click', () => {
  applyProject(readLocal() ?? defaults(), { fromLink: false });
  hideLinkNotice();
});
$('#link-close').addEventListener('click', hideLinkNotice);

render(true);
viewer.setView('perspectiva', false);
requestAnimationFrame(() => {
  document.body.classList.add('is-ready');
  setTimeout(() => viewer.rig.playAssembly(), 450);
  if (viewingLink) setTimeout(showLinkNotice, 700);
});
