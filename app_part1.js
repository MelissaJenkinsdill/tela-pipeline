// ─── DATA ───────────────────────────────────────────────────────────────────
// SHEET_PROPS loaded from data.js

const STAGE_ORDER = ['Acq Closing','Reno','Pre-Listing','Active','Under Contract','Recruiting','Recruiting (HOLD)',''];

const STAGE_COLORS = {
  'Acq Closing':'#7C3AED','Reno':'#D97706','Pre-Listing':'#2563EB',
  'Active':'#059669','Under Contract':'#DC2626',
  'Recruiting':'#6B7280','Recruiting (HOLD)':'#6B7280','':'#E5E7EB'
};

const PSM_INITIALS = {
  'Melissa Jenkins-Dill': 'MJ',
  'Jackson Upcheshaw': 'JU',
  'Shea Helland': 'SH',
  'Suliman Sarwar': 'SS',
  'Melissa Giersz': 'MG',
  'Alexis Schlattman': 'AS',
  'Spencer Jenkins': 'SpJ',
  'Internal Closed': 'INT'
};

// ─── STATE ───────────────────────────────────────────────────────────────────
let view = 'table';
let filterStage = '__all__';
let filterPSM = '';
let filterMarket = '';
let filterAlloc = '';
let searchQ = '';
let sortKey = '';
let sortDir = 1;
let openId = null;

// ─── LOCAL STORAGE ───────────────────────────────────────────────────────────
const LS_PROPS_KEY   = 'tela_user_props';
const LS_NOTES_KEY   = 'tela_notes_';
const LS_STAGES_KEY  = 'tela_stages_';
const LS_HIDDEN_KEY  = 'tela_hidden';

function getUserProps() {
  try { return JSON.parse(localStorage.getItem(LS_PROPS_KEY) || '[]'); } catch(e) { return []; }
}
function saveUserProps(arr) {
  try { localStorage.setItem(LS_PROPS_KEY, JSON.stringify(arr)); } catch(e) {}
}
function getNotes(id) {
  try { return JSON.parse(localStorage.getItem(LS_NOTES_KEY + id) || '[]'); } catch(e) { return []; }
}
function saveNotes(id, arr) {
  try { localStorage.setItem(LS_NOTES_KEY + id, JSON.stringify(arr)); } catch(e) {}
}
function getOverriddenStage(id) {
  try { return localStorage.getItem(LS_STAGES_KEY + id) || null; } catch(e) { return null; }
}
function setOverriddenStage(id, stage) {
  try { localStorage.setItem(LS_STAGES_KEY + id, stage); } catch(e) {}
}
function getHidden() {
  try { return new Set(JSON.parse(localStorage.getItem(LS_HIDDEN_KEY) || '[]')); } catch(e) { return new Set(); }
}
function hideProperty(id) {
  const h = getHidden(); h.add(id);
  try { localStorage.setItem(LS_HIDDEN_KEY, JSON.stringify([...h])); } catch(e) {}
}
function restoreProperty(id) {
  const h = getHidden(); h.delete(id);
  try { localStorage.setItem(LS_HIDDEN_KEY, JSON.stringify([...h])); } catch(e) {}
}

function getAllProperties() {
  const user = getUserProps();
  const hidden = getHidden();
  const all = [...SHEET_PROPS, ...user].filter(p => !hidden.has(p.id));
  return all.map(p => {
    const ov = getOverriddenStage(p.id);
    if (ov !== null) return { ...p, stage: ov };
    return p;
  });
}

// ─── MARKETS ─────────────────────────────────────────────────────────────────
function populateMarkets() {
  const all = getAllProperties();
  const mkts = [...new Set(all.map(p => p.market).filter(Boolean))].sort();
  const sel = document.getElementById('marketFilter');
  sel.innerHTML = '<option value="">All Markets</option>';
  mkts.forEach(m => { const o = document.createElement('option'); o.value = m; o.textContent = m; sel.appendChild(o); });
}

