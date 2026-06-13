// Jell-O Shot Layout Planner
// Each active grid cell = one Jell-O shot. Pick a shape, paint any colors,
// and read off how many of each color you need to make.
//
// Cell values are stored as hex color strings (or null for empty), so the
// palette can hold any colors the user adds.

const DEFAULT_PALETTE = [
  { hex: '#b22234', name: 'Red' },
  { hex: '#ffffff', name: 'White' },
  { hex: '#3c3b6e', name: 'Blue' },
];
const DEFAULT_COUNT = DEFAULT_PALETTE.length;

const EMPTY = null;
const ERASER = 'eraser';
const STORAGE_KEY = 'jelloFlag.layout.v2';

const SHAPES = [
  { id: 'rectangle', label: 'Rectangle ▭' },
  { id: 'circle',    label: 'Circle ⬤' },
  { id: 'star',      label: 'Star ★' },
  { id: 'heart',     label: 'Heart ♥' },
  { id: 'triangle',  label: 'Triangle ▲' },
  { id: 'diamond',   label: 'Diamond ◆' },
];

const state = {
  cols: 25,
  rows: 10,
  shape: 'rectangle',
  target: 250,
  cells: [],          // hex string or null, length cols*rows
  active: [],         // boolean per cell, derived from shape mask
  palette: DEFAULT_PALETTE.map((c) => ({ ...c })),
  selected: '#b22234',
  painting: false,
  strength: 0.25,   // traditional (1.5 oz) shots' worth of liquor per Jell-O shot
  yieldPerBox: 10,  // jello shots produced by one 3 oz box
  tallyRows: [],    // [{hex, name, n}] computed by updateTally, used by liquor calc
};

// Recipe + unit constants (baseline: breadboozebacon.com vodka jello shots)
const SHOT_OZ = 1.5;       // one traditional shot
const CUP_OZ = 8;          // fluid ounces per cup
const BOTTLE_750_OZ = 25.36;
const HANDLE_OZ = 59.17;   // 1.75 L
const NONBOIL_CUP_OZ = CUP_OZ; // boiling water is fixed at 1 cup/box; the other cup
                               // is split between vodka and cold water

// --- DOM refs ---
const els = {
  grid: document.getElementById('grid'),
  shapes: document.getElementById('shapes'),
  palette: document.getElementById('palette'),
  cols: document.getElementById('cols'),
  rows: document.getElementById('rows'),
  target: document.getElementById('target'),
  applyGrid: document.getElementById('applyGrid'),
  addColor: document.getElementById('addColor'),
  colorInput: document.getElementById('colorInput'),
  genFlag: document.getElementById('genFlag'),
  clearGrid: document.getElementById('clearGrid'),
  saveLocal: document.getElementById('saveLocal'),
  loadLocal: document.getElementById('loadLocal'),
  exportPng: document.getElementById('exportPng'),
  totalCount: document.getElementById('totalCount'),
  targetNote: document.getElementById('targetNote'),
  tallyList: document.getElementById('tallyList'),
  strength: document.getElementById('strength'),
  strengthReadout: document.getElementById('strengthReadout'),
  strengthRatio: document.getElementById('strengthRatio'),
  yield: document.getElementById('yield'),
  liquorOutput: document.getElementById('liquorOutput'),
  liquorNote: document.getElementById('liquorNote'),
};

const paletteEntry = (hex) =>
  state.palette.find((c) => c.hex.toLowerCase() === String(hex).toLowerCase());
const isDefault = (hex) =>
  DEFAULT_PALETTE.some((c) => c.hex.toLowerCase() === hex.toLowerCase());

