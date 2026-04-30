
// ─── PROPERTY DETAIL ─────────────────────────────────────────────────────────────
function openProperty(id) {
  const all = getAllProperties();
  const p = all.find(x => x.id === id);
  if (!p) return;
  openId = id;
  
  const addr0 = (p.address || '').split(',')[0];
  const addrRest = (p.address || '').split(',').slice(1).join(',').trim();
  
  document.getElementById('panelTitle').textContent = addr0;
  document.getElementById('panelSub').textContent = addrRest + (p.flip ? ' · ' + p.flip : '');
  
  const tags = document.getElementById('panelTags');
  tags.innerHTML =
    '<span class="sbadge ' + sbCls(p.stage) + '" style="font-size:12px;padding:3px 10px;">' + esc(p.stage || 'No Stage') + '</span>' +
    (p.subStatus ? '<span class="subbadge" style="font-size:11px;padding:3px 8px;background:rgba(255,255,255,0.2);color:white;">' + esc(p.subStatus) + '</span>' : '') +
    '<span class="psm-pill ' + psmCls(p.psm) + '" style="padding:3px 9px;font-size:11px;">' + esc(p.psm || '—') + '</span>' +
    (p.allocated === 'TRUE' ? '<span style="background:#D1FAE5;color:#065F46;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;">✓ Allocated</span>' : '');
  
  renderPanelBody(p);
  document.getElementById('overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function renderPanelBody(p) {
  const notes = getNotes(p.id);
  const events = buildTimeline(p, notes);
  
  document.getElementById('panelBody').innerHTML =
    // Move Stage
    '<div class="sec">' +
    '<div class="sec-title">Move Stage</div>' +
    '<div class="stage-move-grid">' +
    STAGE_ORDER.map(s => {
      const active = p.stage === s ? ' active-stage' : '';
      return '<button class="smove-btn' + active + '" data-s="' + esc(s) + '" onclick="moveStage(\'' + p.id.replace(/'/g,"\\'") + '\',\'' + s.replace(/'/g,"\\'") + '\')">' + esc(s || 'No Stage') + '</button>';
    }).join('') +
    '</div></div>' +
    
    // Property Info
    '<div class="sec"><div class="sec-title">Property Info</div>' +
    '<div class="info-grid">' +
    iItem('Market', p.market) +
    iItem('Flip ID', p.flip, true) +
    iItem('List Price', p.listPrice) +
    iItem('Contract Price', p.contractPrice) +
    iItem('Active Date', p.activeDate) +
    iItem('Contract Date', p.contractDate) +
    iItem('Close Date', p.closeDate) +
    iItem('DTP', p.dtp) +
    iItem('Partner DOM', p.partnerDom) +
    iItem('OD DOM', p.odDom) +
    iItem('Last Check-in', p.dateCheckin) +
    (p.adminStatus ? iItem('Admin Status', p.adminStatus) : '') +
    '</div>' +
    (p.slackLink ? '<div style="margin-top:10px;"><a class="link-btn" href="' + esc(p.slackLink) + '" target="_blank">💬 Slack Thread</a></div>' : '') +
    (p.adminLink ? '<div style="margin-top:6px;"><a class="link-btn" href="' + esc(p.adminLink) + '" target="_blank">🔗 Admin</a></div>' : '') +
    '</div>' +
    
    // Agent
    '<div class="sec"><div class="sec-title">Agent</div>' +
    '<div class="info-grid">' +
    iItem('Name', p.agent) +
    iItem('Phone', p.agentPhone) +
    '<div class="info-item full"><label>Email</label>' +
    (p.agentEmail ? '<span class="val"><a href="mailto:' + esc(p.agentEmail) + '" style="color:var(--od-green);">' + esc(p.agentEmail) + '</a></span>' : '<span class="val empty">—</span>') +
    '</div></div></div>' +
    
    // Timeline
    '<div class="sec"><div class="sec-title">Notes &amp; Timeline</div>' +
    '<div class="timeline" id="tl">' + renderTimeline(events) + '</div></div>' +
    
    // Add note
    '<div class="sec"><div class="sec-title">Add Note</div>' +
    '<div style="display:flex;gap:8px;margin-bottom:8px;">' +
    '<input type="date" class="note-date" id="noteDate" value="' + today() + '">' +
    '</div>' +
    '<div style="display:flex;gap:8px;align-items:flex-end;">' +
    '<textarea class="note-ta" id="noteTa" placeholder="Add a note or update…"></textarea>' +
    '<button class="btn btn-primary" onclick="addNote()" style="align-self:flex-end;white-space:nowrap;">Add Note</button>' +
    '</div></div>' +
    
    // Danger zone
    '<div class="sec">' +
    '<div class="sec-title">Actions</div>' +
    (isUserProp(p.id) ? '<button class="btn btn-danger btn-sm" onclick="deleteProperty(\'' + p.id.replace(/'/g,"\\'") + '\')">Delete Property</button>' : '<span style="font-size:12px;color:#9CA3AF;">Sheet properties cannot be deleted here.</span>') +
    '</div>';
}

function iItem(label, val, mono) {
  const empty = !val;
  return '<div class="info-item"><label>' + esc(label) + '</label>' +
    '<span class="val' + (empty ? ' empty' : '') + '" style="' + (mono ? 'font-family:monospace;font-size:11px;' : '') + '">' + esc(val || '—') + '</span></div>';
}

function isUserProp(id) {
  return getUserProps().some(p => p.id === id);
}

function buildTimeline(p, notes) {
  const evts = [];
  const dateFields = [
    {label:'Active Date', date:p.activeDate},
    {label:'Contract Date', date:p.contractDate},
    {label:'Close Date', date:p.closeDate},
    {label:'Last Check-in', date:p.dateCheckin},
  ];
  dateFields.forEach(f => { if (f.date) evts.push({date:f.date, text:f.label, type:'date'}); });
  if (p.notes) evts.push({date:p.dateCheckin||'', text:p.notes, type:'note', src:'sheet'});
  notes.forEach((n, i) => evts.push({date:n.date, text:n.text, type:'note', src:'user', idx:i}));
  evts.sort((a, b) => { if (!a.date && !b.date) return 0; if (!a.date) return 1; if (!b.date) return -1; return a.date.localeCompare(b.date); });
  return evts;
}

function renderTimeline(evts) {
  if (!evts.length) return '<div style="color:#9CA3AF;font-size:12px;padding:6px 0;">No events yet.</div>';
  return evts.map(e => {
    const isNote = e.type === 'note';
    const dot = '<div class="t-dot' + (isNote ? ' note' : '') + '"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' + (isNote ? '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>' : '<circle cx="12" cy="12" r="4"/>') + '</svg></div>';
    const del = (e.src === 'user') ? '<div class="t-del" onclick="delNote(' + e.idx + ')">Delete</div>' : '';
    return '<div class="t-item">' + dot +
      '<div class="t-content">' +
      (e.date ? '<div class="t-date">' + esc(e.date) + '</div>' : '') +
      '<div class="t-text">' + esc(e.text) + '</div>' + del +
      '</div></div>';
  }).join('');
}

function addNote() {
  if (!openId) return;
  const ta = document.getElementById('noteTa');
  const dt = document.getElementById('noteDate');
  const text = ta.value.trim();
  if (!text) return;
  const notes = getNotes(openId);
  notes.push({date: dt.value || today(), text});
  saveNotes(openId, notes);
  ta.value = '';
  const all = getAllProperties();
  const p = all.find(x => x.id === openId);
  const evts = buildTimeline(p, notes);
  document.getElementById('tl').innerHTML = renderTimeline(evts);
  refresh();
}

function delNote(idx) {
  if (!openId) return;
  const notes = getNotes(openId);
  notes.splice(idx, 1);
  saveNotes(openId, notes);
  const all = getAllProperties();
  const p = all.find(x => x.id === openId);
  const evts = buildTimeline(p, notes);
  document.getElementById('tl').innerHTML = renderTimeline(evts);
  refresh();
}

function moveStage(id, newStage) {
  setOverriddenStage(id, newStage);
  const all = getAllProperties();
  const p = all.find(x => x.id === id);
  if (p) {
    const tags = document.getElementById('panelTags');
    tags.innerHTML =
      '<span class="sbadge ' + sbCls(p.stage) + '" style="font-size:12px;padding:3px 10px;">' + esc(p.stage || 'No Stage') + '</span>' +
      (p.subStatus ? '<span class="subbadge" style="font-size:11px;padding:3px 8px;background:rgba(255,255,255,0.2);color:white;">' + esc(p.subStatus) + '</span>' : '') +
      '<span class="psm-pill ' + psmCls(p.psm) + '" style="padding:3px 9px;font-size:11px;">' + esc(p.psm || '—') + '</span>';
    renderPanelBody(p);
  }
  refresh();
}

function deleteProperty(id) {
  if (!confirm('Delete this property? This cannot be undone.')) return;
  const user = getUserProps().filter(p => p.id !== id);
  saveUserProps(user);
  closePanel();
  refresh();
}

function removePropertyRow(id, trEl, event) {
  event.stopPropagation();
  trEl.classList.add('row-removing');
  trEl.addEventListener('animationend', () => {
    if (isUserProp(id)) {
      saveUserProps(getUserProps().filter(p => p.id !== id));
    } else {
      hideProperty(id);
    }
    refresh();
  }, { once: true });
}

// ─── ADD PROPERTY ─────────────────────────────────────────────────────────────────
function openAddModal(stage) {
  if (stage) document.getElementById('f-stage').value = stage;
  document.getElementById('addModal').classList.add('open');
}
function openAddModalForStage(stage) { openAddModal(stage); }
function closeAddModal() { document.getElementById('addModal').classList.remove('open'); }
function handleModalBg(e) { if (e.target === document.getElementById('addModal')) closeAddModal(); }

function saveNewProperty() {
  const addr = document.getElementById('f-address').value.trim();
  const psm = document.getElementById('f-psm').value;
  if (!addr) { alert('Address is required.'); return; }
  if (!psm) { alert('Please select a PSM.'); return; }
  
  const flip = document.getElementById('f-flip').value.trim();
  const id = flip || ('user_' + Date.now());
  
  const prop = {
    id, address: addr, flip: flip || '',
    market: document.getElementById('f-market').value.trim(),
    psm,
    stage: document.getElementById('f-stage').value,
    subStatus: '', agent: document.getElementById('f-agent').value.trim(),
    agentPhone: document.getElementById('f-agentPhone').value.trim(),
    agentEmail: document.getElementById('f-agentEmail').value.trim(),
    slackLink: document.getElementById('f-slackLink').value.trim(),
    adminLink: '', allocated: document.getElementById('f-allocated').value,
    activeDate: document.getElementById('f-activeDate').value,
    contractDate: '', dtp: '', closeDate: '',
    listPrice: document.getElementById('f-listPrice').value.trim(),
    contractPrice: '', partnerDom: '', odDom: '', dateCheckin: '',
    notes: document.getElementById('f-notes').value.trim(),
    adminStatus: '', statusMatch: '',
  };
  
  const user = getUserProps();
  user.push(prop);
  saveUserProps(user);
  
  ['f-address','f-flip','f-market','f-agent','f-agentPhone','f-agentEmail','f-slackLink','f-listPrice','f-notes'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('f-psm').value = '';
  document.getElementById('f-stage').value = '';
  document.getElementById('f-allocated').value = '';
  document.getElementById('f-activeDate').value = '';
  
  closeAddModal();
  populateMarkets();
  refresh();
  openProperty(prop.id);
}

// ─── PANEL / MODAL CONTROLS ───────────────────────────────────────────────────────
function closePanel() {
  document.getElementById('overlay').classList.remove('open');
  document.body.style.overflow = '';
  openId = null;
}
function handleOverlayBg(e) { if (e.target === document.getElementById('overlay')) closePanel(); }

// ─── SORT ─────────────────────────────────────────────────────────────────────
document.querySelectorAll('th[data-sort]').forEach(th => {
  th.addEventListener('click', () => {
    const key = th.dataset.sort;
    if (sortKey === key) { sortDir *= -1; }
    else { sortKey = key; sortDir = 1; }
    document.querySelectorAll('th[data-sort]').forEach(t => { t.classList.remove('sort-asc','sort-desc'); });
    th.classList.add(sortDir === 1 ? 'sort-asc' : 'sort-desc');
    refresh();
  });
});

// ─── VIEW ─────────────────────────────────────────────────────────────────────
function setView(v) {
  view = v;
  ['Table','Cards','Kanban'].forEach(x => document.getElementById('v'+x).classList.remove('active'));
  document.getElementById('v' + v.charAt(0).toUpperCase() + v.slice(1)).classList.add('active');
  document.getElementById('tableView').style.display = v === 'table' ? '' : 'none';
  document.getElementById('cardsView').style.display = v === 'cards' ? '' : 'none';
  document.getElementById('kanbanView').style.display = v === 'kanban' ? '' : 'none';
  refresh();
}

// ─── MAIN REFRESH ──────────────────────────────────────────────────────────────
function refresh() {
  const filtered = getFiltered();
  document.getElementById('topCount').textContent = filtered.length + ' of ' + getAllProperties().length + ' properties';
  buildStageStrip();
  
  const empty = filtered.length === 0;
  document.getElementById('emptyState').style.display = empty ? '' : 'none';
  
  if (view === 'table') {
    document.getElementById('tableView').style.display = empty ? 'none' : '';
    if (!empty) renderTable(filtered);
  } else if (view === 'cards') {
    document.getElementById('cardsView').style.display = empty ? 'none' : '';
    if (!empty) renderCards(filtered);
  } else if (view === 'kanban') {
    document.getElementById('kanbanView').style.display = empty ? 'none' : '';
    if (!empty) renderKanban(filtered);
  }
}

// ─── EVENT LISTENERS ──────────────────────────────────────────────────────────
document.getElementById('searchInput').addEventListener('input', e => { searchQ = e.target.value; refresh(); });
document.getElementById('psmFilter').addEventListener('change', e => { filterPSM = e.target.value; refresh(); });
document.getElementById('marketFilter').addEventListener('change', e => { filterMarket = e.target.value; refresh(); });
document.getElementById('allocFilter').addEventListener('change', e => { filterAlloc = e.target.value; refresh(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closePanel(); closeAddModal(); } });

// ─── INIT ─────────────────────────────────────────────────────────────────────────────
populateMarkets();
refresh();

function updateHeaderHeight() {
  const topbar = document.querySelector('.topbar');
  const controls = document.querySelector('.controls-bar');
  const strip = document.querySelector('.stage-strip');
  const main = document.querySelector('.main');
  const h = (topbar ? topbar.offsetHeight : 0) +
            (controls ? controls.offsetHeight : 0) +
            (strip ? strip.offsetHeight : 0) +
            (main ? parseInt(getComputedStyle(main).paddingTop) + parseInt(getComputedStyle(main).paddingBottom) : 32);
  document.documentElement.style.setProperty('--header-h', h + 'px');

  const tbH = topbar ? topbar.offsetHeight : 54;
  const cbH = controls ? controls.offsetHeight : 45;
  if (strip) strip.style.top = (tbH + cbH) + 'px';
}
updateHeaderHeight();
window.addEventListener('resize', updateHeaderHeight);
