import './styles/main.css';
import { createStore } from './state/store.js';
import { DEFAULTS } from './state/defaults.js';
import { loadState, readLink, readLocal, saveState, sameProject } from './state/persist.js';
import { derive } from './model/index.js';
import { Viewer } from './three/viewer.js';
import { Sidebar } from './ui/sidebar.js';
import { Report } from './ui/report.js';
import { printReport } from './ui/print.js';
import { ICONS } from './ui/icons.js';
import { fmt } from './ui/dom.js';
import { profileLabel } from './model/catalog.js';

const $ = (sel) => document.querySelector(sel);

const initial = loadState();
const store = createStore(initial.state);

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
const report = new Report($('#drawer'), {
  onSelect: select,
  onHover: (gid) => viewer.rig.setHover(gid),
  onToggle: (open, covered) => viewer.setBottomInset(open ? covered : 0),
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

$('#btn-reset').addEventListener('click', () => {
  if (!confirm('Voltar todas as opções para o padrão?')) return;
  store.replace({ ...DEFAULTS, prices: { ...DEFAULTS.prices }, owned: {} });
  setView('perspectiva');
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

document.addEventListener('mf:reframe', () => setView(viewer.view));

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
  tip.innerHTML = `<b>${piece.letter}</b> ${piece.name}<span>${profileLabel(piece.profile)} · ${fmt(piece.length)} mm · ${piece.ends.map((e) => e.cut + '°').join(' / ')}</span>`;
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

function render(first = false) {
  queued = false;
  const state = store.get();
  current = derive(state);
  const structure = current.model.pieces.map((p) => p.key).join();
  viewer.update(current, state, { animate: !first && structure !== lastStructure, reframe: first });
  lastStructure = structure;
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
  // o render está agendado no próximo frame; este callback roda logo depois dele
  requestAnimationFrame(() => {
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
  applyProject(readLocal() ?? { ...DEFAULTS }, { fromLink: false });
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