// --- Shape masks ---
// Test a cell center, normalized so nx, ny are in (-1, 1). ny grows downward.
function insideShape(shape, col, row, cols, rows) {
  const nx = ((col + 0.5) / cols) * 2 - 1;
  const ny = ((row + 0.5) / rows) * 2 - 1;
  switch (shape) {
    case 'circle':
      return nx * nx + ny * ny <= 1.0;
    case 'diamond':
      return Math.abs(nx) + Math.abs(ny) <= 1.0;
    case 'triangle': // apex at top
      return Math.abs(nx) <= (ny + 1) / 2;
    case 'star':
      return pointInPolygon(nx, ny, starPolygon());
    case 'heart': {
      const X = nx * 1.25;
      const Y = -ny * 1.25; // flip so Y points up
      const t = X * X + Y * Y - 1;
      return t * t * t - X * X * Y * Y * Y <= 0;
    }
    case 'rectangle':
    default:
      return true;
  }
}

let _starPoly = null;
function starPolygon() {
  if (_starPoly) return _starPoly;
  const outer = 1.0;
  const inner = 0.4;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / 5; // 36deg steps
    pts.push([Math.sin(a) * r, -Math.cos(a) * r]); // i=0 -> top point
  }
  _starPoly = pts;
  return pts;
}

function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function recomputeActive() {
  const { cols, rows, shape } = state;
  state.active = new Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const on = insideShape(shape, c, r, cols, rows);
      state.active[i] = on;
      if (!on) state.cells[i] = EMPTY; // clear anything outside the shape
    }
  }
}

// --- Shape buttons ---
function buildShapeButtons() {
  els.shapes.innerHTML = '';
  SHAPES.forEach((s) => {
    const b = document.createElement('button');
    b.className = 'shape-btn' + (state.shape === s.id ? ' selected' : '');
    b.textContent = s.label;
    b.addEventListener('click', () => {
      state.shape = s.id;
      recomputeActive();
      buildShapeButtons();
      buildGrid();
    });
    els.shapes.appendChild(b);
  });
}

// --- Palette ---
function buildPalette() {
  els.palette.innerHTML = '';
  state.palette.forEach((c) => {
    const sw = document.createElement('button');
    sw.className = 'swatch' + (state.selected === c.hex ? ' selected' : '');
    sw.style.background = c.hex;
    sw.title = `${c.name} (double-click to rename` +
      (isDefault(c.hex) ? ')' : ', shift-click to remove)');
    sw.setAttribute('aria-label', c.name);
    sw.addEventListener('click', (e) => {
      if (e.shiftKey && !isDefault(c.hex)) {
        removeColor(c.hex);
      } else {
        selectColor(c.hex);
      }
    });
    sw.addEventListener('dblclick', (e) => {
      e.preventDefault();
      renameColor(c.hex);
    });
    els.palette.appendChild(sw);
  });

  const eraser = document.createElement('button');
  eraser.className = 'swatch eraser' + (state.selected === ERASER ? ' selected' : '');
  eraser.title = 'Eraser';
  eraser.setAttribute('aria-label', 'Eraser');
  eraser.addEventListener('click', () => selectColor(ERASER));
  els.palette.appendChild(eraser);
}

function selectColor(id) {
  state.selected = id;
  buildPalette();
}

function addColor(hex) {
  if (paletteEntry(hex)) {
    selectColor(paletteEntry(hex).hex); // already exists, just select it
    return;
  }
  const name = `Color ${state.palette.length + 1}`;
  state.palette.push({ hex, name });
  selectColor(hex);
}

function removeColor(hex) {
  state.palette = state.palette.filter(
    (c) => c.hex.toLowerCase() !== hex.toLowerCase()
  );
  if (state.selected === hex) state.selected = state.palette[0]?.hex ?? ERASER;
  buildPalette();
  updateTally();
}

function renameColor(hex) {
  const entry = paletteEntry(hex);
  if (!entry) return;
  const name = prompt('Name this color (e.g. flavor):', entry.name);
  if (name && name.trim()) {
    entry.name = name.trim();
    buildPalette();
    updateTally();
  }
}

// --- Grid ---
function buildGrid() {
  els.grid.style.gridTemplateColumns = `repeat(${state.cols}, 1fr)`;
  els.grid.innerHTML = '';
  for (let i = 0; i < state.cols * state.rows; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell' + (state.active[i] ? '' : ' inactive');
    cell.dataset.index = i;
    paintCellEl(cell, state.cells[i]);
    els.grid.appendChild(cell);
  }
  updateTally();
}

