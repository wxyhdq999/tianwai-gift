import { createGift } from './gift.mjs';
import { createFinale } from './finale.mjs';
import { canArrange, canOpenPackage } from './journey-state.mjs';
import { cities, allRecords, total } from './records.mjs';
import { getGate, puzzleRecords } from './unlocks.mjs';
import { cleanState, isSolved, isUnlocked, unlockAnswer, pieceId, decodePiece, getRecord, placePiece, removePiece, missingSlots } from './puzzle-state.mjs';

const $ = id => document.getElementById(id);
const storageKey = 'tianwai-puzzle-v2';
let state = cleanState(null), storageAvailable = true;
try { state = cleanState(JSON.parse(localStorage.getItem(storageKey) || 'null')); }
catch { storageAvailable = false; }
let currentCity = cities[0], page = 0, flipped = false, selectedPiece = null, showAllPieces = false;
let searchId = puzzleRecords.find(record => !state.collected.includes(record.id))?.id || puzzleRecords[0].id;
let hintLevel = 0;
let toastTimer;
const currentRecord = () => getRecord(`${currentCity.id}:${currentCity.shows[page]}`);
function toast(message) {
  $('toast').textContent = message; $('toast').classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3200);
}
function persist() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); }
  catch { if (storageAvailable) toast('当前浏览器无法保存进度；本次仍可继续。'); storageAvailable = false; }
}
function info(title, paragraphs, kicker = 'RECEIVER NOTE') {
  $('info-title').textContent = title;
  $('info-content').replaceChildren(...paragraphs.map(text => { const p = document.createElement('p'); p.textContent = text; return p; }));
  if (!$('info-dialog').open) $('info-dialog').showModal();
}
function showRoom(focus = true) {
  $('opening').hidden = true; $('room').hidden = false; $('terminal').hidden = true;
  $('app-header').hidden = false; $('back-room').hidden = true; $('piece-tray').hidden = false;
  $('room-package').classList.toggle('ready-to-open', canOpenPackage(state));
  renderSearch(); window.scrollTo(0, 0);
  if (focus) $('search-record').focus({ preventScroll: true });
}
function showMap() {
  $('room').hidden = true; $('terminal').hidden = false; $('back-room').hidden = false; $('piece-tray').hidden = true;
  window.scrollTo(0, 0); $('map-title').setAttribute('tabindex', '-1'); $('map-title').focus({ preventScroll: true });
}
$('enter-room').addEventListener('click', () => showRoom());
$('back-room').addEventListener('click', () => showRoom());
$('wall-map').addEventListener('click', showMap);

// Both maps follow the same records, including the newly added Chongqing stop.
const routePath = cities.map((city, index) => `${index ? 'L' : 'M'}${city.x} ${city.y}`).join(' ');
document.querySelectorAll('.route-base, .route-lit').forEach(path => path.setAttribute('d', routePath));
const wallSvg = $('wall-map').querySelector('svg'); wallSvg.setAttribute('viewBox', '0 0 100 100');
wallSvg.querySelector('path').setAttribute('d', routePath);
wallSvg.querySelector('g').replaceChildren(...cities.map(city => {
  const point = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  point.setAttribute('cx', city.x); point.setAttribute('cy', city.y); point.setAttribute('r', '1.5'); return point;
}));
for (const city of cities) {
  const button = document.createElement('button'); button.className = 'city-point'; button.id = `city-${city.id}`;
  button.style.left = `${city.x}%`; button.style.top = `${city.y}%`;
  button.innerHTML = `<span class="point-dot"></span><span class="city-label">${city.name}${city.shows.length > 1 ? '<em>×2</em>' : ''}</span>`;
  button.addEventListener('click', () => openRecord(`${city.id}:${city.shows[0]}`)); $('city-points').append(button);
}
for (const record of puzzleRecords) {
  const option = document.createElement('option'); option.value = record.id; option.textContent = record.city;
  $('search-record').append(option);
}
$('search-record').addEventListener('change', event => { searchId = event.target.value; renderSearch(); });
function renderSearch() {
  $('search-record').value = searchId;
  const count = missingSlots.filter(slot => state.pieces.includes(pieceId(searchId, slot))).length;
  $('search-status').textContent = `${count} / 2`;
  $('tray-count').textContent = `${state.pieces.length} / ${puzzleRecords.length * 2}`;
}
function renderProgress() {
  const count = state.collected.length;
  document.querySelector('.count-total').textContent = String(total).padStart(2, '0');
  $('found-count').textContent = String(count).padStart(2, '0');
  $('ticket-caption').textContent = `${count} / ${total}`;
  finale.refresh();
  for (const city of cities) {
    const done = city.shows.filter(date => state.collected.includes(`${city.id}:${date}`)).length;
    const node = $(`city-${city.id}`); node.classList.toggle('visited', done > 0);
    node.setAttribute('aria-label', `${city.name}，${city.shows.length}场，已收录${done}场，点击查看`);
  }
  renderSearch();
}

