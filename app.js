// Jell-O Shot Flag Planner
// Each grid cell = one Jell-O shot. Paint colors, generate a US flag,
// and read off how many of each color you need to make.

const COLORS = [
  { id: 'red',   name: 'Red',   hex: '#b22234' },
  { id: 'white', name: 'White', hex: '#ffffff' },
  { id: 'blue',  name: 'Blue',  hex: '#3c3b6e' },
];

const EMPTY = null;
const TARGET = 250; // shots you plan to make
const STORAGE_KEY = 'jelloFlag.layout.v1';

const state = {
  cols: 25,
  rows: 10,
  cells: [],        // flat array, length cols*rows, each entry = color id or null
  selected: 'red',  // selected paint id, or 'eraser'
  painting: false,
};

// --- DOM refs ---
const els = {
  grid: document.getElementById('grid'),
  palette: document.getElementById('palette'),
  cols: document.getElementById('cols'),
  rows: document.getElementById('rows'),
  applyGrid: document.getElementById('applyGrid'),
  genFlag: document.getElementById('genFlag'),
  clearGrid: document.getElementById('clearGrid'),
  saveLocal: document.getElementById('saveLocal'),
  loadLocal: document.getElementById('loadLocal'),
  exportPng: document.getElementById('exportPng'),
  totalCount: document.getElementById('totalCount'),
  targetNote: document.getElementById('targetNote'),
  tallyList: document.getElementById('tallyList'),
};

const colorById = (id) => COLORS.find((c) => c.id === id);

// --- Palette ---
function buildPalette() {
  els.palette.innerHTML = '';
  COLORS.forEach((c) => {
    const sw = document.createElement('button');
    sw.className = 'swatch' + (state.selected === c.id ? ' selected' : '');
    sw.style.background = c.hex;
    sw.title = c.name;
    sw.setAttribute('aria-label', c.name);
    sw.addEventListener('click', () => selectColor(c.id));
    els.palette.appendChild(sw);
  });
  const eraser = document.createElement('button');
  eraser.className = 'swatch eraser' + (state.selected === 'eraser' ? ' selected' : '');
  eraser.title = 'Eraser';
  eraser.setAttribute('aria-label', 'Eraser');
  eraser.addEventListener('click', () => selectColor('eraser'));
  els.palette.appendChild(eraser);
}

function selectColor(id) {
  state.selected = id;
  buildPalette();
}

// --- Grid ---
function buildGrid() {
  els.grid.style.gridTemplateColumns = `repeat(${state.cols}, 1fr)`;
  els.grid.innerHTML = '';
  for (let i = 0; i < state.cols * state.rows; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;
    paintCellEl(cell, state.cells[i]);
    els.grid.appendChild(cell);
  }
  updateTally();
}

function paintCellEl(cell, colorId) {
  const c = colorById(colorId);
  cell.style.background = c ? c.hex : '';
  if (!c) cell.style.removeProperty('background');
}

function applyPaint(index) {
  const value = state.selected === 'eraser' ? EMPTY : state.selected;
  if (state.cells[index] === value) return;
  state.cells[index] = value;
  const cell = els.grid.children[index];
  if (cell) paintCellEl(cell, value);
  updateTally();
}

// --- Tally ---
function updateTally() {
  const counts = {};
  COLORS.forEach((c) => (counts[c.id] = 0));
  let total = 0;
  for (const v of state.cells) {
    if (v && counts[v] !== undefined) {
      counts[v]++;
      total++;
    }
  }

  els.totalCount.textContent = total;

  const note = els.targetNote;
  note.className = '';
  if (total === TARGET) {
    note.textContent = `— right on ${TARGET}! 🎯`;
    note.classList.add('match');
  } else if (total > TARGET) {
    note.textContent = `— ${total - TARGET} over ${TARGET}`;
    note.classList.add('over');
  } else {
    note.textContent = `— ${TARGET - total} to go to ${TARGET}`;
  }

  els.tallyList.innerHTML = '';
  COLORS.forEach((c) => {
    const li = document.createElement('li');
    const chip = document.createElement('span');
    chip.className = 'tally-chip';
    chip.style.background = c.hex;
    const name = document.createElement('span');
    name.className = 'tally-name';
    name.textContent = c.name;
    const num = document.createElement('span');
    num.className = 'tally-num';
    num.textContent = counts[c.id];
    li.append(chip, name, num);
    els.tallyList.appendChild(li);
  });
}