function paintCellEl(cell, hex) {
  if (hex) cell.style.background = hex;
  else cell.style.removeProperty('background');
}

function applyPaint(index) {
  if (!state.active[index]) return; // can't paint outside the shape
  const value = state.selected === ERASER ? EMPTY : state.selected;
  if (state.cells[index] === value) return;
  state.cells[index] = value;
  const cell = els.grid.children[index];
  if (cell) paintCellEl(cell, value);
  updateTally();
}

// --- Tally ---
function updateTally() {
  const counts = new Map();
  let total = 0;
  for (let i = 0; i < state.cells.length; i++) {
    const v = state.cells[i];
    if (!state.active[i] || !v) continue;
    counts.set(v, (counts.get(v) || 0) + 1);
    total++;
  }

  els.totalCount.textContent = total;

  const note = els.targetNote;
  const target = state.target;
  note.className = '';
  if (total === target) {
    note.textContent = `— right on ${target}! 🎯`;
    note.classList.add('match');
  } else if (total > target) {
    note.textContent = `— ${total - target} over ${target}`;
    note.classList.add('over');
  } else {
    note.textContent = `— ${target - total} to go to ${target}`;
  }

  // Show every palette color (even at 0), then any painted color not in palette.
  const rows = [];
  const seen = new Set();
  state.palette.forEach((c) => {
    rows.push({ hex: c.hex, name: c.name, n: counts.get(c.hex) || 0 });
    seen.add(c.hex);
  });
  counts.forEach((n, hex) => {
    if (!seen.has(hex)) rows.push({ hex, name: hex.toUpperCase(), n });
  });

  els.tallyList.innerHTML = '';
  rows.forEach((row) => {
    const li = document.createElement('li');
    const chip = document.createElement('span');
    chip.className = 'tally-chip';
    chip.style.background = row.hex;
    const name = document.createElement('span');
    name.className = 'tally-name';
    name.textContent = row.name;
    const num = document.createElement('span');
    num.className = 'tally-num';
    num.textContent = row.n;
    li.append(chip, name, num);
    els.tallyList.appendChild(li);
  });

  state.tallyRows = rows;
  updateLiquor();
}