// ─── FILTERING ───────────────────────────────────────────────────────────────
function getFiltered() {
  let props = getAllProperties();
  if (filterStage !== '__all__') props = props.filter(p => p.stage === filterStage);
  if (filterPSM) props = props.filter(p => p.psm === filterPSM);
  if (filterMarket) props = props.filter(p => p.market === filterMarket);
  if (filterAlloc) props = props.filter(p => p.allocated === filterAlloc);
  if (searchQ) {
    const q = searchQ.toLowerCase();
    props = props.filter(p => [p.address, p.agent, p.market, p.flip, p.psm, p.notes, p.agentEmail].join(' ').toLowerCase().includes(q));
  }
  if (sortKey) {
    props.sort((a, b) => {
      const av = (a[sortKey] || '').toString().toLowerCase();
      const bv = (b[sortKey] || '').toString().toLowerCase();
      return av < bv ? -sortDir : av > bv ? sortDir : 0;
    });
  } else {
    // Default sort: by stage order then address
    props.sort((a, b) => {
      const ai = STAGE_ORDER.indexOf(a.stage); const bi = STAGE_ORDER.indexOf(b.stage);
      const ao = ai === -1 ? 99 : ai; const bo = bi === -1 ? 99 : bi;
      if (ao !== bo) return ao - bo;
      return (a.address || '').localeCompare(b.address || '');
    });
  }
  return props;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function sbCls(stage) {
  const m = {'Acq Closing':'s-Acq-Closing','Reno':'s-Reno','Pre-Listing':'s-Pre-Listing','Active':'s-Active','Under Contract':'s-Under-Contract','Recruiting':'s-Recruiting','Recruiting (HOLD)':'s-Recruiting-HOLD'};
  return m[stage] || 's-none';
}
function psmCls(psm) {
  return 'psm-' + (psm || '').replace(/[\s-]/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
}
function today() { return new Date().toISOString().split('T')[0]; }
function hasUserNotes(id) { return getNotes(id).length > 0; }

// ─── STAGE STRIP ─────────────────────────────────────────────────────────────
function buildStageStrip() {
  const all = getAllProperties();
  const counts = {};
  all.forEach(p => { counts[p.stage] = (counts[p.stage] || 0) + 1; });
  const strip = document.getElementById('stageStrip');
  strip.innerHTML = '';
  
  const allChip = document.createElement('span');
  allChip.className = 'schip schip-all' + (filterStage === '__all__' ? ' on' : '');
  allChip.innerHTML = 'All <span class="cnt">' + all.length + '</span>';
  allChip.onclick = () => { filterStage = '__all__'; refresh(); };
  strip.appendChild(allChip);
  
  STAGE_ORDER.forEach(s => {
    if (!counts[s]) return;
    const c = document.createElement('span');
    c.className = 'schip' + (filterStage === s ? ' on' : '');
    c.setAttribute('data-s', s);
    c.innerHTML = esc(s || 'No Stage') + ' <span class="cnt">' + counts[s] + '</span>';
    c.onclick = () => { filterStage = s; refresh(); };
    strip.appendChild(c);
  });
}

// ─── TABLE ───────────────────────────────────────────────────────────────────
function renderTable(props) {
  const tbody = document.getElementById('tableBody');
  tbody.innerHTML = '';
  props.forEach(p => {
    const notes = getNotes(p.id);
    const allNoteText = [p.notes, ...notes.map(n => n.text)].filter(Boolean).join(' • ');
    const hasMark = (p.notes || notes.length > 0) ? '<span class="note-dot" title="Has notes"></span>' : '';
    const addr0 = (p.address || '').split(',')[0];
    const addrRest = (p.address || '').split(',').slice(1).join(',').trim();
    const tr = document.createElement('tr');
    tr.onclick = () => openProperty(p.id);
    tr.innerHTML =
      '<td class="td-addr">' + esc(addr0) + hasMark + '<small>' + esc(addrRest) + (p.flip ? ' · ' + esc(p.flip) : '') + '</small></td>' +
      '<td><span class="sbadge ' + sbCls(p.stage) + '">' + esc(p.stage || '—') + '</span>' + (p.subStatus ? '<span class="subbadge">' + esc(p.subStatus) + '</span>' : '') + '</td>' +
      '<td class="td-psm"><span class="psm-pill ' + psmCls(p.psm) + '">' + esc(PSM_INITIALS[p.psm] || p.psm || '—') + '</span></td>' +
      '<td>' + esc(p.market || '—') + '</td>' +
      '<td>' + esc(p.agent || '—') + '</td>' +
      '<td>' + esc(p.listPrice || '—') + '</td>' +
      '<td>' + esc(p.activeDate || '—') + '</td>' +
      '<td>' + esc(p.closeDate || '—') + '</td>' +
      '<td><span class="dot-alloc ' + (p.allocated === 'TRUE' ? 'y' : 'n') + '" title="' + (p.allocated === 'TRUE' ? 'Allocated' : 'Not allocated') + '"></span></td>' +
      '<td class="td-notes"><span>' + esc(allNoteText.slice(0,90)) + '</span></td>' +
      '<td class="td-del"><button class="row-del" title="Remove property">✕</button></td>';
    // Wire delete button after innerHTML is set
    tr.querySelector('.row-del').addEventListener('click', function(e) {
      removePropertyRow(p.id, tr, e);
    });
    tbody.appendChild(tr);
  });
}

// ─── CARDS ───────────────────────────────────────────────────────────────────
function renderCards(props) {
  const grid = document.getElementById('cardsGrid');
  grid.innerHTML = '';
  props.forEach(p => {
    const notes = getNotes(p.id);
    const allNoteText = [p.notes, ...notes.map(n => n.text)].filter(Boolean).join(' ');
    const hasMark = (p.notes || notes.length > 0) ? '<span class="note-dot" title="Has notes"></span>' : '';
    const addr0 = (p.address || '').split(',')[0];
    const addrRest = (p.address || '').split(',').slice(1).join(',').trim();
    const card = document.createElement('div');
    card.className = 'card';
    card.style.borderTopColor = STAGE_COLORS[p.stage] || '#E5E7EB';
    card.onclick = () => openProperty(p.id);
    card.innerHTML =
      '<div class="card-head">' +
        '<div class="card-addr">' + esc(addr0) + hasMark + '<small>' + esc(addrRest) + '</small></div>' +
        '<span class="sbadge ' + sbCls(p.stage) + '" style="flex-shrink:0;">' + esc(p.stage || '—') + '</span>' +
      '</div>' +
      (p.subStatus ? '<span class="subbadge">' + esc(p.subStatus) + '</span>' : '') +
      '<div class="card-row"><span class="psm-pill ' + psmCls(p.psm) + '">' + esc(p.psm || '—') + '</span> · 📍 ' + esc(p.market || '—') + '</div>' +
      '<div class="card-row">👤 ' + esc(p.agent || '—') + (p.agentPhone ? ' · ' + esc(p.agentPhone) : '') + '</div>' +
      '<div class="card-row">' +
        (p.listPrice ? '<span><strong>' + esc(p.listPrice) + '</strong> list</span>' : '') +
        (p.activeDate ? '<span>Active: <strong>' + esc(p.activeDate) + '</strong></span>' : '') +
        (p.closeDate ? '<span>Close: <strong>' + esc(p.closeDate) + '</strong></span>' : '') +
      '</div>' +
      (allNoteText ? '<div class="card-notes-preview">' + esc(allNoteText.slice(0,100)) + (allNoteText.length > 100 ? '…' : '') + '</div>' : '');
    grid.appendChild(card);
  });
}

// ─── KANBAN ───────────────────────────────────────────────────────────────────
function renderKanban(props) {
  const kb = document.getElementById('kanban');
  kb.innerHTML = '';
  const grouped = {};
  STAGE_ORDER.forEach(s => { grouped[s] = []; });
  props.forEach(p => {
    const s = p.stage || '';
    if (!grouped[s]) grouped[s] = [];
    grouped[s].push(p);
  });
  
  STAGE_ORDER.forEach(stage => {
    const items = grouped[stage] || [];
    const col = document.createElement('div');
    col.className = 'kancol';
    const color = STAGE_COLORS[stage] || '#9CA3AF';
    col.innerHTML =
      '<div class="kancol-head" style="border-top: 3px solid ' + color + ';">' +
        '<span style="color:' + color + ';font-size:12px;">' + esc(stage || 'No Stage') + '</span>' +
        '<span class="kcnt">' + items.length + '</span>' +
      '</div>' +
      '<div class="kancol-body" id="kb-' + stage.replace(/[^a-zA-Z0-9]/g,'-') + '">' +
        items.map(p => {
          const notes = getNotes(p.id);
          const hasMark = (p.notes || notes.length > 0) ? '<span class="note-dot" title="Has notes"></span>' : '';
          const addr0 = (p.address || '').split(',')[0];
          return '<div class="kancard" onclick="openProperty(\'' + p.id.replace(/'/g,"\\'") + '\')">' +
            '<div class="kancard-addr">' + esc(addr0) + hasMark + '</div>' +
            '<div class="kancard-meta">📍 ' + esc(p.market || '—') + '</div>' +
            (p.listPrice ? '<div class="kancard-meta">💰 ' + esc(p.listPrice) + '</div>' : '') +
            '<div><span class="psm-pill ' + psmCls(p.psm) + ' kancard-psm" style="margin-top:5px;">' + esc(PSM_INITIALS[p.psm] || p.psm || '—') + '</span></div>' +
          '</div>';
        }).join('') +
      '</div>' +
      '<div class="kancol-add"><button class="kancol-add-btn" onclick="openAddModalForStage(\'' + esc(stage) + \')">＋ Add property</button></div>';
    kb.appendChild(col);
  });
}