const hidingPlaces = [
  { name: '收音机', cover: '翻到收音机背面', detail: '找到一块照片。', label: '检查电池盖', after: '这里没有新碎片。' },
  { name: '本子', cover: '翻开本子的夹页', detail: '找到一块照片。', label: '展开夹页', after: '这里没有新碎片。' },
  { name: '包裹', cover: '掀开包裹的标签', detail: '找到一块照片。', label: '掀开标签', after: '这里没有新碎片。' },
];
function hidingPlace(recordId, slot) { return (allRecords.findIndex(record => record.id === recordId) + (slot === 1 ? 0 : 1)) % hidingPlaces.length; }
function inspect(placeIndex) {
  const place = hidingPlaces[placeIndex], record = getRecord(searchId);
  const slot = missingSlots.find(slot => hidingPlace(searchId, slot) === placeIndex && !state.pieces.includes(pieceId(searchId, slot)));
  info(place.name, [], 'LOOK A LITTLE CLOSER');
  const reveal = document.createElement('button'); reveal.className = 'primary'; reveal.textContent = place.cover;
  reveal.addEventListener('click', () => {
    const content = $('info-content'); content.replaceChildren();
    const text = document.createElement('p'); text.textContent = slot === undefined ? place.after : place.detail; content.append(text);
    if (slot === undefined) return;
    const fragment = makePiece(pieceId(searchId, slot), false); fragment.classList.add('discovered-piece');
    fragment.setAttribute('aria-label', `${record.city} ${record.date} 的照片碎片`); content.append(fragment);
    const collect = document.createElement('button'); collect.className = 'primary'; collect.textContent = '收进便签 ＋';
    const capturedId = pieceId(searchId, slot);
    collect.addEventListener('click', () => {
      if (!state.pieces.includes(capturedId)) { state.pieces.push(capturedId); persist(); renderProgress(); }
      $('info-dialog').close(); toast('已收好。');
    }); content.append(collect);
  }); $('info-content').append(reveal);
}
$('room-radio').addEventListener('click', () => inspect(0));
$('room-notebook').addEventListener('click', () => inspect(1));
$('room-package').addEventListener('click', () => { if (canOpenPackage(state)) gift.open(); else inspect(2); });