// --- Liquor & ingredient calculator ---
// Each color = a flavor = its own box(es). Everything scales by whole boxes,
// since you make a full box at a time. Vodka per box comes from the strength
// slider; boiling water is a fixed 1 cup/box and cold water fills the rest of
// the second cup. Past ~0.53 strength there's no water left and it won't set.
function updateLiquor() {
  const strength = state.strength;     // traditional shots per jello shot
  const yld = state.yieldPerBox;

  const vodkaPerShot = strength * SHOT_OZ;          // fl oz of spirit in one shot
  const vodkaPerBox = vodkaPerShot * yld;           // fl oz per box
  const coldPerBox = NONBOIL_CUP_OZ - vodkaPerBox;  // fl oz; negative = won't set
  const willSet = coldPerBox >= 0;

  // strength readouts
  els.strengthReadout.textContent = `${strength.toFixed(2)}× a shot`;
  const perRegular = strength > 0 ? 1 / strength : 0;
  const nice = Number.isInteger(perRegular) ? perRegular : perRegular.toFixed(1);
  els.strengthRatio.textContent =
    `1 Jell-O shot ≈ ${fmtOz(vodkaPerShot)} of spirit — about ${nice} Jell-O shots = 1 regular shot.`;

  // boxes per flavor (only colors actually used)
  const used = state.tallyRows.filter((r) => r.n > 0);
  let totalBoxes = 0;
  const perFlavor = used.map((r) => {
    const boxes = Math.ceil(r.n / yld);
    totalBoxes += boxes;
    return { ...r, boxes };
  });

  const totalVodka = totalBoxes * vodkaPerBox;
  const totalBoil = totalBoxes * CUP_OZ;
  const totalCold = totalBoxes * Math.max(0, coldPerBox);

  const items = [
    {
      icon: '🍮',
      name: 'Jell-O boxes (3 oz)',
      val: `${totalBoxes}`,
      sub: perFlavor.length ? 'one flavor per color →' : 'paint some shots first',
      flavors: perFlavor,
    },
    {
      icon: '🥃',
      name: 'Vodka / spirit',
      val: fmtOz(totalVodka),
      sub: `${fmtCups(totalVodka)} · ${fmtBottles(totalVodka)}`,
    },
    {
      icon: '♨️',
      name: 'Boiling water',
      val: fmtCups(totalBoil),
      sub: `${fmtOz(totalBoil)} (1 cup per box)`,
    },
    {
      icon: '💧',
      name: 'Cold water',
      val: willSet ? fmtCups(totalCold) : '0 cups',
      sub: willSet ? fmtOz(totalCold) : 'none at this strength',
    },
  ];

  els.liquorOutput.innerHTML = '';
  items.forEach((it) => {
    const li = document.createElement('li');
    li.style.flexWrap = 'wrap';

    const icon = document.createElement('span');
    icon.className = 'liquor-icon';
    icon.textContent = it.icon;

    const name = document.createElement('span');
    name.className = 'liquor-name';
    name.textContent = it.name;

    const val = document.createElement('span');
    val.className = 'liquor-val';
    val.innerHTML = `${it.val}<small>${it.sub}</small>`;

    li.append(icon, name, val);

    if (it.flavors && it.flavors.length) {
      const sub = document.createElement('ul');
      sub.className = 'flavor-breakdown';
      sub.style.flexBasis = '100%';
      it.flavors.forEach((f) => {
        const fli = document.createElement('li');
        fli.style.display = 'flex';
        fli.style.alignItems = 'center';
        const dot = document.createElement('span');
        dot.className = 'flavor-dot';
        dot.style.background = f.hex;
        const t = document.createElement('span');
        t.textContent = `${f.name}: ${f.boxes} box${f.boxes === 1 ? '' : 'es'} (${f.n} shots)`;
        fli.append(dot, t);
        sub.appendChild(fli);
      });
      li.appendChild(sub);
    }

    els.liquorOutput.appendChild(li);
  });

  els.liquorNote.className = 'hint';
  if (!willSet) {
    els.liquorNote.classList.add('warn');
    els.liquorNote.textContent =
      '⚠️ Too much spirit to set! At this strength the vodka exceeds 1 cup per box with no water to firm it up. Lower the strength.';
  } else {
    els.liquorNote.textContent =
      `Per box: ${fmtOz(vodkaPerBox)} spirit + ${fmtOz(coldPerBox)} cold water + 1 cup boiling water → ${yld} shots.`;
  }
}

// --- Formatting helpers ---
function fmtOz(oz) {
  return `${round(oz, 1)} fl oz`;
}
function fmtCups(oz) {
  const cups = oz / CUP_OZ;
  return `${round(cups, 2)} cup${cups === 1 ? '' : 's'}`;
}
function fmtBottles(oz) {
  if (oz >= HANDLE_OZ) return `${round(oz / HANDLE_OZ, 1)} handle(s) of 1.75 L`;
  return `${round(oz / BOTTLE_750_OZ, 1)} × 750 mL bottle`;
}
function round(n, places) {
  const p = 10 ** places;
  return Math.round(n * p) / p;
}

// --- US flag generator (fills active cells; ignores cells outside the shape) ---
function generateFlag() {
  const { cols, rows } = state;
  const red = '#b22234', white = '#ffffff', blue = '#3c3b6e';
  // make sure flag colors are in the palette
  [['#b22234', 'Red'], ['#ffffff', 'White'], ['#3c3b6e', 'Blue']].forEach(
    ([hex, name]) => {
      if (!paletteEntry(hex)) state.palette.push({ hex, name });
    }
  );

  const cantonH = Math.max(1, Math.round((rows * 7) / 13));
  const cantonW = Math.max(1, Math.round(cols * 0.4));

  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const i = r * cols + col;
      if (!state.active[i]) { state.cells[i] = EMPTY; continue; }
      const inCanton = r < cantonH && col < cantonW;
      if (inCanton) {
        const isStar = r % 2 === 0 && col % 2 === 0;
        state.cells[i] = isStar && cantonW > 2 && cantonH > 2 ? white : blue;
      } else {
        const stripe = Math.floor((r / rows) * 13);
        state.cells[i] = stripe % 2 === 0 ? red : white;
      }
    }
  }
  buildPalette();
  buildGrid();
}