// --- US flag generator ---
// Stripes: 13 bands, red/white alternating, starting + ending red.
// Canton (blue field): top-left, ~7/13 of height tall, ~2/5 of width wide,
// with a scattered white star field.
function generateFlag() {
  const { cols, rows } = state;
  const cantonH = Math.max(1, Math.round(rows * 7 / 13));
  const cantonW = Math.max(1, Math.round(cols * 0.4));

  const cells = new Array(cols * rows).fill(EMPTY);
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const i = r * cols + col;
      const inCanton = r < cantonH && col < cantonW;
      if (inCanton) {
        // star field: white dot on a staggered lattice, else blue
        const isStar = (r % 2 === 0) && (col % 2 === 0);
        cells[i] = isStar && cantonW > 2 && cantonH > 2 ? 'white' : 'blue';
      } else {
        const stripe = Math.floor((r / rows) * 13);
        cells[i] = stripe % 2 === 0 ? 'red' : 'white';
      }
    }
  }
  state.cells = cells;
  buildGrid();
}

// --- Persistence ---
function saveLayout() {
  const payload = { cols: state.cols, rows: state.rows, cells: state.cells };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  flash(els.saveLocal, 'Saved ✓');
}

function loadLayout() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    flash(els.loadLocal, 'Nothing saved');
    return;
  }
  try {
    const data = JSON.parse(raw);
    state.cols = data.cols;
    state.rows = data.rows;
    state.cells = data.cells;
    els.cols.value = state.cols;
    els.rows.value = state.rows;
    buildGrid();
    flash(els.loadLocal, 'Loaded ✓');
  } catch {
    flash(els.loadLocal, 'Load failed');
  }
}

function flash(btn, msg) {
  const original = btn.textContent;
  btn.textContent = msg;
  setTimeout(() => (btn.textContent = original), 1200);
}

// --- Resize / clear ---
function resizeGrid() {
  const newCols = clamp(parseInt(els.cols.value, 10) || 1, 1, 60);
  const newRows = clamp(parseInt(els.rows.value, 10) || 1, 1, 40);
  const old = state.cells;
  const oldCols = state.cols;
  const next = new Array(newCols * newRows).fill(EMPTY);
  // preserve overlapping region
  for (let r = 0; r < newRows; r++) {
    for (let c = 0; c < newCols; c++) {
      if (r < state.rows && c < oldCols) {
        next[r * newCols + c] = old[r * oldCols + c] ?? EMPTY;
      }
    }
  }
  state.cols = newCols;
  state.rows = newRows;
  state.cells = next;
  els.cols.value = newCols;
  els.rows.value = newRows;
  buildGrid();
}

function clearGrid() {
  state.cells = new Array(state.cols * state.rows).fill(EMPTY);
  buildGrid();
}

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

// --- PNG export ---
function exportPng() {
  const cell = 24, gap = 3, pad = 12;
  const w = state.cols * cell + (state.cols - 1) * gap + pad * 2;
  const h = state.rows * cell + (state.rows - 1) * gap + pad * 2;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0f1424';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < state.cells.length; i++) {
    const c = colorById(state.cells[i]);
    const col = i % state.cols;
    const row = Math.floor(i / state.cols);
    const x = pad + col * (cell + gap);
    const y = pad + row * (cell + gap);
    ctx.fillStyle = c ? c.hex : '#232a47';
    ctx.beginPath();
    ctx.arc(x + cell / 2, y + cell / 2, cell / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  const link = document.createElement('a');
  link.download = 'jello-flag.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// --- Pointer painting ---
function indexFromEvent(e) {
  const target = e.target.closest('.cell');
  if (!target) return -1;
  return parseInt(target.dataset.index, 10);
}

els.grid.addEventListener('pointerdown', (e) => {
  const i = indexFromEvent(e);
  if (i < 0) return;
  e.preventDefault();
  state.painting = true;
  // right-click erases regardless of selected color
  if (e.button === 2) {
    const prev = state.selected;
    state.selected = 'eraser';
    applyPaint(i);
    state.selected = prev;
  } else {
    applyPaint(i);
  }
});

els.grid.addEventListener('pointerover', (e) => {
  if (!state.painting) return;
  const i = indexFromEvent(e);
  if (i >= 0) applyPaint(i);
});

window.addEventListener('pointerup', () => (state.painting = false));
els.grid.addEventListener('contextmenu', (e) => e.preventDefault());

// --- Wire up controls ---
els.applyGrid.addEventListener('click', resizeGrid);
els.genFlag.addEventListener('click', generateFlag);
els.clearGrid.addEventListener('click', clearGrid);
els.saveLocal.addEventListener('click', saveLayout);
els.loadLocal.addEventListener('click', loadLayout);
els.exportPng.addEventListener('click', exportPng);

// --- Init ---
state.cells = new Array(state.cols * state.rows).fill(EMPTY);
buildPalette();
generateFlag(); // start with a flag so the page is never blank