function makePiece(id, interactive = true) {
  const decoded = decodePiece(id), record = getRecord(decoded.recordId);
  const tile = document.createElement(interactive ? 'button' : 'div'); tile.className = 'photo-piece';
  tile.style.backgroundImage = `url("${record.photos.front}")`;
  tile.style.backgroundPosition = `${(decoded.slot % 2) * 100}% ${Math.floor(decoded.slot / 2) * 100}%`;
  tile.style.aspectRatio = String(photoRatios.get(decoded.recordId) || 1);
  if (interactive) tile.type = 'button';
  return tile;
}
const photoRatios = new Map();
function placedElsewhere(id, exceptRecord) {
  return Object.entries(state.placements).some(([recordId, positions]) => recordId !== exceptRecord && Object.values(positions).includes(id));
}
function renderPicker() {
  const record = currentRecord();
  $('picker-heading').textContent = showAllPieces ? '全部' : record.city;
  $('toggle-piece-filter').textContent = showAllPieces ? '只看本站' : '显示全部';
  const pieces = state.pieces.filter(id => {
    const decoded = decodePiece(id);
    const used = Object.values(state.placements[record.id] || {}).includes(id);
    return !used && !placedElsewhere(id, record.id) && (showAllPieces || decoded.recordId === record.id);
  });
  $('piece-options').replaceChildren();
  for (const id of pieces) {
    const decoded = decodePiece(id), owner = getRecord(decoded.recordId);
    const tile = makePiece(id); tile.setAttribute('aria-label', `${owner.city} ${owner.date} 碎片${decoded.slot === 1 ? '一' : '二'}`);
    tile.setAttribute('aria-pressed', String(selectedPiece === id)); tile.classList.toggle('selected', selectedPiece === id);
    tile.addEventListener('click', () => { selectedPiece = id; renderPicker(); toast('点一个空位。'); });
    $('piece-options').append(tile);
  }
  if (!pieces.length) { const p = document.createElement('p'); p.textContent = '还没有碎片。'; $('piece-options').append(p); }
}
function renderPuzzle() {
  const record = currentRecord(), solved = isSolved(state, record.id), gate = getGate(record.id), unlocked = isUnlocked(state, record.id);
  renderCollect();
  renderGate();
  $('puzzle-grid').replaceChildren(); $('puzzle-board').classList.toggle('solved', solved);
  $('puzzle-grid').hidden = solved || gate.type !== 'puzzle'; $('front-photo').style.visibility = solved || gate.type !== 'puzzle' ? 'visible' : 'hidden';
  $('flip-ticket').disabled = !unlocked;
  $('record-front').hidden = !unlocked;
  $('photo-side-label').textContent = solved ? '照片已修复' : '正面 · 照片待修复';
  $('puzzle-tools').hidden = solved || gate.type !== 'puzzle';
  $('puzzle-status').textContent = missingSlots.every(slot => state.pieces.includes(pieceId(record.id, slot))) ? '选碎片，点空位。' : '还缺两块照片。';
  if (solved || gate.type !== 'puzzle') return;
  for (let slot = 0; slot < 4; slot++) {
    const fixed = !missingSlots.includes(slot), placed = state.placements[record.id]?.[slot];
    const cell = document.createElement(fixed ? 'div' : 'button'); cell.className = 'puzzle-cell';
    if (fixed || placed) {
      const decoded = placed ? decodePiece(placed) : { recordId: record.id, slot };
      const owner = getRecord(decoded.recordId);
      cell.style.backgroundImage = `url("${owner.photos.front}")`;
      cell.style.backgroundPosition = `${(decoded.slot % 2) * 100}% ${Math.floor(decoded.slot / 2) * 100}%`;
    } else { cell.classList.add('empty'); cell.textContent = '＋'; }
    if (!fixed) {
      cell.type = 'button'; cell.setAttribute('aria-label', `${['左上','右上','左下','右下'][slot]}拼图位置${placed ? '，已放入，点击取回或替换' : '，空缺'}`);
      cell.addEventListener('click', () => {
        if (selectedPiece) {
          placePiece(state, record.id, slot, selectedPiece); selectedPiece = null;
        } else if (placed) { removePiece(state, record.id, slot); }
        else { $('piece-picker').hidden = false; renderPicker(); toast('先选一块碎片。'); return; }
        const nowSolved = isSolved(state, record.id); persist(); renderPuzzle(); renderPicker(); renderProgress();
        if (nowSolved) toast('拼好了。');
        else if (missingSlots.every(position => state.placements[record.id]?.[position])) toast('位置不对，可以取回重放。');
      });
    } else cell.setAttribute('aria-label', '已固定的照片部分');
    $('puzzle-grid').append(cell);
  }
  renderPicker();
}
function updateDate() {
  const record = currentRecord();
  const hidden = getGate(record.id).type === 'date' && !isUnlocked(state, record.id);
  $('record-date').textContent = hidden ? '···' : record.date;
  $('record-date').setAttribute('aria-label', hidden ? '日期未解锁' : record.date);
}
function renderGate() {
  const record = currentRecord(), gate = getGate(record.id);
  $('unlock-form').hidden = gate.type === 'puzzle' || isUnlocked(state, record.id) || flipped;
  if (gate.type === 'puzzle') return;
  $('gate-question').textContent = gate.type === 'date' ? '这场演出是哪一天？' : gate.question;
  $('unlock-answer').placeholder = gate.type === 'date' ? '年 / 月 / 日' : gate.placeholder;
  $('unlock-answer').inputMode = gate.type === 'date' || gate.placeholder === '输入年份' ? 'numeric' : 'text';
  updateDate();
}
$('unlock-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!unlockAnswer(state, currentRecord().id, $('unlock-answer').value)) {
    $('gate-feedback').textContent = '再想想，或看看提示。'; return;
  }
  persist(); renderPuzzle(); updateDate(); toast('已解锁。');
});
$('gate-hint').addEventListener('click', () => {
  const record = currentRecord(), gate = getGate(record.id); hintLevel++;
  if (gate.type === 'date') $('gate-feedback').textContent = hintLevel === 1 ? `${record.date.slice(0, 4)}年${Number(record.date.slice(5, 7))}月。` : record.date;
  else $('gate-feedback').textContent = hintLevel === 1 ? gate.hint : gate.reveal;
});
$('record-dialog').addEventListener('close', () => { $('piece-tray').hidden = $('room').hidden; });
function openRecord(id) {
  const record = getRecord(id); currentCity = cities.find(city => city.id === record.cityId); page = currentCity.shows.indexOf(record.date);
  $('piece-tray').hidden = getGate(id).type !== 'puzzle';
  renderTicket(); if (!$('record-dialog').open) $('record-dialog').showModal();
}
function renderTicket() {
  const record = currentRecord(), photos = record.photos;
  selectedPiece = null; showAllPieces = false; hintLevel = 0; $('piece-picker').hidden = true;
  $('unlock-answer').value = ''; $('gate-feedback').textContent = '';
  $('piece-tray').hidden = getGate(record.id).type !== 'puzzle';
  setFlipped(false, true);
  for (const side of ['front', 'back']) {
    const image = $(`${side}-photo`); $(`${side}-error`).hidden = true;
    image.onerror = () => { $(`${side}-error`).hidden = false; };
    image.alt = `${record.city} · ${side === 'front' ? '正面' : '背面'}照片`;
    if (side === 'front') {
      const resize = () => {
        if (!image.naturalWidth || !image.naturalHeight || currentRecord().id !== record.id) return;
        const ratio = image.naturalWidth / image.naturalHeight; photoRatios.set(record.id, ratio);
        $('puzzle-board').style.width = `min(100%, ${230 * ratio}px)`;
        $('puzzle-board').style.aspectRatio = String(ratio);
        renderPuzzle();
      };
      image.onload = resize; image.src = photos[side]; if (image.complete) resize();
    } else image.src = photos[side];
  }
  $('record-number').textContent = ` ${String(allRecords.findIndex(item => item.id === record.id) + 1).padStart(2, '0')}`;
  $('record-en').textContent = `${currentCity.en} / LIVE RECORD`; $('record-title').textContent = record.city; updateDate();
  $('record-pagination').textContent = `${page + 1} / ${currentCity.shows.length}`;
  document.querySelector('.record-pagination').hidden = currentCity.shows.length === 1;
  $('prev-record').disabled = page === 0; $('next-record').disabled = page === currentCity.shows.length - 1;
  $('back-caption').textContent = photos.backCaption || ''; $('back-caption').hidden = !photos.backCaption;
  renderCollect(); renderPuzzle();
}
function renderCollect() {
  const record = currentRecord(), collected = state.collected.includes(record.id);
  $('collect').disabled = collected || !isUnlocked(state, record.id);
  $('collect').textContent = collected ? '已收录 ✓' : '收录';
  $('fragment-copy').textContent = '';
  $('next-journey').hidden = !canArrange(state) || state.archived;
}
function setFlipped(value, immediate = false) {
  if (value && !isUnlocked(state, currentRecord().id)) return;
  flipped = value; const turner = document.querySelector('.photo-turner');
  if (immediate) turner.style.transition = 'none';
  $('photo-flipper').classList.toggle('is-flipped', value);
  $('photo-obverse').setAttribute('aria-hidden', String(value)); $('photo-reverse').setAttribute('aria-hidden', String(!value));
  $('flip-ticket').setAttribute('aria-pressed', String(value)); $('flip-ticket').textContent = value ? '翻回正面 ↻' : '翻到背面 ↻';
  $('photo-side-label').textContent = value ? '背面 · 照片' : '正面 · 照片'; $('record-back').hidden = !value;
  $('puzzle-grid').inert = value;
  if (immediate) { void turner.offsetWidth; turner.style.transition = ''; }
}
$('flip-ticket').addEventListener('click', () => setFlipped(!flipped));
$('prev-record').addEventListener('click', () => { if (page > 0) { page--; renderTicket(); } });
$('next-record').addEventListener('click', () => { if (page < currentCity.shows.length - 1) { page++; renderTicket(); } });
$('open-piece-picker').addEventListener('click', () => { $('piece-picker').hidden = !$('piece-picker').hidden; renderPicker(); });
$('toggle-piece-filter').addEventListener('click', () => { showAllPieces = !showAllPieces; renderPicker(); });
$('search-pieces').addEventListener('click', () => { searchId = currentRecord().id; $('record-dialog').close(); showRoom(); });
$('collect').addEventListener('click', () => {
  const record = currentRecord(); if (!flipped || !isUnlocked(state, record.id) || state.collected.includes(record.id)) return;
  state.collected.push(record.id); persist(); renderCollect(); renderProgress();
  searchId = puzzleRecords.find(item => !state.collected.includes(item.id))?.id || puzzleRecords[0].id; renderSearch();
  toast(state.collected.length === total ? '全部现场已收录。' : '已收录。');
});
$('next-journey').addEventListener('click', () => { $('record-dialog').close(); showMap(); $('arrange-journey').click(); });
$('piece-tray').addEventListener('click', () => {
  $('inventory-summary').textContent = `${state.pieces.length} / ${puzzleRecords.length * 2}`;
  $('inventory-pieces').replaceChildren();
  for (const id of state.pieces) {
    const decoded = decodePiece(id), record = getRecord(decoded.recordId);
    const tile = makePiece(id); tile.setAttribute('aria-label', `${record.city} ${record.date} 的照片碎片`);
    const label = document.createElement('span'); label.textContent = `${record.city} ${record.date.slice(5)}`; tile.append(label);
    tile.addEventListener('click', () => { $('inventory-dialog').close(); showMap(); openRecord(record.id); });
    $('inventory-pieces').append(tile);
  }
  if (!state.pieces.length) $('inventory-pieces').textContent = '还没有碎片。';
  $('inventory-dialog').showModal();
});
$('inventory-map').addEventListener('click', () => { $('inventory-dialog').close(); showMap(); });
$('archive-button').addEventListener('click', () => {
  $('archive-description').textContent = `${state.collected.length} / ${total}`;
  $('archive-list').replaceChildren(...allRecords.map(record => {
    const row = document.createElement('button'); row.className = 'archive-item' + (state.collected.includes(record.id) ? '' : ' missing');
    const name = document.createElement('span'); name.textContent = record.city;
    const right = document.createElement('span'), time = document.createElement('time'), mark = document.createElement('b');
    time.textContent = getGate(record.id).type === 'date' && !isUnlocked(state, record.id) ? '···' : record.date;
    if (isUnlocked(state, record.id)) time.dateTime = record.date.replaceAll('.', '-');
    mark.textContent = state.collected.includes(record.id) ? '✓' : '·'; right.append(time, mark); row.append(name, right);
    row.addEventListener('click', () => { $('archive-dialog').close(); openRecord(record.id); }); return row;
  }));
  if (canArrange(state) && !state.archived) { const next = document.createElement('button'); next.className = 'primary'; next.textContent = '整理航线 →'; next.addEventListener('click', () => { $('archive-dialog').close(); $('arrange-journey').click(); }); $('archive-list').append(next); }
  $('archive-dialog').showModal();
});
const hints = () => info('提示', ['常州、南京：翻找桌上物件，找到两块碎片，再到票根里拼好。', '其他场次：输入演出日期，或回答一个音乐小问题。', '全部收录后，点“整理航线”。点两张票根交换，按从早到晚排列。', '排对后播放航线，最后打开11月2日的信。进度保存在当前浏览器。']);
$('help').addEventListener('click', hints); $('note-button').addEventListener('click', hints);
$('reset').addEventListener('click', () => {
  info('重新开始？', ['会清空当前进度。']);
  const action = document.createElement('button'); action.className = 'primary'; action.textContent = '确认重置进度';
  action.addEventListener('click', () => { state = cleanState(null); selectedPiece = null; searchId = puzzleRecords[0].id; persist(); finale.reset(); renderProgress(); $('info-dialog').close(); toast('进度已重置。'); }); $('info-content').append(action);
});
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
}
const gift = createGift({ getState: () => state, save: persist });
const finale = createFinale({ getState: () => state, save: persist, showMap, openRecord, goHome: () => { showRoom(false); $('room-package').focus({ preventScroll: true }); } });
renderProgress();