// --- Persistence ---
function saveLayout() {
  const payload = {
    cols: state.cols,
    rows: state.rows,
    shape: state.shape,
    target: state.target,
    strength: state.strength,
    yieldPerBox: state.yieldPerBox,
    palette: state.palette,
    cells: state.cells,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  flash(els.saveLocal, 'Saved ✓');
}

function loadLayout() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return flash(els.loadLocal, 'Nothing saved');
  try {
    const d = JSON.parse(raw);
    state.cols = d.cols;
    state.rows = d.rows;
    state.shape = d.shape || 'rectangle';
    state.target = d.target || 250;
    state.strength = d.strength ?? 0.25;
    state.yieldPerBox = d.yieldPerBox ?? 10;
    state.palette = d.palette?.length ? d.palette : DEFAULT_PALETTE.map((c) => ({ ...c }));
    state.cells = d.cells;
    state.selected = state.palette[0]?.hex ?? ERASER;
    els.cols.value = state.cols;
    els.rows.value = state.rows;
    els.target.value = state.target;
    els.strength.value = state.strength;
    els.yield.value = state.yieldPerBox;
    recomputeActive();
    buildShapeButtons();
    buildPalette();
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
  const oldRows = state.rows;
  const next = new Array(newCols * newRows).fill(EMPTY);
  for (let r = 0; r < newRows; r++) {
    for (let c = 0; c < newCols; c++) {
      if (r < oldRows && c < oldCols) next[r * newCols + c] = old[r * oldCols + c] ?? EMPTY;
    }
  }
  state.cols = newCols;
  state.rows = newRows;
  state.cells = next;
  els.cols.value = newCols;
  els.rows.value = newRows;
  recomputeActive();
  buildGrid();
}

function clearGrid() {
  state.cells = new Array(state.cols * state.rows).fill(EMPTY);
  buildGrid();
}

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

// --- PNG export (draws active cells as filled circles) ---
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
    if (!state.active[i]) continue;
    const col = i % state.cols;
    const row = Math.floor(i / state.cols);
    const x = pad + col * (cell + gap);
    const y = pad + row * (cell + gap);
    ctx.fillStyle = state.cells[i] || '#232a47';
    ctx.beginPath();
    ctx.arc(x + cell / 2, y + cell / 2, cell / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  const link = document.createElement('a');
  link.download = 'jello-layout.png';
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
  if (e.button === 2) {
    const prev = state.selected;
    state.selected = ERASER;
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
els.target.addEventListener('change', () => {
  state.target = clamp(parseInt(els.target.value, 10) || 1, 1, 2000);
  els.target.value = state.target;
  updateTally();
});
els.strength.addEventListener('input', () => {
  state.strength = parseFloat(els.strength.value);
  updateLiquor();
});
els.yield.addEventListener('change', () => {
  state.yieldPerBox = clamp(parseInt(els.yield.value, 10) || 1, 1, 24);
  els.yield.value = state.yieldPerBox;
  updateLiquor();
});
els.addColor.addEventListener('click', () => els.colorInput.click());
els.colorInput.addEventListener('input', (e) => addColor(e.target.value));
els.genFlag.addEventListener('click', generateFlag);
els.clearGrid.addEventListener('click', clearGrid);
els.saveLocal.addEventListener('click', saveLayout);
els.loadLocal.addEventListener('click', loadLayout);
els.exportPng.addEventListener('click', exportPng);

// --- Init ---
state.cells = new Array(state.cols * state.rows).fill(EMPTY);
recomputeActive();
buildShapeButtons();
buildPalette();
generateFlag(); // start with a flag so the page is never blank
